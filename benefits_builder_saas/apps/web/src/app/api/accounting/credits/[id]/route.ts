import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /api/accounting/credits/[id]
 *
 * Get credit details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = createServiceClient();

    const { data: credit, error } = await db
      .from('company_credits')
      .select(`
        *,
        company:companies(id, name),
        source_invoice:invoices!source_invoice_id(id, invoice_number, total_cents),
        applied_invoice:invoices!applied_to_invoice_id(id, invoice_number, total_cents)
      `)
      .eq('id', params.id)
      .single();

    if (error || !credit) {
      return NextResponse.json(
        { error: 'Credit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ credit });
  } catch (error) {
    console.error('Error fetching credit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/credits/[id]
 *
 * Update credit (mainly for adjusting amount or notes)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { amount, notes, expiresAt } = body;

    const db = createServiceClient();

    // Get current credit to verify it's not already applied
    const { data: currentCredit } = await db
      .from('company_credits')
      .select('status')
      .eq('id', params.id)
      .single();

    if (!currentCredit) {
      return NextResponse.json(
        { error: 'Credit not found' },
        { status: 404 }
      );
    }

    if (currentCredit.status === 'applied') {
      return NextResponse.json(
        { error: 'Cannot modify a credit that has been applied' },
        { status: 400 }
      );
    }

    const updates: any = {};

    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be greater than 0' },
          { status: 400 }
        );
      }
      updates.amount = Math.round(amount * 100); // Convert to cents
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (expiresAt !== undefined) {
      updates.expires_at = expiresAt;
    }

    const { data: credit, error } = await db
      .from('company_credits')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating credit:', error);
      return NextResponse.json(
        { error: 'Failed to update credit' },
        { status: 500 }
      );
    }

    return NextResponse.json({ credit });
  } catch (error) {
    console.error('Error in credit update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/credits/[id]
 *
 * Delete an unused credit
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = createServiceClient();

    // Verify credit is not applied
    const { data: credit } = await db
      .from('company_credits')
      .select('status, applied_to_invoice_id')
      .eq('id', params.id)
      .single();

    if (!credit) {
      return NextResponse.json(
        { error: 'Credit not found' },
        { status: 404 }
      );
    }

    if (credit.status === 'applied' || credit.applied_to_invoice_id) {
      return NextResponse.json(
        { error: 'Cannot delete a credit that has been applied to an invoice' },
        { status: 400 }
      );
    }

    const { error } = await db
      .from('company_credits')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting credit:', error);
      return NextResponse.json(
        { error: 'Failed to delete credit' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in credit deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
