'use client';
import { useState, useEffect, useMemo } from 'react';
import * as db from '../../lib/database';
import * as Icons from '../icons';
import { Avatar } from '../ui';
import { formatDate, formatRelative } from '../../lib/format';

// Cross-project "Today" digest. Pulls activity_log entries
// across all projects, grouped by section.
//
// Sections inferred from action_type:
//   pipeline_update          → Design / drawings
//   fab_*                    → Fabrication
//   dispatch_*               → Dispatch
//   erect_*, snag_*, bolt_*, safety_*  → Erection / site

const SECTION_FROM_ACTION = (a) => {
  if (!a) return 'other';
  if (a.startsWith('pipeline')) return 'design';
  if (a.startsWith('fab')) return 'fabrication';
  if (a.startsWith('dispatch')) return 'dispatch';
  if (
    a.startsWith('erect') ||
    a.startsWith('snag') ||
    a.startsWith('bolt') ||
    a.startsWith('safety') ||
    a.startsWith('ifc')
  )
    return 'erection';
  if (a.startsWith('drawing')) return 'design';
  return 'other';
};

const SECTION_META = {
  design: { label: 'Design', color: 'var(--accent)', icon: 'File' },
  fabrication: { label: 'Fabrication', color: 'var(--cat-builtup)', icon: 'Cut' },
  dispatch: { label: 'Dispatch', color: 'var(--cat-coldform)', icon: 'Truck' },
  erection: { label: 'Erection', color: 'var(--cat-roofing)', icon: 'Crane' },
  other: { label: 'Other', color: 'var(--ink-500)', icon: 'Activity' },
};

const SECTIONS = ['design', 'fabrication', 'dispatch', 'erection'];

export default function TodayFeed({ auth }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sectionFilter, setSectionFilter] = useState('all');

  useEffect(() => { load(); }, [date]);

  async function load() {
    setLoading(true);
    try {
      const data = await db.getPortfolioActivity(date);
      setActivity(data || []);
    } catch (e) {
      console.error('TodayFeed load', e);
    }
    setLoading(false);
  }

  const counts = useMemo(() => {
    const c = { all: activity.length };
    SECTIONS.forEach((s) => (c[s] = 0));
    activity.forEach((a) => {
      const sec = SECTION_FROM_ACTION(a.action_type);
      if (c[sec] != null) c[sec]++;
    });
    return c;
  }, [activity]);

  const filtered = useMemo(() => {
    if (sectionFilter === 'all') return activity;
    return activity.filter(
      (a) => SECTION_FROM_ACTION(a.action_type) === sectionFilter
    );
  }, [activity, sectionFilter]);

  // Group by project (so user sees grouped chunks per project)
  const byProject = useMemo(() => {
    const m = {};
    filtered.forEach((a) => {
      const pid = a.project_id;
      if (!m[pid]) m[pid] = { project: a.projects, entries: [] };
      m[pid].entries.push(a);
    });
    // Sort projects by most recent activity
    return Object.values(m).sort((x, y) => {
      const ax = x.entries[0]?.created_at || '';
      const by = y.entries[0]?.created_at || '';
      return by.localeCompare(ax);
    });
  }, [filtered]);

  // Date navigation
  function shiftDay(delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  }

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Date + section filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Date picker pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface-1)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            padding: '4px 4px 4px 8px',
            height: 32,
          }}
        >
          <Icons.Calendar size={13} color="var(--ink-500)" />
          <button
            onClick={() => shiftDay(-1)}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ width: 24, height: 24 }}
            aria-label="Previous day"
          >
            <Icons.ChevronRight
              size={12}
              style={{ transform: 'rotate(180deg)' }}
            />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              fontFamily: 'inherit',
              fontWeight: 500,
              padding: 0,
              width: 120,
              color: 'var(--ink-900)',
            }}
          />
          <button
            onClick={() => shiftDay(1)}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ width: 24, height: 24 }}
            aria-label="Next day"
          >
            <Icons.ChevronRight size={12} />
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(new Date().toISOString().split('T')[0])}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '0 10px',
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginLeft: 4,
              }}
            >
              Today
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Section filter chips */}
        <FilterPill
          label="All"
          count={counts.all}
          active={sectionFilter === 'all'}
          onClick={() => setSectionFilter('all')}
        />
        {SECTIONS.map((s) => (
          <FilterPill
            key={s}
            label={SECTION_META[s].label}
            count={counts[s] || 0}
            color={SECTION_META[s].color}
            active={sectionFilter === s}
            onClick={() => setSectionFilter(s)}
          />
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
          }}
        >
          Loading…
        </div>
      ) : byProject.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 60,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
          }}
        >
          <Icons.Calendar
            size={28}
            color="var(--ink-300)"
            style={{ marginBottom: 8 }}
          />
          <div>
            No activity {isToday ? 'today' : `on ${formatDate(date)}`}
            {sectionFilter !== 'all' &&
              ` in ${SECTION_META[sectionFilter].label}`}
            .
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {byProject.map(({ project, entries }) => (
            <ProjectBlock
              key={project?.id || entries[0].project_id}
              project={project}
              entries={entries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectBlock({ project, entries }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '12px 18px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--ink-500)',
            letterSpacing: '0.02em',
          }}
        >
          {project?.project_no || '—'}
          {project?.job_no ? ` · ${project.job_no}` : ''}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>
          {project?.client_name || '—'}
        </div>
        <span className="t-caption" style={{ marginLeft: 'auto' }}>
          {entries.length} entry{entries.length === 1 ? '' : 'ies'}
        </span>
      </div>
      <div>
        {entries.map((entry, i) => (
          <ActivityRow
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ entry, isLast }) {
  const sec = SECTION_FROM_ACTION(entry.action_type);
  const meta = SECTION_META[sec];
  const Icon = Icons[meta.icon] || Icons.File;

  const time = entry.created_at
    ? new Date(entry.created_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 18px',
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          background: `color-mix(in oklab, ${meta.color} 12%, white)`,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: 'var(--ink-900)',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {entry.details || '—'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 3,
            fontSize: 11,
            color: 'var(--ink-500)',
          }}
        >
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 3,
              background: `color-mix(in oklab, ${meta.color} 8%, white)`,
              color: meta.color,
              fontWeight: 600,
              fontSize: 10,
            }}
          >
            {meta.label}
          </span>
          <span className="mono tnum">{time}</span>
          {entry.user_name && (
            <>
              <span>·</span>
              <span>{entry.user_name}</span>
            </>
          )}
          {entry.user_role && (
            <span style={{ color: 'var(--ink-400)' }}>({entry.user_role})</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 28,
        padding: '0 12px',
        borderRadius: 999,
        border: 'none',
        background: active
          ? color
            ? `color-mix(in oklab, ${color} 12%, white)`
            : 'var(--surface-2)'
          : 'transparent',
        color: active ? color || 'var(--ink-900)' : 'var(--ink-500)',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
      <span className="mono tnum" style={{ fontSize: 10.5, opacity: 0.85 }}>
        {count}
      </span>
    </button>
  );
}
