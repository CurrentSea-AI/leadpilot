import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { Status, ContactMethod } from "@prisma/client";

const updateLeadSchema = z.object({
  status: z.nativeEnum(Status).optional(),
  recipientName: z.string().optional(),
  name: z.string().optional(),
  // Outreach tracking fields
  lastContactedAt: z.string().datetime().optional().nullable(), // ISO datetime string
  nextFollowUpAt: z.string().datetime().optional().nullable(), // ISO datetime string
  contactMethod: z.nativeEnum(ContactMethod).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if lead exists
    const existing = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const validation = updateLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Build update data only with provided fields
    const updateData: {
      status?: Status;
      recipientName?: string | null;
      name?: string;
      lastContactedAt?: Date | null;
      nextFollowUpAt?: Date | null;
      contactMethod?: ContactMethod | null;
      notes?: string | null;
    } = {};

    if (validation.data.status !== undefined) {
      updateData.status = validation.data.status;
    }
    if (validation.data.recipientName !== undefined) {
      // Allow empty string to clear the field
      updateData.recipientName = validation.data.recipientName || null;
    }
    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }
    if (validation.data.lastContactedAt !== undefined) {
      updateData.lastContactedAt = validation.data.lastContactedAt 
        ? new Date(validation.data.lastContactedAt) 
        : null;
    }
    if (validation.data.nextFollowUpAt !== undefined) {
      updateData.nextFollowUpAt = validation.data.nextFollowUpAt 
        ? new Date(validation.data.nextFollowUpAt) 
        : null;
    }
    if (validation.data.contactMethod !== undefined) {
      updateData.contactMethod = validation.data.contactMethod;
    }
    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes || null;
    }

    // Auto-set nextFollowUpAt when status becomes SENT and no explicit nextFollowUpAt was provided
    if (
      updateData.status === "SENT" &&
      validation.data.nextFollowUpAt === undefined // Not explicitly set in request
    ) {
      // If existing lead doesn't have nextFollowUpAt, auto-set it
      if (!existing.nextFollowUpAt) {
        const baseDate = updateData.lastContactedAt || existing.lastContactedAt || new Date();
        const followUpDate = new Date(baseDate);
        followUpDate.setDate(followUpDate.getDate() + 2);
        updateData.nextFollowUpAt = followUpDate;
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        audit: true,
        outreachDraft: true,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

