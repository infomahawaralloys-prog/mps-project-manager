// ============================================================
// Drawing Pipeline — categories, statuses, helpers
// ============================================================

export const PIPELINE_CATEGORIES = ['civil', 'ga', 'fab', 'sheeting'];

export const PIPELINE_CAT_LABELS = {
  civil: 'Civil',
  ga: 'GA',
  fab: 'Fabrication',
  sheeting: 'Sheeting',
};

export const PIPELINE_CAT_COLORS = {
  civil: '#8B6F4E', // earth brown — site / civil
  ga: '#1E5FAA', // steel blue — design (matches accent)
  fab: '#B6711A', // amber — fabrication
  sheeting: '#117A4A', // green — final layer
};

export const PIPELINE_STATUSES = [
  'not_started',
  'in_progress',
  'on_hold',
  'done',
];

export const PIPELINE_STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  on_hold: 'On hold',
  done: 'Done',
};

export const PIPELINE_STATUS_COLORS = {
  not_started: 'var(--ink-400)',
  in_progress: 'var(--accent)',
  on_hold: 'var(--status-alert)',
  done: 'var(--status-done)',
};

// Returns a default row for a project+category that doesn't have one yet
export function defaultPipelineRow(projectId, category) {
  return {
    project_id: projectId,
    category,
    status: 'not_started',
    percent: 0,
    due_date: null,
    note: '',
    drawing_url: '',
    revision: 'Rev 0',
    updated_at: null,
    updated_by: null,
  };
}

// Build a {category: row} map for one project, filling in defaults
export function pipelineMap(projectId, rows) {
  const map = {};
  PIPELINE_CATEGORIES.forEach((cat) => {
    map[cat] = defaultPipelineRow(projectId, cat);
  });
  (rows || []).forEach((r) => {
    if (PIPELINE_CATEGORIES.includes(r.category)) {
      map[r.category] = { ...map[r.category], ...r };
    }
  });
  return map;
}

// Days until / since a given ISO date. Negative = past, positive = future.
export function daysUntil(isoDate) {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Returns due-date label and tone:
//   { label: '3d', tone: 'progress' }   future, soon
//   { label: 'Due', tone: 'alert' }     today
//   { label: '5d late', tone: 'alert' } past
export function dueDateLabel(isoDate, status) {
  if (!isoDate) return null;
  if (status === 'done') return null;
  const d = daysUntil(isoDate);
  if (d == null) return null;
  if (d === 0) return { label: 'Due today', tone: 'alert' };
  if (d > 0) {
    if (d <= 2) return { label: `${d}d`, tone: 'alert' };
    if (d <= 7) return { label: `${d}d`, tone: 'progress' };
    return { label: `${d}d`, tone: 'mute' };
  }
  // overdue
  return { label: `${Math.abs(d)}d late`, tone: 'alert' };
}
