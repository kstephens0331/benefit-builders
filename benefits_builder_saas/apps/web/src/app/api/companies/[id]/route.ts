import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET /api/companies/[id]
 * Fetch a single company by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();
    const { searchParams } = new URL(request.url);
    const includeEmployees = searchParams.get("include") === "employees";

    let query = db.from("companies").select("*");

    if (includeEmployees) {
      query = db
        .from("companies")
        .select(`
          *,
          employees:employees(*)
        `);
    }

    const { data, error } = await query.eq("id", id).single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/companies/[id]
 * Update a company by ID
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate billing model if provided
    if (body.billing_model) {
      const validModels = ['5/3', '5/0', '10/0'];
      if (!validModels.includes(body.billing_model)) {
        return NextResponse.json(
          { ok: false, error: "Invalid billing model. Must be one of: 5/3, 5/0, 10/0" },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (body.contact_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.contact_email)) {
        return NextResponse.json(
          { ok: false, error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    // Validate phone if provided
    if (body.contact_phone) {
      const phoneRegex = /^\d{3}[-.]?\d{3}[-.]?\d{4}$/;
      if (!phoneRegex.test(body.contact_phone.replace(/[\s()-]/g, ''))) {
        return NextResponse.json(
          { ok: false, error: "Invalid phone format" },
          { status: 400 }
        );
      }
    }

    // Validate EIN if provided
    if (body.ein) {
      const einRegex = /^\d{2}-\d{7}$/;
      if (!einRegex.test(body.ein)) {
        return NextResponse.json(
          { ok: false, error: "Invalid EIN format. Must be XX-XXXXXXX" },
          { status: 400 }
        );
      }
    }

    // Validate ZIP if provided
    if (body.zip) {
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(body.zip)) {
        return NextResponse.json(
          { ok: false, error: "Invalid ZIP code format" },
          { status: 400 }
        );
      }
    }

    // Validate company_name is not empty if provided
    if (body.company_name !== undefined && body.company_name === '') {
      return NextResponse.json(
        { ok: false, error: "Company name cannot be empty" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedBody: any = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        // Remove HTML tags
        sanitizedBody[key] = value.replace(/<[^>]*>/g, '');
      } else {
        sanitizedBody[key] = value;
      }
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("companies")
      .update(sanitizedBody)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/companies/[id]
 * Delete a company by ID (soft delete by default)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServiceClient();
    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get("cascade") === "true";

    // Check if company exists first
    const { data: existingCompany } = await db
      .from("companies")
      .select("id")
      .eq("id", id)
      .single();

    if (!existingCompany) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 }
      );
    }

    // Soft delete by default - update status to deleted
    const { data, error } = await db
      .from("companies")
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Check for foreign key constraint violations
      if (error.code === '23503') {
        return NextResponse.json(
          { ok: false, error: "Cannot delete company with existing employees or invoices" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
