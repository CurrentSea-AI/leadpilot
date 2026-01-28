import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { publicId } = await context.params;

    const report = await prisma.report.findUnique({
      where: { publicId },
      include: {
        lead: {
          select: {
            name: true,
            websiteUrl: true,
            city: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Mark as viewed if not already
    if (!report.viewed) {
      await prisma.report.update({
        where: { publicId },
        data: {
          viewed: true,
          viewedAt: new Date(),
        },
      });
    }

    const data = JSON.parse(report.dataJson);

    return NextResponse.json({
      id: report.id,
      publicId: report.publicId,
      type: report.type,
      createdAt: report.createdAt,
      viewed: report.viewed,
      viewedAt: report.viewedAt,
      lead: report.lead,
      data,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

