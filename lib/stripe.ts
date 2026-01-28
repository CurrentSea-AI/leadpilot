import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set - billing features will be disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    })
  : null;

// Price IDs from your Stripe Dashboard
export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID || "",
  AGENCY_MONTHLY: process.env.STRIPE_AGENCY_PRICE_ID || "",
};

// Create a checkout session for upgrading
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    allow_promotion_codes: true,
  });

  return session;
}

// Create a billing portal session
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Get or create a Stripe customer for a user
export async function getOrCreateStripeCustomer({
  email,
  name,
  userId,
}: {
  email: string;
  name?: string;
  userId: string;
}) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });

  return customer;
}

// Map Stripe price ID to tier
export function getTierFromPriceId(priceId: string): "FREE" | "PRO" | "AGENCY" {
  if (priceId === PRICE_IDS.AGENCY_MONTHLY) {
    return "AGENCY";
  }
  if (priceId === PRICE_IDS.PRO_MONTHLY) {
    return "PRO";
  }
  return "FREE";
}

