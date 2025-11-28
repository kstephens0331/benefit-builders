import { NextResponse } from 'next/server';
import { applyCreditToInvoice } from '@/lib/payment-alerts';

/**
 * POST /api/accounting/credits/[id]/apply
 *
 * Manually apply a credit to a specific invoice
 * Body: { invoiceId: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      );
    }

    const creditId = params.id;

    // Apply the credit
    const result = await applyCreditToInvoice(creditId, invoiceId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to apply credit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appliedAmount: result.appliedAmount,
      message: `Applied $${result.appliedAmount.toFixed(2)} credit to invoice`
    });
  } catch (error: any) {
    console.error('Error applying credit:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
