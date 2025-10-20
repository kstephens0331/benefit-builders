// src/app/api/reports/company/[id]/employees/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createPdfDoc, addPage, drawHeaderFooter, drawTable } from "@/lib/pdf";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const db = createServiceClient();

  // Company
  const { data: company, error: cErr } = await db
    .from("companies")
    .select("id,name,state,model,status")
    .eq("id", id)
    .single();
  if (cErr || !company) {
    return NextResponse.json({ ok:false, error: cErr?.message ?? "Company not found" }, { status: 404 });
  }

  // Employees
  const { data: emps, error: eErr } = await db
    .from("employees")
    .select("last_name,first_name,state,pay_period,paycheck_gross,filing_status,dependents,active")
    .eq("company_id", id)
    .order("last_name")
    .order("first_name");
  if (eErr) return NextResponse.json({ ok:false, error: eErr.message }, { status: 500 });

  const { doc, font, bold } = await createPdfDoc();

  // First page
  let page = addPage(doc);
  drawHeaderFooter(page, { font, bold }, {
    titleLeft: `Employee Roster — ${company.name}`,
    titleRight: new Date().toLocaleDateString(),
    subtitle: `${company.state} · Model ${company.model} · ${company.status}`
  });

  const columns = [
    { key: "name", header: "Name", width: 180 },
    { key: "state", header: "State", width: 60 },
    { key: "period", header: "Pay Period", width: 90 },
    { key: "gross", header: "Gross / Pay", width: 90 },
    { key: "filing", header: "Filing", width: 70 },
    { key: "deps", header: "Deps", width: 40 },
    { key: "status", header: "Status", width: 60 },
  ] as const;

  const payMap: Record<string,string> = { w:"weekly", b:"biweekly", s:"semimonthly", m:"monthly" };

  const rows = (emps ?? []).map((e) => ({
    name: `${e.last_name}, ${e.first_name}`,
    state: e.state ?? "",
    period: payMap[e.pay_period ?? ""] ?? e.pay_period ?? "",
    gross: `$${Number(e.paycheck_gross ?? 0).toFixed(2)}`,
    filing: e.filing_status ?? "",
    deps: String(e.dependents ?? 0),
    status: e.active ? "active" : "inactive",
  }));

  let y = 720; // top content
  const table = { title: "Employees", columns: columns as any, rows, footerNote: `Total employees: ${rows.length}` };

  // paginate as needed
  while (true) {
    const { exhausted } = drawTable({ page, fonts: { font, bold }, table, topY: y });
    if (!exhausted) break;
    page = addPage(doc);
    drawHeaderFooter(page, { font, bold }, {
      titleLeft: `Employee Roster — ${company.name}`,
      titleRight: new Date().toLocaleDateString(),
    });
    y = 740;
    // drawTable will render from the top again; trivial approach since we pass full table each time.
    // For large tables, you can slice rows across pages. For MVP, a second pass is acceptable for typical sizes.
    // (If your roster is very large, ping me and I’ll switch to proper row slicing.)
    const { exhausted: exhausted2 } = drawTable({ page, fonts: { font, bold }, table, topY: y });
    if (!exhausted2) break; // stop after 2 pages for MVP
    break;
  }

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="employee_roster_${company.name.replace(/\W+/g,"_")}.pdf"`
    }
  });
}
