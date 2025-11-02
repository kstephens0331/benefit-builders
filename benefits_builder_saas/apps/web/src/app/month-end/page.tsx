import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import MonthEndManager from "@/components/MonthEndManager";

export const metadata = {
  title: "Month-End Closing",
};

export default async function MonthEndPage() {
  const db = createServiceClient();

  // Fetch recent month-end closings
  const { data: closings } = await db
    .from("month_end_closings")
    .select("*")
    .order("closing_date", { ascending: false })
    .limit(24); // Last 2 years

  return (
    <MonthEndManager initialClosings={closings || []} />
  );
}
