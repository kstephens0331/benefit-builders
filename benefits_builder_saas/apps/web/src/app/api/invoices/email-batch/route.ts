import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceIds, period } = body;

    const db = createServiceClient();
    let invoicesToSend: string[] = [];

    // If period is provided, get all invoices for that period
    if (period) {
      const { data, error } = await db
        .from("invoices")
        .select("id")
        .eq("period", period)
        .neq("status", "sent");

      if (error) throw new Error(error.message);
      invoicesToSend = data?.map((inv) => inv.id) || [];
    } else if (invoiceIds && Array.isArray(invoiceIds)) {
      invoicesToSend = invoiceIds;
    } else {
      return NextResponse.json(
        { ok: false, error: "Either 'period' or 'invoiceIds' must be provided" },
        { status: 400 }
      );
    }

    if (invoicesToSend.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No invoices to send",
        sent: 0,
        failed: 0,
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send each invoice
    for (const invoiceId of invoicesToSend) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/invoices/${invoiceId}/email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (data.ok) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Invoice ${invoiceId.substring(0, 8)}: ${data.error}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Invoice ${invoiceId.substring(0, 8)}: ${error.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Sent ${results.sent} invoices, ${results.failed} failed`,
      ...results,
    });
  } catch (error: any) {
    console.error("Batch email error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
