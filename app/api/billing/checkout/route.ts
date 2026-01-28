import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { createCheckoutSession, getOrCreateStripeCustomer, PRICE_IDS, stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
    }

    const { plan } = await request.json();
    
    const priceId = plan === "agency" ? PRICE_IDS.AGENCY_MONTHLY : PRICE_IDS.PRO_MONTHLY;
    
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await getOrCreateStripeCustomer({
        email: user.email,
        name: user.name || undefined,
        userId: user.id,
      });
      customerId = customer.id;
      
      // Save customer ID to user
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${request.nextUrl.origin}/billing?success=true`,
      cancelUrl: `${request.nextUrl.origin}/billing?canceled=true`,
      userId: user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

