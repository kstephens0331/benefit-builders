/**
 * Tests for QuickBooksSyncDashboard Component
 * Monitors QuickBooks sync status and operations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickBooksSyncDashboard from './QuickBooksSyncDashboard';

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
global.confirm = jest.fn();

describe('QuickBooksSyncDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    delete process.env.NEXT_PUBLIC_CRON_SECRET;
  });

  describe('Not Connected State', () => {
    it('should show connect button when not connected', () => {
      render(
        <QuickBooksSyncDashboard
          connected={false}
          lastSync={null}
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      expect(screen.getByText('QuickBooks Integration')).toBeInTheDocument();
      expect(screen.getByText(/connect to quickbooks/i)).toBeInTheDocument();
      expect(screen.getByText('Connect QuickBooks')).toBeInTheDocument();
    });

    it('should link to QuickBooks OAuth when clicking connect', () => {
      render(
        <QuickBooksSyncDashboard
          connected={false}
          lastSync={null}
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      const connectLink = screen.getByRole('link', { name: /connect quickbooks/i });
      expect(connectLink).toHaveAttribute('href', '/api/accounting/quickbooks/auth');
    });

    it('should not show sync dashboard when disconnected', () => {
      render(
        <QuickBooksSyncDashboard
          connected={false}
          lastSync={null}
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      expect(screen.queryByText('QuickBooks Sync Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    const mockSyncHistory = [
      {
        id: 'log-1',
        sync_type: 'bidirectional',
        customers_pushed: 5,
        customers_pulled: 0,
        invoices_pushed: 10,
        invoices_pulled: 0,
        payments_pushed: 0,
        payments_pulled: 3,
        errors: null,
        synced_at: '2024-11-20T10:00:00Z',
        duration_ms: 5000,
      },
      {
        id: 'log-2',
        sync_type: 'manual',
        customers_pushed: 2,
        customers_pulled: 0,
        invoices_pushed: 5,
        invoices_pulled: 0,
        payments_pushed: 0,
        payments_pulled: 1,
        errors: { customers: ['Error syncing customer 1'] },
        synced_at: '2024-11-19T15:00:00Z',
        duration_ms: 3000,
      },
    ];

    it('should show connected status', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={mockSyncHistory}
        />
      );

      expect(screen.getByText('QuickBooks Sync Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/quickbooks is connected/i)).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should display last sync time', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={mockSyncHistory}
        />
      );

      expect(screen.getByText('Last Sync')).toBeInTheDocument();
      expect(screen.getByText(/nov.*20/i)).toBeInTheDocument();
    });

    it('should display never synced when no last sync', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync={null}
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={[]}
        />
      );

      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should display pending sync counts', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={mockSyncHistory}
        />
      );

      expect(screen.getByText('Pending Sync')).toBeInTheDocument();
      expect(screen.getByText('Customers:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Invoices:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display sync history table', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={mockSyncHistory}
        />
      );

      expect(screen.getByText('Recent Sync History')).toBeInTheDocument();
      expect(screen.getByText('bidirectional')).toBeInTheDocument();
      expect(screen.getByText('manual')).toBeInTheDocument();
    });

    it('should show sync statistics in table', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={mockSyncHistory}
        />
      );

      // Check for pushed/pulled indicators
      expect(screen.getByText('↑5')).toBeInTheDocument(); // customers pushed
      expect(screen.getByText('↑10')).toBeInTheDocument(); // invoices pushed
      expect(screen.getByText('↓3')).toBeInTheDocument(); // payments pulled
    });

    it('should show success status for sync without errors', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={mockSyncHistory}
        />
      );

      const successBadges = screen.getAllByText('Success');
      expect(successBadges.length).toBeGreaterThan(0);
    });

    it('should show partial status for sync with errors', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={mockSyncHistory}
        />
      );

      expect(screen.getByText('Partial')).toBeInTheDocument();
    });

    it('should show empty state when no sync history', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync={null}
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      expect(screen.getByText(/no sync history yet/i)).toBeInTheDocument();
    });

    it('should trigger manual sync when clicking Sync Now', async () => {
      process.env.NEXT_PUBLIC_CRON_SECRET = 'test-secret';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          results: {
            customers: { pushed: 2 },
            invoices: { pushed: 5 },
            payments: { pulled: 1 },
          },
        }),
      });

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={[]}
        />
      );

      const syncButton = screen.getByText('Sync Now');
      await userEvent.click(syncButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/quickbooks/sync-bidirectional',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-secret',
            }),
          })
        );
      });
    });

    it('should disable sync button while syncing', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={[]}
        />
      );

      const syncButton = screen.getByText('Sync Now');
      await userEvent.click(syncButton);

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      expect(syncButton).toBeDisabled();
    });

    it('should show success message after manual sync', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          results: {
            customers: { pushed: 2 },
            invoices: { pushed: 5 },
            payments: { pulled: 1 },
          },
        }),
      });

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={[]}
        />
      );

      const syncButton = screen.getByText('Sync Now');
      await userEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText(/sync completed/i)).toBeInTheDocument();
        expect(screen.getByText(/2 customers/i)).toBeInTheDocument();
        expect(screen.getByText(/5 invoices/i)).toBeInTheDocument();
        expect(screen.getByText(/1 payments/i)).toBeInTheDocument();
      });
    });

    it('should show error message if sync fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'Token expired' }),
      });

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 2, invoices: 5 }}
          syncHistory={[]}
        />
      );

      const syncButton = screen.getByText('Sync Now');
      await userEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText(/token expired/i)).toBeInTheDocument();
      });
    });

    it('should prompt confirmation before disconnecting', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      const disconnectButton = screen.getByText('Disconnect');
      await userEvent.click(disconnectButton);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('disconnect QuickBooks')
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should disconnect QuickBooks when confirmed', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      const disconnectButton = screen.getByText('Disconnect');
      await userEvent.click(disconnectButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/accounting/quickbooks/disconnect',
          expect.objectContaining({ method: 'POST' })
        );
        expect(mockPush).toHaveBeenCalledWith('/accounting');
      });
    });

    it('should refresh page after successful sync', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          results: {
            customers: { pushed: 0 },
            invoices: { pushed: 0 },
            payments: { pulled: 0 },
          },
        }),
      });

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      const syncButton = screen.getByText('Sync Now');
      await userEvent.click(syncButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should display how automatic sync works', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      expect(screen.getByText('How Automatic Sync Works')).toBeInTheDocument();
      expect(screen.getByText(/push to quickbooks/i)).toBeInTheDocument();
      expect(screen.getByText(/pull from quickbooks/i)).toBeInTheDocument();
      expect(screen.getByText(/every 3 hours/i)).toBeInTheDocument();
    });

    it('should show next sync time estimate', () => {
      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      expect(screen.getByText(/next sync in/i)).toBeInTheDocument();
      expect(screen.getByText(/minutes/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle disconnect error', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'Failed to disconnect' }),
      });

      render(
        <QuickBooksSyncDashboard
          connected={true}
          lastSync="2024-11-20T10:00:00Z"
          pendingSync={{ customers: 0, invoices: 0 }}
          syncHistory={[]}
        />
      );

      const disconnectButton = screen.getByText('Disconnect');
      await userEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to disconnect/i)).toBeInTheDocument();
      });
    });
  });
});
