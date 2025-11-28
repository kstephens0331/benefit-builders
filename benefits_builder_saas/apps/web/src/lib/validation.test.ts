/**
 * Tests for Validation Utilities
 * Tests Zod schemas and validation helpers
 */

import { z } from "zod";
import {
  stateValidator,
  payFrequencyValidator,
  filingStatusValidator,
  billingModelValidator,
  profitShareModeValidator,
  periodValidator,
  taxYearValidator,
  uuidValidator,
  moneyValidator,
  percentageValidator,
  profitSharePercentValidator,
  OptimizerPreviewSchema,
  BillingCloseSchema,
  CreateCompanySchema,
  CreateEmployeeSchema,
  CreateBenefitSchema,
  CompanyBillingSettingsSchema,
  BulkUploadRowSchema,
  CreateGoalSchema,
  validateRequest,
  validateRequestBody,
} from './validation';

describe('Validation Utilities', () => {
  describe('stateValidator', () => {
    it('should validate correct state codes', () => {
      expect(stateValidator.safeParse('CA').success).toBe(true);
      expect(stateValidator.safeParse('NY').success).toBe(true);
      expect(stateValidator.safeParse('TX').success).toBe(true);
    });

    it('should reject invalid state codes', () => {
      expect(stateValidator.safeParse('ZZ').success).toBe(false);
      expect(stateValidator.safeParse('California').success).toBe(false);
      expect(stateValidator.safeParse('').success).toBe(false);
    });
  });

  describe('payFrequencyValidator', () => {
    it('should validate correct pay frequencies', () => {
      expect(payFrequencyValidator.safeParse('weekly').success).toBe(true);
      expect(payFrequencyValidator.safeParse('biweekly').success).toBe(true);
      expect(payFrequencyValidator.safeParse('semimonthly').success).toBe(true);
      expect(payFrequencyValidator.safeParse('monthly').success).toBe(true);
    });

    it('should reject invalid pay frequencies', () => {
      expect(payFrequencyValidator.safeParse('daily').success).toBe(false);
      expect(payFrequencyValidator.safeParse('annual').success).toBe(false);
      expect(payFrequencyValidator.safeParse('').success).toBe(false);
    });
  });

  describe('filingStatusValidator', () => {
    it('should validate correct filing statuses', () => {
      expect(filingStatusValidator.safeParse('single').success).toBe(true);
      expect(filingStatusValidator.safeParse('married').success).toBe(true);
      expect(filingStatusValidator.safeParse('head').success).toBe(true);
    });

    it('should reject invalid filing statuses', () => {
      expect(filingStatusValidator.safeParse('married_separately').success).toBe(false);
      expect(filingStatusValidator.safeParse('joint').success).toBe(false);
      expect(filingStatusValidator.safeParse('').success).toBe(false);
    });
  });

  describe('billingModelValidator', () => {
    it('should validate correct billing models', () => {
      expect(billingModelValidator.safeParse('5/3').success).toBe(true);
      expect(billingModelValidator.safeParse('4/3').success).toBe(true);
      expect(billingModelValidator.safeParse('5/1').success).toBe(true);
      expect(billingModelValidator.safeParse('5/0').success).toBe(true);
      expect(billingModelValidator.safeParse('4/4').success).toBe(true);
    });

    it('should reject invalid billing models', () => {
      expect(billingModelValidator.safeParse('10/10').success).toBe(false);
      expect(billingModelValidator.safeParse('5/5').success).toBe(false);
      expect(billingModelValidator.safeParse('invalid').success).toBe(false);
      expect(billingModelValidator.safeParse('').success).toBe(false);
    });
  });

  describe('profitShareModeValidator', () => {
    it('should validate correct profit share modes', () => {
      expect(profitShareModeValidator.safeParse('none').success).toBe(true);
      expect(profitShareModeValidator.safeParse('percent_er_savings').success).toBe(true);
      expect(profitShareModeValidator.safeParse('percent_bb_profit').success).toBe(true);
    });

    it('should reject invalid profit share modes', () => {
      expect(profitShareModeValidator.safeParse('flat').success).toBe(false);
      expect(profitShareModeValidator.safeParse('other').success).toBe(false);
      expect(profitShareModeValidator.safeParse('').success).toBe(false);
    });
  });

  describe('periodValidator', () => {
    it('should validate correct period format', () => {
      expect(periodValidator.safeParse('2025-01').success).toBe(true);
      expect(periodValidator.safeParse('2025-12').success).toBe(true);
      expect(periodValidator.safeParse('2020-06').success).toBe(true);
      expect(periodValidator.safeParse('2100-01').success).toBe(true);
    });

    it('should reject invalid period format', () => {
      expect(periodValidator.safeParse('2025-1').success).toBe(false); // Missing leading zero
      expect(periodValidator.safeParse('25-01').success).toBe(false); // 2-digit year
      expect(periodValidator.safeParse('2025/01').success).toBe(false); // Wrong separator
      expect(periodValidator.safeParse('2025-13').success).toBe(false); // Invalid month
      expect(periodValidator.safeParse('2025-00').success).toBe(false); // Invalid month
      expect(periodValidator.safeParse('2019-01').success).toBe(false); // Year too early
      expect(periodValidator.safeParse('2101-01').success).toBe(false); // Year too late
    });
  });

  describe('taxYearValidator', () => {
    it('should validate correct tax years', () => {
      expect(taxYearValidator.safeParse(2020).success).toBe(true);
      expect(taxYearValidator.safeParse(2025).success).toBe(true);
      expect(taxYearValidator.safeParse(2100).success).toBe(true);
    });

    it('should reject invalid tax years', () => {
      expect(taxYearValidator.safeParse(2019).success).toBe(false);
      expect(taxYearValidator.safeParse(2101).success).toBe(false);
      expect(taxYearValidator.safeParse(2025.5).success).toBe(false); // Not an integer
      expect(taxYearValidator.safeParse('2025').success).toBe(false); // String
    });
  });

  describe('uuidValidator', () => {
    it('should validate correct UUIDs', () => {
      expect(uuidValidator.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(uuidValidator.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(uuidValidator.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidValidator.safeParse('123e4567-e89b-12d3').success).toBe(false);
      expect(uuidValidator.safeParse('').success).toBe(false);
    });
  });

  describe('moneyValidator', () => {
    it('should validate correct money amounts', () => {
      expect(moneyValidator.safeParse(0).success).toBe(true);
      expect(moneyValidator.safeParse(100).success).toBe(true);
      expect(moneyValidator.safeParse(50000.50).success).toBe(true);
      expect(moneyValidator.safeParse(1000000).success).toBe(true);
    });

    it('should reject invalid money amounts', () => {
      expect(moneyValidator.safeParse(-1).success).toBe(false);
      expect(moneyValidator.safeParse(1000001).success).toBe(false);
      expect(moneyValidator.safeParse('100').success).toBe(false); // String
    });
  });

  describe('percentageValidator', () => {
    it('should validate correct percentages', () => {
      expect(percentageValidator.safeParse(0).success).toBe(true);
      expect(percentageValidator.safeParse(50).success).toBe(true);
      expect(percentageValidator.safeParse(100).success).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(percentageValidator.safeParse(-1).success).toBe(false);
      expect(percentageValidator.safeParse(101).success).toBe(false);
      expect(percentageValidator.safeParse('50').success).toBe(false); // String
    });
  });

  describe('profitSharePercentValidator', () => {
    it('should validate correct profit share percentages', () => {
      expect(profitSharePercentValidator.safeParse(0).success).toBe(true);
      expect(profitSharePercentValidator.safeParse(25).success).toBe(true);
      expect(profitSharePercentValidator.safeParse(50).success).toBe(true);
    });

    it('should reject invalid profit share percentages', () => {
      expect(profitSharePercentValidator.safeParse(-1).success).toBe(false);
      expect(profitSharePercentValidator.safeParse(51).success).toBe(false);
      expect(profitSharePercentValidator.safeParse(100).success).toBe(false);
    });
  });

  describe('OptimizerPreviewSchema', () => {
    it('should validate correct optimizer preview data', () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        taxYear: 2025
      };
      expect(OptimizerPreviewSchema.safeParse(data).success).toBe(true);
    });

    it('should apply default tax year', () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = OptimizerPreviewSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxYear).toBe(2025);
      }
    });

    it('should reject invalid data', () => {
      expect(OptimizerPreviewSchema.safeParse({ employeeId: 'not-a-uuid' }).success).toBe(false);
      expect(OptimizerPreviewSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('BillingCloseSchema', () => {
    it('should validate correct billing close data', () => {
      const data = { period: '2025-01' };
      expect(BillingCloseSchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid period', () => {
      expect(BillingCloseSchema.safeParse({ period: '2025-13' }).success).toBe(false);
      expect(BillingCloseSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('CreateCompanySchema', () => {
    it('should validate correct company data', () => {
      const data = {
        name: 'Test Company',
        state: 'CA',
        model: '5/3',
        pay_frequency: 'monthly',
        contact_email: 'test@example.com',
        status: 'active'
      };
      expect(CreateCompanySchema.safeParse(data).success).toBe(true);
    });

    it('should apply default status', () => {
      const data = {
        name: 'Test Company',
        state: 'CA',
        model: '5/3',
        pay_frequency: 'monthly'
      };
      const result = CreateCompanySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });

    it('should validate optional email', () => {
      const data = {
        name: 'Test Company',
        state: 'CA',
        model: '5/3',
        pay_frequency: 'monthly'
      };
      expect(CreateCompanySchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid data', () => {
      expect(CreateCompanySchema.safeParse({ name: '' }).success).toBe(false);
      expect(CreateCompanySchema.safeParse({ name: 'Test', state: 'ZZ' }).success).toBe(false);
      expect(CreateCompanySchema.safeParse({ name: 'Test', state: 'CA', model: 'invalid' }).success).toBe(false);
    });
  });

  describe('CreateEmployeeSchema', () => {
    it('should validate correct employee data', () => {
      const data = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        filing_status: 'single',
        dependents: 2,
        dob: '1990-01-01',
        tobacco_use: false,
        gross_pay: 50000,
        consent_status: 'elect',
        active: true
      };
      expect(CreateEmployeeSchema.safeParse(data).success).toBe(true);
    });

    it('should apply defaults', () => {
      const data = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000
      };
      const result = CreateEmployeeSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filing_status).toBe('single');
        expect(result.data.dependents).toBe(0);
        expect(result.data.tobacco_use).toBe(false);
        expect(result.data.consent_status).toBe('pending');
        expect(result.data.active).toBe(true);
      }
    });

    it('should reject invalid data', () => {
      expect(CreateEmployeeSchema.safeParse({}).success).toBe(false);
      expect(CreateEmployeeSchema.safeParse({ first_name: 'John', gross_pay: -100 }).success).toBe(false);
      expect(CreateEmployeeSchema.safeParse({ first_name: 'John', gross_pay: 50000, company_id: 'not-uuid' }).success).toBe(false);
    });
  });

  describe('CreateBenefitSchema', () => {
    it('should validate correct benefit data', () => {
      const data = {
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        plan_code: 'HEALTH-001',
        reduces_fit: true,
        reduces_fica: true,
        per_pay_amount: 100,
        effective_date: '2025-01-01'
      };
      expect(CreateBenefitSchema.safeParse(data).success).toBe(true);
    });

    it('should reject zero amount', () => {
      const data = {
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        plan_code: 'HEALTH-001',
        per_pay_amount: 0
      };
      expect(CreateBenefitSchema.safeParse(data).success).toBe(false);
    });

    it('should apply defaults', () => {
      const data = {
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        plan_code: 'HEALTH-001',
        per_pay_amount: 100
      };
      const result = CreateBenefitSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reduces_fit).toBe(true);
        expect(result.data.reduces_fica).toBe(true);
      }
    });

    it('should reject invalid data', () => {
      expect(CreateBenefitSchema.safeParse({}).success).toBe(false);
      expect(CreateBenefitSchema.safeParse({ plan_code: 'TEST', per_pay_amount: -10 }).success).toBe(false);
    });
  });

  describe('CompanyBillingSettingsSchema', () => {
    it('should validate correct billing settings', () => {
      const data = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        plan_tier: 'standard',
        base_fee_cents: 10000,
        per_employee_active_cents: 500,
        per_report_cents: 100,
        profit_share_mode: 'none',
        profit_share_percent: 0,
        maintenance_cents: 5000,
        tax_rate_percent: 7.5,
        effective_from: '2025-01-01'
      };
      expect(CompanyBillingSettingsSchema.safeParse(data).success).toBe(true);
    });

    it('should apply defaults', () => {
      const data = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        base_fee_cents: 10000,
        per_employee_active_cents: 500,
        per_report_cents: 100,
        maintenance_cents: 5000
      };
      const result = CompanyBillingSettingsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.plan_tier).toBe('standard');
        expect(result.data.profit_share_mode).toBe('none');
        expect(result.data.profit_share_percent).toBe(0);
        expect(result.data.tax_rate_percent).toBe(0);
      }
    });

    it('should reject invalid data', () => {
      expect(CompanyBillingSettingsSchema.safeParse({}).success).toBe(false);
      expect(CompanyBillingSettingsSchema.safeParse({
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        base_fee_cents: 10000.5 // Not an integer
      }).success).toBe(false);
    });
  });

  describe('BulkUploadRowSchema', () => {
    it('should validate correct bulk upload row', () => {
      const data = {
        company_name: 'Test Company',
        company_state: 'CA',
        company_model: '5/3',
        company_pay_frequency: 'monthly',
        employee_first_name: 'John',
        employee_last_name: 'Doe',
        employee_gross_pay: 50000,
        employee_filing_status: 'single',
        employee_dependents: 2,
        benefit_plan_code: 'HEALTH-001',
        benefit_amount: 100
      };
      expect(BulkUploadRowSchema.safeParse(data).success).toBe(true);
    });

    it('should validate minimal data', () => {
      const data = {
        company_name: 'Test Company',
        employee_first_name: 'John',
        employee_last_name: 'Doe',
        employee_gross_pay: 50000
      };
      expect(BulkUploadRowSchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid data', () => {
      expect(BulkUploadRowSchema.safeParse({}).success).toBe(false);
      expect(BulkUploadRowSchema.safeParse({ company_name: '' }).success).toBe(false);
    });
  });

  describe('CreateGoalSchema', () => {
    it('should validate correct goal data', () => {
      const data = {
        goal_type: 'revenue',
        target_amount: 100000,
        target_date: '2025-12-31',
        description: 'Reach $100k ARR'
      };
      expect(CreateGoalSchema.safeParse(data).success).toBe(true);
    });

    it('should validate without description', () => {
      const data = {
        goal_type: 'companies',
        target_amount: 50,
        target_date: '2025-12-31'
      };
      expect(CreateGoalSchema.safeParse(data).success).toBe(true);
    });

    it('should reject invalid data', () => {
      expect(CreateGoalSchema.safeParse({}).success).toBe(false);
      expect(CreateGoalSchema.safeParse({ goal_type: 'invalid' }).success).toBe(false);
      expect(CreateGoalSchema.safeParse({ goal_type: 'revenue', target_amount: -100 }).success).toBe(false);
    });
  });

  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0)
    });

    it('should return success for valid data', () => {
      const result = validateRequest(testSchema, { name: 'John', age: 30 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('should return error for invalid data', () => {
      const result = validateRequest(testSchema, { name: '', age: 30 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation error');
        expect(result.issues).toHaveLength(1);
      }
    });

    it('should include field path in error message', () => {
      const result = validateRequest(testSchema, { name: 'John', age: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('age');
      }
    });

    it('should handle missing fields', () => {
      const result = validateRequest(testSchema, { name: 'John' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateRequestBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0)
    });

    it('should return valid for correct request body', async () => {
      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', age: 30 })
      });

      const result = await validateRequestBody(mockRequest, testSchema);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('should return error for invalid data', async () => {
      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: '', age: 30 })
      });

      const result = await validateRequestBody(mockRequest, testSchema);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Validation error');
        expect(result.issues).toHaveLength(1);
      }
    });

    it('should handle invalid JSON', async () => {
      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json'
      });

      const result = await validateRequestBody(mockRequest, testSchema);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Invalid JSON in request body');
        expect(result.issues).toEqual([]);
      }
    });

    it('should handle empty body', async () => {
      const mockRequest = new Request('http://localhost', {
        method: 'POST',
        body: ''
      });

      const result = await validateRequestBody(mockRequest, testSchema);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Invalid JSON in request body');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle date format validation', () => {
      expect(CreateEmployeeSchema.safeParse({
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000,
        dob: '1990-01-01'
      }).success).toBe(true);

      expect(CreateEmployeeSchema.safeParse({
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000,
        dob: '01/01/1990' // Invalid format
      }).success).toBe(false);
    });

    it('should handle dependents boundary', () => {
      expect(CreateEmployeeSchema.safeParse({
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000,
        dependents: 0
      }).success).toBe(true);

      expect(CreateEmployeeSchema.safeParse({
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000,
        dependents: 20
      }).success).toBe(true);

      expect(CreateEmployeeSchema.safeParse({
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000,
        dependents: 21
      }).success).toBe(false);
    });

    it('should handle money validator boundary', () => {
      expect(moneyValidator.safeParse(0).success).toBe(true);
      expect(moneyValidator.safeParse(1000000).success).toBe(true);
      expect(moneyValidator.safeParse(1000001).success).toBe(false);
    });

    it('should handle profit share percent cap', () => {
      expect(profitSharePercentValidator.safeParse(0).success).toBe(true);
      expect(profitSharePercentValidator.safeParse(50).success).toBe(true);
      expect(profitSharePercentValidator.safeParse(51).success).toBe(false);
    });
  });
});
