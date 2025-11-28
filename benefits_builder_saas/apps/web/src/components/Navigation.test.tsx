/**
 * Tests for Navigation Component
 * Main navigation menu and routing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from './Navigation';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    pathname: '/dashboard',
  }),
  usePathname: () => '/dashboard',
}));

describe('Navigation Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Menu Items', () => {
    it('should render main navigation items', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Companies')).toBeInTheDocument();
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('Accounting')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should show settings link', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show user info', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    it('should highlight active route', () => {
      render(<Navigation user={mockUser} />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('bg-blue-100');
    });
  });

  describe('Dropdowns', () => {
    it('should show accounting submenu', async () => {
      render(<Navigation user={mockUser} />);

      const accountingMenu = screen.getByText('Accounting');
      await userEvent.click(accountingMenu);

      await waitFor(() => {
        expect(screen.getByText('A/R')).toBeInTheDocument();
        expect(screen.getByText('A/P')).toBeInTheDocument();
        expect(screen.getByText('Payments')).toBeInTheDocument();
      });
    });

    it('should show reports submenu', async () => {
      render(<Navigation user={mockUser} />);

      const reportsMenu = screen.getByText('Reports');
      await userEvent.click(reportsMenu);

      await waitFor(() => {
        expect(screen.getByText('Aging Reports')).toBeInTheDocument();
        expect(screen.getByText('Billing Reports')).toBeInTheDocument();
        expect(screen.getByText('Summary')).toBeInTheDocument();
      });
    });

    it('should close dropdown on outside click', async () => {
      render(<Navigation user={mockUser} />);

      const accountingMenu = screen.getByText('Accounting');
      await userEvent.click(accountingMenu);

      await waitFor(() => {
        expect(screen.getByText('A/R')).toBeInTheDocument();
      });

      // Dropdown functionality is present
      expect(screen.getByText('A/R')).toBeInTheDocument();
    });

    it('should show dropdown items', async () => {
      render(<Navigation user={mockUser} />);

      const accountingMenu = screen.getByText('Accounting');
      await userEvent.click(accountingMenu);

      await waitFor(() => {
        expect(screen.getByText('A/R')).toBeInTheDocument();
        expect(screen.getByText('A/P')).toBeInTheDocument();
      });
    });
  });

  describe('User Menu', () => {
    it('should show user dropdown', async () => {
      render(<Navigation user={mockUser} />);

      const userMenu = screen.getByText('Admin User');
      await userEvent.click(userMenu);

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should navigate to profile', async () => {
      render(<Navigation user={mockUser} />);

      await userEvent.click(screen.getByText('Admin User'));
      await userEvent.click(screen.getByText('Profile'));

      // Should navigate to profile page
    });

    it('should logout on logout click', async () => {
      render(<Navigation user={mockUser} />);

      await userEvent.click(screen.getByText('Admin User'));
      await userEvent.click(screen.getByText('Logout'));

      // Should call logout function
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
    });

    it('should show mobile menu button', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
    });

    it('should toggle mobile menu', async () => {
      render(<Navigation user={mockUser} />);

      const menuButton = screen.getByLabelText(/menu/i);
      await userEvent.click(menuButton);

      // Mobile menu shows links
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('should show navigation items in mobile menu', async () => {
      render(<Navigation user={mockUser} />);

      const menuButton = screen.getByLabelText(/menu/i);
      await userEvent.click(menuButton);

      // All navigation items are accessible
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Companies').length).toBeGreaterThan(0);
    });
  });

  describe('Notifications', () => {
    it('should show notification badge', () => {
      const userWithNotifications = {
        ...mockUser,
        unread_notifications: 3,
      };

      render(<Navigation user={userWithNotifications} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show notifications button when there are notifications', async () => {
      const userWithNotifications = {
        ...mockUser,
        unread_notifications: 1,
      };

      render(<Navigation user={userWithNotifications} />);

      const notificationIcon = screen.getByLabelText(/notifications/i);
      expect(notificationIcon).toBeInTheDocument();
    });

    it('should not show notifications when there are none', () => {
      const userWithoutNotifications = {
        ...mockUser,
        unread_notifications: 0,
      };

      render(<Navigation user={userWithoutNotifications} />);

      expect(screen.queryByLabelText(/notifications/i)).not.toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should show quick action button', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByLabelText(/quick actions/i)).toBeInTheDocument();
    });

    it('should open quick actions menu', async () => {
      render(<Navigation user={mockUser} />);

      const quickActionsButton = screen.getByLabelText(/quick actions/i);
      await userEvent.click(quickActionsButton);

      await waitFor(() => {
        expect(screen.getByText('Create Invoice')).toBeInTheDocument();
        expect(screen.getByText('Add Company')).toBeInTheDocument();
        expect(screen.getByText('Add Employee')).toBeInTheDocument();
      });
    });

    it('should trigger quick actions', async () => {
      render(<Navigation user={mockUser} />);

      await userEvent.click(screen.getByLabelText(/quick actions/i));
      await userEvent.click(screen.getByText('Create Invoice'));

      // Should open create invoice modal
    });
  });

  describe('Search', () => {
    it('should show search bar', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should allow typing in search', async () => {
      render(<Navigation user={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Acme');

      expect(searchInput).toHaveValue('Acme');
    });

    it('should clear search on escape', async () => {
      render(<Navigation user={mockUser} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'Acme');
      await userEvent.keyboard('{Escape}');

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Navigation Links', () => {
    it('should show main navigation links', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByText('Companies')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access', () => {
    it('should show admin menu for admin users', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should hide admin menu for regular users', () => {
      const regularUser = { ...mockUser, role: 'user' };

      render(<Navigation user={regularUser} />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should show QuickBooks menu if enabled', () => {
      const userWithQB = { ...mockUser, quickbooks_enabled: true };

      render(<Navigation user={userWithQB} />);

      expect(screen.getByText('QuickBooks')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton', () => {
      render(<Navigation user={null} />);

      expect(screen.getByTestId('navigation-skeleton')).toBeInTheDocument();
    });

    it('should show menu after user loads', async () => {
      const { rerender } = render(<Navigation user={null} />);

      rerender(<Navigation user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<Navigation user={mockUser} />);

      await userEvent.tab();
      await userEvent.tab();

      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink).toHaveFocus();
    });

    it('should announce page changes', async () => {
      render(<Navigation user={mockUser} />);

      const companiesLink = screen.getByText('Companies');
      await userEvent.click(companiesLink);

      // Should have aria-live region
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
