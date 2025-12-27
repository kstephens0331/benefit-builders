import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser, getRepFilterId, getClientCompanyId, isAdmin, isRep, isClient } from "@/lib/auth";

export async function GET() {
  const db = createServiceClient();
  const user = await getCurrentUser();
  const repFilterId = getRepFilterId(user);
  const clientCompanyId = getClientCompanyId(user);

  // Build query based on role
  let query = db.from("companies").select("*, assigned_rep:internal_users!assigned_rep_id(id, full_name)").order("name");

  // Client users can only see their single assigned company
  if (clientCompanyId) {
    query = query.eq("id", clientCompanyId);
  }
  // Reps only see their assigned companies
  else if (repFilterId) {
    query = query.eq("assigned_rep_id", repFilterId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok:true, count: data?.length ?? 0, data, user_role: user?.role });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = createServiceClient();
    const user = await getCurrentUser();

    // Admins and reps can create companies
    // Clients cannot create companies
    if (!isAdmin(user) && !isRep(user)) {
      return NextResponse.json(
        { ok: false, error: "Only admins and reps can create companies" },
        { status: 403 }
      );
    }

    // For reps, auto-assign the company to themselves
    // Reps cannot set assigned_rep_id to someone else
    let assignedRepId = body.assigned_rep_id || null;
    if (isRep(user)) {
      assignedRepId = user?.id; // Always assign to themselves
    }

    const { data, error } = await db
      .from("companies")
      .insert({
        name: body.name,
        state: body.state,
        pay_frequency: body.pay_frequency || 'biweekly',
        model: body.model || '5/3',
        employer_rate: body.employer_rate || 5.0,
        employee_rate: body.employee_rate || 3.0,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        address: body.address || null,
        city: body.city || null,
        zip: body.zip || null,
        status: body.status || 'active',
        assigned_rep_id: assignedRepId,
        // Custom Section 125 amounts for 3/4 model
        sec125_single_0: body.sec125_single_0 || null,
        sec125_married_0: body.sec125_married_0 || null,
        sec125_single_deps: body.sec125_single_deps || null,
        sec125_married_deps: body.sec125_married_deps || null,
      })
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
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();
    const user = await getCurrentUser();

    // Clients cannot update companies at all
    if (isClient(user)) {
      return NextResponse.json(
        { ok: false, error: "Clients cannot modify company details" },
        { status: 403 }
      );
    }

    // Reps cannot change assigned_rep_id (only admins can reassign)
    if (isRep(user) && 'assigned_rep_id' in updates) {
      delete updates.assigned_rep_id;
    }

    const { data, error } = await db
      .from("companies")
      .update(updates)
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
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Check if company has employees
    const { data: employees } = await db
      .from("employees")
      .select("id")
      .eq("company_id", id)
      .limit(1);

    if (employees && employees.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete company with existing employees. Archive instead." },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Company deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
