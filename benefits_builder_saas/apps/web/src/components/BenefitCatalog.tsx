"use client";

import { useEffect, useState } from "react";

interface Benefit {
  id: string;
  name: string;
  description: string;
  category: string;
  cost: number;
  per: string;
  tax_advantage: string;
  popular: boolean;
  eligibility?: string;
}

interface BenefitCatalogProps {
  onSelect?: (benefit: Benefit) => void;
  multiSelect?: boolean;
}

export default function BenefitCatalog({ onSelect, multiSelect = false }: BenefitCatalogProps) {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [taxFilter, setTaxFilter] = useState("all");
  const [popularOnly, setPopularOnly] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [selectedBenefits, setSelectedBenefits] = useState<Set<string>>(new Set());
  const [expandedBenefits, setExpandedBenefits] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);

  useEffect(() => {
    fetchBenefits();
  }, []);

  async function fetchBenefits() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/benefits");
      const json = await res.json();
      if (res.ok && json.ok) {
        setBenefits(json.data);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (err) {
      setError("Failed to load");
      console.error("Failed to load benefits:", err);
    }
    setLoading(false);
  }

  const handleRetry = () => {
    fetchBenefits();
  };

  const handleSelect = (benefit: Benefit) => {
    if (compareMode) {
      const newSelected = new Set(selectedBenefits);
      if (newSelected.has(benefit.id)) {
        newSelected.delete(benefit.id);
      } else if (newSelected.size < 3) {
        newSelected.add(benefit.id);
      }
      setSelectedBenefits(newSelected);
      return;
    }

    const newSelected = new Set(selectedBenefits);
    if (newSelected.has(benefit.id)) {
      newSelected.delete(benefit.id);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(benefit.id);
    }
    setSelectedBenefits(newSelected);
    if (onSelect) {
      onSelect(benefit);
    }
  };

  const toggleExpanded = (benefitId: string) => {
    const newExpanded = new Set(expandedBenefits);
    if (newExpanded.has(benefitId)) {
      newExpanded.delete(benefitId);
    } else {
      newExpanded.add(benefitId);
    }
    setExpandedBenefits(newExpanded);
  };

  const filteredBenefits = benefits
    .filter((b) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!b.name.toLowerCase().includes(query) && !b.description.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (categoryFilter !== "all" && b.category !== categoryFilter) {
        return false;
      }
      if (taxFilter !== "all" && b.tax_advantage !== taxFilter) {
        return false;
      }
      if (popularOnly && !b.popular) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "cost-asc":
          return a.cost - b.cost;
        case "cost-desc":
          return b.cost - a.cost;
        case "name":
          return a.name.localeCompare(b.name);
        case "popular":
          return b.popular ? 1 : -1;
        default:
          return 0;
      }
    });

  const calculateSavings = (cost: number) => {
    const taxRate = 0.0765; // 7.65% FICA
    return cost * taxRate;
  };

  const totalSavings = Array.from(selectedBenefits)
    .map((id) => benefits.find((b) => b.id === id))
    .filter((b): b is Benefit => b !== undefined)
    .reduce((sum, b) => sum + calculateSavings(b.cost), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div data-testid="catalog-skeleton" className="space-y-4">
            <div className="animate-pulse bg-gray-200 h-48 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-48 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-red-600">{error}</div>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (benefits.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">No benefits available</div>
        </div>
      </div>
    );
  }

  return (
    <div role="main" className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Benefit Catalog</h1>
          <p className="text-gray-600 mt-1">Browse and select employee benefits</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search benefits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            />

            {/* Category Filter */}
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="all">All Categories</option>
              <option value="health">Health</option>
              <option value="dental">Dental</option>
              <option value="vision">Vision</option>
              <option value="retirement">Retirement</option>
            </select>

            {/* Tax Advantage Filter */}
            <select
              aria-label="Filter by tax advantage"
              value={taxFilter}
              onChange={(e) => setTaxFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="all">All Tax Types</option>
              <option value="pre-tax">Pre-tax</option>
              <option value="post-tax">Post-tax</option>
            </select>

            {/* Sort */}
            <select
              aria-label="Sort benefits by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="name">Sort by Name</option>
              <option value="cost-asc">Cost: Low to High</option>
              <option value="cost-desc">Cost: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Show popular benefits only"
                checked={popularOnly}
                onChange={(e) => setPopularOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Popular Only</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Enable compare mode"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Compare</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label="Show annual costs"
                checked={showAnnual}
                onChange={(e) => setShowAnnual(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Annual</span>
            </label>

            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setTaxFilter("all");
                setPopularOnly(false);
                setSortBy("name");
              }}
              className="text-sm text-blue-600 hover:underline ml-auto"
            >
              Clear Filters
            </button>
          </div>

          {compareMode && selectedBenefits.size >= 3 && (
            <div className="text-sm text-yellow-600">Maximum 3 benefits can be compared</div>
          )}

          {compareMode && selectedBenefits.size > 0 && (
            <button
              onClick={() => {}}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Compare Selected ({selectedBenefits.size})
            </button>
          )}
        </div>

        {/* Results Count */}
        {filteredBenefits.length === 0 && (
          <div className="text-center text-gray-600 py-8">No benefits found</div>
        )}

        {/* Benefits Grid */}
        {compareMode && (
          <div className="mb-4 text-sm text-gray-600">
            Select benefits to compare (max 3)
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredBenefits.map((benefit) => {
            const isSelected = selectedBenefits.has(benefit.id);
            const isExpanded = expandedBenefits.has(benefit.id);
            const displayCost = showAnnual ? benefit.cost * 12 : benefit.cost;

            return (
              <article
                key={benefit.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{benefit.name}</h3>
                    <span className="text-xs text-gray-500 uppercase">{benefit.category}</span>
                  </div>
                  {benefit.popular && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Popular
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{benefit.description}</p>

                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ${displayCost.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">per {showAnnual ? "year" : benefit.per}</div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {compareMode ? (
                    <input
                      type="checkbox"
                      role="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelect(benefit)}
                      disabled={!isSelected && selectedBenefits.size >= 3}
                      className="rounded"
                    />
                  ) : (
                    <button
                      onClick={() => handleSelect(benefit)}
                      className={`flex-1 py-2 rounded font-medium ${
                        isSelected
                          ? "bg-green-600 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  )}

                  <button
                    onClick={() => toggleExpanded(benefit.id)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => {}}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Calculate Savings
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Tax Advantage:</span> {benefit.tax_advantage}
                    </div>
                    {benefit.eligibility && (
                      <div className="text-sm">
                        <span className="font-medium">Eligibility:</span> {benefit.eligibility}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Coverage:</span> Full coverage details
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Total Savings */}
        {selectedBenefits.size > 0 && !compareMode && (
          <div className="bg-green-50 border border-green-200 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-green-900 mb-2">Total Savings</h3>
            <div className="text-3xl font-bold text-green-700">
              ${totalSavings.toFixed(2)}
            </div>
            <div className="text-sm text-green-600 mt-1">Estimated monthly FICA savings</div>
          </div>
        )}

        {/* Comparison View */}
        {compareMode && selectedBenefits.size > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Comparison</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cost</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from(selectedBenefits).map((id) => {
                    const benefit = benefits.find((b) => b.id === id);
                    if (!benefit) return null;
                    return (
                      <tr key={id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{benefit.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">${benefit.cost}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{benefit.tax_advantage}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Accessibility live region */}
      <div role="status" aria-live="polite" className="sr-only">
        {isSelected && "Benefit selected"}
      </div>
    </div>
  );
}
