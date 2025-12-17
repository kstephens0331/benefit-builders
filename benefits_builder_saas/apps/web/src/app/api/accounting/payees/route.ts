import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { ensureValidToken, getAllCustomersFromQB } from "@/lib/quickbooks";

// GET - Fetch all QuickBooks customers (payees) with their link status
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    // Get QuickBooks connection
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json({
        ok: false,
        error: "No active QuickBooks connection",
        qb_connected: false,
      });
    }

    const tokens = {
      realmId: connection.realm_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      accessTokenExpiry: connection.token_expires_at,
      refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Ensure token is valid
    const validTokens = await ensureValidToken(tokens);

    // Update tokens if refreshed
    if (validTokens.accessToken !== tokens.accessToken) {
      await db
        .from("quickbooks_connections")
        .update({
          access_token: validTokens.accessToken,
          refresh_token: validTokens.refreshToken,
          token_expires_at: validTokens.accessTokenExpiry,
        })
        .eq("id", connection.id);
    }

    // Get all customers from QuickBooks
    const customersResult = await getAllCustomersFromQB(validTokens);

    if (!customersResult.success || !customersResult.customers) {
      return NextResponse.json({
        ok: false,
        error: customersResult.error || "Failed to fetch customers from QuickBooks",
        qb_connected: true,
      });
    }

    // Get all companies from database to check which are linked
    const { data: companies } = await db
      .from("companies")
      .select("id, name, qb_customer_id, qb_synced_at")
      .not("qb_customer_id", "is", null);

    // Create a map of QB customer IDs to company links
    const linkedCompanies = new Map<string, { id: string; name: string; synced_at: string }>();
    for (const company of companies || []) {
      linkedCompanies.set(company.qb_customer_id, {
        id: company.id,
        name: company.name,
        synced_at: company.qb_synced_at,
      });
    }

    // Get A/R data for payees
    const { data: arData } = await db
      .from("accounts_receivable")
      .select("company_id, amount, amount_paid, amount_due, status")
      .in("company_id", companies?.map(c => c.id) || []);

    // Build AR summary per company
    const arByCompany = new Map<string, { total: number; paid: number; due: number; count: number }>();
    for (const ar of arData || []) {
      const existing = arByCompany.get(ar.company_id) || { total: 0, paid: 0, due: 0, count: 0 };
      existing.total += parseFloat(ar.amount) || 0;
      existing.paid += parseFloat(ar.amount_paid) || 0;
      existing.due += parseFloat(ar.amount_due) || 0;
      existing.count += 1;
      arByCompany.set(ar.company_id, existing);
    }

    // Format payees data with link status
    const payees = customersResult.customers.map((qbCustomer: any) => {
      const linkedCompany = linkedCompanies.get(qbCustomer.Id);
      const ar = linkedCompany ? arByCompany.get(linkedCompany.id) : null;

      return {
        qb_id: qbCustomer.Id,
        display_name: qbCustomer.DisplayName,
        company_name: qbCustomer.CompanyName || null,
        email: qbCustomer.PrimaryEmailAddr?.Address || null,
        phone: qbCustomer.PrimaryPhone?.FreeFormNumber || null,
        balance: parseFloat(qbCustomer.Balance) || 0,
        active: qbCustomer.Active,
        // Link status
        is_linked: !!linkedCompany,
        linked_company: linkedCompany ? {
          id: linkedCompany.id,
          name: linkedCompany.name,
          synced_at: linkedCompany.synced_at,
        } : null,
        // AR summary if linked
        ar_summary: ar ? {
          total_invoiced: ar.total,
          total_paid: ar.paid,
          amount_due: ar.due,
          invoice_count: ar.count,
        } : null,
      };
    });

    // Sort: linked first, then by display name
    payees.sort((a: any, b: any) => {
      if (a.is_linked && !b.is_linked) return -1;
      if (!a.is_linked && b.is_linked) return 1;
      return a.display_name.localeCompare(b.display_name);
    });

    return NextResponse.json({
      ok: true,
      qb_connected: true,
      payees,
      summary: {
        total: payees.length,
        linked: payees.filter((p: any) => p.is_linked).length,
        unlinked: payees.filter((p: any) => !p.is_linked).length,
      },
    });
  } catch (error: any) {
    console.error("Payees fetch error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Link a QuickBooks customer to a company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qb_customer_id, company_id } = body;

    if (!qb_customer_id || !company_id) {
      return NextResponse.json(
        { ok: false, error: "qb_customer_id and company_id are required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Update the company with the QB customer link
    const { data, error } = await db
      .from("companies")
      .update({
        qb_customer_id: qb_customer_id,
        qb_synced_at: new Date().toISOString(),
      })
      .eq("id", company_id)
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

// DELETE - Unlink a QuickBooks customer from a company
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company_id = searchParams.get("company_id");

    if (!company_id) {
      return NextResponse.json(
        { ok: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Remove the QB customer link from the company
    const { data, error } = await db
      .from("companies")
      .update({
        qb_customer_id: null,
        qb_synced_at: null,
      })
      .eq("id", company_id)
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
