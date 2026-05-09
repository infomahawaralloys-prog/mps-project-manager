// ============================================================
// Daily cron handler
// Triggered by Vercel Cron at midnight UTC (~5:30 AM IST)
// ============================================================
import { Resend } from 'resend';
import {
  getYesterdayActivity,
  getDueDateAlerts,
  groupActivity,
  groupAlerts,
} from '../../../../lib/notifications';
import { buildDailyDigest } from '../../../../lib/email-templates';

export const dynamic = 'force-dynamic';
// Increase timeout for the email send + DB queries (default 10s on Hobby)
export const maxDuration = 60;

export async function GET(request) {
  // ---- Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET> ----
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  return await runDailyDigest();
}

export async function runDailyDigest() {
  try {
    // Verify required env vars
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.NOTIFICATION_TO_EMAIL;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
      return Response.json(
        { ok: false, error: 'Missing RESEND_API_KEY env var' },
        { status: 500 }
      );
    }
    if (!toEmail) {
      return Response.json(
        { ok: false, error: 'Missing NOTIFICATION_TO_EMAIL env var' },
        { status: 500 }
      );
    }

    // ---- Fetch data ----
    const [activity, alerts] = await Promise.all([
      getYesterdayActivity(),
      getDueDateAlerts(),
    ]);
    const groupedActivity = groupActivity(activity);
    const groupedAlerts = groupAlerts(alerts);

    // ---- Build email ----
    const email = buildDailyDigest({
      groupedActivity,
      alerts: groupedAlerts,
    });

    // Nothing to report — skip sending
    if (!email) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: 'no activity or alerts in last 24h',
      });
    }

    // ---- Send via Resend ----
    const resend = new Resend(apiKey);
    const sendResult = await resend.emails.send({
      from: `MPS Project Manager <${fromEmail}>`,
      to: [toEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (sendResult.error) {
      return Response.json(
        { ok: false, error: sendResult.error.message || String(sendResult.error) },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      sentTo: toEmail,
      subject: email.subject,
      activityCount: activity.length,
      alertCount: alerts.length,
      messageId: sendResult.data?.id,
    });
  } catch (err) {
    console.error('Daily digest error:', err);
    return Response.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
