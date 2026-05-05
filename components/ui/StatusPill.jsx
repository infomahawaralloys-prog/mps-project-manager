'use client';

const STATUS_MAP = {
  // domain → kind
  done: 'done',
  complete: 'done',
  approved: 'done',
  delivered: 'done',
  closed: 'done',
  progress: 'progress',
  'in progress': 'progress',
  'en-route': 'progress',
  enroute: 'progress',
  review: 'progress',
  'under review': 'progress',
  submitted: 'progress',
  revised: 'progress',
  loaded: 'progress',
  fabrication: 'progress',
  active: 'progress',
  idle: 'idle',
  'not started': 'idle',
  bought: 'idle',
  'bought-out': 'idle',
  pending: 'idle',
  unloaded: 'idle',
  hold: 'idle',
  alert: 'alert',
  open: 'alert',
  critical: 'alert',
  major: 'progress',
  minor: 'idle',
};

export default function StatusPill({ status, children }) {
  const key = String(status || '').toLowerCase().trim();
  const kind = STATUS_MAP[key] || 'idle';
  const label = children || (status ? String(status).replace(/_/g, ' ') : 'Unknown');
  return <span className={`badge-${kind}`}>{label}</span>;
}
