import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET - Get a single proposal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    const { data: proposal, error } = await db
      .from("proposals")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !proposal) {
      return NextResponse.json(
        { ok: false, error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Get employees
    const { data: employees } = await db
      .from("proposal_employees")
      .select("*")
      .eq("proposal_id", id)
      .order("employee_name");

    return NextResponse.json({
      ok: true,
      proposal,
      employees: employees || [],
    });
  } catch (error: any) {
    console.error("Error fetching proposal:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update a proposal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = createServiceClient();

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};

    if (body.proposal_name !== undefined) updateData.proposal_name = body.proposal_name;
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.company_address !== undefined) updateData.company_address = body.company_address;
    if (body.company_city !== undefined) updateData.company_city = body.company_city;
    if (body.company_state !== undefined) updateData.company_state = body.company_state;
    if (body.company_phone !== undefined) updateData.company_phone = body.company_phone;
    if (body.company_email !== undefined) updateData.company_email = body.company_email;
    if (body.company_contact !== undefined) updateData.company_contact = body.company_contact;
    if (body.effective_date !== undefined) updateData.effective_date = body.effective_date;
    if (body.model_percentage !== undefined) updateData.model_percentage = body.model_percentage;
    if (body.pay_period !== undefined) updateData.pay_period = body.pay_period;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: proposal, error } = await db
      .from("proposals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Proposal updated successfully",
      proposal,
    });
  } catch (error: any) {
    console.error("Error updating proposal:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a proposal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // First delete associated employees
    await db
      .from("proposal_employees")
      .delete()
      .eq("proposal_id", id);

    // Then delete the proposal
    const { error } = await db
      .from("proposals")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Proposal deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting proposal:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
