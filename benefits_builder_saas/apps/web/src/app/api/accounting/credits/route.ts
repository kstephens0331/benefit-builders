import { NextResponse } from 'next/server';
import { getAvailableCredits, createCreditFromOverpayment } from '@/lib/payment-alerts';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /api/accounting/credits
 *
 * Get available credits for a company
 * Query params:
 *   - companyId: required - company to get credits for
 *   - status: optional - filter by status (available, applied, expired)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    let query = db
      .from('company_credits')
      .select(`
        *,
        source_invoice:invoices!source_invoice_id(invoice_number),
        applied_invoice:invoices!applied_to_invoice_id(invoice_number)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: credits, error } = await query;

    if (error) {
      console.error('Error fetching credits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      );
    }

    // Calculate total available credit
    const totalAvailable = credits
      ?.filter(c => c.status === 'available')
      ?.reduce((sum, c) => sum + c.amount, 0) || 0;

    return NextResponse.json({
      credits,
      totalAvailable: totalAvailable / 100 // Convert to dollars
    });
  } catch (error) {
    console.error('Error in credits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/credits
 *
 * Create a new credit (from overpayment, refund, or adjustment)
 * Body: {
 *   companyId: string
 *   amount: number (in dollars)
 *   source: 'overpayment' | 'refund' | 'adjustment' | 'goodwill'
 *   sourceInvoiceId?: string
 *   notes?: string
 *   expiresInDays?: number (default: 365)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyId,
      amount,
      source,
      sourceInvoiceId,
      notes,
      expiresInDays = 365
    } = body;

    if (!companyId || !amount || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, amount, source' },
        { status: 400 }
      );
    }

    if (!['overpayment', 'refund', 'adjustment', 'goodwill'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be: overpayment, refund, adjustment, or goodwill' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Verify company exists
    const { data: company, error: companyError } = await db
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const amountCents = Math.round(amount * 100);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: credit, error } = await db
      .from('company_credits')
      .insert({
        company_id: companyId,
        amount: amountCents,
        source,
        source_invoice_id: sourceInvoiceId,
        status: 'available',
        expires_at: expiresAt.toISOString(),
        notes: notes || `Credit from ${source}`
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credit:', error);
      return NextResponse.json(
        { error: 'Failed to create credit' },
        { status: 500 }
      );
    }

    return NextResponse.json({ credit }, { status: 201 });
  } catch (error) {
    console.error('Error in credits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
