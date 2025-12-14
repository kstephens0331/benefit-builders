import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET - Test raw QuickBooks API queries
export async function GET() {
  const db = createServiceClient();

  try {
    // Get active connection
    const { data: connection, error: connError } = await db
      .from("quickbooks_connections")
      .select("*")
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json({
        ok: false,
        error: "No active QuickBooks connection",
        debug: { connError: connError?.message }
      });
    }

    // Determine environment
    const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || "sandbox";
    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const realmId = connection.realm_id;
    const accessToken = connection.access_token;

    // Test 1: Query customers
    const customerQuery = "SELECT * FROM Customer MAXRESULTS 10";
    const customerUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(customerQuery)}`;

    console.log("=== QB TEST QUERY ===");
    console.log("Environment:", QB_ENVIRONMENT);
    console.log("Base URL:", baseUrl);
    console.log("Realm ID:", realmId);
    console.log("Customer URL:", customerUrl);

    const customerResponse = await fetch(customerUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const customerStatus = customerResponse.status;
    const customerText = await customerResponse.text();
    let customerData: any = null;

    try {
      customerData = JSON.parse(customerText);
    } catch (e) {
      customerData = { raw: customerText };
    }

    // Test 2: Query invoices
    const invoiceQuery = "SELECT * FROM Invoice MAXRESULTS 10";
    const invoiceUrl = `${baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(invoiceQuery)}`;

    const invoiceResponse = await fetch(invoiceUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const invoiceStatus = invoiceResponse.status;
    const invoiceText = await invoiceResponse.text();
    let invoiceData: any = null;

    try {
      invoiceData = JSON.parse(invoiceText);
    } catch (e) {
      invoiceData = { raw: invoiceText };
    }

    // Test 3: Query Company Info (simpler test)
    const companyUrl = `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`;

    const companyResponse = await fetch(companyUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    const companyStatus = companyResponse.status;
    const companyText = await companyResponse.text();
    let companyData: any = null;

    try {
      companyData = JSON.parse(companyText);
    } catch (e) {
      companyData = { raw: companyText };
    }

    return NextResponse.json({
      ok: true,
      config: {
        environment: QB_ENVIRONMENT,
        base_url: baseUrl,
        realm_id: realmId,
        token_expires_at: connection.token_expires_at,
        token_preview: accessToken?.substring(0, 20) + "...",
      },
      tests: {
        company: {
          status: companyStatus,
          name: companyData?.CompanyInfo?.CompanyName || null,
          data: companyData,
        },
        customers: {
          status: customerStatus,
          count: customerData?.QueryResponse?.Customer?.length || 0,
          maxResults: customerData?.QueryResponse?.maxResults || null,
          startPosition: customerData?.QueryResponse?.startPosition || null,
          names: customerData?.QueryResponse?.Customer?.slice(0, 5)?.map((c: any) => c.DisplayName) || [],
          error: customerData?.Fault || null,
        },
        invoices: {
          status: invoiceStatus,
          count: invoiceData?.QueryResponse?.Invoice?.length || 0,
          maxResults: invoiceData?.QueryResponse?.maxResults || null,
          numbers: invoiceData?.QueryResponse?.Invoice?.slice(0, 5)?.map((i: any) => i.DocNumber || i.Id) || [],
          error: invoiceData?.Fault || null,
        },
      },
    });
  } catch (error: any) {
    console.error("QB test query error:", error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
