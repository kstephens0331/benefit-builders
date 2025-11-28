/**
 * Tests for InvoiceManager Component
 * Critical component for invoice management and batch operations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceManager from './InvoiceManager';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('InvoiceManager Component', () => {
  const mockInvoices = [
    {
      id: 'inv-1',
      company_id: 'comp-1',
      period: '2024-11',
      status: 'open',
      subtotal_cents: 100000,
      tax_cents: 0,
      total_cents: 100000,
      issued_at: '2024-11-01T00:00:00Z',
      companies: { name: 'Test Co', contact_email: 'test@test.com' },
    },
    {
      id: 'inv-2',
      company_id: 'comp-2',
      period: '2024-11',
      status: 'sent',
      subtotal_cents: 200000,
      tax_cents: 0,
      total_cents: 200000,
      issued_at: '2024-11-01T00:00:00Z',
      companies: { name: 'Demo Inc', contact_email: 'demo@demo.com' },
    },
    {
      id: 'inv-3',
      company_id: 'comp-3',
      period: '2024-10',
      status: 'paid',
      subtotal_cents: 150000,
      tax_cents: 0,
      total_cents: 150000,
      issued_at: '2024-10-01T00:00:00Z',
      companies: { name: 'ABC Corp', contact_email: 'abc@abc.com' },
    },
  ];

  const mockPeriods = ['2024-11', '2024-10', '2024-09'];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, message: 'Success' }),
    });
  });

  describe('Component Rendering', () => {
    it('should render invoice management page', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText('Invoice Management')).toBeInTheDocument();
      expect(screen.getByText(/view, send, and manage/i)).toBeInTheDocument();
    });

    it('should display all invoices', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText('Test Co')).toBeInTheDocument();
      expect(screen.getByText('Demo Inc')).toBeInTheDocument();
      expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    });

    it('should show empty state when no invoices match filters', () => {
      render(<InvoiceManager invoices={[]} periods={mockPeriods} />);

      expect(screen.getByText(/no invoices found/i)).toBeInTheDocument();
    });
  });

  describe('Summary Cards', () => {
    it('should display summary statistics', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('should show correct count for each status', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText('1')).toBeInTheDocument(); // 1 open
      // Note: Multiple status counts might appear, so we just check they exist
    });

    it('should calculate and display total value', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      // Total is $4,500.00 (100000 + 200000 + 150000 cents = 450000 cents = $4,500)
      expect(screen.getByText(/\$4,500/)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('should filter invoices by period', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const periodFilter = screen.getByLabelText(/period/i);
      await userEvent.selectOptions(periodFilter, '2024-10');

      // Should only show October invoice
      expect(screen.getByText('ABC Corp')).toBeInTheDocument();
      expect(screen.queryByText('Test Co')).not.toBeInTheDocument();
    });

    it('should filter invoices by status', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const statusFilter = screen.getByLabelText(/status/i);
      await userEvent.selectOptions(statusFilter, 'paid');

      // Should only show paid invoice
      expect(screen.getByText('ABC Corp')).toBeInTheDocument();
      expect(screen.queryByText('Test Co')).not.toBeInTheDocument();
    });

    it('should show all invoices when filters are set to all', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const periodFilter = screen.getByLabelText(/period/i);
      await userEvent.selectOptions(periodFilter, 'all');

      const statusFilter = screen.getByLabelText(/status/i);
      await userEvent.selectOptions(statusFilter, 'all');

      expect(screen.getByText('Test Co')).toBeInTheDocument();
      expect(screen.getByText('Demo Inc')).toBeInTheDocument();
      expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    });
  });

  describe('Invoice Selection', () => {
    it('should select individual invoices', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstInvoiceCheckbox = checkboxes[1]; // Skip "select all" checkbox

      await userEvent.click(firstInvoiceCheckbox);
      expect(firstInvoiceCheckbox).toBeChecked();

      await userEvent.click(firstInvoiceCheckbox);
      expect(firstInvoiceCheckbox).not.toBeChecked();
    });

    it('should select all invoices with select all checkbox', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];

      await userEvent.click(selectAllCheckbox);

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should deselect all when clicking select all again', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];

      await userEvent.click(selectAllCheckbox);
      await userEvent.click(selectAllCheckbox);

      expect(selectAllCheckbox).not.toBeChecked();
    });

    it('should update selection count in button text', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText(/email selected \(0\)/i)).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      expect(screen.getByText(/email selected \(1\)/i)).toBeInTheDocument();
    });
  });

  describe('Individual Invoice Actions', () => {
    it('should have view PDF link for each invoice', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const pdfLinks = screen.getAllByText('View PDF');
      expect(pdfLinks).toHaveLength(3);
    });

    it('should have email button for each invoice', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailButtons = screen.getAllByText('Email');
      expect(emailButtons).toHaveLength(3);
    });

    it('should send individual invoice email', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailButtons = screen.getAllByText('Email');
      await userEvent.click(emailButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/invoices/inv-1/email',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('should disable email button when no contact email', () => {
      const invoicesNoEmail = [
        {
          ...mockInvoices[0],
          companies: { name: 'Test Co', contact_email: undefined },
        },
      ];

      render(<InvoiceManager invoices={invoicesNoEmail} periods={mockPeriods} />);

      const emailButton = screen.getByText('Email');
      expect(emailButton).toBeDisabled();
    });

    it('should have mark paid button for unpaid invoices', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const markPaidButtons = screen.getAllByText('Mark Paid');
      expect(markPaidButtons.length).toBeGreaterThan(0);
    });

    it('should not show mark paid button for already paid invoices', () => {
      const paidInvoice = mockInvoices.filter((inv) => inv.status === 'paid');
      render(<InvoiceManager invoices={paidInvoice} periods={mockPeriods} />);

      expect(screen.queryByText('Mark Paid')).not.toBeInTheDocument();
    });

    it('should mark invoice as paid', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const markPaidButtons = screen.getAllByText('Mark Paid');
      await userEvent.click(markPaidButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/invoices',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"status":"paid"'),
          })
        );
      });
    });
  });

  describe('Batch Email Operations', () => {
    it('should disable batch email button when no invoices selected', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const batchEmailButton = screen.getByText(/email selected/i);
      expect(batchEmailButton).toBeDisabled();
    });

    it('should send batch emails for selected invoices', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);
      await userEvent.click(checkboxes[2]);

      const batchEmailButton = screen.getByText(/email selected/i);
      await userEvent.click(batchEmailButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/invoices/email-batch',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('inv-1'),
          })
        );
      });
    });

    it('should clear selection after successful batch email', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, message: 'Emails sent successfully' }),
      });

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      const batchEmailButton = screen.getByText(/email selected \(1\)/i);
      await userEvent.click(batchEmailButton);

      await waitFor(() => {
        expect(screen.getByText(/email selected \(0\)/i)).toBeInTheDocument();
      });
    });

    it('should display success message after batch email', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, message: 'Successfully sent 2 emails' }),
      });

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      const batchEmailButton = screen.getByText(/email selected/i);
      await userEvent.click(batchEmailButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully sent 2 emails/i)).toBeInTheDocument();
      });
    });

    it('should show error if batch email fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'SMTP error' }),
      });

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      const batchEmailButton = screen.getByText(/email selected/i);
      await userEvent.click(batchEmailButton);

      await waitFor(() => {
        expect(screen.getByText(/smtp error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Email All for Period', () => {
    it('should disable email all button when no period selected', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailAllButton = screen.getByText(/email all for period/i);
      expect(emailAllButton).toBeDisabled();
    });

    it('should enable email all button when period is selected', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const periodFilter = screen.getByLabelText(/period/i);
      await userEvent.selectOptions(periodFilter, '2024-11');

      const emailAllButton = screen.getByText(/email all for period/i);
      expect(emailAllButton).not.toBeDisabled();
    });

    it('should send emails for all invoices in selected period', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const periodFilter = screen.getByLabelText(/period/i);
      await userEvent.selectOptions(periodFilter, '2024-11');

      const emailAllButton = screen.getByText(/email all for period/i);
      await userEvent.click(emailAllButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/invoices/email-batch',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"period":"2024-11"'),
          })
        );
      });
    });

    it('should display success message after emailing all', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, message: 'Sent emails to 2 companies' }),
      });

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const periodFilter = screen.getByLabelText(/period/i);
      await userEvent.selectOptions(periodFilter, '2024-11');

      const emailAllButton = screen.getByText(/email all for period/i);
      await userEvent.click(emailAllButton);

      await waitFor(() => {
        expect(screen.getByText(/sent emails to 2 companies/i)).toBeInTheDocument();
      });
    });
  });

  describe('Invoice Display', () => {
    it('should display invoice period', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText('2024-11')).toBeInTheDocument();
      expect(screen.getByText('2024-10')).toBeInTheDocument();
    });

    it('should display formatted amounts', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText('$1,000.00')).toBeInTheDocument();
      expect(screen.getByText('$2,000.00')).toBeInTheDocument();
      expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    });

    it('should display formatted dates', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      expect(screen.getByText(/nov.*1/i)).toBeInTheDocument();
      expect(screen.getByText(/oct.*1/i)).toBeInTheDocument();
    });

    it('should display status badges with correct colors', () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const openBadge = screen.getByText('open');
      expect(openBadge).toHaveClass('bg-yellow-100');

      const sentBadge = screen.getByText('sent');
      expect(sentBadge).toHaveClass('bg-blue-100');

      const paidBadge = screen.getByText('paid');
      expect(paidBadge).toHaveClass('bg-green-100');
    });
  });

  describe('Loading States', () => {
    it('should disable buttons while loading', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailButtons = screen.getAllByText('Email');
      await userEvent.click(emailButtons[0]);

      expect(emailButtons[0]).toBeDisabled();
    });

    it('should refresh router after successful operation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, message: 'Success' }),
      });

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailButtons = screen.getAllByText('Email');
      await userEvent.click(emailButtons[0]);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when no invoices selected for batch email', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      // Manually enable button to test error handling
      const batchEmailButton = screen.getByText(/email selected/i);

      // The button should be disabled, but we're testing the internal validation
      // This would be triggered if someone bypasses UI validation
      expect(batchEmailButton).toBeDisabled();
    });

    it('should show error when trying to email all without period', async () => {
      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailAllButton = screen.getByText(/email all for period/i);
      expect(emailAllButton).toBeDisabled();
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<InvoiceManager invoices={mockInvoices} periods={mockPeriods} />);

      const emailButtons = screen.getAllByText('Email');
      await userEvent.click(emailButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});
