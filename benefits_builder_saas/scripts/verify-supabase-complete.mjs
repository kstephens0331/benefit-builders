#!/usr/bin/env node
/**
 * Complete Supabase Database Verification
 *
 * Verifies all tables, data, and system readiness
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read environment variables
const envPath = join(__dirname, '..', 'apps', 'web', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.+)`));
  if (!match) throw new Error(`Missing ${name}`);
  return match[1].trim();
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Complete Supabase Database Verification\n');
console.log('='.repeat(70) + '\n');

let allPassed = true;

// Test function
async function verify(name, testFn) {
  try {
    const result = await testFn();
    if (result.pass) {
      console.log(`✅ ${name}`);
      if (result.details) console.log(`   ${result.details}`);
    } else {
      console.log(`❌ ${name}`);
      console.log(`   ${result.message}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    allPassed = false;
  }
}

console.log('📊 CORE TABLES\n');

await verify('Companies table exists', async () => {
  const { data, error } = await supabase.from('companies').select('id').limit(1);
  return { pass: !error, message: error?.message };
});

await verify('Employees table exists', async () => {
  const { data, error } = await supabase.from('employees').select('id').limit(1);
  return { pass: !error, message: error?.message };
});

await verify('Plan models table exists', async () => {
  const { data, error } = await supabase.from('plan_models').select('id').limit(1);
  return { pass: !error, message: error?.message };
});

console.log('\n📋 SEED DATA\n');

await verify('Plan models populated (4 models)', async () => {
  const { data, error, count } = await supabase
    .from('plan_models')
    .select('*', { count: 'exact' });

  if (error) return { pass: false, message: error.message };
  if (count === 0) return { pass: false, message: 'No plan models found - run 001_plan_models.sql' };
  if (count < 4) return { pass: false, message: `Only ${count}/4 models found` };

  const models = data.map(m => m.name).join(', ');
  return { pass: true, details: `Found: ${models}` };
});

await verify('Federal tax params (2025)', async () => {
  const { data, error } = await supabase
    .from('tax_federal_params')
    .select('*')
    .eq('tax_year', 2025)
    .single();

  if (error) return { pass: false, message: 'No 2025 federal tax data - run 002_federal_tax_2025.sql' };

  const ssRate = (data.ss_rate * 100).toFixed(2);
  const medRate = (data.med_rate * 100).toFixed(2);
  return {
    pass: true,
    details: `SS: ${ssRate}%, Med: ${medRate}%, Wage Base: $${data.ss_wage_base.toLocaleString()}`
  };
});

await verify('Federal withholding tables (2025)', async () => {
  const { data, error, count } = await supabase
    .from('withholding_federal_15t')
    .select('*', { count: 'exact' })
    .eq('tax_year', 2025);

  if (error) return { pass: false, message: error.message };
  if (count === 0) return { pass: false, message: 'No federal withholding data - run 003_withholding_federal_15t_2025.sql' };

  return { pass: true, details: `${count} withholding tables (3 filing statuses × 5 frequencies)` };
});

await verify('State tax params (51 jurisdictions)', async () => {
  const { data, error, count } = await supabase
    .from('tax_state_params')
    .select('state, method', { count: 'exact' })
    .eq('tax_year', 2025);

  if (error) return { pass: false, message: error.message };
  if (count === 0) return { pass: false, message: 'No state tax data - run 006 & 007 SQL files' };
  if (count < 51) return { pass: false, message: `Only ${count}/51 jurisdictions found` };

  const none = data.filter(s => s.method === 'none').length;
  const flat = data.filter(s => s.method === 'flat').length;
  const brackets = data.filter(s => s.method === 'brackets').length;

  return {
    pass: true,
    details: `None: ${none}, Flat: ${flat}, Progressive: ${brackets}`
  };
});

console.log('\n🔐 AUTHENTICATION\n');

await verify('Internal users table exists', async () => {
  const { data, error } = await supabase.from('internal_users').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 003_add_auth_users.sql' };
  return { pass: true };
});

await verify('User accounts seeded', async () => {
  const { data, error, count } = await supabase
    .from('internal_users')
    .select('email, role', { count: 'exact' });

  if (error) return { pass: false, message: error.message };
  if (count === 0) return { pass: false, message: 'No users - run 003_internal_users.sql' };

  const admin = data.find(u => u.role === 'admin');
  if (!admin) return { pass: false, message: 'No admin user found' };

  return { pass: true, details: `${count} users, admin: ${admin.email}` };
});

await verify('Auth sessions table exists', async () => {
  const { data, error } = await supabase.from('auth_sessions').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 003_add_auth_users.sql' };
  return { pass: true };
});

console.log('\n📈 REPORTING\n');

await verify('Report templates table exists', async () => {
  const { data, error } = await supabase.from('report_templates').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 004_advanced_reporting.sql' };
  return { pass: true };
});

await verify('Report templates seeded (5 templates)', async () => {
  const { data, error, count } = await supabase
    .from('report_templates')
    .select('name', { count: 'exact' });

  if (error) return { pass: false, message: error.message };
  if (count === 0) return { pass: false, message: 'No templates - run 004_report_templates.sql' };
  if (count < 5) return { pass: false, message: `Only ${count}/5 templates found` };

  return { pass: true, details: data.map(t => t.name).join(', ') };
});

await verify('Scheduled reports table exists', async () => {
  const { data, error } = await supabase.from('scheduled_reports').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 004_advanced_reporting.sql' };
  return { pass: true };
});

await verify('Report history table exists', async () => {
  const { data, error } = await supabase.from('report_history').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 004_advanced_reporting.sql' };
  return { pass: true };
});

console.log('\n💰 BILLING\n');

await verify('Billing settings table exists', async () => {
  const { data, error } = await supabase.from('company_billing_settings').select('company_id').limit(1);
  return { pass: !error, message: error?.message };
});

await verify('Invoices table exists', async () => {
  const { data, error } = await supabase.from('invoices').select('id').limit(1);
  return { pass: !error, message: error?.message };
});

await verify('Invoice lines table exists', async () => {
  const { data, error } = await supabase.from('invoice_lines').select('id').limit(1);
  return { pass: !error, message: error?.message };
});

console.log('\n🔌 INTEGRATIONS\n');

await verify('QuickBooks integration table exists', async () => {
  const { data, error } = await supabase.from('quickbooks_integration').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 005_quickbooks_integration.sql' };
  return { pass: true };
});

await verify('QuickBooks sync mappings table exists', async () => {
  const { data, error } = await supabase.from('quickbooks_sync_mappings').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 005_quickbooks_integration.sql' };
  return { pass: true };
});

await verify('QuickBooks sync log table exists', async () => {
  const { data, error } = await supabase.from('quickbooks_sync_log').select('id').limit(1);
  if (error) return { pass: false, message: 'Table missing - run migration 005_quickbooks_integration.sql' };
  return { pass: true };
});

console.log('\n📝 AUDIT\n');

await verify('Audit logs table exists', async () => {
  const { data, error } = await supabase.from('audit_logs').select('id').limit(1);
  return { pass: !error, message: error?.message };
});

console.log('\n' + '='.repeat(70));

if (allPassed) {
  console.log('\n🎉 ALL CHECKS PASSED! Database is ready for production.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME CHECKS FAILED. See missing items above.\n');
  console.log('📋 To fix:');
  console.log('1. Run missing migrations from supabase/migrations/');
  console.log('2. Run missing seed files from supabase/seed/');
  console.log('3. Re-run this verification script\n');
  process.exit(1);
}
