import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /api/accounting/month-end/history
 *
 * Get history of month-end closings
 * Query params:
 *   - year: optional - filter by year
 *   - status: optional - filter by status (pending, closed, rejected)
 *   - limit: optional - number of records (default: 12)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '12');

    const db = createServiceClient();

    let query = db
      .from('month_end_closings')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(limit);

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: closings, error } = await query;

    if (error) {
      console.error('Error fetching month-end history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    // Format data with month names
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formattedClosings = closings?.map(c => ({
      ...c,
      monthName: monthNames[c.month - 1],
      displayPeriod: `${monthNames[c.month - 1]} ${c.year}`
    }));

    return NextResponse.json({ closings: formattedClosings });
  } catch (error) {
    console.error('Error in month-end history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
