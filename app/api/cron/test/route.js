// ============================================================
// Manual test endpoint — same logic as /api/cron/daily but
// authenticated via ?key=<CRON_SECRET> query param so you can
// hit it from a browser to test without waiting 24 hours.
// ============================================================
import { runDailyDigest } from '../daily/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!process.env.CRON_SECRET) {
    return Response.json(
      { ok: false, error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    );
  }

  if (key !== process.env.CRON_SECRET) {
    return Response.json(
      { ok: false, error: 'Invalid or missing key query param' },
      { status: 401 }
    );
  }

  return await runDailyDigest();
}
