import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createBillingPortalSession, stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const session = await createBillingPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: `${request.nextUrl.origin}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to open billing portal" },
      { status: 500 }
    );
  }
}

