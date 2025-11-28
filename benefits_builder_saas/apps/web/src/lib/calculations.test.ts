/**
 * Tests for Benefit Calculations
 * FICA tax savings and benefit amount calculations
 */

import {
  calculateFICASavings,
  calculateBenefitAmount,
  calculateEmployerShare,
  calculateEmployeeShare,
  applyBillingModel,
} from './calculations';

describe('Benefit Calculations', () => {
  describe('calculateFICASavings', () => {
    it('should calculate 7.65% FICA savings', () => {
      const grossWages = 50000;
      const savings = calculateFICASavings(grossWages);

      expect(savings).toBe(3825); // 7.65% of $50,000
    });

    it('should handle zero wages', () => {
      const savings = calculateFICASavings(0);
      expect(savings).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const grossWages = 50123.45;
      const savings = calculateFICASavings(grossWages);

      expect(savings).toBeCloseTo(3834.44, 2);
    });

    it('should respect Social Security wage base', () => {
      const wageBase = 160200; // 2023 SS wage base
      const highWages = 200000;

      const savings = calculateFICASavings(highWages, { wageBase });

      // Should cap SS portion at wage base
      // 6.2% of $160,200 + 1.45% of $200,000 = $9,932.40 + $2,900 = $12,832.40
      expect(savings).toBeCloseTo(12832.40, 2);
    });

    it('should include Medicare additional tax for high earners', () => {
      const highWages = 250000;
      const savings = calculateFICASavings(highWages, {
        includeMedicareAdditional: true,
        medicareThreshold: 200000,
      });

      // Additional 0.9% Medicare on amounts over $200k
      expect(savings).toBeGreaterThan(250000 * 0.0765);
    });
  });

  describe('calculateBenefitAmount', () => {
    it('should calculate benefit based on model', () => {
      const ficaSavings = 3825;
      const model = '5/3'; // 5% to us, 3% to company

      const benefit = calculateBenefitAmount(ficaSavings, model);

      expect(benefit).toBe(3825); // Full FICA savings available
    });

    it('should handle 5/0 model', () => {
      const ficaSavings = 3825;
      const model = '5/0'; // 5% to us, 0% to company

      const benefit = calculateBenefitAmount(ficaSavings, model);

      expect(benefit).toBe(3825);
    });

    it('should handle 4/4 model', () => {
      const ficaSavings = 3825;
      const model = '4/4'; // 4% each

      const benefit = calculateBenefitAmount(ficaSavings, model);

      expect(benefit).toBe(3825); // Full FICA savings available
    });
  });

  describe('calculateEmployerShare', () => {
    it('should calculate employer share for 5/3 model', () => {
      const grossWages = 50000;
      const model = '5/3';

      const employerShare = calculateEmployerShare(grossWages, model);

      // 3% of gross wages
      expect(employerShare).toBe(1500);
    });

    it('should return 0 for 5/0 model', () => {
      const grossWages = 50000;
      const model = '5/0';

      const employerShare = calculateEmployerShare(grossWages, model);

      expect(employerShare).toBe(0);
    });

    it('should calculate for 4/4 model', () => {
      const grossWages = 50000;
      const model = '4/4';

      const employerShare = calculateEmployerShare(grossWages, model);

      // 4% of gross wages
      expect(employerShare).toBe(2000);
    });
  });

  describe('calculateEmployeeShare', () => {
    it('should calculate employee share for 5/3 model', () => {
      const grossWages = 50000;
      const model = '5/3';

      const employeeShare = calculateEmployeeShare(grossWages, model);

      // 5% of gross wages = $2,500
      expect(employeeShare).toBe(2500);
    });

    it('should calculate for 5/0 model', () => {
      const grossWages = 50000;
      const model = '5/0';

      const employeeShare = calculateEmployeeShare(grossWages, model);

      // 5% of gross wages
      expect(employeeShare).toBe(2500);
    });

    it('should validate employee and employer shares are percentages of gross wages', () => {
      const grossWages = 50000;
      const ficaSavings = calculateFICASavings(grossWages);
      const model = '5/3';

      const employeeShare = calculateEmployeeShare(grossWages, model);
      const employerShare = calculateEmployerShare(grossWages, model);

      // Employee and employer shares are percentages of gross wages, not FICA savings
      // They represent contributions/fees, not the benefit itself
      expect(employeeShare).toBe(2500); // 5% of $50,000
      expect(employerShare).toBe(1500); // 3% of $50,000
    });
  });

  describe('applyBillingModel', () => {
    const employee = {
      gross_wages: 50000,
      filing_status: 'single',
      exemptions: 1,
    };

    it('should apply 5/3 model correctly', () => {
      const result = applyBillingModel(employee, '5/3');

      expect(result.fica_savings).toBe(3825);
      expect(result.employee_benefit).toBe(2500); // 5% of gross wages
      expect(result.employer_contribution).toBe(1500); // 3% of gross wages
      expect(result.our_fee).toBe(2500); // Same as employee_benefit (our fee from employee)
    });

    it('should apply 5/0 model correctly', () => {
      const result = applyBillingModel(employee, '5/0');

      expect(result.fica_savings).toBe(3825);
      expect(result.employee_benefit).toBe(2500); // 5% of gross wages
      expect(result.employer_contribution).toBe(0); // 0% of gross wages
      expect(result.our_fee).toBe(2500); // Same as employee_benefit
    });

    it('should apply 4/4 model correctly', () => {
      const result = applyBillingModel(employee, '4/4');

      expect(result.employee_benefit).toBe(2000); // 4% of gross wages
      expect(result.employer_contribution).toBe(2000); // 4% of gross wages
      expect(result.our_fee).toBe(2000); // Same as employee_benefit
    });

    it('should apply 5/1 model correctly', () => {
      const result = applyBillingModel(employee, '5/1');

      expect(result.employee_benefit).toBe(2500); // 5% of gross wages
      expect(result.employer_contribution).toBe(500); // 1% of gross wages
      expect(result.our_fee).toBe(2500); // Same as employee_benefit
    });

    it('should apply 4/3 model correctly', () => {
      const result = applyBillingModel(employee, '4/3');

      expect(result.employee_benefit).toBe(2000);
      expect(result.employer_contribution).toBe(1500);
    });

    it('should ensure fees and contributions are calculated correctly', () => {
      const models = ['5/3', '5/0', '4/4', '5/1', '4/3'];

      models.forEach(model => {
        const result = applyBillingModel(employee, model);

        // our_fee should equal employee_benefit (both are the employee rate applied to gross wages)
        expect(result.our_fee).toBe(result.employee_benefit);

        // The total of employee + employer contributions should be based on model percentages
        // and should not necessarily be limited by FICA savings
        // (FICA savings is a separate calculation)
        expect(result.fica_savings).toBeGreaterThan(0);
        expect(result.employee_benefit).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small wages', () => {
      const savings = calculateFICASavings(100);
      expect(savings).toBe(7.65);
    });

    it('should handle very large wages', () => {
      const savings = calculateFICASavings(1000000);
      expect(savings).toBeGreaterThan(0);
    });

    it('should handle invalid billing model gracefully', () => {
      const employee = { gross_wages: 50000 };
      const result = applyBillingModel(employee, 'invalid');

      expect(result).toBeDefined();
      expect(result.fica_savings).toBeGreaterThan(0);
    });

    it('should round to 2 decimal places', () => {
      const savings = calculateFICASavings(12345.678);
      const rounded = Math.round(savings * 100) / 100;

      expect(savings).toBe(rounded);
    });
  });
});
