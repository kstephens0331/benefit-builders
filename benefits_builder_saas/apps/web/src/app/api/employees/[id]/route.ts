// apps/web/src/app/api/employees/[id]/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * Masks an SSN to show only last 4 digits
 */
function maskSSN(ssn: string | null | undefined): string | null {
  if (!ssn) return null;
  const digits = ssn.replace(/\D/g, '');
  if (digits.length !== 9) return ssn;
  return `***-**-${digits.slice(-4)}`;
}

/**
 * Validates SSN format (9 digits)
 */
function isValidSSN(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '');
  return digits.length === 9;
}

/**
 * Sanitizes HTML/script tags from string
 */
function sanitizeString(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes date fields - converts timestamps to date strings
 */
function sanitizeDate(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  if (dateValue === '' || dateValue === 'undefined') return null;

  // If it's an ISO timestamp, extract just the date part
  const isoMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  return dateValue;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data, error } = await db
      .from("employees")
      .select("*, company:companies(id, company_name)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Mask SSN in response
    const employee = {
      ...data,
      ssn: maskSSN(data.ssn),
    };

    return NextResponse.json({ ok: true, data: employee });
  } catch (error: any) {
    console.error("Employee GET error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate that company_id is not being changed
    if (body.company_id) {
      return NextResponse.json(
        { ok: false, error: "Cannot change company_id" },
        { status: 400 }
      );
    }

    // Validate SSN format if provided
    if (body.ssn && !isValidSSN(body.ssn)) {
      return NextResponse.json(
        { ok: false, error: "Invalid SSN format" },
        { status: 400 }
      );
    }

    // Validate wages are positive if provided
    if (body.gross_wages !== undefined && body.gross_wages < 0) {
      return NextResponse.json(
        { ok: false, error: "Gross wages must be positive" },
        { status: 400 }
      );
    }

    // Sanitize string fields
    const sanitizedUpdates: any = { ...body };
    const stringFields = ['first_name', 'last_name', 'address', 'city', 'state'];

    for (const field of stringFields) {
      if (sanitizedUpdates[field] && typeof sanitizedUpdates[field] === 'string') {
        sanitizedUpdates[field] = sanitizeString(sanitizedUpdates[field]);
      }
    }

    // Sanitize date fields
    const dateFields = ['hire_date', 'termination_date', 'dob'];
    for (const field of dateFields) {
      if (field in sanitizedUpdates) {
        sanitizedUpdates[field] = sanitizeDate(sanitizedUpdates[field]);
      }
    }

    // Remove undefined values
    Object.keys(sanitizedUpdates).forEach(key => {
      if (sanitizedUpdates[key] === undefined) {
        delete sanitizedUpdates[key];
      }
    });

    const db = createServiceClient();

    const { data, error } = await db
      .from("employees")
      .update(sanitizedUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Employee update error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("Employee PATCH error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    const db = createServiceClient();

    if (permanent) {
      // Permanent delete
      const { error } = await db
        .from("employees")
        .delete()
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          return NextResponse.json(
            { ok: false, error: "Employee not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, message: "Employee permanently deleted" });
    } else {
      // Soft delete - update status to deleted
      const { data, error } = await db
        .from("employees")
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          return NextResponse.json(
            { ok: false, error: "Employee not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, data });
    }
  } catch (error: any) {
    console.error("Employee DELETE error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
