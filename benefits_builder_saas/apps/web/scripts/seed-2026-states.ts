#!/usr/bin/env tsx

/**
 * Seed 2026 State Tax Data
 * Seeds all 50 states + DC for 2026 tax year
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment
const envPath = join(rootDir, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key.trim(), valueParts.join('=').trim()];
    })
);

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 2026 State Tax Data (based on 2025 with inflation adjustments)
const states2026 = [
  // No income tax states
  { state: 'AK', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'FL', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'NV', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'NH', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'SD', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'TN', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'TX', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'WA', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'WY', method: 'none', flat_rate: null, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },

  // Flat tax states
  { state: 'AZ', method: 'flat', flat_rate: 0.025, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'CO', method: 'flat', flat_rate: 0.044, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'IL', method: 'flat', flat_rate: 0.0495, standard_deduction: 0, personal_exemption: 2700, dependent_exemption: 2700, brackets: null },
  { state: 'IN', method: 'flat', flat_rate: 0.0305, standard_deduction: 0, personal_exemption: 1030, dependent_exemption: 1030, brackets: null },
  { state: 'KY', method: 'flat', flat_rate: 0.04, standard_deduction: 3250, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'MA', method: 'flat', flat_rate: 0.05, standard_deduction: 0, personal_exemption: 4520, dependent_exemption: 1030, brackets: null },
  { state: 'MI', method: 'flat', flat_rate: 0.0405, standard_deduction: 0, personal_exemption: 5750, dependent_exemption: 5750, brackets: null },
  { state: 'NC', method: 'flat', flat_rate: 0.0475, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'PA', method: 'flat', flat_rate: 0.0307, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'UT', method: 'flat', flat_rate: 0.0465, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'GA', method: 'flat', flat_rate: 0.0539, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'ID', method: 'flat', flat_rate: 0.058, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'IA', method: 'flat', flat_rate: 0.038, standard_deduction: 0, personal_exemption: 41, dependent_exemption: 41, brackets: null },
  { state: 'MS', method: 'flat', flat_rate: 0.047, standard_deduction: 2360, personal_exemption: 6160, dependent_exemption: 1540, brackets: null },
  { state: 'MO', method: 'flat', flat_rate: 0.047, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'ND', method: 'flat', flat_rate: 0.019, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },
  { state: 'OH', method: 'flat', flat_rate: 0.035, standard_deduction: 0, personal_exemption: 0, dependent_exemption: 0, brackets: null },

  // Bracket states
  { state: 'AL', method: 'brackets', flat_rate: null, standard_deduction: 3080, personal_exemption: 1540, dependent_exemption: 515, brackets: [{"over":0,"rate":0.02},{"over":515,"rate":0.04},{"over":3080,"rate":0.05}] },
  { state: 'AR', method: 'brackets', flat_rate: null, standard_deduction: 2400, personal_exemption: 30, dependent_exemption: 30, brackets: [{"over":0,"rate":0.02},{"over":5240,"rate":0.04},{"over":10580,"rate":0.044}] },
  { state: 'CA', method: 'brackets', flat_rate: null, standard_deduction: 5690, personal_exemption: 148, dependent_exemption: 458, brackets: [{"over":0,"rate":0.01},{"over":10700,"rate":0.02},{"over":25350,"rate":0.04},{"over":40020,"rate":0.06},{"over":55540,"rate":0.08},{"over":70200,"rate":0.093},{"over":358570,"rate":0.103},{"over":430270,"rate":0.113},{"over":717120,"rate":0.123}] },
  { state: 'CT', method: 'brackets', flat_rate: null, standard_deduction: 0, personal_exemption: 15400, dependent_exemption: 0, brackets: [{"over":0,"rate":0.02},{"over":10270,"rate":0.045},{"over":51350,"rate":0.055},{"over":102700,"rate":0.06},{"over":205400,"rate":0.065},{"over":256750,"rate":0.069},{"over":513500,"rate":0.0699}] },
  { state: 'DE', method: 'brackets', flat_rate: null, standard_deduction: 3340, personal_exemption: 113, dependent_exemption: 113, brackets: [{"over":2055,"rate":0.022},{"over":5135,"rate":0.039},{"over":10270,"rate":0.048},{"over":20540,"rate":0.052},{"over":25675,"rate":0.0555},{"over":61620,"rate":0.066}] },
  { state: 'HI', method: 'brackets', flat_rate: null, standard_deduction: 4520, personal_exemption: 1175, dependent_exemption: 1175, brackets: [{"over":0,"rate":0.014},{"over":2465,"rate":0.032},{"over":4930,"rate":0.055},{"over":9860,"rate":0.064},{"over":14790,"rate":0.068},{"over":19720,"rate":0.072},{"over":24650,"rate":0.076},{"over":36975,"rate":0.079},{"over":49300,"rate":0.0825},{"over":154050,"rate":0.09},{"over":179725,"rate":0.10},{"over":205400,"rate":0.11}] },
  { state: 'KS', method: 'brackets', flat_rate: null, standard_deduction: 3595, personal_exemption: 2310, dependent_exemption: 2310, brackets: [{"over":0,"rate":0.031},{"over":15400,"rate":0.0525},{"over":30810,"rate":0.057}] },
  { state: 'LA', method: 'brackets', flat_rate: null, standard_deduction: 0, personal_exemption: 4620, dependent_exemption: 1030, brackets: [{"over":0,"rate":0.0185},{"over":12840,"rate":0.035},{"over":51350,"rate":0.0425}] },
  { state: 'ME', method: 'brackets', flat_rate: null, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: [{"over":0,"rate":0.058},{"over":26750,"rate":0.0675},{"over":63265,"rate":0.0715}] },
  { state: 'MD', method: 'brackets', flat_rate: null, standard_deduction: 2620, personal_exemption: 3290, dependent_exemption: 3290, brackets: [{"over":0,"rate":0.02},{"over":1030,"rate":0.03},{"over":2055,"rate":0.04},{"over":3080,"rate":0.0475},{"over":102700,"rate":0.05},{"over":128375,"rate":0.0525},{"over":154050,"rate":0.055},{"over":256750,"rate":0.0575}] },
  { state: 'MN', method: 'brackets', flat_rate: null, standard_deduction: 14970, personal_exemption: 0, dependent_exemption: 0, brackets: [{"over":0,"rate":0.0535},{"over":32545,"rate":0.068},{"over":106900,"rate":0.0785},{"over":188290,"rate":0.0985}] },
  { state: 'MT', method: 'brackets', flat_rate: null, standard_deduction: 5885, personal_exemption: 3290, dependent_exemption: 3290, brackets: [{"over":0,"rate":0.01},{"over":3700,"rate":0.02},{"over":6680,"rate":0.03},{"over":10375,"rate":0.04},{"over":14070,"rate":0.05},{"over":18075,"rate":0.06},{"over":23315,"rate":0.065}] },
  { state: 'NE', method: 'brackets', flat_rate: null, standard_deduction: 0, personal_exemption: 161, dependent_exemption: 161, brackets: [{"over":0,"rate":0.0246},{"over":3800,"rate":0.0351},{"over":22770,"rate":0.0501},{"over":36700,"rate":0.0584}] },
  { state: 'NJ', method: 'brackets', flat_rate: null, standard_deduction: 0, personal_exemption: 1030, dependent_exemption: 1540, brackets: [{"over":0,"rate":0.014},{"over":20540,"rate":0.0175},{"over":35945,"rate":0.035},{"over":41080,"rate":0.05525},{"over":77025,"rate":0.0637},{"over":513500,"rate":0.0897},{"over":1027000,"rate":0.1075}] },
  { state: 'NM', method: 'brackets', flat_rate: null, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: [{"over":0,"rate":0.017},{"over":5650,"rate":0.032},{"over":11300,"rate":0.047},{"over":16430,"rate":0.049},{"over":215700,"rate":0.059}] },
  { state: 'NY', method: 'brackets', flat_rate: null, standard_deduction: 8730, personal_exemption: 0, dependent_exemption: 0, brackets: [{"over":0,"rate":0.04},{"over":8730,"rate":0.045},{"over":12015,"rate":0.0525},{"over":14275,"rate":0.055},{"over":82830,"rate":0.06},{"over":221215,"rate":0.0685},{"over":1106665,"rate":0.0965},{"over":5135000,"rate":0.103},{"over":25675000,"rate":0.109}] },
  { state: 'OK', method: 'brackets', flat_rate: null, standard_deduction: 6520, personal_exemption: 1030, dependent_exemption: 1030, brackets: [{"over":0,"rate":0.0025},{"over":1030,"rate":0.0075},{"over":2570,"rate":0.0175},{"over":3850,"rate":0.0275},{"over":5035,"rate":0.0375},{"over":7395,"rate":0.0475}] },
  { state: 'OR', method: 'brackets', flat_rate: null, standard_deduction: 2820, personal_exemption: 242, dependent_exemption: 242, brackets: [{"over":0,"rate":0.0475},{"over":4415,"rate":0.0675},{"over":11040,"rate":0.0875},{"over":128375,"rate":0.099}] },
  { state: 'RI', method: 'brackets', flat_rate: null, standard_deduction: 10835, personal_exemption: 4980, dependent_exemption: 0, brackets: [{"over":0,"rate":0.0375},{"over":79540,"rate":0.0475},{"over":180820,"rate":0.0599}] },
  { state: 'SC', method: 'brackets', flat_rate: null, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: [{"over":0,"rate":0.0},{"over":3555,"rate":0.03},{"over":17800,"rate":0.064}] },
  { state: 'VT', method: 'brackets', flat_rate: null, standard_deduction: 7395, personal_exemption: 4980, dependent_exemption: 4980, brackets: [{"over":0,"rate":0.0335},{"over":46625,"rate":0.066},{"over":113025,"rate":0.076},{"over":235755,"rate":0.0875}] },
  { state: 'VA', method: 'brackets', flat_rate: null, standard_deduction: 4620, personal_exemption: 955, dependent_exemption: 955, brackets: [{"over":0,"rate":0.02},{"over":3080,"rate":0.03},{"over":5135,"rate":0.05},{"over":17460,"rate":0.0575}] },
  { state: 'WV', method: 'brackets', flat_rate: null, standard_deduction: 0, personal_exemption: 2055, dependent_exemption: 2055, brackets: [{"over":0,"rate":0.0236},{"over":10270,"rate":0.0315},{"over":25675,"rate":0.0354},{"over":41080,"rate":0.0472},{"over":61620,"rate":0.0512}] },
  { state: 'WI', method: 'brackets', flat_rate: null, standard_deduction: 13590, personal_exemption: 720, dependent_exemption: 720, brackets: [{"over":0,"rate":0.0354},{"over":14705,"rate":0.0465},{"over":29410,"rate":0.0530},{"over":323820,"rate":0.0765}] },
  { state: 'DC', method: 'brackets', flat_rate: null, standard_deduction: 16100, personal_exemption: 0, dependent_exemption: 0, brackets: [{"over":0,"rate":0.04},{"over":10270,"rate":0.06},{"over":41080,"rate":0.065},{"over":61620,"rate":0.085},{"over":256750,"rate":0.0925},{"over":513500,"rate":0.0975},{"over":1027000,"rate":0.1075}] },
];

async function main() {
  console.log('🚀 Seeding 2026 State Tax Data\n');
  console.log('='.repeat(60) + '\n');

  let success = 0;
  let failed = 0;

  for (const stateData of states2026) {
    const { error } = await supabase
      .from('tax_state_params')
      .upsert({
        state: stateData.state,
        tax_year: 2026,
        method: stateData.method,
        flat_rate: stateData.flat_rate,
        standard_deduction: stateData.standard_deduction,
        personal_exemption: stateData.personal_exemption,
        dependent_exemption: stateData.dependent_exemption,
        brackets: stateData.brackets,
        effective_from: '2026-01-01'
      }, { onConflict: 'state,tax_year' });

    if (error) {
      console.log(`❌ ${stateData.state}: ${error.message}`);
      failed++;
    } else {
      success++;
    }
  }

  console.log(`\n✅ Successfully seeded: ${success} states`);
  if (failed > 0) {
    console.log(`⚠️  Failed: ${failed} states`);
  }

  // Verify count
  const { count } = await supabase
    .from('tax_state_params')
    .select('*', { count: 'exact', head: true })
    .eq('tax_year', 2026);

  console.log(`\n📊 Total 2026 state tax configs in database: ${count}`);
  console.log('\n✨ 2026 state tax seeding complete!');
}

main().catch(err => {
  console.error('💥 Failed:', err);
  process.exit(1);
});
