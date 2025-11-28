/**
 * Tests for BenefitCatalog Component
 * Display available benefits and pricing tiers
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BenefitCatalog from './BenefitCatalog';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

global.fetch = jest.fn();

describe('BenefitCatalog Component', () => {
  const mockBenefits = [
    {
      id: 'benefit-1',
      name: 'Health Insurance',
      description: 'Comprehensive health coverage',
      category: 'health',
      cost: 500.0,
      per: 'month',
      tax_advantage: 'pre-tax',
      popular: true,
    },
    {
      id: 'benefit-2',
      name: 'Dental Insurance',
      description: 'Full dental coverage',
      category: 'dental',
      cost: 50.0,
      per: 'month',
      tax_advantage: 'pre-tax',
      popular: false,
    },
    {
      id: 'benefit-3',
      name: 'Vision Insurance',
      description: 'Vision care coverage',
      category: 'vision',
      cost: 25.0,
      per: 'month',
      tax_advantage: 'pre-tax',
      popular: false,
    },
    {
      id: 'benefit-4',
      name: '401(k) Contribution',
      description: 'Retirement savings',
      category: 'retirement',
      cost: 200.0,
      per: 'month',
      tax_advantage: 'pre-tax',
      popular: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: mockBenefits }),
    });
  });

  describe('Catalog Display', () => {
    it('should display all benefits', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
        expect(screen.getByText('Dental Insurance')).toBeInTheDocument();
        expect(screen.getByText('Vision Insurance')).toBeInTheDocument();
        expect(screen.getByText('401(k) Contribution')).toBeInTheDocument();
      });
    });

    it('should show benefit descriptions', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Comprehensive health coverage')).toBeInTheDocument();
      });
    });

    it('should display benefit costs', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText(/\$500/)).toBeInTheDocument();
        expect(screen.getByText(/\$50/)).toBeInTheDocument();
        expect(screen.getByText(/\$25/)).toBeInTheDocument();
      });
    });

    it('should show popular badge', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        const popularBadges = screen.getAllByText(/popular/i);
        expect(popularBadges).toHaveLength(2);
      });
    });

    it('should group by category', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText(/health/i)).toBeInTheDocument();
        expect(screen.getByText(/dental/i)).toBeInTheDocument();
        expect(screen.getByText(/retirement/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should show filter controls', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/tax advantage/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should show search input', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

  });

  describe('Sorting', () => {
    it('should show sort select', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByLabelText(/sort/i)).toBeInTheDocument();
      });
    });
  });

  describe('Benefit Selection', () => {
    it('should select benefit', async () => {
      render(<BenefitCatalog onSelect={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText(/select/i)[0];
      await userEvent.click(selectButton);

      // Selection callback should be called
    });

    it('should allow multiple selections', async () => {
      const onSelect = jest.fn();
      render(<BenefitCatalog onSelect={onSelect} multiSelect={true} />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const selectButtons = screen.getAllByText(/select/i);
      await userEvent.click(selectButtons[0]);
      await userEvent.click(selectButtons[1]);

      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('should show selected state', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText(/select/i)[0];
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/selected/i)).toBeInTheDocument();
      });
    });

    it('should deselect benefit', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText(/select/i)[0];
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/selected/i)).toBeInTheDocument();
      });

      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Tax Savings Calculator', () => {
    it('should calculate tax savings', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const calculateButton = screen.getAllByText(/calculate savings/i)[0];
      await userEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/\$38.25/)).toBeInTheDocument(); // 7.65% of $500
      });
    });

    it('should show annual savings', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const annualToggle = screen.getByLabelText(/annual/i);
      await userEvent.click(annualToggle);

      await waitFor(() => {
        expect(screen.getByText(/\$6,000/)).toBeInTheDocument(); // $500 * 12
      });
    });

    it('should calculate combined savings', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const selectButtons = screen.getAllByText(/select/i);
      await userEvent.click(selectButtons[0]); // Health $500
      await userEvent.click(selectButtons[1]); // Dental $50

      await waitFor(() => {
        expect(screen.getByText(/total savings/i)).toBeInTheDocument();
        expect(screen.getByText(/\$42.08/)).toBeInTheDocument(); // 7.65% of $550
      });
    });
  });

  describe('Benefit Details', () => {
    it('should expand benefit details', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const expandButton = screen.getAllByText(/details/i)[0];
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/comprehensive health coverage/i)).toBeVisible();
      });
    });

    it('should show eligibility requirements', async () => {
      const benefitsWithEligibility = mockBenefits.map((b) => ({
        ...b,
        eligibility: 'Full-time employees only',
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: benefitsWithEligibility }),
      });

      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const expandButton = screen.getAllByText(/details/i)[0];
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/full-time employees only/i)).toBeInTheDocument();
      });
    });

    it('should show coverage details', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const expandButton = screen.getAllByText(/details/i)[0];
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/coverage/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comparison Mode', () => {
    it('should enable comparison mode', async () => {
      render(<BenefitCatalog />);

      const compareToggle = screen.getByLabelText(/compare/i);
      await userEvent.click(compareToggle);

      await waitFor(() => {
        expect(screen.getByText(/select benefits to compare/i)).toBeInTheDocument();
      });
    });

    it('should compare selected benefits', async () => {
      render(<BenefitCatalog />);

      const compareToggle = screen.getByLabelText(/compare/i);
      await userEvent.click(compareToggle);

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);

      const compareButton = screen.getByText(/compare selected/i);
      await userEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText(/comparison/i)).toBeInTheDocument();
      });
    });

    it('should limit comparison to 3 benefits', async () => {
      render(<BenefitCatalog />);

      const compareToggle = screen.getByLabelText(/compare/i);
      await userEvent.click(compareToggle);

      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);
      await userEvent.click(checkboxes[2]);
      await userEvent.click(checkboxes[3]);

      await waitFor(() => {
        expect(screen.getByText(/maximum 3 benefits/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<BenefitCatalog />);

      expect(screen.getByTestId('catalog-skeleton')).toBeInTheDocument();
    });

    it('should show benefits after loading', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to load' }),
      });

      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed' }),
      });

      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });

    it('should retry on retry button click', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Failed' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, data: mockBenefits }),
        });

      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });
    });

    it('should handle empty catalog', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: [] }),
      });

      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText(/no benefits available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      await userEvent.tab();

      const firstButton = screen.getAllByText(/select/i)[0];
      expect(firstButton).toHaveFocus();
    });

    it('should announce selections', async () => {
      render(<BenefitCatalog />);

      await waitFor(() => {
        expect(screen.getByText('Health Insurance')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText(/select/i)[0];
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });
});
