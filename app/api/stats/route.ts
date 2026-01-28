import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    
    // For now, show all leads if no user (backwards compat)
    // In production, you'd require auth
    const whereClause = user ? { userId: user.id } : {};

    const [
      totalLeads,
      audited,
      drafted,
      sent,
      reportsViewed,
    ] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.count({ 
        where: { 
          ...whereClause,
          OR: [
            { designAudit: { isNot: null } },
            { seoAudit: { isNot: null } },
          ],
        } 
      }),
      prisma.lead.count({ 
        where: { 
          ...whereClause,
          outreachDraft: { isNot: null } 
        } 
      }),
      prisma.lead.count({ 
        where: { 
          ...whereClause,
          status: "SENT" 
        } 
      }),
      prisma.report.count({ 
        where: { 
          viewed: true,
          lead: whereClause,
        } 
      }),
    ]);

    return NextResponse.json({
      totalLeads,
      audited,
      drafted,
      sent,
      reportsViewed,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

