/**
 * Tests for Aging Utilities
 * Calculates 30/60/90+ day aging buckets
 */

import {
  calculateDaysOverdue,
  getAgingBucket,
  calculateAgingSummary,
  processARforAging,
  processAPforAging,
  sortByDaysOverdue,
  filterByBucket,
  type AgingItem,
  type AgingSummary,
} from './aging';

describe('Aging Utilities', () => {
  describe('calculateDaysOverdue', () => {
    it('should calculate days overdue for past date', () => {
      const dueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
      const days = calculateDaysOverdue(dueDate.toISOString());

      expect(days).toBeGreaterThanOrEqual(44);
      expect(days).toBeLessThanOrEqual(46);
    });

    it('should return 0 for future date', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const days = calculateDaysOverdue(futureDate.toISOString());

      expect(days).toBe(0);
    });

    it('should return 0 for today', () => {
      const today = new Date().toISOString();
      const days = calculateDaysOverdue(today);

      expect(days).toBeLessThanOrEqual(1); // Allow for time zone differences
    });

    it('should handle different date formats', () => {
      const dueDate = '2024-01-01';
      const days = calculateDaysOverdue(dueDate);

      expect(days).toBeGreaterThan(0);
    });
  });

  describe('getAgingBucket', () => {
    it('should return current for 0 days', () => {
      expect(getAgingBucket(0)).toBe('current');
    });

    it('should return current for negative days', () => {
      expect(getAgingBucket(-5)).toBe('current');
    });

    it('should return 30 for 1-30 days', () => {
      expect(getAgingBucket(1)).toBe('30');
      expect(getAgingBucket(15)).toBe('30');
      expect(getAgingBucket(30)).toBe('30');
    });

    it('should return 60 for 31-60 days', () => {
      expect(getAgingBucket(31)).toBe('60');
      expect(getAgingBucket(45)).toBe('60');
      expect(getAgingBucket(60)).toBe('60');
    });

    it('should return 90+ for over 60 days', () => {
      expect(getAgingBucket(61)).toBe('90+');
      expect(getAgingBucket(90)).toBe('90+');
      expect(getAgingBucket(365)).toBe('90+');
    });
  });

  describe('calculateAgingSummary', () => {
    const mockAgingItems: AgingItem[] = [
      {
        id: '1',
        amount_due: 1000,
        due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        days_overdue: 15,
        bucket: '30',
      },
      {
        id: '2',
        amount_due: 2000,
        due_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        days_overdue: 45,
        bucket: '60',
      },
      {
        id: '3',
        amount_due: 500,
        due_date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        days_overdue: 75,
        bucket: '90+',
      },
      {
        id: '4',
        amount_due: 1500,
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        days_overdue: 0,
        bucket: 'current',
      },
    ];

    it('should calculate totals for each bucket', () => {
      const summary = calculateAgingSummary(mockAgingItems);

      expect(summary.current).toBe(1500);
      expect(summary.days_30).toBe(1000);
      expect(summary.days_60).toBe(2000);
      expect(summary.days_90_plus).toBe(500);
    });

    it('should sum all amounts correctly', () => {
      const summary = calculateAgingSummary(mockAgingItems);

      expect(summary.total).toBe(5000); // Total of all invoices
    });

    it('should handle empty aging items list', () => {
      const summary = calculateAgingSummary([]);

      expect(summary.current).toBe(0);
      expect(summary.days_30).toBe(0);
      expect(summary.days_60).toBe(0);
      expect(summary.days_90_plus).toBe(0);
      expect(summary.total).toBe(0);
    });

    it('should handle items with zero amount', () => {
      const items: AgingItem[] = [
        {
          id: '1',
          amount_due: 0,
          due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          days_overdue: 30,
          bucket: '30',
        },
      ];

      const summary = calculateAgingSummary(items);

      expect(summary.total).toBe(0);
    });
  });

  describe('processARforAging', () => {
    const mockARRecords = [
      {
        id: '1',
        invoice_number: 'INV-001',
        companies: { name: 'Test Co' },
        amount_due: '1000',
        due_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        invoice_number: 'INV-002',
        companies: [{ name: 'Test Co 2' }],
        amount_due: '2000',
        due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    it('should process AR records into aging items', () => {
      const items = processARforAging(mockARRecords);

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('1');
      expect(items[0].invoice_number).toBe('INV-001');
      expect(items[0].company_name).toBe('Test Co');
      expect(items[0].amount_due).toBe(1000);
    });

    it('should handle company name as array', () => {
      const items = processARforAging(mockARRecords);

      expect(items[1].company_name).toBe('Test Co 2');
    });

    it('should calculate days overdue and bucket', () => {
      const items = processARforAging(mockARRecords);

      expect(items[0].days_overdue).toBeGreaterThanOrEqual(44);
      expect(items[0].bucket).toBe('60');
      expect(items[1].days_overdue).toBeGreaterThanOrEqual(14);
      expect(items[1].bucket).toBe('30');
    });

    it('should handle empty list', () => {
      const items = processARforAging([]);

      expect(items).toHaveLength(0);
    });
  });

  describe('processAPforAging', () => {
    const mockAPRecords = [
      {
        id: '1',
        bill_number: 'BILL-001',
        vendor_name: 'Vendor Co',
        amount_due: '500',
        due_date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    it('should process AP records into aging items', () => {
      const items = processAPforAging(mockAPRecords);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('1');
      expect(items[0].bill_number).toBe('BILL-001');
      expect(items[0].vendor_name).toBe('Vendor Co');
      expect(items[0].amount_due).toBe(500);
    });

    it('should calculate days overdue and bucket', () => {
      const items = processAPforAging(mockAPRecords);

      expect(items[0].days_overdue).toBeGreaterThanOrEqual(74);
      expect(items[0].bucket).toBe('90+');
    });

    it('should handle empty list', () => {
      const items = processAPforAging([]);

      expect(items).toHaveLength(0);
    });
  });

  describe('sortByDaysOverdue', () => {
    const mockItems: AgingItem[] = [
      {
        id: '1',
        amount_due: 1000,
        due_date: '2024-01-01',
        days_overdue: 15,
        bucket: '30',
      },
      {
        id: '2',
        amount_due: 2000,
        due_date: '2024-01-01',
        days_overdue: 75,
        bucket: '90+',
      },
      {
        id: '3',
        amount_due: 500,
        due_date: '2024-01-01',
        days_overdue: 45,
        bucket: '60',
      },
    ];

    it('should sort items by days overdue descending', () => {
      const sorted = sortByDaysOverdue(mockItems);

      expect(sorted[0].days_overdue).toBe(75);
      expect(sorted[1].days_overdue).toBe(45);
      expect(sorted[2].days_overdue).toBe(15);
    });

    it('should not modify original array', () => {
      const original = [...mockItems];
      sortByDaysOverdue(mockItems);

      expect(mockItems).toEqual(original);
    });
  });

  describe('filterByBucket', () => {
    const mockItems: AgingItem[] = [
      {
        id: '1',
        amount_due: 1000,
        due_date: '2024-01-01',
        days_overdue: 15,
        bucket: '30',
      },
      {
        id: '2',
        amount_due: 2000,
        due_date: '2024-01-01',
        days_overdue: 75,
        bucket: '90+',
      },
      {
        id: '3',
        amount_due: 500,
        due_date: '2024-01-01',
        days_overdue: 45,
        bucket: '60',
      },
    ];

    it('should filter items by bucket', () => {
      const filtered = filterByBucket(mockItems, '30');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].bucket).toBe('30');
    });

    it('should return empty array if no matches', () => {
      const filtered = filterByBucket(mockItems, 'current');

      expect(filtered).toHaveLength(0);
    });

    it('should filter by 90+ bucket', () => {
      const filtered = filterByBucket(mockItems, '90+');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date strings', () => {
      expect(() => calculateDaysOverdue('invalid-date')).not.toThrow();
    });

    it('should handle very large day counts', () => {
      const bucket = getAgingBucket(10000);
      expect(bucket).toBe('90+');
    });

    it('should handle decimal amounts in summary', () => {
      const items: AgingItem[] = [
        {
          id: '1',
          amount_due: 123.45,
          due_date: new Date().toISOString(),
          days_overdue: 0,
          bucket: 'current',
        },
      ];

      const summary = calculateAgingSummary(items);
      expect(summary.current).toBe(123.45);
      expect(summary.total).toBe(123.45);
    });
  });
});
