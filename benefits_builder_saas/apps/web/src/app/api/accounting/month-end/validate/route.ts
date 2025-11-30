import { NextResponse } from 'next/server';
import { runMonthEndValidation } from '@/lib/month-end-validation';

/**
 * POST /api/accounting/month-end/validate
 *
 * Run month-end validation for a specific month
 * Body: { year: number, month: number (1-12) }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Missing required fields: year, month' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    if (year < 2020 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    // Run validation
    const report = await runMonthEndValidation(year, month);

    return NextResponse.json({
      report,
      summary: {
        canClose: report.canClose,
        criticalIssues: report.criticalIssues.length,
        warnings: report.importantIssues.length + report.recommendations.length,
        recommendations: report.recommendations.length,
        passedChecks: report.checks.filter(c => c.passed).length,
        totalChecks: report.checks.length
      }
    });
  } catch (error) {
    console.error('Error running month-end validation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
