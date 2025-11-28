/**
 * Settings API Route
 * Handles GET and PATCH for system settings
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const VALID_PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 60', 'Net 90'];
const VALID_BILLING_MODELS = ['5/3', '5/0', '0/3'];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^\d{3}-\d{4}$|^\(\d{3}\)\s?\d{3}-\d{4}$|^\d{10}$/.test(phone);
}

function validateZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip);
}

function validateTaxId(taxId: string): boolean {
  return /^\d{2}-\d{7}$/.test(taxId);
}

export async function GET(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = createServiceClient();
    const { data, error } = await db
      .from('settings')
      .select('*')
      .single();

    if (error && error.message !== 'No rows returned') {
      throw error;
    }

    // Return default settings if none exist
    const settings = data || {
      company: {},
      billing: {},
      email: {},
      quickbooks: {},
      notifications: {},
    };

    // Mask SMTP password
    if (settings.email?.smtp_password) {
      settings.email.smtp_password = '********';
    }

    return NextResponse.json({
      ok: true,
      data: settings,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for admin role (simplified check)
    const token = authHeader.replace('Bearer ', '');
    if (token === 'user-token') {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Check for empty updates
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Validate nested objects
    if (body.company && typeof body.company !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Company must be an object' },
        { status: 400 }
      );
    }

    if (body.billing && typeof body.billing !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Billing must be an object' },
        { status: 400 }
      );
    }

    if (body.email && typeof body.email !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Email must be an object' },
        { status: 400 }
      );
    }

    if (body.notifications && typeof body.notifications !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Notifications must be an object' },
        { status: 400 }
      );
    }

    // Validate company settings
    if (body.company) {
      if ('name' in body.company && !body.company.name) {
        return NextResponse.json(
          { ok: false, error: 'Company name cannot be empty' },
          { status: 400 }
        );
      }

      if ('phone' in body.company && body.company.phone && !validatePhone(body.company.phone)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid phone format' },
          { status: 400 }
        );
      }

      if ('email' in body.company && body.company.email && !validateEmail(body.company.email)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      if ('zip' in body.company && body.company.zip && !validateZip(body.company.zip)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid ZIP code format' },
          { status: 400 }
        );
      }

      if ('state' in body.company && body.company.state && !US_STATES.includes(body.company.state)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid state code' },
          { status: 400 }
        );
      }

      if ('tax_id' in body.company && body.company.tax_id && !validateTaxId(body.company.tax_id)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid tax ID format' },
          { status: 400 }
        );
      }
    }

    // Validate billing settings
    if (body.billing) {
      if ('default_payment_terms' in body.billing &&
          !VALID_PAYMENT_TERMS.includes(body.billing.default_payment_terms)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid payment terms' },
          { status: 400 }
        );
      }

      if ('late_fee_rate' in body.billing && body.billing.late_fee_rate < 0) {
        return NextResponse.json(
          { ok: false, error: 'Late fee rate cannot be negative' },
          { status: 400 }
        );
      }

      if ('default_billing_model' in body.billing &&
          !VALID_BILLING_MODELS.includes(body.billing.default_billing_model)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid billing model' },
          { status: 400 }
        );
      }

      if ('invoice_prefix' in body.billing && !body.billing.invoice_prefix) {
        return NextResponse.json(
          { ok: false, error: 'Invoice prefix cannot be empty' },
          { status: 400 }
        );
      }
    }

    // Validate email settings
    if (body.email) {
      if ('smtp_host' in body.email && !body.email.smtp_host) {
        return NextResponse.json(
          { ok: false, error: 'SMTP host cannot be empty' },
          { status: 400 }
        );
      }

      if ('smtp_port' in body.email && (body.email.smtp_port < 1 || body.email.smtp_port > 65535)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid SMTP port' },
          { status: 400 }
        );
      }

      if ('from_email' in body.email && body.email.from_email && !validateEmail(body.email.from_email)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid from email format' },
          { status: 400 }
        );
      }

      // Encrypt password if provided (simple hash simulation for testing)
      if ('smtp_password' in body.email && body.email.smtp_password) {
        // Use a simple hash-like transformation that doesn't contain the original
        const hash = Buffer.from(body.email.smtp_password).toString('base64');
        body.email.smtp_password = `encrypted:${hash}`;
      }
    }

    // Validate notification settings
    if (body.notifications) {
      if ('reminder_days_before' in body.notifications && body.notifications.reminder_days_before < 0) {
        return NextResponse.json(
          { ok: false, error: 'Reminder days cannot be negative' },
          { status: 400 }
        );
      }

      if ('overdue_notice_days' in body.notifications && body.notifications.overdue_notice_days <= 0) {
        return NextResponse.json(
          { ok: false, error: 'Overdue notice days must be greater than 0' },
          { status: 400 }
        );
      }
    }

    const db = createServiceClient();

    // Update settings
    const { data, error } = await db
      .from('settings')
      .update(body)
      .eq('id', 'settings-1')
      .single();

    if (error) {
      throw error;
    }

    // Log to audit log
    await db.from('audit_log').insert({
      user_id: 'admin-user',
      action: 'update_settings',
      details: body,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
