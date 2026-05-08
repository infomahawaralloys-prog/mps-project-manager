'use client';
import { useState, useEffect } from 'react';
import * as db from '../../lib/database';
import { Segmented } from '../ui';
import * as Icons from '../icons';
import PipelineGrid from './PipelineGrid';
import TodayFeed from './TodayFeed';

// Studio — cross-project portfolio view.
// Sub-tabs:
//   pipeline  — drawing pipeline matrix
//   today     — chronological cross-project activity feed
//
// Replaces the "no project selected" empty state on the homepage.

const SUB_TABS = [
  { value: 'pipeline', label: 'Pipeline', icon: 'Grid' },
  { value: 'today', label: 'Today', icon: 'Calendar' },
];

export default function StudioView({ auth, projects, onProjectClick }) {
  const [subTab, setSubTab] = useState('pipeline');
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPipelines(); }, []);

  async function loadPipelines() {
    setLoading(true);
    try {
      const data = await db.getAllPipelines();
      setPipelines(data || []);
    } catch (e) {
      console.error('Studio loadPipelines', e);
    }
    setLoading(false);
  }

  // Quick portfolio stats for the header
  const activeProjects = projects.filter((p) => p.status === 'Active').length;
  const overdueCount = pipelines.filter((p) => {
    if (!p.due_date || p.status === 'done') return false;
    return new Date(p.due_date) < new Date();
  }).length;
  const onHoldCount = pipelines.filter((p) => p.status === 'on_hold').length;

  return (
    <div
      className="animate-fade"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
    >
      {/* Studio header */}
      <div
        className="header-with-hamburger"
        style={{
          padding: '20px 28px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-1)',
        }}
      >
        <div className="t-overline" style={{ marginBottom: 4 }}>Portfolio</div>
        <div
          className="studio-header-stats"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--ink-900)',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Studio
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 12,
              color: 'var(--ink-500)',
            }}
          >
            <Stat
              label="Active projects"
              value={activeProjects}
              color="var(--ink-900)"
            />
            <Sep />
            <Stat
              label="On hold"
              value={onHoldCount}
              color={onHoldCount > 0 ? 'var(--status-alert)' : 'var(--ink-500)'}
            />
            <Sep />
            <Stat
              label="Overdue drawings"
              value={overdueCount}
              color={overdueCount > 0 ? 'var(--status-alert)' : 'var(--ink-500)'}
            />
          </div>
        </div>
      </div>

      {/* Sub-tab strip */}
      <div
        style={{
          padding: '14px 28px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-0)',
        }}
      >
        <div className="tabs-strip">
          <Segmented
            value={subTab}
            onChange={setSubTab}
            options={SUB_TABS}
            size="md"
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 28px 60px', flex: 1, minWidth: 0 }}>
        {subTab === 'pipeline' && (
          loading ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--ink-500)',
                fontSize: 13,
              }}
            >
              Loading pipeline…
            </div>
          ) : (
            <PipelineGrid
              projects={projects}
              pipelines={pipelines}
              auth={auth}
              onProjectClick={onProjectClick}
              onChanged={loadPipelines}
            />
          )
        )}

        {subTab === 'today' && <TodayFeed auth={auth} />}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
      <span
        className="mono tnum"
        style={{ fontSize: 14, fontWeight: 600, color }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{label}</span>
    </div>
  );
}

function Sep() {
  return <span style={{ color: 'var(--ink-300)' }}>·</span>;
}
