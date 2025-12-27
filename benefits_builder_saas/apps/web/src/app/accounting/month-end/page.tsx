import { createServiceClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import MonthEndClosingManager from "@/components/MonthEndClosingManager";

export const metadata = {
  title: "Month-End Closing - Accounting",
};

export default async function MonthEndPage() {
  const db = createServiceClient();
  const user = await getCurrentUser();

  // Fetch all month-end closings
  const { data: closings } = await db
    .from("month_end_closings")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(24); // Last 2 years

  // Get current date info
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  return (
    <MonthEndClosingManager
      closings={closings || []}
      currentYear={currentYear}
      currentMonth={currentMonth}
      userId={user?.id || null}
    />
  );
}
