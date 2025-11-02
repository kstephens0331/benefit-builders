import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - Get specific month-end closing details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // Get closing record
    const { data: closing, error: closingError } = await db
      .from("month_end_closings")
      .select("*")
      .eq("id", id)
      .single();

    if (closingError || !closing) {
      return NextResponse.json(
        { ok: false, error: "Month-end closing not found" },
        { status: 404 }
      );
    }

    // Get company details
    const { data: companyDetails, error: detailsError } = await db
      .from("month_end_company_details")
      .select("*")
      .eq("closing_id", id)
      .order("company_name");

    if (detailsError) throw new Error(detailsError.message);

    return NextResponse.json({
      ok: true,
      data: {
        closing,
        companyDetails: companyDetails || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
