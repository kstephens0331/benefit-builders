import { NextResponse } from 'next/server';
import { runMonthEndValidation } from '@/lib/month-end-validation';
import { createServiceClient } from '@/lib/supabase';

/**
 * POST /api/accounting/month-end/close
 *
 * Close a month (locks all transactions)
 * Body: {
 *   year: number,
 *   month: number,
 *   userId: string,
 *   confirmationText: string (must be "CLOSE [MONTH] [YEAR]")
 *   notes?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month, userId, confirmationText, notes } = body;

    if (!year || !month || !userId || !confirmationText) {
      return NextResponse.json(
        { error: 'Missing required fields: year, month, userId, confirmationText' },
        { status: 400 }
      );
    }

    // Verify confirmation text
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const expectedText = `CLOSE ${monthNames[month - 1]} ${year}`;

    if (confirmationText.trim().toUpperCase() !== expectedText) {
      return NextResponse.json(
        {
          error: `Invalid confirmation. Please type: "${expectedText}"`,
          expected: expectedText
        },
        { status: 400 }
      );
    }

    const db = createServiceClient();

    // Check if month is already closed
    const { data: existing } = await db
      .from('month_end_closings')
      .select('status')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (existing && existing.status === 'closed') {
      return NextResponse.json(
        { error: 'Month is already closed' },
        { status: 400 }
      );
    }

    // Run validation one last time
    const validation = await runMonthEndValidation(year, month);

    if (!validation.canClose) {
      return NextResponse.json(
        {
          error: 'Cannot close month - critical issues must be resolved',
          validation,
          criticalIssues: validation.criticalIssues
        },
        { status: 400 }
      );
    }

    // Create or update closing record
    const closingData = {
      year,
      month,
      validation_report: validation,
      can_close: validation.canClose,
      critical_issues_count: validation.criticalIssues.length,
      warnings_count: validation.importantIssues.length + validation.recommendations.length,
      status: 'closed',
      closed_by: userId,
      closed_at: new Date().toISOString(),
      approved_by: userId, // Can add separate approval flow later
      approved_at: new Date().toISOString(),
      transactions_locked: true,
      notes
    };

    const { data: closing, error } = await db
      .from('month_end_closings')
      .upsert(closingData, {
        onConflict: 'year,month'
      })
      .select()
      .single();

    if (error) {
      console.error('Error closing month:', error);
      return NextResponse.json(
        { error: 'Failed to close month' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      closing,
      message: `Successfully closed ${monthNames[month - 1]} ${year}`
    });
  } catch (error) {
    console.error('Error in month-end close:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
