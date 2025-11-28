import { NextResponse } from 'next/server';
import { getPaymentAlerts } from '@/lib/payment-alerts';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /api/accounting/alerts
 *
 * Get all active payment alerts
 * Query params:
 *   - type: filter by alert type (late, underpaid, overpaid, failed)
 *   - severity: filter by severity (critical, warning, info)
 *   - status: filter by status (active, acknowledged, resolved)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status') || 'active';

    const db = createServiceClient();

    let query = db
      .from('payment_alerts')
      .select(`
        *,
        company:companies(id, name),
        invoice:invoices(id, invoice_number, total_cents, due_date)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('alert_type', type);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/alerts
 *
 * Manually create a payment alert (usually done automatically)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      alertType,
      severity,
      companyId,
      invoiceId,
      paymentId,
      message,
      actionRequired
    } = body;

    if (!alertType || !severity || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: alertType, severity, message' },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const { data: alert, error } = await db
      .from('payment_alerts')
      .insert({
        alert_type: alertType,
        severity,
        company_id: companyId,
        invoice_id: invoiceId,
        payment_id: paymentId,
        message,
        action_required: actionRequired,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
