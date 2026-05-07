'use client';
import { useMemo } from 'react';
import { Ring, Bar } from '../../ui';
import * as Icons from '../../icons';
import WeatherCard from './WeatherCard';
import { formatDate, formatRelative } from '../../../lib/format';

// Erection Dashboard combines:
// - Overall progress ring + key stats
// - Daily erection log (chronological, newest first)
// - Weather card (right rail)

export default function ErectionDashboard({
  project,
  parts,
  erectionRecords,
  snags,
  bolts,
  fabSummary,
  dispatchedPartIds,
}) {
  const totalWeight = parts.reduce(
    (a, p) => a + (p.weight || 0) * (p.qty || 0),
    0
  );
  const partsById = useMemo(() => {
    const m = {};
    parts.forEach((p) => (m[p.id] = p));
    return m;
  }, [parts]);

  const erectedWeight = erectionRecords.reduce((a, r) => {
    const p = partsById[r.part_id];
    return a + (p ? p.weight || 0 : 0);
  }, 0);
  const pctErected =
    totalWeight > 0 ? Math.round((erectedWeight / totalWeight) * 100) : 0;

  const totalInstalled = bolts.reduce((a, b) => a + (b.installed || 0), 0);
  const totalTorqued = bolts.reduce((a, b) => a + (b.torqued || 0), 0);
  const boltPct =
    totalInstalled > 0 ? Math.round((totalTorqued / totalInstalled) * 100) : 0;

  const openSnags = snags.filter((s) => s.status === 'Open').length;
  const erectableNow = parts.filter((p) => {
    if (erectionRecords.find((r) => r.part_id === p.id)) return false;
    if (p.category === 'builtup') {
      const fs = fabSummary[p.id];
      if (!fs || (fs.painting || 0) < p.qty) return false;
    }
    if (p.category === 'coldform') {
      const fs = fabSummary[p.id];
      if (!fs || (fs.cutting || 0) < p.qty) return false;
    }
    if ((dispatchedPartIds[p.id] || 0) < p.qty) return false;
    return true;
  }).length;

  // Group erection records by date (newest first)
  const grouped = useMemo(() => {
    const map = {};
    erectionRecords.forEach((r) => {
      const k = r.erection_date || 'undated';
      if (!map[k]) map[k] = [];
      map[k].push(r);
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, records]) => ({
        date,
        records: records.sort((a, b) =>
          (a.created_at || '') < (b.created_at || '') ? 1 : -1
        ),
        weight: records.reduce((acc, r) => {
          const p = partsById[r.part_id];
          return acc + (p?.weight || 0);
        }, 0),
      }));
  }, [erectionRecords, partsById]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 18,
      }}
    >
      {/* LEFT — main dashboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Progress block */}
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Ring
                value={pctErected}
                size={88}
                stroke={6}
                color="var(--accent)"
              />
              <div>
                <div className="t-overline">Site progress</div>
                <div
                  className="mono tnum"
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: 'var(--ink-900)',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {(erectedWeight / 1000).toFixed(1)}{' '}
                  <span style={{ fontSize: 16, color: 'var(--ink-500)' }}>
                    /
                  </span>{' '}
                  {(totalWeight / 1000).toFixed(1)}
                  <span style={{ fontSize: 14, color: 'var(--ink-500)', marginLeft: 6 }}>
                    MT
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>
                  {erectionRecords.length} of {parts.length} marks erected
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
                minWidth: 280,
              }}
            >
              <Stat
                icon={Icons.Crane}
                label="Ready to erect"
                value={erectableNow}
                color="var(--accent)"
              />
              <Stat
                icon={Icons.Bolt}
                label="Bolts torqued"
                value={`${boltPct}%`}
                sub={`${totalTorqued}/${totalInstalled}`}
                color="var(--cat-coldform)"
              />
              <Stat
                icon={Icons.X}
                label="Open snags"
                value={openSnags}
                color={openSnags > 0 ? 'var(--status-alert)' : 'var(--ink-500)'}
              />
              <Stat
                icon={Icons.User}
                label="Erection days"
                value={grouped.length}
                color="var(--ink-700)"
              />
            </div>
          </div>
        </div>

        {/* Daily log */}
        <div className="card">
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icons.Calendar size={15} color="var(--ink-700)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Daily log</span>
            <span className="t-caption" style={{ marginLeft: 4 }}>
              {erectionRecords.length} record{erectionRecords.length === 1 ? '' : 's'}
            </span>
          </div>

          {grouped.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--ink-500)',
              }}
            >
              No erection records yet.
            </div>
          ) : (
            <div>
              {grouped.map((day, i) => (
                <DayBlock
                  key={day.date}
                  day={day}
                  partsById={partsById}
                  isLast={i === grouped.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — weather + future */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <WeatherCard project={project} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: `color-mix(in oklab, ${color} 12%, white)`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </div>
      <div>
        <div
          className="mono tnum"
          style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}
        >
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
          {label}
          {sub && (
            <span className="mono tnum" style={{ marginLeft: 4, color: 'var(--ink-400)' }}>
              · {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DayBlock({ day, partsById, isLast }) {
  const dt = new Date(day.date);
  const isValid = !isNaN(dt.getTime());
  return (
    <div
      style={{
        padding: '12px 18px',
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink-900)',
            background: 'var(--surface-2)',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {isValid ? formatDate(dt) : day.date}
        </div>
        <span className="t-caption">
          {day.records.length} mark{day.records.length === 1 ? '' : 's'} ·{' '}
          <span className="mono tnum">{day.weight.toFixed(0)} kg</span>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {day.records.map((r) => {
          const p = partsById[r.part_id];
          return (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
              }}
            >
              <Icons.Check size={11} color="var(--status-done)" />
              <span className="mono" style={{ fontWeight: 600, width: 80 }}>
                {p?.mark || '?'}
              </span>
              <span style={{ color: 'var(--ink-500)', flex: 1, minWidth: 0 }}>
                {p?.description || p?.category || ''}
              </span>
              <span
                className="mono tnum"
                style={{ fontSize: 11, color: 'var(--ink-500)', width: 70, textAlign: 'right' }}
              >
                {p?.weight || 0} kg
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-700)', width: 100 }}>
                by {r.erector_name || '—'}
              </span>
              <span
                className="mono tnum"
                style={{ fontSize: 11, color: 'var(--ink-500)', width: 30, textAlign: 'right' }}
              >
                ×{r.crew_size || 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
