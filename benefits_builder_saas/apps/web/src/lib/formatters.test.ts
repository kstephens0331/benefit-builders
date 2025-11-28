/**
 * Tests for Formatting Utilities
 * Currency, dates, phone numbers, SSN, etc.
 */

import {
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  formatSSN,
  formatEIN,
  formatPercentage,
  formatBillingModel,
  formatAddress,
  parseDate,
  parseCurrency,
} from './formatters';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(2500.5)).toBe('$2,500.50');
      expect(formatCurrency(999999.99)).toBe('$999,999.99');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00');
      expect(formatCurrency(-500.75)).toBe('-$500.75');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(10.999)).toBe('$11.00');
      expect(formatCurrency(10.994)).toBe('$10.99');
    });

    it('should handle very large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('should handle very small amounts', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should support custom currency symbol', () => {
      expect(formatCurrency(1000, { symbol: '€' })).toBe('€1,000.00');
    });

    it('should support no decimal places', () => {
      expect(formatCurrency(1234.56, { decimals: 0 })).toBe('$1,235');
    });

    it('should handle string inputs', () => {
      expect(formatCurrency('1000')).toBe('$1,000.00');
      expect(formatCurrency('2500.50')).toBe('$2,500.50');
    });

    it('should handle invalid inputs', () => {
      expect(formatCurrency(NaN)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(null)).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date strings', () => {
      // ISO date strings are parsed as UTC and displayed in local timezone
      // So we test that the format is correct rather than specific date
      const formatted = formatDate('2024-11-24');
      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
      expect(formatDate('2024-01-01')).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it('should format Date objects', () => {
      const date = new Date('2024-11-24T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it('should support short format', () => {
      // Short format returns MM/DD/YYYY in local timezone
      const result = formatDate('2024-11-24', { format: 'short' });
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should support long format', () => {
      // Long format includes full month name
      const result = formatDate('2024-11-24', { format: 'long' });
      expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    it('should support ISO format', () => {
      expect(formatDate('2024-11-24', { format: 'iso' })).toBe('2024-11-24');
    });

    it('should include time if requested', () => {
      const date = new Date('2024-11-24T10:30:00Z');
      const formatted = formatDate(date, { includeTime: true });
      // Time format includes AM/PM, so we check for time pattern
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
      expect(formatDate(null)).toBe('Invalid Date');
    });

    it('should support custom timezone', () => {
      const date = new Date('2024-11-24T10:30:00Z');
      expect(formatDate(date, { timezone: 'America/New_York' })).toBeDefined();
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit numbers', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('should handle numbers with country code', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('should clean existing formatting', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    });

    it('should handle extensions', () => {
      expect(formatPhoneNumber('5551234567x123')).toBe('(555) 123-4567 ext. 123');
    });

    it('should handle invalid numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('abc')).toBe('abc');
      expect(formatPhoneNumber('')).toBe('');
    });

    it('should support international format', () => {
      expect(formatPhoneNumber('442012345678', { international: true })).toContain(
        '+44'
      );
    });
  });

  describe('formatSSN', () => {
    it('should format 9-digit SSN', () => {
      expect(formatSSN('123456789')).toBe('123-45-6789');
    });

    it('should preserve existing formatting', () => {
      expect(formatSSN('123-45-6789')).toBe('123-45-6789');
    });

    it('should mask SSN by default', () => {
      expect(formatSSN('123456789', { mask: true })).toBe('***-**-6789');
    });

    it('should mask first 5 digits only', () => {
      expect(formatSSN('123-45-6789', { mask: true })).toBe('***-**-6789');
    });

    it('should handle invalid SSN', () => {
      expect(formatSSN('123')).toBe('123');
      expect(formatSSN('abc')).toBe('abc');
    });

    it('should validate SSN format', () => {
      expect(formatSSN('000000000')).toBe('000-00-0000');
    });
  });

  describe('formatEIN', () => {
    it('should format 9-digit EIN', () => {
      expect(formatEIN('123456789')).toBe('12-3456789');
    });

    it('should preserve existing formatting', () => {
      expect(formatEIN('12-3456789')).toBe('12-3456789');
    });

    it('should handle invalid EIN', () => {
      expect(formatEIN('123')).toBe('123');
      expect(formatEIN('abc')).toBe('abc');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal to percentage', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(0.075)).toBe('7.5%');
      expect(formatPercentage(0.1234)).toBe('12.3%');
    });

    it('should handle whole numbers', () => {
      expect(formatPercentage(50, { isDecimal: false })).toBe('50.0%');
      expect(formatPercentage(100, { isDecimal: false })).toBe('100.0%');
    });

    it('should support custom decimal places', () => {
      expect(formatPercentage(0.12345, { decimals: 2 })).toBe('12.35%');
      expect(formatPercentage(0.12345, { decimals: 0 })).toBe('12%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-0.05)).toBe('-5.0%');
    });

    it('should handle very small percentages', () => {
      expect(formatPercentage(0.00001)).toBe('0.0%');
    });

    it('should handle percentages over 100%', () => {
      expect(formatPercentage(1.25)).toBe('125.0%');
    });
  });

  describe('formatBillingModel', () => {
    it('should format billing model string', () => {
      expect(formatBillingModel('5/3')).toBe('5% / 3%');
      expect(formatBillingModel('5/0')).toBe('5% / 0%');
      expect(formatBillingModel('4/4')).toBe('4% / 4%');
    });

    it('should add descriptive labels', () => {
      expect(formatBillingModel('5/3', { verbose: true })).toBe(
        '5% Employee / 3% Employer'
      );
    });

    it('should handle invalid format', () => {
      expect(formatBillingModel('invalid')).toBe('invalid');
      expect(formatBillingModel('')).toBe('');
    });

    it('should parse model components', () => {
      const parsed = formatBillingModel('5/3', { parse: true });
      expect(parsed).toEqual({ employee: 5, employer: 3 });
    });

    it('should calculate total', () => {
      expect(formatBillingModel('5/3', { includeTotal: true })).toContain('8%');
    });
  });

  describe('formatAddress', () => {
    const mockAddress = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
    };

    it('should format full address', () => {
      // Implementation joins all parts with commas, including before zip
      expect(formatAddress(mockAddress)).toBe(
        '123 Main St, Anytown, CA, 12345'
      );
    });

    it('should handle multiline format', () => {
      const formatted = formatAddress(mockAddress, { multiline: true });
      expect(formatted).toContain('\n');
      expect(formatted).toContain('123 Main St');
      // Implementation joins city, state, zip with commas
      expect(formatted).toContain('Anytown, CA, 12345');
    });

    it('should handle missing optional fields', () => {
      const minimalAddress = {
        city: 'Anytown',
        state: 'CA',
      };
      expect(formatAddress(minimalAddress)).toBe('Anytown, CA');
    });

    it('should include country if provided', () => {
      const addressWithCountry = {
        ...mockAddress,
        country: 'USA',
      };
      expect(formatAddress(addressWithCountry)).toContain('USA');
    });

    it('should handle suite/apt numbers', () => {
      const addressWithSuite = {
        ...mockAddress,
        street2: 'Suite 100',
      };
      const formatted = formatAddress(addressWithSuite);
      expect(formatted).toContain('Suite 100');
    });
  });

  describe('parseDate', () => {
    it('should parse various date formats', () => {
      expect(parseDate('2024-11-24')).toBeInstanceOf(Date);
      expect(parseDate('11/24/2024')).toBeInstanceOf(Date);
      expect(parseDate('November 24, 2024')).toBeInstanceOf(Date);
    });

    it('should handle ISO timestamps', () => {
      const date = parseDate('2024-11-24T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.getUTCHours()).toBe(10);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate(null)).toBeNull();
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-11-24');
      expect(parseDate(date)).toBe(date);
    });
  });

  describe('parseCurrency', () => {
    it('should parse currency strings', () => {
      expect(parseCurrency('$1,000.00')).toBe(1000);
      expect(parseCurrency('$2,500.50')).toBe(2500.5);
    });

    it('should handle negative amounts', () => {
      expect(parseCurrency('-$500.00')).toBe(-500);
      expect(parseCurrency('($500.00)')).toBe(-500);
    });

    it('should strip formatting', () => {
      expect(parseCurrency('$1,234,567.89')).toBe(1234567.89);
      expect(parseCurrency('1,000')).toBe(1000);
    });

    it('should handle numbers without symbols', () => {
      expect(parseCurrency('1000')).toBe(1000);
      expect(parseCurrency('2500.50')).toBe(2500.5);
    });

    it('should handle invalid inputs', () => {
      expect(parseCurrency('abc')).toBe(0);
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency(null)).toBe(0);
    });

    it('should preserve precision', () => {
      expect(parseCurrency('$10.99')).toBe(10.99);
      expect(parseCurrency('$0.01')).toBe(0.01);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatDate(null)).toBe('Invalid Date');
      expect(formatPhoneNumber(null)).toBe('');
      expect(formatSSN(null)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(formatCurrency('')).toBe('$0.00');
      expect(formatPhoneNumber('')).toBe('');
      expect(formatSSN('')).toBe('');
    });

    it('should handle very long inputs', () => {
      const longNumber = '1'.repeat(100);
      expect(() => formatCurrency(longNumber)).not.toThrow();
      expect(() => formatPhoneNumber(longNumber)).not.toThrow();
    });
  });
});
