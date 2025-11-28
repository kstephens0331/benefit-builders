/**
 * Tests for AgingReport Component
 * Displays 30/60/90+ day aging buckets
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgingReport from './AgingReport';
import { AgingItem, AgingSummary, calculateAgingSummary, getAgingBucket, calculateDaysOverdue } from '@/lib/aging';

describe('AgingReport Component', () => {
  // Create proper aging items using the library functions
  const mockARItems: AgingItem[] = [
    {
      id: 'ar-1',
      invoice_number: 'INV-001',
      company_name: 'Test Co',
      amount_due: 1000,
      due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      days_overdue: 15,
      bucket: '30',
    },
    {
      id: 'ar-2',
      invoice_number: 'INV-002',
      company_name: 'Demo Inc',
      amount_due: 2000,
      due_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      days_overdue: 45,
      bucket: '60',
    },
    {
      id: 'ar-3',
      invoice_number: 'INV-003',
      company_name: 'ABC Corp',
      amount_due: 500,
      due_date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), // 75 days ago
      days_overdue: 75,
      bucket: '90+',
    },
    {
      id: 'ar-4',
      invoice_number: 'INV-004',
      company_name: 'XYZ Ltd',
      amount_due: 1500,
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // Future
      days_overdue: 0,
      bucket: 'current',
    },
  ];

  const mockSummary: AgingSummary = calculateAgingSummary(mockARItems);

  it('should render aging report with buckets', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    expect(screen.getAllByText(/current/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1-30 days/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/31-60 days/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/90\+ days/i).length).toBeGreaterThan(0);
  });

  it('should display totals for each bucket', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Current bucket should have $1,500
    expect(screen.getAllByText('$1,500.00').length).toBeGreaterThan(0);

    // Should show amounts in other buckets
    expect(screen.getAllByText('$1,000.00').length).toBeGreaterThan(0); // 30 day bucket
    expect(screen.getAllByText('$2,000.00').length).toBeGreaterThan(0); // 60 day bucket
    expect(screen.getAllByText('$500.00').length).toBeGreaterThan(0); // 90+ day bucket
  });

  it('should show invoice count in each bucket', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Should display item counts - 4 items total
    expect(screen.getByText(/4 items/i)).toBeInTheDocument();
  });

  it('should filter by bucket when clicked', async () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Click on 60-day bucket card
    const bucket60Cards = screen.getAllByText(/31-60 days/i);
    const bucket60Card = bucket60Cards[0].closest('div');
    await userEvent.click(bucket60Card!);

    // Should show only invoices in that bucket - now filtered to 1 item
    expect(screen.getByText('INV-002')).toBeInTheDocument();
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
  });

  it('should show color coding by urgency', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Current should have green class
    const currentLabels = screen.getAllByText(/current/i);
    const currentCard = currentLabels[0];
    expect(currentCard).toHaveClass('text-green-700');

    // 90+ should have red class
    const overdueLabels = screen.getAllByText(/90\+ days/i);
    const overdueCard = overdueLabels[0];
    expect(overdueCard).toHaveClass('text-red-700');
  });

  it('should display invoice details in table', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Test Co')).toBeInTheDocument();
    // Amount appears in both summary card and table
    expect(screen.getAllByText('$1,000.00').length).toBeGreaterThan(0);
  });

  it('should show days overdue', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Should show days for overdue invoices
    expect(screen.getByText('45 days')).toBeInTheDocument();
    expect(screen.getByText('75 days')).toBeInTheDocument();
  });

  it('should display grand total', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    expect(screen.getByText(/total/i)).toBeInTheDocument();
    // Total should be $5,000
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('should support A/P mode', () => {
    const apItems: AgingItem[] = [{
      id: 'ap-1',
      vendor_name: 'Vendor Co',
      bill_number: 'BILL-001',
      amount_due: 1000,
      due_date: new Date().toISOString(),
      days_overdue: 0,
      bucket: 'current',
    }];
    const apSummary = calculateAgingSummary(apItems);

    render(<AgingReport items={apItems} summary={apSummary} type="ap" />);

    expect(screen.getByText(/accounts payable/i)).toBeInTheDocument();
    expect(screen.getAllByText(/vendor/i).length).toBeGreaterThan(0);
  });

  it('should support A/R mode', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    expect(screen.getByText(/accounts receivable/i)).toBeInTheDocument();
    expect(screen.getByText(/company/i)).toBeInTheDocument();
  });

  it('should show visual bar chart', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Should have visual representation - check for progress bars
    expect(screen.getByText(/aging distribution/i)).toBeInTheDocument();
    // Check for percentage text
    expect(screen.getByText(/30\.0%/)).toBeInTheDocument(); // $1500/$5000
  });

  it('should handle empty records', () => {
    const emptySummary: AgingSummary = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90_plus: 0,
      total: 0,
    };
    render(<AgingReport items={[]} summary={emptySummary} type="ar" />);

    expect(screen.getByText(/no items in this aging bucket/i)).toBeInTheDocument();
  });

  it('should reset filter when clicking All', async () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Filter to one bucket
    const bucket60Cards = screen.getAllByText(/31-60 days/i);
    const bucket60Card = bucket60Cards[0].closest('div');
    await userEvent.click(bucket60Card!);

    // Verify filtered
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();

    // Click Total (All) to reset
    const totalCards = screen.getAllByText(/total/i);
    const totalCard = totalCards[0].closest('div');
    await userEvent.click(totalCard!);

    // Should show all invoices again - 4 items
    expect(screen.getByText(/4 items/i)).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('INV-002')).toBeInTheDocument();
    expect(screen.getByText('INV-003')).toBeInTheDocument();
  });

  it('should calculate percentages for each bucket', () => {
    render(<AgingReport items={mockARItems} summary={mockSummary} type="ar" />);

    // Should show percentage of total - $1500/$5000 = 30%
    expect(screen.getByText(/30\.0%/)).toBeInTheDocument();
  });
});
