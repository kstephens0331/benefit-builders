/**
 * Tests for CompanyDetailManager Component
 * Manages company details and employee list with inline editing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyDetailManager from './CompanyDetailManager';

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
global.confirm = jest.fn();

// Mock fetch
global.fetch = jest.fn();

describe('CompanyDetailManager Component', () => {
  const mockCompany = {
    id: 'comp-123',
    name: 'Test Company',
    state: 'CA',
    model: '8',
    status: 'active',
    tier: '2025',
    employer_rate: 8,
    employee_rate: 0,
    pay_frequency: 'bi-weekly',
  };

  const mockEmployees = [
    {
      id: 'emp-1',
      first_name: 'Jane',
      last_name: 'Smith',
      filing_status: 'single',
      dependents: 0,
      gross_pay: 5000,
      consent_status: 'elect',
      active: true,
      dob: '1990-01-15',
    },
    {
      id: 'emp-2',
      first_name: 'Bob',
      last_name: 'Johnson',
      filing_status: 'married',
      dependents: 2,
      gross_pay: 6000,
      consent_status: 'pending',
      active: true,
      dob: '1985-05-20',
    },
    {
      id: 'emp-3',
      first_name: 'Alice',
      last_name: 'Williams',
      filing_status: 'single',
      dependents: 1,
      gross_pay: 4500,
      consent_status: 'dont',
      active: false,
      dob: '1992-08-10',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: {} }),
    });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  describe('Component Rendering', () => {
    it('should render company name and details', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      expect(screen.getByText('Test Company')).toBeInTheDocument();
      expect(screen.getByText(/CA/)).toBeInTheDocument();
      expect(screen.getByText(/Model 8/)).toBeInTheDocument();
      expect(screen.getByText(/active/)).toBeInTheDocument();
    });

    it('should display edit company button', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      expect(screen.getByText('Edit Company')).toBeInTheDocument();
    });

    it('should display all action buttons in header', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      expect(screen.getByText('View Deductions')).toBeInTheDocument();
      expect(screen.getByText('Add Employee')).toBeInTheDocument();
      expect(screen.getByText('Download Invoice PDF')).toBeInTheDocument();
      expect(screen.getByText('Download Roster PDF')).toBeInTheDocument();
      expect(screen.getByText('Generate Proposal')).toBeInTheDocument();
    });
  });

  describe('Employee List', () => {
    it('should render all employees', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      expect(screen.getByText('Smith, Jane')).toBeInTheDocument();
      expect(screen.getByText('Johnson, Bob')).toBeInTheDocument();
      expect(screen.getByText('Williams, Alice')).toBeInTheDocument();
    });

    it('should display employee details', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      expect(screen.getByText(/Status: elect/)).toBeInTheDocument();
      expect(screen.getByText(/Filing: single/)).toBeInTheDocument();
      expect(screen.getByText(/Dependents: 0/)).toBeInTheDocument();
      expect(screen.getByText(/Gross: \$5000.00/)).toBeInTheDocument();
    });

    it('should show active/inactive status badges', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const activeButtons = screen.getAllByText('active');
      const inactiveButtons = screen.getAllByText('inactive');

      expect(activeButtons.length).toBeGreaterThan(0);
      expect(inactiveButtons.length).toBeGreaterThan(0);
    });

    it('should display edit and delete buttons for each employee', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButtons = screen.getAllByText('Edit');
      const deleteButtons = screen.getAllByText('Delete');

      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('should show empty state when no employees', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={[]} />);

      expect(screen.getByText('No employees yet.')).toBeInTheDocument();
    });
  });

  describe('Employee Active Toggle', () => {
    it('should toggle employee active status', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const activeButtons = screen.getAllByText('active');
      await userEvent.click(activeButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/employees',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"active":false'),
          })
        );
      });
    });

    it('should refresh router after toggling active status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { ...mockEmployees[0], active: false } }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const activeButtons = screen.getAllByText('active');
      await userEvent.click(activeButtons[0]);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should display error if toggle fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'Failed to update employee' }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const activeButtons = screen.getAllByText('active');
      await userEvent.click(activeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to update employee/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Employee Modal', () => {
    it('should open edit modal when clicking edit button', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Jane Smith')).toBeInTheDocument();
      });
    });

    it('should pre-fill form with employee data', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
        const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
        const grossPayInput = screen.getByLabelText(/gross pay/i) as HTMLInputElement;

        expect(firstNameInput.value).toBe('Jane');
        expect(lastNameInput.value).toBe('Smith');
        expect(grossPayInput.value).toBe('5000');
      });
    });

    it('should save employee changes', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Jane Smith')).toBeInTheDocument();
      });

      const grossPayInput = screen.getByLabelText(/gross pay/i);
      await userEvent.clear(grossPayInput);
      await userEvent.type(grossPayInput, '5500');

      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/employees',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"gross_pay":5500'),
          })
        );
      });
    });

    it('should close modal on cancel', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Jane Smith')).toBeInTheDocument();
      });

      const cancelButton = screen.getAllByText('Cancel')[0];
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should update consent status in modal', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Jane Smith')).toBeInTheDocument();
      });

      const consentSelect = screen.getByLabelText(/consent status/i);
      await userEvent.selectOptions(consentSelect, 'dont');

      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/employees',
          expect.objectContaining({
            body: expect.stringContaining('"consent_status":"dont"'),
          })
        );
      });
    });
  });

  describe('Delete Employee', () => {
    it('should prompt for confirmation before deleting', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('DELETE "Jane Smith"')
      );
    });

    it('should delete employee when confirmed', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/employees?id=emp-1'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    it('should not delete if user cancels', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should refresh router after successful deletion', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Company Modal', () => {
    it('should open company edit modal', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButton = screen.getByText('Edit Company');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Company Settings')).toBeInTheDocument();
      });
    });

    it('should pre-fill company form data', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButton = screen.getByText('Edit Company');
      await userEvent.click(editButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/company name/i) as HTMLInputElement;
        const stateInput = screen.getByLabelText(/state/i) as HTMLInputElement;

        expect(nameInput.value).toBe('Test Company');
        expect(stateInput.value).toBe('CA');
      });
    });

    it('should save company changes', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButton = screen.getByText('Edit Company');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Company Settings')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/company name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Company');

      const saveButton = screen.getAllByText('Save Changes')[0];
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/companies',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('Updated Company'),
          })
        );
      });
    });

    it('should close modal on cancel', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const editButton = screen.getByText('Edit Company');
      await userEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Company Settings')).toBeInTheDocument();
      });

      const cancelButton = screen.getAllByText('Cancel')[0];
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Company Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Generate Proposal', () => {
    it('should disable generate proposal when no employees', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={[]} />);

      const generateButton = screen.getByText('Generate Proposal');
      expect(generateButton).toBeDisabled();
    });

    it('should prompt for confirmation before generating', async () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const generateButton = screen.getByText('Generate Proposal');
      await userEvent.click(generateButton);

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Generate proposal for Test Company')
      );
    });

    it('should generate proposal when confirmed', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, proposalId: 'prop-123' }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const generateButton = screen.getByText('Generate Proposal');
      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/proposals/from-employees',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('comp-123'),
          })
        );
      });
    });

    it('should open proposal PDF in new window', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, proposalId: 'prop-123' }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const generateButton = screen.getByText('Generate Proposal');
      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(global.open).toHaveBeenCalledWith(
          '/api/proposals/prop-123/pdf',
          '_blank'
        );
      });
    });

    it('should show loading state while generating', async () => {
      (global.confirm as jest.Mock).mockReturnValue(true);
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const generateButton = screen.getByText('Generate Proposal');
      await userEvent.click(generateButton);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
  });

  describe('Action Links', () => {
    it('should have correct href for deductions link', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const deductionsLink = screen.getByText('View Deductions').closest('a');
      expect(deductionsLink).toHaveAttribute('href', '/companies/comp-123/deductions');
    });

    it('should have correct href for add employee link', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const addEmployeeLink = screen.getByText('Add Employee').closest('a');
      expect(addEmployeeLink).toHaveAttribute('href', '/companies/comp-123/add-employee');
    });

    it('should have correct href for invoice PDF', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const invoiceLink = screen.getByText('Download Invoice PDF').closest('a');
      expect(invoiceLink?.getAttribute('href')).toContain('/companies/comp-123/billing/pdf');
    });

    it('should have correct href for roster PDF', () => {
      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const rosterLink = screen.getByText('Download Roster PDF').closest('a');
      expect(rosterLink).toHaveAttribute('href', '/companies/comp-123/roster/pdf');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when operation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'Network error' }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const activeButtons = screen.getAllByText('active');
      await userEvent.click(activeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing error messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: 'Test error' }),
      });

      render(<CompanyDetailManager company={mockCompany} initialEmployees={mockEmployees} />);

      const activeButtons = screen.getAllByText('active');
      await userEvent.click(activeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      await userEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });
  });
});
