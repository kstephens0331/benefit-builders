import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET - Get cleanup candidates (items that may need cleanup)
 */
export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();

    // Find A/R entries with suspiciously large amounts (likely from x100 bug)
    const { data: largeAmounts } = await db
      .from("accounts_receivable")
      .select("id, invoice_number, amount, amount_paid, amount_due, company_id, companies(name)")
      .gte("amount", 100000) // $100k+ is suspicious for this business
      .order("amount", { ascending: false })
      .limit(50);

    // Find duplicate QB invoice IDs
    const { data: duplicateQBIds } = await db
      .from("accounts_receivable")
      .select("quickbooks_invoice_id, count:quickbooks_invoice_id")
      .not("quickbooks_invoice_id", "is", null);

    // Find A/R entries with negative amount_due (overpaid - double counting bug)
    const { data: negativeDue } = await db
      .from("accounts_receivable")
      .select("id, invoice_number, amount, amount_paid, amount_due, company_id, companies(name)")
      .lt("amount_due", 0)
      .order("amount_due", { ascending: true })
      .limit(50);

    // Count companies without QB link
    const { count: unlinkedCompanies } = await db
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("qb_customer_id", null);

    // Find orphaned A/R entries (no matching company)
    const { data: orphanedAR } = await db
      .from("accounts_receivable")
      .select("id, invoice_number, company_id")
      .is("company_id", null)
      .limit(50);

    return NextResponse.json({
      ok: true,
      cleanup_candidates: {
        large_amounts: {
          count: largeAmounts?.length || 0,
          items: largeAmounts || [],
          description: "A/R entries with amounts >= $100,000 (may be from x100 bug)",
        },
        negative_due: {
          count: negativeDue?.length || 0,
          items: negativeDue || [],
          description: "A/R entries with negative amount_due (overpaid - possible double counting)",
        },
        unlinked_companies: {
          count: unlinkedCompanies || 0,
          description: "Active companies not linked to QuickBooks",
        },
        orphaned_ar: {
          count: orphanedAR?.length || 0,
          items: orphanedAR || [],
          description: "A/R entries without a valid company link",
        },
      },
    });
  } catch (error: any) {
    console.error("Cleanup check error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Execute cleanup operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids } = body;

    const db = createServiceClient();
    const results: any = { action, success: 0, failed: 0, errors: [] };

    switch (action) {
      case "delete_large_amounts":
        // Delete A/R entries with amounts >= $100,000
        if (ids && ids.length > 0) {
          const { error } = await db
            .from("accounts_receivable")
            .delete()
            .in("id", ids);

          if (error) {
            results.failed = ids.length;
            results.errors.push(error.message);
          } else {
            results.success = ids.length;
          }
        } else {
          // Delete all large amounts
          const { data, error } = await db
            .from("accounts_receivable")
            .delete()
            .gte("amount", 100000)
            .select("id");

          if (error) {
            results.errors.push(error.message);
          } else {
            results.success = data?.length || 0;
          }
        }
        break;

      case "delete_negative_due":
        // Delete A/R entries with negative amount_due
        if (ids && ids.length > 0) {
          const { error } = await db
            .from("accounts_receivable")
            .delete()
            .in("id", ids);

          if (error) {
            results.failed = ids.length;
            results.errors.push(error.message);
          } else {
            results.success = ids.length;
          }
        } else {
          const { data, error } = await db
            .from("accounts_receivable")
            .delete()
            .lt("amount_due", 0)
            .select("id");

          if (error) {
            results.errors.push(error.message);
          } else {
            results.success = data?.length || 0;
          }
        }
        break;

      case "delete_orphaned_ar":
        // Delete A/R entries without a company
        const { data: orphaned, error: orphanError } = await db
          .from("accounts_receivable")
          .delete()
          .is("company_id", null)
          .select("id");

        if (orphanError) {
          results.errors.push(orphanError.message);
        } else {
          results.success = orphaned?.length || 0;
        }
        break;

      case "delete_by_ids":
        // Delete specific A/R entries by ID
        if (!ids || ids.length === 0) {
          return NextResponse.json(
            { ok: false, error: "No IDs provided" },
            { status: 400 }
          );
        }

        const { error: deleteError } = await db
          .from("accounts_receivable")
          .delete()
          .in("id", ids);

        if (deleteError) {
          results.failed = ids.length;
          results.errors.push(deleteError.message);
        } else {
          results.success = ids.length;
        }
        break;

      case "fix_amount_paid":
        // Reset amount_paid to match QB balance for entries where amount_paid > amount
        // This would need to re-sync from QB, so we just delete and let sync recreate
        if (ids && ids.length > 0) {
          const { error } = await db
            .from("accounts_receivable")
            .delete()
            .in("id", ids);

          if (error) {
            results.errors.push(error.message);
          } else {
            results.success = ids.length;
            results.note = "Deleted entries will be recreated on next sync";
          }
        }
        break;

      case "clear_all_qb_ar":
        // Nuclear option: Delete ALL A/R entries that came from QuickBooks
        const { data: qbEntries, error: clearError } = await db
          .from("accounts_receivable")
          .delete()
          .not("quickbooks_invoice_id", "is", null)
          .select("id");

        if (clearError) {
          results.errors.push(clearError.message);
        } else {
          results.success = qbEntries?.length || 0;
          results.note = "All QB-imported A/R entries deleted. Run sync to reimport correctly.";
        }
        break;

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ok: results.errors.length === 0,
      results,
    });
  } catch (error: any) {
    console.error("Cleanup execution error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
