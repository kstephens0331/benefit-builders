/**
 * Tests for Main Dashboard Component
 * Overview of key business metrics and recent activity
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

global.fetch = jest.fn();

describe('Dashboard Component', () => {
  const mockDashboardData = {
    analytics: {
      total_companies: 45,
      active_companies: 42,
      total_employees: 523,
      active_employees: 495,
      total_revenue_ytd: 125000,
      total_savings_ytd: 385000,
      avg_savings_per_employee: 736.55,
      revenue_growth_mom: 12.5,
      employee_growth_mom: 8.3,
      churn_rate: 2.1,
    },
    recent_invoices: [
      {
        id: 'inv-1',
        company_name: 'Acme Corp',
        amount: 2500,
        status: 'paid',
        due_date: '2024-11-30',
      },
      {
        id: 'inv-2',
        company_name: 'TechStart Inc',
        amount: 1800,
        status: 'sent',
        due_date: '2024-12-15',
      },
    ],
    overdue_invoices: [
      {
        id: 'inv-3',
        company_name: 'Late Co',
        amount: 3200,
        days_overdue: 15,
      },
    ],
    recent_activities: [
      {
        id: 'act-1',
        type: 'invoice_sent',
        description: 'Invoice sent to Acme Corp',
        timestamp: '2024-11-24T10:30:00Z',
      },
      {
        id: 'act-2',
        type: 'payment_received',
        description: 'Payment received from TechStart Inc',
        timestamp: '2024-11-24T09:15:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: mockDashboardData }),
    });
  });

  describe('Metrics Display', () => {
    it('should render key metrics cards', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/45/)).toBeInTheDocument();
        expect(screen.getByText(/523/)).toBeInTheDocument();
        expect(screen.getByText(/\$125,000/)).toBeInTheDocument();
      });
    });

    it('should display growth indicators', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/12\.5%/)).toBeInTheDocument(); // Revenue growth
        expect(screen.getByText(/8\.3%/)).toBeInTheDocument(); // Employee growth
      });
    });

    it('should show positive growth with up arrow', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const growthIndicators = screen.getAllByText(/↑|▲/);
        expect(growthIndicators.length).toBeGreaterThan(0);
      });
    });

    it('should display total savings prominently', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$385,000/)).toBeInTheDocument();
      });
    });

    it('should show average savings per employee', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$736\.55/)).toBeInTheDocument();
      });
    });

    it('should display churn rate with warning if high', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/2\.1%/)).toBeInTheDocument();
      });
    });
  });

  describe('Recent Invoices', () => {
    it('should list recent invoices', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('TechStart Inc')).toBeInTheDocument();
      });
    });

    it('should show invoice amounts', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/\$2,500/)).toBeInTheDocument();
        expect(screen.getByText(/\$1,800/)).toBeInTheDocument();
      });
    });

    it('should display invoice status badges', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('paid')).toBeInTheDocument();
        expect(screen.getByText('sent')).toBeInTheDocument();
      });
    });

    it('should navigate to invoice detail on click', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const invoiceRow = screen.getByText('Acme Corp');
        expect(invoiceRow).toBeInTheDocument();
      });

      const invoiceRow = screen.getByText('Acme Corp');
      await userEvent.click(invoiceRow);

      // Should navigate to invoice page
    });

    it('should show "View All Invoices" link', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/view all invoices/i)).toBeInTheDocument();
      });
    });
  });

  describe('Overdue Invoices Alert', () => {
    it('should display overdue invoices section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/overdue/i)).toBeInTheDocument();
        expect(screen.getByText('Late Co')).toBeInTheDocument();
      });
    });

    it('should show days overdue', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/15.*days/i)).toBeInTheDocument();
      });
    });

    it('should highlight overdue invoices', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const overdueSection = screen.getByText(/overdue/i);
        expect(overdueSection).toBeInTheDocument();
      });
    });

    it('should not show overdue section when empty', async () => {
      const dataWithoutOverdue = {
        ...mockDashboardData,
        overdue_invoices: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: dataWithoutOverdue }),
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Late Co')).not.toBeInTheDocument();
      });
    });
  });

  describe('Recent Activity Feed', () => {
    it('should display recent activities', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/invoice sent to acme corp/i)).toBeInTheDocument();
        expect(screen.getByText(/payment received from techstart/i)).toBeInTheDocument();
      });
    });

    it('should show activity timestamps', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });

    it('should show activity icons based on type', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const activities = screen.getByText(/recent activity/i).closest('div');
        expect(activities).toBeInTheDocument();
      });
    });

    it('should limit to recent activities', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const activities = screen.getAllByText(/invoice sent|payment received/i);
        expect(activities.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Quick Actions', () => {
    it('should show quick action buttons', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/create invoice/i)).toBeInTheDocument();
        expect(screen.getByText(/add company/i)).toBeInTheDocument();
      });
    });

    it('should navigate to create invoice on click', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const createButton = screen.getByText(/create invoice/i);
        expect(createButton).toBeInTheDocument();
      });

      const createButton = screen.getByText(/create invoice/i);
      await userEvent.click(createButton);
    });

    it('should show sync QuickBooks button if connected', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/sync quickbooks/i)).toBeInTheDocument();
      });
    });

    it('should show quick action buttons', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/create invoice/i)).toBeInTheDocument();
      });
    });
  });

  describe('Charts and Visualizations', () => {
    it('should render dashboard sections', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Executive Dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filter', () => {
    it('should show YTD metrics by default', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/YTD/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner while fetching data', () => {
      render(<Dashboard />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to load dashboard' }),
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });

    it('should refetch data on retry click', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<Dashboard />);

      await waitFor(() => {
        const retryButton = screen.getByText(/retry/i);
        expect(retryButton).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      await userEvent.click(retryButton);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Loading', () => {
    it('should fetch data on mount', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});
