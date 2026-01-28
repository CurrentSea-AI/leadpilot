import { NextResponse } from "next/server";
import { getOrCreateUser, checkUsageLimit, TIER_FEATURES } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await checkUsageLimit(user);
    const features = TIER_FEATURES[user.tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.FREE;

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      prospectsUsed: usage.used,
      prospectsLimit: usage.limit,
      prospectsRemaining: usage.remaining,
      hasStripeCustomer: !!user.stripeCustomerId,
      features,
    });
  } catch (error) {
    console.error("User fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

