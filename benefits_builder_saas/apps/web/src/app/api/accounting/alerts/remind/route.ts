import { NextResponse } from 'next/server';
import { sendPaymentReminder } from '@/lib/payment-alerts';
import { createServiceClient } from '@/lib/supabase';

/**
 * POST /api/accounting/alerts/remind
 *
 * Send payment reminder email
 * Body: { invoiceId, reminderType: 'gentle' | 'firm' | 'final' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId, reminderType } = body;

    if (!invoiceId || !reminderType) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, reminderType' },
        { status: 400 }
      );
    }

    if (!['gentle', 'firm', 'final'].includes(reminderType)) {
      return NextResponse.json(
        { error: 'Invalid reminderType. Must be: gentle, firm, or final' },
        { status: 400 }
      );
    }

    // Verify invoice exists and is overdue
    const db = createServiceClient();
    const { data: invoice, error: invoiceError } = await db
      .from('invoices')
      .select('id, due_date, payment_status')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already paid' },
        { status: 400 }
      );
    }

    // Send reminder
    const result = await sendPaymentReminder(invoiceId, reminderType);

    if (!result.sent) {
      return NextResponse.json(
        { error: 'Failed to send reminder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
