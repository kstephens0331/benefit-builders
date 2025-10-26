// apps/web/src/app/api/tax-rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const taxYear = searchParams.get("tax_year");

  const db = createServiceClient();

  let query = db
    .from("tax_state_rates")
    .select("*")
    .order("state");

  if (state) {
    query = query.eq("state", state);
  }

  if (taxYear) {
    query = query.eq("tax_year", parseInt(taxYear));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, tax_year, ...updates } = body;

    if (!state || !tax_year) {
      return NextResponse.json(
        { ok: false, error: "State and tax year are required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // First try to update
    const { data: existing } = await db
      .from("tax_state_rates")
      .select("state, tax_year")
      .eq("state", state)
      .eq("tax_year", tax_year)
      .single();

    if (existing) {
      // Update existing record
      const { data, error } = await db
        .from("tax_state_rates")
        .update(updates)
        .eq("state", state)
        .eq("tax_year", tax_year)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, data });
    } else {
      // Insert new record
      const { data, error } = await db
        .from("tax_state_rates")
        .insert({
          state,
          tax_year,
          ...updates,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, data });
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const taxYear = searchParams.get("tax_year");

    if (!state || !taxYear) {
      return NextResponse.json(
        { ok: false, error: "State and tax year are required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { error } = await db
      .from("tax_state_rates")
      .delete()
      .eq("state", state)
      .eq("tax_year", parseInt(taxYear));

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Tax rate deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
