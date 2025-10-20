// src/lib/tax.ts

/** Social Security + Medicare */
export function calcFICA(
  gross: number,
  preFICA: number,
  ssRate: number,
  medRate: number
) {
  const base = Math.max(0, gross - (preFICA || 0));
  const ss = +(base * Number(ssRate || 0)).toFixed(2);
  const med = +(base * Number(medRate || 0)).toFixed(2);
  const fica = +(ss + med).toFixed(2);
  return { ss, med, fica };
}

/** Percentage table per IRS Pub. 15-T row shape: { over, baseTax, pct } sorted ascending by `over`. */
export function calcFITFromTable(taxable: number, table: Array<{over:number;baseTax:number;pct:number}>) {
  if (!Array.isArray(table) || table.length === 0) return 0;
  let row = table[0];
  for (const r of table) {
    if (taxable >= r.over) row = r; else break;
  }
  const overAmt = Math.max(0, taxable - row.over);
  const fit = +(Number(row.baseTax || 0) + overAmt * Number(row.pct || 0)).toFixed(2);
  return fit;
}

/** Simple flat state tax */
export function calcSITFlat(taxable: number, flatRate: number) {
  return +(Math.max(0, taxable) * Number(flatRate || 0)).toFixed(2);
}

/** Convenience map from single-letter pay period to frequency text and periods/year. */
export function mapPayPeriod(p: string): { freq: "weekly"|"biweekly"|"semimonthly"|"monthly"; periodsPerYear: number } {
  switch ((p || "").toLowerCase()) {
    case "w": return { freq: "weekly", periodsPerYear: 52 };
    case "b": return { freq: "biweekly", periodsPerYear: 26 };
    case "s": return { freq: "semimonthly", periodsPerYear: 24 };
    default:  return { freq: "monthly", periodsPerYear: 12 };
  }
}
