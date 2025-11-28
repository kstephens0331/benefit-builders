/**
 * Utility Functions
 *
 * Common utility functions used throughout the application
 */

import { type ClassValue, clsx } from "clsx";

/**
 * Combines multiple class names into a single string
 * Handles conditional classes and removes duplicates
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format currency values
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numValue);
}

/**
 * Format date values
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
