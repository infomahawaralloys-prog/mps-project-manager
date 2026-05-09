// ============================================================
// Notification helpers — Supabase queries for daily digest
// ============================================================
import { createClient } from '@supabase/supabase-js';

// Build a Supabase client with the SERVICE ROLE key so the cron job
// can read all activity across all projects regardless of RLS.
// (Falls back to anon key if service role isn't configured — anon
// key works only if RLS allows reads for `service_role` or anon.)
function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or service role / anon key)'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Map activity_log.action_type → section label (must match the app's UI)
export function sectionFromAction(actionType) {
  if (!actionType) return 'other';
  if (actionType.startsWith('pipeline')) return 'design';
  if (actionType.startsWith('drawing')) return 'design';
  if (actionType.startsWith('fab')) return 'fabrication';
  if (actionType.startsWith('dispatch')) return 'dispatch';
  if (
    actionType.startsWith('erect') ||
    actionType.startsWith('snag') ||
    actionType.startsWith('bolt') ||
    actionType.startsWith('safety') ||
    actionType.startsWith('ifc')
  )
    return 'erection';
  return 'other';
}

export const SECTION_LABELS = {
  design: 'Design',
  fabrication: 'Fabrication',
  dispatch: 'Dispatch',
  erection: 'Erection',
  other: 'Other',
};

export const SECTION_COLORS = {
  design: '#1E5FAA',
  fabrication: '#B6711A',
  dispatch: '#117A4A',
  erection: '#8B6F4E',
  other: '#6B6863',
};

// ============================================================
// Fetch yesterday's activity (last 24 hours)
// ============================================================
export async function getYesterdayActivity() {
  const supabase = serverSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('activity_log')
    .select(
      'id, project_id, action_type, details, user_name, user_role, created_at, projects ( id, project_no, job_no, client_name )'
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================
// Fetch drawing pipeline rows that are due/overdue
// Returns rows where:
//   status != 'done' AND due_date <= today + 3 days
// Includes both upcoming-soon and overdue items.
// ============================================================
export async function getDueDateAlerts() {
  const supabase = serverSupabase();

  // 3 days from now (in UTC, but the difference is just a date so it's fine)
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 3);
  const horizonISO = horizon.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('project_pipeline')
    .select(
      'id, project_id, category, status, percent, due_date, note, drawing_url, revision, updated_at, projects ( id, project_no, job_no, client_name )'
    )
    .neq('status', 'done')
    .not('due_date', 'is', null)
    .lte('due_date', horizonISO)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================
// Group activity entries by project, then by section
// Returns: [{ project, sections: { design: [...], fab: [...], ... }, total }]
// ============================================================
export function groupActivity(rows) {
  const byProject = new Map();
  for (const r of rows) {
    const pid = r.project_id || 'no_project';
    if (!byProject.has(pid)) {
      byProject.set(pid, { project: r.projects || null, sections: {}, total: 0 });
    }
    const bucket = byProject.get(pid);
    const sec = sectionFromAction(r.action_type);
    if (!bucket.sections[sec]) bucket.sections[sec] = [];
    bucket.sections[sec].push(r);
    bucket.total += 1;
  }
  return Array.from(byProject.values()).sort((a, b) => {
    const pa = a.project?.project_no || '';
    const pb = b.project?.project_no || '';
    return pa.localeCompare(pb);
  });
}

// ============================================================
// Group due-date alerts by urgency:
//   overdue  — due_date < today
//   today    — due_date === today
//   soon     — due_date in next 3 days
// ============================================================
export function groupAlerts(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];
  const overdue = [];
  const dueToday = [];
  const soon = [];
  for (const r of rows) {
    if (r.due_date < todayISO) overdue.push(r);
    else if (r.due_date === todayISO) dueToday.push(r);
    else soon.push(r);
  }
  return { overdue, dueToday, soon };
}

// ============================================================
// Day count helpers
// ============================================================
export function daysUntil(isoDate) {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
