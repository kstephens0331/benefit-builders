/**
 * Aging Report Utilities
 * Calculate 30/60/90+ day aging buckets for A/R and A/P
 */

export type AgingBucket = "current" | "30" | "60" | "90+";

export type AgingItem = {
  id: string;
  company_name?: string;
  vendor_name?: string;
  invoice_number?: string;
  bill_number?: string;
  due_date: string;
  amount_due: number;
  days_overdue: number;
  bucket: AgingBucket;
};

export type AgingSummary = {
  current: number;
  days_30: number;
  days_60: number;
  days_90_plus: number;
  total: number;
};

/**
 * Calculate days overdue from due date
 */
export function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Determine aging bucket based on days overdue
 */
export function getAgingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "30";
  if (daysOverdue <= 60) return "60";
  return "90+";
}

/**
 * Calculate aging summary from items
 */
export function calculateAgingSummary(items: AgingItem[]): AgingSummary {
  const summary: AgingSummary = {
    current: 0,
    days_30: 0,
    days_60: 0,
    days_90_plus: 0,
    total: 0,
  };

  for (const item of items) {
    const amount = item.amount_due;
    summary.total += amount;

    switch (item.bucket) {
      case "current":
        summary.current += amount;
        break;
      case "30":
        summary.days_30 += amount;
        break;
      case "60":
        summary.days_60 += amount;
        break;
      case "90+":
        summary.days_90_plus += amount;
        break;
    }
  }

  return summary;
}

/**
 * Process A/R records into aging items
 */
export function processARforAging(arRecords: any[]): AgingItem[] {
  return arRecords.map((ar) => {
    const daysOverdue = calculateDaysOverdue(ar.due_date);
    return {
      id: ar.id,
      company_name: Array.isArray(ar.companies) ? ar.companies[0]?.name : ar.companies?.name,
      invoice_number: ar.invoice_number,
      due_date: ar.due_date,
      amount_due: parseFloat(ar.amount_due),
      days_overdue: daysOverdue,
      bucket: getAgingBucket(daysOverdue),
    };
  });
}

/**
 * Process A/P records into aging items
 */
export function processAPforAging(apRecords: any[]): AgingItem[] {
  return apRecords.map((ap) => {
    const daysOverdue = calculateDaysOverdue(ap.due_date);
    return {
      id: ap.id,
      vendor_name: ap.vendor_name,
      bill_number: ap.bill_number,
      due_date: ap.due_date,
      amount_due: parseFloat(ap.amount_due),
      days_overdue: daysOverdue,
      bucket: getAgingBucket(daysOverdue),
    };
  });
}

/**
 * Sort aging items by days overdue (descending)
 */
export function sortByDaysOverdue(items: AgingItem[]): AgingItem[] {
  return [...items].sort((a, b) => b.days_overdue - a.days_overdue);
}

/**
 * Filter aging items by bucket
 */
export function filterByBucket(items: AgingItem[], bucket: AgingBucket): AgingItem[] {
  return items.filter((item) => item.bucket === bucket);
}
