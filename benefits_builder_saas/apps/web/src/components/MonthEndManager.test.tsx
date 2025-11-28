/**
 * Tests for MonthEndManager Component
 * Month-end closing workflow and history management
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthEndManager from './MonthEndManager';

// Mock Next.js router
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock window.open
global.open = jest.fn();

// Mock fetch
global.fetch = jest.fn();

describe('MonthEndManager Component', () => {
  const mockClosings = [
    {
      id: 'closing-1',
      closing_date: '2024-11-30',
      month_year: 'November 2024',
      status: 'closed',
      total_companies: 45,
      total_employees: 523,
      total_pretax_deductions: 125000.50,
      total_bb_fees: 52500.00,
      total_employer_savings: 75000.00,
      total_employee_savings: 25000.00,
      total_ar_open: 10000.00,
      total_ar_overdue: 2000.00,
      emails_sent: 42,
      emails_failed: 3,
      closed_at: '2024-12-01T10:00:00Z',
      created_at: '2024-12-01T09:00:00Z',
    },
    {
      id: 'closing-2',
      closing_date: '2024-10-31',
      month_year: 'October 2024',
      status: 'closed',
      total_companies: 40,
      total_employees: 480,
      total_pretax_deductions: 110000.00,
      total_bb_fees: 48000.00,
      total_employer_savings: 70000.00,
      total_employee_savings: 22000.00,
      total_ar_open: 5000.00,
      total_ar_overdue: 500.00,
      emails_sent: 38,
      emails_failed: 2,
      closed_at: '2024-11-01T10:00:00Z',
      created_at: '2024-11-01T09:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  describe('Component Rendering', () => {
    it('should render month-end closing page with header', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      expect(screen.getByText('Month-End Closing')).toBeInTheDocument();
      expect(screen.getByText(/run month-end reports/i)).toBeInTheDocument();
    });

    it('should display new month-end close button', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      expect(screen.getByText('+ New Month-End Close')).toBeInTheDocument();
    });

    it('should render closing history table', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      expect(screen.getByText('Closing History')).toBeInTheDocument();
      expect(screen.getByText('November 2024')).toBeInTheDocument();
      expect(screen.getByText('October 2024')).toBeInTheDocument();
    });

    it('should show empty state when no closings exist', () => {
      render(<MonthEndManager initialClosings={[]} />);

      expect(screen.getByText(/no month-end closings yet/i)).toBeInTheDocument();
    });
  });

  describe('Summary Cards', () => {
    it('should display summary cards with most recent closing data', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      expect(screen.getByText('Most Recent')).toBeInTheDocument();
      expect(screen.getByText('November 2024')).toBeInTheDocument();
      expect(screen.getByText('Total Companies')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
      expect(screen.getByText('523')).toBeInTheDocument();
      expect(screen.getByText('Total BB Fees')).toBeInTheDocument();
    });

    it('should not display summary cards when no closings', () => {
      render(<MonthEndManager initialClosings={[]} />);

      expect(screen.queryByText('Most Recent')).not.toBeInTheDocument();
    });
  });

  describe('Closing History Table', () => {
    it('should display all closing data in table', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      // Check for November closing
      expect(screen.getByText('November 2024')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('523')).toBeInTheDocument();

      // Check for October closing
      expect(screen.getByText('October 2024')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText('480')).toBeInTheDocument();
    });

    it('should display status badges with correct colors', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const statusBadges = screen.getAllByText('closed');
      expect(statusBadges.length).toBeGreaterThan(0);
      statusBadges.forEach((badge) => {
        expect(badge).toHaveClass('bg-green-100');
      });
    });

    it('should display email statistics', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('/ 3')).toBeInTheDocument();
    });

    it('should format currency correctly', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const dollarValues = screen.getAllByText(/\$52,500/);
      expect(dollarValues.length).toBeGreaterThan(0);
    });
  });

  describe('New Closing Modal', () => {
    it('should open modal when clicking new month-end close', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
        expect(screen.getByLabelText(/closing date/i)).toBeInTheDocument();
      });
    });

    it('should pre-fill suggested closing date', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        const dateInput = screen.getByLabelText(/closing date/i) as HTMLInputElement;
        expect(dateInput.value).toBeTruthy();
      });
    });

    it('should have send emails checkbox checked by default', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        const checkbox = screen.getByLabelText(/send email reports/i) as HTMLInputElement;
        expect(checkbox).toBeChecked();
      });
    });

    it('should close modal when clicking cancel', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Run Month-End Closing')).not.toBeInTheDocument();
      });
    });

    it('should submit closing with correct data', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
      });

      const dateInput = screen.getByLabelText(/closing date/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-12-31');

      const submitButton = screen.getByText('Run Month-End Close');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/month-end/close',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('2024-12-31'),
          })
        );
      });
    });

    it('should disable checkbox to not send emails', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText(/send email reports/i);
      await userEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();

      const submitButton = screen.getByText('Run Month-End Close');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/month-end/close',
          expect.objectContaining({
            body: expect.stringContaining('"sendEmails":false'),
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Run Month-End Close');
      await userEvent.click(submitButton);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should display error message on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'Failed to create closing' }),
      });

      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Run Month-End Close');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create closing/i)).toBeInTheDocument();
      });
    });

    it('should refresh router on successful submission', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(<MonthEndManager initialClosings={mockClosings} />);

      const newButton = screen.getByText('+ New Month-End Close');
      await userEvent.click(newButton);

      await waitFor(() => {
        expect(screen.getByText('Run Month-End Closing')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Run Month-End Close');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should have view details buttons for each closing', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const viewButtons = screen.getAllByText('View Details');
      expect(viewButtons).toHaveLength(2);
    });

    it('should navigate to closing details page', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const viewButtons = screen.getAllByText('View Details');
      await userEvent.click(viewButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/month-end/closing-1');
    });

    it('should have download CSV buttons for each closing', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const downloadButtons = screen.getAllByText('Download CSV');
      expect(downloadButtons).toHaveLength(2);
    });

    it('should open CSV download in new window', async () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      const downloadButtons = screen.getAllByText('Download CSV');
      await userEvent.click(downloadButtons[0]);

      expect(global.open).toHaveBeenCalledWith(
        '/api/month-end/closing-1/download',
        '_blank'
      );
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      render(<MonthEndManager initialClosings={mockClosings} />);

      // Check for formatted date (Nov 30, 2024)
      expect(screen.getByText(/nov.*30/i)).toBeInTheDocument();
    });
  });
});
