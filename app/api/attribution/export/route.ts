/**
 * app/api/attribution/export/route.ts
 *
 * Export revenue attribution data as CSV or JSON.
 *
 * GET /api/attribution/export?format=csv
 * GET /api/attribution/export?format=json
 * Authorization: Bearer <api_key>
 */

import { NextRequest } from 'next/server';
import { resolveApiKey } from '@/lib/api/auth';
import { getRevenueExportData } from '@/lib/attribution/actions';

export async function GET(req: NextRequest) {
  const ctx = await resolveApiKey(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const format = req.nextUrl.searchParams.get('format') ?? 'json';
  const rows = await getRevenueExportData();

  if (format === 'csv') {
    const headers = ['Campaign ID', 'Campaign Name', 'Subject', 'Emails Sent', 'Opens', 'Clicks', 'Purchases', 'Revenue ($)', 'Sent At'];
    const csvRows = rows.map((r) =>
      [r.campaignId, `"${r.campaignName}"`, `"${r.subject}"`, r.emailsSent, r.opens, r.clicks, r.purchases, r.revenue, r.sentAt].join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="revenue-attribution.csv"',
      },
    });
  }

  return Response.json({ data: rows });
}
