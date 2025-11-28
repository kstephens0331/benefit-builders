/**
 * Tests for Settings Component
 * User settings, preferences, and configuration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

global.fetch = jest.fn();

describe('Settings Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
    preferences: {
      email_notifications: true,
      theme: 'light',
      timezone: 'America/New_York',
    },
  };

  const mockSettings = {
    company: {
      name: 'Benefits Builder',
      logo_url: 'https://example.com/logo.png',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
      phone: '555-1234',
      email: 'support@benefitsbuilder.com',
    },
    billing: {
      default_payment_terms: 'Net 30',
      late_fee_rate: 1.5,
      invoice_prefix: 'INV-',
    },
    email: {
      smtp_host: 'smtp.example.com',
      smtp_port: 587,
      from_email: 'noreply@benefitsbuilder.com',
      from_name: 'Benefits Builder',
    },
    quickbooks: {
      enabled: true,
      connected: true,
      last_sync: '2024-11-24T10:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: mockSettings }),
    });
  });

  describe('Profile Settings', () => {
    it('should show profile section', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument();
      });
    });

    it('should have name and email inputs', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });

  });

  describe('Password Change', () => {
    it('should show password change form', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Preferences', () => {
    it('should show notification toggles', () => {
      render(<Settings user={mockUser} />);

      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/invoice reminders/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment confirmations/i)).toBeInTheDocument();
    });

    it('should toggle email notifications', async () => {
      render(<Settings user={mockUser} />);

      const toggle = screen.getByLabelText(/email notifications/i);
      await userEvent.click(toggle);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"email_notifications":false'),
          })
        );
      });
    });

    it('should save notification preferences', async () => {
      render(<Settings user={mockUser} />);

      await userEvent.click(screen.getByLabelText(/invoice reminders/i));
      await userEvent.click(screen.getByLabelText(/payment confirmations/i));

      const saveButton = screen.getByText(/save.*preferences/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/preferences.*saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Appearance Settings', () => {
    it('should show theme selector', () => {
      render(<Settings user={mockUser} />);

      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });

    it('should switch to dark theme', async () => {
      render(<Settings user={mockUser} />);

      const themeSelect = screen.getByLabelText(/theme/i);
      await userEvent.selectOptions(themeSelect, 'dark');

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark');
      });
    });

    it('should persist theme preference', async () => {
      render(<Settings user={mockUser} />);

      const themeSelect = screen.getByLabelText(/theme/i);
      await userEvent.selectOptions(themeSelect, 'dark');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/'),
          expect.objectContaining({
            body: expect.stringContaining('"theme":"dark"'),
          })
        );
      });
    });
  });

  describe('Company Settings', () => {
    it('should display company information', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Benefits Builder')).toBeInTheDocument();
        expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
      });
    });

    it('should update company information', async () => {
      render(<Settings user={mockUser} />);

      const nameInput = screen.getByDisplayValue('Benefits Builder');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Company Name');

      const saveButton = screen.getByText(/save.*company/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings/company'),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    it('should upload company logo', async () => {
      render(<Settings user={mockUser} />);

      const file = new File(['logo'], 'logo.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText(/upload logo/i);

      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/upload'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Billing Settings', () => {
    it('should display billing configuration', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Net 30')).toBeInTheDocument();
        expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
      });
    });

    it('should update payment terms', async () => {
      render(<Settings user={mockUser} />);

      const termsSelect = screen.getByLabelText(/payment terms/i);
      await userEvent.selectOptions(termsSelect, 'Net 15');

      const saveButton = screen.getByText(/save.*billing/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings/billing'),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    it('should update late fee rate', async () => {
      render(<Settings user={mockUser} />);

      const lateFeeInput = screen.getByLabelText(/late fee rate/i);
      await userEvent.clear(lateFeeInput);
      await userEvent.type(lateFeeInput, '2.0');

      const saveButton = screen.getByText(/save.*billing/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"late_fee_rate":2'),
          })
        );
      });
    });
  });

  describe('Email Settings', () => {
    it('should display SMTP configuration', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('smtp.example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('587')).toBeInTheDocument();
      });
    });

    it('should test SMTP connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, connection: 'success' }),
      });

      render(<Settings user={mockUser} />);

      const testButton = screen.getByText(/test.*connection/i);
      await userEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/connection.*successful/i)).toBeInTheDocument();
      });
    });

    it('should handle SMTP connection errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Connection failed' }),
      });

      render(<Settings user={mockUser} />);

      const testButton = screen.getByText(/test.*connection/i);
      await userEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/connection.*failed/i)).toBeInTheDocument();
      });
    });

    it('should update from email', async () => {
      render(<Settings user={mockUser} />);

      const fromEmailInput = screen.getByLabelText(/from email/i);
      await userEvent.clear(fromEmailInput);
      await userEvent.type(fromEmailInput, 'support@benefitsbuilder.com');

      const saveButton = screen.getByText(/save.*email/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings/email'),
          expect.any(Object)
        );
      });
    });
  });

  describe('QuickBooks Integration', () => {
    it('should show QuickBooks status', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    it('should show last sync time', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/last sync/i)).toBeInTheDocument();
      });
    });

    it('should connect to QuickBooks', async () => {
      const notConnectedSettings = {
        ...mockSettings,
        quickbooks: {
          enabled: true,
          connected: false,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: notConnectedSettings }),
      });

      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/connect.*quickbooks/i)).toBeInTheDocument();
      });

      const connectButton = screen.getByText(/connect.*quickbooks/i);
      await userEvent.click(connectButton);

      // Should open OAuth window
    });

    it('should disconnect from QuickBooks', async () => {
      render(<Settings user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/disconnect/i)).toBeInTheDocument();
      });

      const disconnectButton = screen.getByText(/disconnect/i);
      await userEvent.click(disconnectButton);

      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/accounting/quickbooks/disconnect'),
          expect.any(Object)
        );
      });
    });

    it('should sync with QuickBooks', async () => {
      render(<Settings user={mockUser} />);

      const syncButton = screen.getByText(/sync now/i);
      await userEvent.click(syncButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/quickbooks/sync-bidirectional'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Security Settings', () => {
    it('should show two-factor authentication', () => {
      render(<Settings user={mockUser} />);

      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });

    it('should enable 2FA', async () => {
      render(<Settings user={mockUser} />);

      const enable2FAButton = screen.getByText(/enable.*2fa/i);
      await userEvent.click(enable2FAButton);

      await waitFor(() => {
        expect(screen.getByText(/scan.*qr code/i)).toBeInTheDocument();
      });
    });

    it('should show active sessions', () => {
      render(<Settings user={mockUser} />);

      expect(screen.getByText(/active sessions/i)).toBeInTheDocument();
    });

    it('should revoke session', async () => {
      render(<Settings user={mockUser} />);

      const revokeButton = screen.getByText(/revoke/i);
      await userEvent.click(revokeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/sessions/'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

      render(<Settings user={mockUser} />);

      const saveButton = screen.getByText(/save.*profile/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      render(<Settings user={mockUser} />);

      const nameInput = screen.getByLabelText(/name/i);
      await userEvent.clear(nameInput);

      const saveButton = screen.getByText(/save.*profile/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
      });
    });
  });
});
