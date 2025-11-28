import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /api/accounting/alerts/[id]
 *
 * Get details of a specific alert
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = createServiceClient();

    const { data: alert, error } = await db
      .from('payment_alerts')
      .select(`
        *,
        company:companies(id, name, contact_email),
        invoice:invoices(
          id,
          invoice_number,
          total_cents,
          amount_paid_cents,
          due_date,
          payment_status
        ),
        payment:payment_transactions(id, amount, payment_date, status)
      `)
      .eq('id', params.id)
      .single();

    if (error || !alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/alerts/[id]
 *
 * Update alert status (acknowledge or resolve)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, resolutionNotes, userId } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    const updates: any = {
      status
    };

    if (status === 'acknowledged') {
      updates.acknowledged_at = new Date().toISOString();
      updates.acknowledged_by = userId;
    }

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      updates.resolution_notes = resolutionNotes;
    }

    const { data: alert, error } = await db
      .from('payment_alerts')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert:', error);
      return NextResponse.json(
        { error: 'Failed to update alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error in alert update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/alerts/[id]
 *
 * Delete an alert (use sparingly - prefer marking as resolved)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = createServiceClient();

    const { error } = await db
      .from('payment_alerts')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting alert:', error);
      return NextResponse.json(
        { error: 'Failed to delete alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in alert deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
