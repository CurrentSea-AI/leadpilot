import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Forward to the main audit endpoint
  const baseUrl = request.nextUrl.origin;
  const response = await fetch(`${baseUrl}/api/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId: id }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

