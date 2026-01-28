import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

// Get or create user in our database from Clerk auth
export async function getOrCreateUser() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return null;
  }

  // Check if user exists in our database
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  // If not, create them
  if (!user) {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw new Error("User has no email address");
    }

    user = await prisma.user.create({
      data: {
        clerkId,
        email,
        name: clerkUser.firstName 
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : null,
        tier: "FREE",
        prospectsUsed: 0,
        prospectsReset: new Date(),
      },
    });
  }

  return user;
}

// Get user without creating
export async function getUser() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { clerkId },
  });
}

// Check if user has exceeded their tier limits
export async function checkUsageLimit(user: { id: string; tier: string; prospectsUsed: number; prospectsReset: Date }) {
  const limits = {
    FREE: 5,
    PRO: 100,
    AGENCY: Infinity,
  };

  const limit = limits[user.tier as keyof typeof limits] || 5;
  
  // Check if we need to reset (monthly)
  const now = new Date();
  const resetDate = new Date(user.prospectsReset);
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  
  if (resetDate < oneMonthAgo) {
    // Reset usage
    await prisma.user.update({
      where: { id: user.id },
      data: {
        prospectsUsed: 0,
        prospectsReset: now,
      },
    });
    return { allowed: true, used: 0, limit, remaining: limit };
  }

  const remaining = limit - user.prospectsUsed;
  
  return {
    allowed: remaining > 0,
    used: user.prospectsUsed,
    limit,
    remaining: Math.max(0, remaining),
  };
}

// Increment usage count
export async function incrementUsage(userId: string, count: number = 1) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      prospectsUsed: { increment: count },
    },
  });
}

// Tier features
export const TIER_FEATURES = {
  FREE: {
    prospectsPerMonth: 5,
    designAudit: true,
    seoAudit: false,
    aiEmails: false,
    brandedReports: false,
    apiAccess: false,
  },
  PRO: {
    prospectsPerMonth: 100,
    designAudit: true,
    seoAudit: true,
    aiEmails: true,
    brandedReports: true,
    apiAccess: false,
  },
  AGENCY: {
    prospectsPerMonth: Infinity,
    designAudit: true,
    seoAudit: true,
    aiEmails: true,
    brandedReports: true,
    apiAccess: true,
  },
};

