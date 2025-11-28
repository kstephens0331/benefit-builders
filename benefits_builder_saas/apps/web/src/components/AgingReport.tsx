"use client";

import { useState } from "react";
import {
  AgingItem,
  AgingSummary,
  AgingBucket,
  filterByBucket,
  sortByDaysOverdue,
} from "@/lib/aging";

type Props = {
  items: AgingItem[];
  summary: AgingSummary;
  type: "ar" | "ap";
};

export default function AgingReport({ items: initialItems, summary, type }: Props) {
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | "all">("all");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getBucketColor = (bucket: AgingBucket) => {
    switch (bucket) {
      case "current":
        return "bg-green-100 text-green-800";
      case "30":
        return "bg-yellow-100 text-yellow-800";
      case "60":
        return "bg-orange-100 text-orange-800";
      case "90+":
        return "bg-red-100 text-red-800";
    }
  };

  const filteredItems =
    selectedBucket === "all"
      ? sortByDaysOverdue(initialItems)
      : sortByDaysOverdue(filterByBucket(initialItems, selectedBucket));

  const isAR = type === "ar";
  const title = isAR ? "Accounts Receivable Aging" : "Accounts Payable Aging";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-slate-600 text-sm">
          30/60/90+ day aging analysis for {isAR ? "receivables" : "payables"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div
          onClick={() => setSelectedBucket("current")}
          className={`bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
            selectedBucket === "current" ? "ring-2 ring-green-500" : ""
          }`}
        >
          <div className="text-sm text-green-700 font-medium">Current</div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(summary.current)}
          </div>
          <div className="text-xs text-slate-500">Not overdue</div>
        </div>

        <div
          onClick={() => setSelectedBucket("30")}
          className={`bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
            selectedBucket === "30" ? "ring-2 ring-yellow-500" : ""
          }`}
        >
          <div className="text-sm text-yellow-700 font-medium">1-30 Days</div>
          <div className="text-2xl font-bold text-yellow-900">
            {formatCurrency(summary.days_30)}
          </div>
          <div className="text-xs text-slate-500">Slightly overdue</div>
        </div>

        <div
          onClick={() => setSelectedBucket("60")}
          className={`bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
            selectedBucket === "60" ? "ring-2 ring-orange-500" : ""
          }`}
        >
          <div className="text-sm text-orange-700 font-medium">31-60 Days</div>
          <div className="text-2xl font-bold text-orange-900">
            {formatCurrency(summary.days_60)}
          </div>
          <div className="text-xs text-slate-500">Overdue</div>
        </div>

        <div
          onClick={() => setSelectedBucket("90+")}
          className={`bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
            selectedBucket === "90+" ? "ring-2 ring-red-500" : ""
          }`}
        >
          <div className="text-sm text-red-700 font-medium">90+ Days</div>
          <div className="text-2xl font-bold text-red-900">
            {formatCurrency(summary.days_90_plus)}
          </div>
          <div className="text-xs text-slate-500">Severely overdue</div>
        </div>

        <div
          onClick={() => setSelectedBucket("all")}
          className={`bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
            selectedBucket === "all" ? "ring-2 ring-blue-500" : ""
          }`}
        >
          <div className="text-sm text-blue-700 font-medium">Total</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(summary.total)}
          </div>
          <div className="text-xs text-slate-500">All outstanding</div>
        </div>
      </div>

      {/* Aging Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-lg">
            {selectedBucket === "all" ? "All Items" : `${selectedBucket} Day Bucket`}
          </h3>
          <p className="text-sm text-slate-600">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4">{isAR ? "Company" : "Vendor"}</th>
                <th className="text-left py-3 px-4">
                  {isAR ? "Invoice #" : "Bill #"}
                </th>
                <th className="text-left py-3 px-4">Due Date</th>
                <th className="text-center py-3 px-4">Days Overdue</th>
                <th className="text-right py-3 px-4">Amount Due</th>
                <th className="text-center py-3 px-4">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">
                    {isAR ? item.company_name : item.vendor_name}
                  </td>
                  <td className="py-3 px-4">
                    {isAR ? item.invoice_number : item.bill_number}
                  </td>
                  <td className="py-3 px-4">{formatDate(item.due_date)}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-sm font-medium ${
                        item.days_overdue === 0
                          ? "bg-green-100 text-green-800"
                          : item.days_overdue <= 30
                          ? "bg-yellow-100 text-yellow-800"
                          : item.days_overdue <= 60
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.days_overdue === 0 ? "Current" : `${item.days_overdue} days`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    {formatCurrency(item.amount_due)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getBucketColor(
                        item.bucket
                      )}`}
                    >
                      {item.bucket === "90+" ? "90+ Days" : `${item.bucket} Days`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            No items in this aging bucket.
          </div>
        )}
      </div>

      {/* Visual Chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Aging Distribution</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-700 font-medium">Current</span>
              <span className="font-bold">
                {((summary.current / summary.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full transition-all"
                style={{ width: `${(summary.current / summary.total) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-yellow-700 font-medium">1-30 Days</span>
              <span className="font-bold">
                {((summary.days_30 / summary.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-yellow-500 h-full rounded-full transition-all"
                style={{ width: `${(summary.days_30 / summary.total) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-orange-700 font-medium">31-60 Days</span>
              <span className="font-bold">
                {((summary.days_60 / summary.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full transition-all"
                style={{ width: `${(summary.days_60 / summary.total) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-700 font-medium">90+ Days</span>
              <span className="font-bold">
                {((summary.days_90_plus / summary.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all"
                style={{ width: `${(summary.days_90_plus / summary.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
