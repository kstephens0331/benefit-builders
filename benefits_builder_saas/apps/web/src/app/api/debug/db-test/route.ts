// Debug API to test database connectivity and data
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = createServiceClient();

    // Test 1: Count companies
    const { count: companiesCount, error: companiesError } = await db
      .from("companies")
      .select("*", { count: "exact", head: true });

    // Test 2: Fetch actual companies
    const { data: companiesData, error: companiesDataError } = await db
      .from("companies")
      .select("id, name, status")
      .limit(5);

    // Test 3: Count employees
    const { count: employeesCount, error: employeesError } = await db
      .from("employees")
      .select("*", { count: "exact", head: true });

    // Test 4: Fetch actual employees
    const { data: employeesData, error: employeesDataError } = await db
      .from("employees")
      .select("id, first_name, last_name, active")
      .limit(5);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {
        companies_count: {
          count: companiesCount,
          error: companiesError?.message || null
        },
        companies_sample: {
          data: companiesData,
          error: companiesDataError?.message || null
        },
        employees_count: {
          count: employeesCount,
          error: employeesError?.message || null
        },
        employees_sample: {
          data: employeesData,
          error: employeesDataError?.message || null
        }
      },
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
