/**
 * Tests for Validation Utilities
 * Schema validation using Zod
 */

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
    it('should validate valid US state codes', () => {
      expect(stateValidator.safeParse('CA').success).toBe(true);
      expect(stateValidator.safeParse('NY').success).toBe(true);
      expect(stateValidator.safeParse('TX').success).toBe(true);
    });

    it('should reject invalid state codes', () => {
      expect(stateValidator.safeParse('XX').success).toBe(false);
      expect(stateValidator.safeParse('california').success).toBe(false);
      expect(stateValidator.safeParse('').success).toBe(false);
    });
  });

  describe('payFrequencyValidator', () => {
    it('should validate valid pay frequencies', () => {
      expect(payFrequencyValidator.safeParse('weekly').success).toBe(true);
      expect(payFrequencyValidator.safeParse('biweekly').success).toBe(true);
      expect(payFrequencyValidator.safeParse('semimonthly').success).toBe(true);
      expect(payFrequencyValidator.safeParse('monthly').success).toBe(true);
    });

    it('should reject invalid pay frequencies', () => {
      expect(payFrequencyValidator.safeParse('daily').success).toBe(false);
      expect(payFrequencyValidator.safeParse('yearly').success).toBe(false);
    });
  });

  describe('filingStatusValidator', () => {
    it('should validate valid filing statuses', () => {
      expect(filingStatusValidator.safeParse('single').success).toBe(true);
      expect(filingStatusValidator.safeParse('married').success).toBe(true);
      expect(filingStatusValidator.safeParse('head').success).toBe(true);
    });

    it('should reject invalid filing statuses', () => {
      expect(filingStatusValidator.safeParse('divorced').success).toBe(false);
      expect(filingStatusValidator.safeParse('').success).toBe(false);
    });
  });

  describe('billingModelValidator', () => {
    it('should validate valid billing models', () => {
      expect(billingModelValidator.safeParse('5/3').success).toBe(true);
      expect(billingModelValidator.safeParse('3/4').success).toBe(true);
      expect(billingModelValidator.safeParse('5/1').success).toBe(true);
      expect(billingModelValidator.safeParse('5/0').success).toBe(true);
      expect(billingModelValidator.safeParse('4/4').success).toBe(true);
    });

    it('should reject invalid billing models', () => {
      expect(billingModelValidator.safeParse('6/3').success).toBe(false);
      expect(billingModelValidator.safeParse('5/5').success).toBe(false);
      expect(billingModelValidator.safeParse('3-3').success).toBe(false);
      expect(billingModelValidator.safeParse('invalid').success).toBe(false);
    });
  });

  describe('profitShareModeValidator', () => {
    it('should validate valid profit share modes', () => {
      expect(profitShareModeValidator.safeParse('none').success).toBe(true);
      expect(profitShareModeValidator.safeParse('percent_er_savings').success).toBe(true);
      expect(profitShareModeValidator.safeParse('percent_bb_profit').success).toBe(true);
    });

    it('should reject invalid profit share modes', () => {
      expect(profitShareModeValidator.safeParse('flat_fee').success).toBe(false);
      expect(profitShareModeValidator.safeParse('').success).toBe(false);
    });
  });

  describe('periodValidator', () => {
    it('should validate valid period formats', () => {
      expect(periodValidator.safeParse('2024-01').success).toBe(true);
      expect(periodValidator.safeParse('2024-12').success).toBe(true);
      expect(periodValidator.safeParse('2025-06').success).toBe(true);
    });

    it('should reject invalid period formats', () => {
      expect(periodValidator.safeParse('2024-13').success).toBe(false); // Invalid month
      expect(periodValidator.safeParse('2024-00').success).toBe(false); // Invalid month
      expect(periodValidator.safeParse('2019-06').success).toBe(false); // Year too early
      expect(periodValidator.safeParse('2024/06').success).toBe(false); // Wrong separator
      expect(periodValidator.safeParse('24-06').success).toBe(false); // Short year
    });
  });

  describe('taxYearValidator', () => {
    it('should validate valid tax years', () => {
      expect(taxYearValidator.safeParse(2024).success).toBe(true);
      expect(taxYearValidator.safeParse(2025).success).toBe(true);
      expect(taxYearValidator.safeParse(2020).success).toBe(true);
    });

    it('should reject invalid tax years', () => {
      expect(taxYearValidator.safeParse(2019).success).toBe(false);
      expect(taxYearValidator.safeParse(2101).success).toBe(false);
      expect(taxYearValidator.safeParse(24).success).toBe(false);
    });
  });

  describe('uuidValidator', () => {
    it('should validate valid UUIDs', () => {
      expect(uuidValidator.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(uuidValidator.safeParse('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11').success).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(uuidValidator.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidValidator.safeParse('123').success).toBe(false);
      expect(uuidValidator.safeParse('').success).toBe(false);
    });
  });

  describe('moneyValidator', () => {
    it('should validate valid monetary amounts', () => {
      expect(moneyValidator.safeParse(0).success).toBe(true);
      expect(moneyValidator.safeParse(100.50).success).toBe(true);
      expect(moneyValidator.safeParse(999999).success).toBe(true);
    });

    it('should reject invalid monetary amounts', () => {
      expect(moneyValidator.safeParse(-1).success).toBe(false); // Negative
      expect(moneyValidator.safeParse(1000001).success).toBe(false); // Too large
    });
  });

  describe('percentageValidator', () => {
    it('should validate valid percentages', () => {
      expect(percentageValidator.safeParse(0).success).toBe(true);
      expect(percentageValidator.safeParse(50).success).toBe(true);
      expect(percentageValidator.safeParse(100).success).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(percentageValidator.safeParse(-1).success).toBe(false);
      expect(percentageValidator.safeParse(101).success).toBe(false);
    });
  });

  describe('profitSharePercentValidator', () => {
    it('should validate valid profit share percentages', () => {
      expect(profitSharePercentValidator.safeParse(0).success).toBe(true);
      expect(profitSharePercentValidator.safeParse(25).success).toBe(true);
      expect(profitSharePercentValidator.safeParse(50).success).toBe(true);
    });

    it('should reject invalid profit share percentages', () => {
      expect(profitSharePercentValidator.safeParse(-1).success).toBe(false);
      expect(profitSharePercentValidator.safeParse(51).success).toBe(false); // Cap at 50%
    });
  });

  describe('CreateCompanySchema', () => {
    it('should validate valid company data', () => {
      const validData = {
        name: 'Acme Corp',
        state: 'CA',
        model: '5/3',
        pay_frequency: 'biweekly',
      };
      expect(CreateCompanySchema.safeParse(validData).success).toBe(true);
    });

    it('should apply default status', () => {
      const data = {
        name: 'Acme Corp',
        state: 'CA',
        model: '5/3',
        pay_frequency: 'biweekly',
      };
      const result = CreateCompanySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });

    it('should reject invalid company data', () => {
      const invalidData = {
        name: '',
        state: 'XX',
        model: '6/3',
        pay_frequency: 'biweekly',
      };
      expect(CreateCompanySchema.safeParse(invalidData).success).toBe(false);
    });
  });

  describe('CreateEmployeeSchema', () => {
    it('should validate valid employee data', () => {
      const validData = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 5000,
      };
      expect(CreateEmployeeSchema.safeParse(validData).success).toBe(true);
    });

    it('should apply defaults', () => {
      const data = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 5000,
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

    it('should reject invalid employee data', () => {
      const invalidData = {
        company_id: 'not-a-uuid',
        first_name: '',
        last_name: 'Doe',
        gross_pay: -100,
      };
      expect(CreateEmployeeSchema.safeParse(invalidData).success).toBe(false);
    });
  });

  describe('CreateBenefitSchema', () => {
    it('should validate valid benefit data', () => {
      const validData = {
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        plan_code: 'DENTAL-100',
        per_pay_amount: 50,
      };
      expect(CreateBenefitSchema.safeParse(validData).success).toBe(true);
    });

    it('should reject zero or negative amounts', () => {
      const invalidData = {
        employee_id: '123e4567-e89b-12d3-a456-426614174000',
        plan_code: 'DENTAL-100',
        per_pay_amount: 0,
      };
      expect(CreateBenefitSchema.safeParse(invalidData).success).toBe(false);
    });
  });

  describe('validateRequest', () => {
    it('should return success for valid data', () => {
      const result = validateRequest(billingModelValidator, '5/3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('5/3');
      }
    });

    it('should return error for invalid data', () => {
      const result = validateRequest(billingModelValidator, '6/3');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation error');
        expect(result.issues).toBeDefined();
      }
    });
  });

  describe('validateRequestBody', () => {
    it('should validate valid JSON request body', async () => {
      const validData = { name: 'Test', state: 'CA', model: '5/3', pay_frequency: 'biweekly' };
      const mockRequest = {
        json: async () => validData,
      } as Request;

      const result = await validateRequestBody(mockRequest, CreateCompanySchema);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.name).toBe('Test');
      }
    });

    it('should return error for invalid JSON', async () => {
      const mockRequest = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Request;

      const result = await validateRequestBody(mockRequest, CreateCompanySchema);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Invalid JSON in request body');
      }
    });

    it('should return error for invalid data', async () => {
      const invalidData = { name: '', state: 'XX', model: '6/3', pay_frequency: 'daily' };
      const mockRequest = {
        json: async () => invalidData,
      } as Request;

      const result = await validateRequestBody(mockRequest, CreateCompanySchema);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('Validation error');
      }
    });
  });
});
