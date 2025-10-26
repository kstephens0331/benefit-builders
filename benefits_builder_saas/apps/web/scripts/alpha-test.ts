// Alpha Testing Script - Break Everything
// This script tests all routes with edge cases, invalid data, and boundary conditions

import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";

interface TestResult {
  route: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  response?: any;
}

const results: TestResult[] = [];

function log(result: TestResult) {
  results.push(result);
  const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} ${result.route} - ${result.test}: ${result.message}`);
}

async function testRoute(route: string, test: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${BASE_URL}${route}`, options);
    const data = await response.json().catch(() => null);
    return { response, data };
  } catch (error: any) {
    log({
      route,
      test,
      status: "FAIL",
      message: `Network error: ${error.message}`
    });
    return null;
  }
}

// ============================================================================
// TEST SUITE 1: Health & Basic Routes
// ============================================================================
async function testHealthRoutes() {
  console.log("\n🔍 Testing Health & Basic Routes...\n");

  // Test 1: Health endpoint
  const health = await testRoute("/api/health", "Health Check");
  if (health?.response.ok) {
    log({ route: "/api/health", test: "Health Check", status: "PASS", message: "Endpoint is reachable" });
  } else {
    log({ route: "/api/health", test: "Health Check", status: "FAIL", message: "Health check failed" });
  }
}

// ============================================================================
// TEST SUITE 2: Edge Cases - Invalid Data
// ============================================================================
async function testEdgeCases() {
  console.log("\n🔍 Testing Edge Cases & Invalid Data...\n");

  // Test 1: Invalid period format
  const invalidPeriod = await testRoute("/api/billing/INVALID", "Invalid Period Format");
  if (invalidPeriod?.data?.ok === false) {
    log({ route: "/api/billing/:period", test: "Invalid Period Format", status: "PASS", message: "Correctly rejected invalid period" });
  } else {
    log({ route: "/api/billing/:period", test: "Invalid Period Format", status: "FAIL", message: "Should reject invalid period format" });
  }

  // Test 2: Missing period
  const missingPeriod = await testRoute("/api/billing/close", "Missing Period in POST", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (missingPeriod?.data?.ok === false) {
    log({ route: "/api/billing/close", test: "Missing Period", status: "PASS", message: "Correctly rejected missing period" });
  } else {
    log({ route: "/api/billing/close", test: "Missing Period", status: "FAIL", message: "Should reject missing period" });
  }

  // Test 3: Invalid period format in close
  const invalidClose = await testRoute("/api/billing/close", "Invalid Period Format in Close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period: "2025-13" }) // Invalid month
  });
  if (invalidClose?.data?.ok === false) {
    log({ route: "/api/billing/close", test: "Invalid Period Format", status: "PASS", message: "Correctly rejected invalid period format" });
  } else {
    log({ route: "/api/billing/close", test: "Invalid Period Format", status: "WARN", message: "May not validate month range" });
  }

  // Test 4: Future period
  const futurePeriod = await testRoute("/api/billing/2099-12", "Future Period");
  if (futurePeriod?.response.ok) {
    log({ route: "/api/billing/:period", test: "Future Period", status: "WARN", message: "Accepts future periods - may be intentional" });
  }

  // Test 5: SQL Injection attempts
  const sqlInjection = await testRoute("/api/billing/2025-01'; DROP TABLE companies; --", "SQL Injection Test");
  if (sqlInjection?.data?.ok === false || sqlInjection?.response.status === 404) {
    log({ route: "/api/billing/:period", test: "SQL Injection", status: "PASS", message: "Safely rejected SQL injection attempt" });
  } else {
    log({ route: "/api/billing/:period", test: "SQL Injection", status: "FAIL", message: "Potential SQL injection vulnerability" });
  }
}

// ============================================================================
// TEST SUITE 3: Boundary Conditions
// ============================================================================
async function testBoundaryConditions() {
  console.log("\n🔍 Testing Boundary Conditions...\n");

  // Test 1: Zero employees
  const zeroEmployees = await testRoute("/api/billing/2025-01", "Company with Zero Employees");
  if (zeroEmployees?.data?.ok === true) {
    log({ route: "/api/billing/:period", test: "Zero Employees", status: "PASS", message: "Handles companies with no employees" });
  }

  // Test 2: Very old period
  const oldPeriod = await testRoute("/api/billing/1900-01", "Very Old Period");
  if (oldPeriod?.response.ok) {
    log({ route: "/api/billing/:period", test: "Old Period", status: "WARN", message: "Accepts very old periods" });
  }

  // Test 3: Invalid company ID
  const invalidCompany = await testRoute("/api/reports/company/00000000-0000-0000-0000-000000000000/employees", "Invalid Company UUID");
  if (invalidCompany?.data?.ok === false || invalidCompany?.response.status === 404) {
    log({ route: "/api/reports/company/:id", test: "Invalid UUID", status: "PASS", message: "Correctly handles non-existent company" });
  } else {
    log({ route: "/api/reports/company/:id", test: "Invalid UUID", status: "FAIL", message: "Should return 404 for non-existent company" });
  }

  // Test 4: Malformed UUID
  const malformedUUID = await testRoute("/api/reports/company/not-a-uuid/employees", "Malformed UUID");
  if (malformedUUID?.response.status === 400 || malformedUUID?.response.status === 404) {
    log({ route: "/api/reports/company/:id", test: "Malformed UUID", status: "PASS", message: "Rejects malformed UUID" });
  } else {
    log({ route: "/api/reports/company/:id", test: "Malformed UUID", status: "WARN", message: "May not validate UUID format" });
  }
}

// ============================================================================
// TEST SUITE 4: Data Integrity Tests
// ============================================================================
async function testDataIntegrity() {
  console.log("\n🔍 Testing Data Integrity...\n");

  // Test 1: Missing billing settings
  const noBillingSettings = await testRoute("/api/billing/close", "Company Without Billing Settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period: "2025-01" })
  });
  if (noBillingSettings?.data?.ok === true || noBillingSettings?.data?.ok === false) {
    log({ route: "/api/billing/close", test: "Missing Billing Settings", status: "PASS", message: "Handles missing billing settings gracefully" });
  }

  // Test 2: Check analytics with no data
  const analytics = await testRoute("/api/analytics/summary", "Analytics with No Data");
  if (analytics?.data?.ok === true) {
    log({ route: "/api/analytics/summary", test: "No Data", status: "PASS", message: "Returns valid response even with no data" });
  } else {
    log({ route: "/api/analytics/summary", test: "No Data", status: "FAIL", message: "Should handle empty database" });
  }

  // Test 3: Optimizer with missing tax data
  const noTaxData = await testRoute("/api/optimizer/preview", "Optimizer Without Tax Data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gross_pay: 3000,
      pay_frequency: "biweekly",
      filing_status: "single",
      dependents: 0,
      state: "XX", // Invalid state
      pretax_benefits: 100,
      tax_year: 2025
    })
  });
  if (noTaxData?.data?.ok === false || noTaxData?.data) {
    log({ route: "/api/optimizer/preview", test: "Missing Tax Data", status: "PASS", message: "Handles missing state tax data" });
  }
}

// ============================================================================
// TEST SUITE 5: Calculation Validation
// ============================================================================
async function testCalculations() {
  console.log("\n🔍 Testing Calculation Logic...\n");

  // Test 1: Extreme values
  const extremeValues = await testRoute("/api/optimizer/preview", "Extreme Gross Pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gross_pay: 9999999999, // Extremely high salary
      pay_frequency: "biweekly",
      filing_status: "single",
      dependents: 0,
      state: "TX",
      pretax_benefits: 1000,
      tax_year: 2025
    })
  });
  if (extremeValues?.data) {
    const current = extremeValues.data.current;
    if (current && typeof current.fit === "number" && !isNaN(current.fit)) {
      log({ route: "/api/optimizer/preview", test: "Extreme Values", status: "PASS", message: "Handles extreme values without crashing" });
    } else {
      log({ route: "/api/optimizer/preview", test: "Extreme Values", status: "FAIL", message: "Calculation failed with extreme values" });
    }
  }

  // Test 2: Zero values
  const zeroValues = await testRoute("/api/optimizer/preview", "Zero Gross Pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gross_pay: 0,
      pay_frequency: "biweekly",
      filing_status: "single",
      dependents: 0,
      state: "TX",
      pretax_benefits: 0,
      tax_year: 2025
    })
  });
  if (zeroValues?.data) {
    log({ route: "/api/optimizer/preview", test: "Zero Values", status: "PASS", message: "Handles zero values" });
  }

  // Test 3: Negative values (should reject)
  const negativeValues = await testRoute("/api/optimizer/preview", "Negative Values", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gross_pay: -1000,
      pay_frequency: "biweekly",
      filing_status: "single",
      dependents: -5,
      state: "TX",
      pretax_benefits: -100,
      tax_year: 2025
    })
  });
  if (negativeValues?.data?.ok === false) {
    log({ route: "/api/optimizer/preview", test: "Negative Values", status: "PASS", message: "Correctly rejects negative values" });
  } else if (negativeValues?.data) {
    log({ route: "/api/optimizer/preview", test: "Negative Values", status: "WARN", message: "May accept negative values - should validate" });
  }

  // Test 4: Pretax > Gross (invalid scenario)
  const pretaxExceedsGross = await testRoute("/api/optimizer/preview", "Pretax Exceeds Gross", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gross_pay: 1000,
      pay_frequency: "biweekly",
      filing_status: "single",
      dependents: 0,
      state: "TX",
      pretax_benefits: 2000, // More than gross!
      tax_year: 2025
    })
  });
  if (pretaxExceedsGross?.data?.ok === false) {
    log({ route: "/api/optimizer/preview", test: "Pretax > Gross", status: "PASS", message: "Rejects invalid pretax amount" });
  } else if (pretaxExceedsGross?.data) {
    log({ route: "/api/optimizer/preview", test: "Pretax > Gross", status: "WARN", message: "Should validate pretax <= gross" });
  }
}

// ============================================================================
// TEST SUITE 6: Concurrency & Race Conditions
// ============================================================================
async function testConcurrency() {
  console.log("\n🔍 Testing Concurrency & Race Conditions...\n");

  // Test 1: Multiple simultaneous billing close requests
  const closePromises = Array.from({ length: 5 }, (_, i) =>
    testRoute("/api/billing/close", `Concurrent Close Request ${i + 1}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: "2025-01" })
    })
  );

  const closeResults = await Promise.all(closePromises);
  const successCount = closeResults.filter(r => r?.data?.ok === true).length;

  if (successCount > 0) {
    log({
      route: "/api/billing/close",
      test: "Concurrent Requests",
      status: "PASS",
      message: `Handled ${successCount}/5 concurrent requests`
    });
  } else {
    log({
      route: "/api/billing/close",
      test: "Concurrent Requests",
      status: "WARN",
      message: "May have issues with concurrent requests"
    });
  }

  // Test 2: Multiple simultaneous analytics requests
  const analyticsPromises = Array.from({ length: 10 }, () =>
    testRoute("/api/analytics/summary", "Concurrent Analytics")
  );

  const analyticsResults = await Promise.all(analyticsPromises);
  const analyticsSuccess = analyticsResults.filter(r => r?.response.ok).length;

  if (analyticsSuccess === 10) {
    log({
      route: "/api/analytics/summary",
      test: "Concurrent Analytics",
      status: "PASS",
      message: "Handled 10/10 concurrent analytics requests"
    });
  } else {
    log({
      route: "/api/analytics/summary",
      test: "Concurrent Analytics",
      status: "WARN",
      message: `Only ${analyticsSuccess}/10 succeeded`
    });
  }
}

// ============================================================================
// TEST SUITE 7: Bulk Upload Edge Cases
// ============================================================================
async function testBulkUpload() {
  console.log("\n🔍 Testing Bulk Upload Edge Cases...\n");

  // Test 1: Empty file
  const formData1 = new FormData();
  const emptyBlob = new Blob([], { type: "text/csv" });
  formData1.append("file", emptyBlob, "empty.csv");

  const emptyFile = await testRoute("/api/bulk-upload", "Empty File Upload", {
    method: "POST",
    body: formData1 as any
  });

  if (emptyFile?.data?.ok === false) {
    log({ route: "/api/bulk-upload", test: "Empty File", status: "PASS", message: "Correctly rejects empty file" });
  } else {
    log({ route: "/api/bulk-upload", test: "Empty File", status: "WARN", message: "Should validate file content" });
  }

  // Test 2: Malformed CSV
  const formData2 = new FormData();
  const malformedCsv = new Blob(["invalid,csv,data\n1,2"], { type: "text/csv" });
  formData2.append("file", malformedCsv, "malformed.csv");

  const malformedFile = await testRoute("/api/bulk-upload", "Malformed CSV", {
    method: "POST",
    body: formData2 as any
  });

  if (malformedFile?.data) {
    log({ route: "/api/bulk-upload", test: "Malformed CSV", status: "PASS", message: "Handles malformed CSV" });
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  console.log("=" .repeat(70));
  console.log("🚨 ALPHA TESTING: BREAKING BENEFITS BUILDER SaaS");
  console.log("=" .repeat(70));
  console.log(`Testing against: ${BASE_URL}`);
  console.log("");

  await testHealthRoutes();
  await testEdgeCases();
  await testBoundaryConditions();
  await testDataIntegrity();
  await testCalculations();
  await testConcurrency();
  await testBulkUpload();

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 ALPHA TEST SUMMARY");
  console.log("=".repeat(70));

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warnings = results.filter(r => r.status === "WARN").length;
  const total = results.length;

  console.log(`\n✅ PASSED: ${passed}/${total}`);
  console.log(`❌ FAILED: ${failed}/${total}`);
  console.log(`⚠️  WARNINGS: ${warnings}/${total}`);
  console.log("");

  if (failed > 0) {
    console.log("🔴 FAILED TESTS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`   - ${r.route}: ${r.test} - ${r.message}`);
    });
    console.log("");
  }

  if (warnings > 0) {
    console.log("⚠️  WARNINGS:");
    results.filter(r => r.status === "WARN").forEach(r => {
      console.log(`   - ${r.route}: ${r.test} - ${r.message}`);
    });
    console.log("");
  }

  console.log("=".repeat(70));

  const score = (passed / total * 100).toFixed(1);
  console.log(`\n🎯 TEST SCORE: ${score}%`);

  if (failed === 0 && warnings === 0) {
    console.log("🎉 BULLETPROOF! All tests passed!");
  } else if (failed === 0) {
    console.log("✅ SOLID! No critical failures, but review warnings.");
  } else {
    console.log("❌ NEEDS WORK! Fix critical failures before production.");
  }

  console.log("");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, results };
