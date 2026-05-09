// ============================================================
// Email templates for the daily digest
// Inline CSS for max email-client compatibility
// ============================================================
import {
  SECTION_LABELS,
  SECTION_COLORS,
  daysUntil,
} from './notifications';

const CAT_LABELS = {
  civil: 'Civil',
  ga: 'GA',
  fab: 'Fabrication',
  sheeting: 'Sheeting',
};

// Format a date in IST for the email subject/header
function formatDateIST(d = new Date()) {
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeIST(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Escape HTML special characters to prevent XSS in email content
function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Build the daily digest email
// Returns { subject, html, text }
// Returns null if there's nothing to report (skip sending)
// ============================================================
export function buildDailyDigest({ groupedActivity, alerts }) {
  const totalActivity = groupedActivity.reduce((a, g) => a + g.total, 0);
  const totalAlerts =
    alerts.overdue.length + alerts.dueToday.length + alerts.soon.length;

  if (totalActivity === 0 && totalAlerts === 0) return null;

  const date = formatDateIST();
  const summaryParts = [];
  if (totalActivity > 0) summaryParts.push(`${totalActivity} activities`);
  if (totalAlerts > 0) summaryParts.push(`${totalAlerts} due-date alerts`);
  const subjectSummary = summaryParts.join(' · ');
  const subject = `MPS Daily Digest — ${date} · ${subjectSummary}`;

  return {
    subject,
    html: renderHTML({ date, groupedActivity, alerts, totalActivity, totalAlerts }),
    text: renderText({ date, groupedActivity, alerts }),
  };
}

// ============================================================
// HTML email
// ============================================================
function renderHTML({ date, groupedActivity, alerts, totalActivity, totalAlerts }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MPS Daily Digest</title>
</head>
<body style="margin:0;padding:0;background:#F4EFE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1A1916;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4EFE6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FCFBF7;border-radius:8px;overflow:hidden;border:1px solid #E5DDC9;">

          <!-- Header -->
          <tr>
            <td style="padding:22px 24px 18px 24px;border-bottom:1px solid #E5DDC9;">
              <div style="font-size:11px;font-weight:600;color:#6B6863;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Daily Digest</div>
              <div style="font-size:20px;font-weight:700;color:#1A1916;letter-spacing:-0.01em;">MPS Project Manager</div>
              <div style="font-size:13px;color:#6B6863;margin-top:4px;">${escape(date)} · ${escape(totalActivity > 0 ? `${totalActivity} activities` : '')}${totalActivity > 0 && totalAlerts > 0 ? ' · ' : ''}${escape(totalAlerts > 0 ? `${totalAlerts} due-date alerts` : '')}</div>
            </td>
          </tr>

          ${renderAlertsSection(alerts)}
          ${renderActivitySection(groupedActivity)}

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px;border-top:1px solid #E5DDC9;background:#F4EFE6;font-size:11px;color:#6B6863;">
              Sent automatically by MPS Project Manager · daily at ~5:30&nbsp;AM&nbsp;IST.
              <br>If something looks wrong, check the activity feed in the app.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderAlertsSection(alerts) {
  const total =
    alerts.overdue.length + alerts.dueToday.length + alerts.soon.length;
  if (total === 0) return '';

  const rows = [];
  for (const r of alerts.overdue) rows.push(renderAlertRow(r, 'overdue'));
  for (const r of alerts.dueToday) rows.push(renderAlertRow(r, 'today'));
  for (const r of alerts.soon) rows.push(renderAlertRow(r, 'soon'));

  return `
  <tr>
    <td style="padding:18px 24px 8px 24px;">
      <div style="display:inline-block;padding:3px 9px;border-radius:4px;background:#FCE8E2;color:#B33A1A;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
        Drawing alerts
      </div>
      <div style="margin-top:10px;border:1px solid #E5DDC9;border-radius:6px;overflow:hidden;background:#FCFBF7;">
        ${rows.join('')}
      </div>
    </td>
  </tr>`;
}

function renderAlertRow(r, kind) {
  const project = r.projects;
  const cat = CAT_LABELS[r.category] || r.category;
  const days = daysUntil(r.due_date);
  let badge, badgeColor, badgeBg;
  if (kind === 'overdue') {
    badge = `${Math.abs(days)}d late`;
    badgeColor = '#B33A1A';
    badgeBg = '#FCE8E2';
  } else if (kind === 'today') {
    badge = 'Due today';
    badgeColor = '#B6711A';
    badgeBg = '#FBEBD0';
  } else {
    badge = `Due in ${days}d`;
    badgeColor = '#1E5FAA';
    badgeBg = '#DEE9F8';
  }

  return `
    <div style="padding:11px 14px;border-bottom:1px solid #E5DDC9;">
      <div style="display:block;margin-bottom:2px;">
        <span style="font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#9B9690;font-weight:600;">${escape(project?.project_no || '—')}</span>
        <span style="font-size:13px;color:#1A1916;font-weight:600;margin-left:6px;">${escape(project?.client_name || '—')}</span>
      </div>
      <div style="font-size:13px;color:#3F3D38;">
        <strong>${escape(cat)}</strong> drawings
        <span style="display:inline-block;padding:1px 7px;border-radius:3px;background:${badgeBg};color:${badgeColor};font-size:11px;font-weight:600;margin-left:8px;">${badge}</span>
      </div>
      ${r.note ? `<div style="font-size:12px;color:#6B6863;margin-top:4px;font-style:italic;">"${escape(r.note)}"</div>` : ''}
    </div>`;
}

function renderActivitySection(groupedActivity) {
  if (groupedActivity.length === 0) return '';

  const projectBlocks = groupedActivity
    .map((g) => renderProjectBlock(g))
    .join('');

  return `
  <tr>
    <td style="padding:18px 24px 8px 24px;">
      <div style="display:inline-block;padding:3px 9px;border-radius:4px;background:#E8E2D3;color:#3F3D38;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
        Activity (last 24h)
      </div>
      ${projectBlocks}
    </td>
  </tr>`;
}

function renderProjectBlock({ project, sections, total }) {
  const sectionOrder = ['design', 'fabrication', 'dispatch', 'erection', 'other'];
  const sectionBlocks = sectionOrder
    .filter((s) => sections[s] && sections[s].length > 0)
    .map((s) => renderSection(s, sections[s]))
    .join('');

  return `
    <div style="margin-top:12px;border:1px solid #E5DDC9;border-radius:6px;overflow:hidden;background:#FCFBF7;">
      <div style="padding:9px 14px;background:#F4EFE6;border-bottom:1px solid #E5DDC9;">
        <span style="font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#6B6863;font-weight:600;">${escape(project?.project_no || '—')}${project?.job_no ? ` · ${escape(project.job_no)}` : ''}</span>
        <span style="font-size:13px;color:#1A1916;font-weight:600;margin-left:6px;">${escape(project?.client_name || 'Unknown project')}</span>
        <span style="float:right;font-size:11px;color:#6B6863;">${total} ${total === 1 ? 'entry' : 'entries'}</span>
      </div>
      ${sectionBlocks}
    </div>`;
}

function renderSection(sec, entries) {
  const color = SECTION_COLORS[sec] || '#6B6863';
  const label = SECTION_LABELS[sec] || sec;
  const rows = entries.map((e) => renderEntry(e)).join('');
  return `
    <div style="border-top:1px solid #F0EADA;padding:8px 14px 4px 14px;">
      <div style="font-size:10.5px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">
        ${escape(label)} <span style="color:#9B9690;font-weight:500;">(${entries.length})</span>
      </div>
      ${rows}
    </div>`;
}

function renderEntry(e) {
  const time = formatTimeIST(e.created_at);
  return `
    <div style="font-size:12px;color:#3F3D38;padding:3px 0;line-height:1.5;">
      <span style="font-family:ui-monospace,Menlo,monospace;color:#9B9690;font-size:11px;">${escape(time)}</span>
      <span style="margin-left:6px;">${escape(e.details || '—')}</span>
      ${e.user_name ? `<span style="color:#9B9690;font-size:11px;margin-left:4px;">— ${escape(e.user_name)}</span>` : ''}
    </div>`;
}

// ============================================================
// Plaintext fallback
// ============================================================
function renderText({ date, groupedActivity, alerts }) {
  const lines = [];
  lines.push(`MPS Daily Digest — ${date}`);
  lines.push('='.repeat(50));
  lines.push('');

  const totalAlerts =
    alerts.overdue.length + alerts.dueToday.length + alerts.soon.length;
  if (totalAlerts > 0) {
    lines.push('DRAWING ALERTS');
    lines.push('-'.repeat(50));
    [...alerts.overdue, ...alerts.dueToday, ...alerts.soon].forEach((r) => {
      const days = daysUntil(r.due_date);
      const project = r.projects;
      const cat = CAT_LABELS[r.category] || r.category;
      let badge;
      if (days < 0) badge = `OVERDUE by ${Math.abs(days)}d`;
      else if (days === 0) badge = 'DUE TODAY';
      else badge = `due in ${days}d`;
      lines.push(
        `  ${project?.project_no || '—'} ${project?.client_name || ''} — ${cat} (${badge})`
      );
      if (r.note) lines.push(`    Note: ${r.note}`);
    });
    lines.push('');
  }

  if (groupedActivity.length > 0) {
    lines.push('ACTIVITY (last 24h)');
    lines.push('-'.repeat(50));
    groupedActivity.forEach((g) => {
      const project = g.project;
      lines.push(
        `\n${project?.project_no || '—'} ${project?.client_name || 'Unknown'} (${g.total} entries)`
      );
      const sectionOrder = ['design', 'fabrication', 'dispatch', 'erection', 'other'];
      sectionOrder.forEach((s) => {
        if (g.sections[s]?.length) {
          lines.push(`  [${SECTION_LABELS[s]}]`);
          g.sections[s].forEach((e) => {
            const time = formatTimeIST(e.created_at);
            lines.push(
              `    ${time}  ${e.details || '—'}${e.user_name ? ` — ${e.user_name}` : ''}`
            );
          });
        }
      });
    });
  }

  lines.push('');
  lines.push('—');
  lines.push('Sent automatically by MPS Project Manager (daily ~5:30 AM IST)');
  return lines.join('\n');
}
