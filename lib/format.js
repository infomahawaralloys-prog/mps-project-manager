// ============================================================
// Formatting helpers — Indian number grouping, dates, weight.
// All consumers import from here so output is consistent.
// ============================================================

const NF_INT_IN = new Intl.NumberFormat('en-IN');
const NF_DEC_IN = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// 1234567 → "12,34,567"
export function formatInt(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return NF_INT_IN.format(Math.round(Number(n)));
}

// 1234.567 → "1,234.57"
export function formatDecimal(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return NF_DEC_IN.format(Number(n));
}

// 1000 → "1.00 MT"; 950 → "950 kg"
export function formatWeight(kg) {
  if (kg == null || isNaN(Number(kg))) return '—';
  const v = Number(kg);
  if (v >= 1000) return `${(v / 1000).toFixed(2)} MT`;
  return `${formatInt(v)} kg`;
}

// "2026-04-12" → "12 Apr 2026"
export function formatDate(input) {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '—';
  const m = d.toLocaleString('en-GB', { month: 'short' });
  return `${String(d.getDate()).padStart(2, '0')} ${m} ${d.getFullYear()}`;
}

// Short relative: "8 min ago", "3 hr ago", "Yesterday", "12 Apr"
export function formatRelative(input) {
  if (!input) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day} days ago`;
  return formatDate(d).slice(0, 6); // "12 Apr"
}

// "12 Apr 2026" + "28 Jun 2026" → returns weeks-elapsed / total-weeks pair
// Used by the project-header on-track chip.
export function projectWeeks(startISO, targetISO) {
  if (!startISO || !targetISO) return null;
  const start = new Date(startISO);
  const target = new Date(targetISO);
  if (isNaN(start.getTime()) || isNaN(target.getTime())) return null;
  const totalDays = Math.max(1, (target - start) / 86400000);
  const elapsedDays = Math.max(0, (Date.now() - start.getTime()) / 86400000);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const elapsedWeeks = Math.min(totalWeeks, Math.ceil(elapsedDays / 7));
  return { elapsed: elapsedWeeks, total: totalWeeks };
}

// On-track classification given erection-progress % and project schedule.
// Returns { label, kind } where kind ∈ {done, progress, alert, idle}.
export function onTrackStatus(erectionPct, startISO, targetISO) {
  if (erectionPct >= 100) return { label: 'Complete', kind: 'done' };
  if (!startISO || !targetISO) return { label: 'In progress', kind: 'progress' };
  const w = projectWeeks(startISO, targetISO);
  if (!w) return { label: 'In progress', kind: 'progress' };
  const expectedPct = (w.elapsed / w.total) * 100;
  // Tolerance: within 5% = on track, 5-15% behind = at risk, >15% = behind
  const gap = expectedPct - (erectionPct || 0);
  if (gap <= 5) return { label: 'On track', kind: 'done' };
  if (gap <= 15) return { label: 'At risk', kind: 'progress' };
  return { label: 'Behind', kind: 'alert' };
}

// Phone formatting: "+91 9876 54 3210" preserving raw if shape unknown
export function formatPhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
  if (digits.length === 12 && digits.startsWith('91'))
    return `+91 ${digits.slice(2, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  return p;
}