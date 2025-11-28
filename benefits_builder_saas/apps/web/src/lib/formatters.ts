/**
 * Formatting Utilities
 * Currency, dates, phone numbers, SSN, etc.
 */

import { fromCents, toCents } from './money';

/**
 * Format currency amounts
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: { symbol?: string; decimals?: number }
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (num === null || num === undefined || isNaN(num)) {
    return `${options?.symbol ?? '$'}0.00`;
  }

  const symbol = options?.symbol ?? '$';
  const decimals = options?.decimals ?? 2;

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const formatted = formatter.format(Math.abs(num));
  return num < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Format dates
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: {
    format?: 'short' | 'long' | 'medium' | 'iso';
    includeTime?: boolean;
    timezone?: string;
  }
): string {
  if (!date) return 'Invalid Date';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const format = options?.format ?? 'medium';

  if (format === 'iso') {
    return dateObj.toISOString().split('T')[0];
  }

  if (format === 'short') {
    return dateObj.toLocaleDateString('en-US');
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'long' ? 'long' : 'short',
    day: 'numeric',
    ...(options?.timezone && { timeZone: options.timezone }),
  };

  if (options?.includeTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-US', dateOptions);
}

/**
 * Format phone numbers
 */
export function formatPhoneNumber(
  phone: string | null | undefined,
  options?: { international?: boolean }
): string {
  if (!phone) return '';

  // Remove all non-numeric characters except 'x' for extension
  const parts = phone.split(/x|ext/i);
  const numbers = parts[0].replace(/\D/g, '');
  const ext = parts[1]?.trim();

  if (numbers.length === 10) {
    const formatted = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    return ext ? `${formatted} ext. ${ext}` : formatted;
  }

  if (numbers.length === 11 && numbers[0] === '1') {
    const formatted = `+1 (${numbers.slice(1, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7)}`;
    return ext ? `${formatted} ext. ${ext}` : formatted;
  }

  if (options?.international && numbers.length > 10) {
    return `+${numbers}`;
  }

  return phone;
}

/**
 * Format SSN
 */
export function formatSSN(
  ssn: string | null | undefined,
  options?: { mask?: boolean }
): string {
  if (!ssn) return '';

  const numbers = ssn.replace(/\D/g, '');

  if (numbers.length !== 9) {
    return ssn;
  }

  if (options?.mask) {
    return `***-**-${numbers.slice(5)}`;
  }

  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
}

/**
 * Format EIN
 */
export function formatEIN(ein: string | null | undefined): string {
  if (!ein) return '';

  const numbers = ein.replace(/\D/g, '');

  if (numbers.length !== 9) {
    return ein;
  }

  return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  options?: { decimals?: number; isDecimal?: boolean }
): string {
  const decimals = options?.decimals ?? 1;
  const isDecimal = options?.isDecimal ?? true;

  const percentage = isDecimal ? value * 100 : value;

  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format billing model
 */
export function formatBillingModel(
  model: string,
  options?: { verbose?: boolean; parse?: boolean; includeTotal?: boolean }
): string | { employee: number; employer: number } {
  if (!model) return '';

  const parts = model.split('/');

  if (parts.length !== 2) {
    return model;
  }

  const employee = parseFloat(parts[0]);
  const employer = parseFloat(parts[1]);

  if (isNaN(employee) || isNaN(employer)) {
    return model;
  }

  if (options?.parse) {
    return { employee, employer };
  }

  if (options?.verbose) {
    return `${employee}% Employee / ${employer}% Employer`;
  }

  if (options?.includeTotal) {
    const total = employee + employer;
    return `${employee}% / ${employer}% (Total: ${total}%)`;
  }

  return `${employee}% / ${employer}%`;
}

/**
 * Format address
 */
export function formatAddress(
  address: {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  },
  options?: { multiline?: boolean }
): string {
  const parts: string[] = [];

  if (address.street) {
    parts.push(address.street);
  }

  if (address.street2) {
    parts.push(address.street2);
  }

  const cityStateZip: string[] = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) cityStateZip.push(address.state);
  if (address.zip) cityStateZip.push(address.zip);

  if (cityStateZip.length > 0) {
    if (options?.multiline && parts.length > 0) {
      parts.push(cityStateZip.join(', '));
    } else {
      parts.push(cityStateZip.join(', '));
    }
  }

  if (address.country) {
    parts.push(address.country);
  }

  return options?.multiline ? parts.join('\n') : parts.join(', ');
}

/**
 * Parse date strings
 */
export function parseDate(
  date: string | Date | null | undefined
): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return date;
  }

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

/**
 * Parse currency strings to numbers
 */
export function parseCurrency(
  value: string | null | undefined
): number {
  if (!value) return 0;

  // Remove currency symbols, commas, and parentheses
  const cleaned = value.toString()
    .replace(/[$,]/g, '')
    .replace(/[()]/g, '');

  const isNegative = value.includes('(') || value.startsWith('-');
  const num = parseFloat(cleaned);

  if (isNaN(num)) return 0;

  return isNegative ? -Math.abs(num) : num;
}
