'use client';
import { useEffect, useState } from 'react';
import { Ring } from '../ui';
import { ChevronRight } from '../icons';
import * as db from '../../lib/database';
import {
  formatDate,
  projectWeeks,
  onTrackStatus,
} from '../../lib/format';

// Computes the project's "Overall %" as the erected weight / total weight,
// fetched from parts + erection_records. Cheap because both are already
// queried by other tabs; this triggers its own fetch since the header
// renders before any tab.
function useOverallProgress(projectId) {
  const [data, setData] = useState({ pct: 0, loading: true });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const [parts, records] = await Promise.all([
          db.getParts(projectId),
          db.getErectionRecords(projectId),
        ]);
        if (cancelled) return;
        const totalWeight = (parts || []).reduce(
          (a, p) => a + (Number(p.weight) || 0) * (Number(p.qty) || 0),
          0
        );
        // Each erection_record represents ONE erected piece of that part_id.
        // Each part has a `weight` per piece, so erected weight = sum of
        // matched part.weight per record.
        const partsById = {};
        (parts || []).forEach((p) => {
          partsById[p.id] = p;
        });
        const erectedWeight = (records || []).reduce((a, r) => {
          const p = partsById[r.part_id];
          return a + (p ? Number(p.weight) || 0 : 0);
        }, 0);
        const pct =
          totalWeight > 0 ? Math.round((erectedWeight / totalWeight) * 100) : 0;
        setData({ pct, loading: false });
      } catch (e) {
        console.error('overall progress error', e);
        if (!cancelled) setData({ pct: 0, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return data;
}

export default function ProjectHeader({ project, onBackToList }) {
  const { pct, loading } = useOverallProgress(project.id);

  const weeks = projectWeeks(project.start_date, project.target_date);
  const tracking = onTrackStatus(pct, project.start_date, project.target_date);

  // Status pill text inside the header chip.
  // If we have schedule + status, show: "<Status> · Week N/M"
  // Else just: "<Status>"
  const statusLabel = project.status || 'Active';
  const chipText = weeks ? `${statusLabel} · Week ${weeks.elapsed}/${weeks.total}` : statusLabel;
  const statusDot =
    statusLabel === 'Hold'
      ? 'var(--status-progress)'
      : statusLabel === 'Completed'
      ? 'var(--status-done)'
      : 'var(--accent)';

  const trackingColor =
    tracking.kind === 'done'
      ? 'var(--status-done)'
      : tracking.kind === 'progress'
      ? 'var(--status-progress)'
      : tracking.kind === 'alert'
      ? 'var(--status-alert)'
      : 'var(--ink-500)';

  return (
    <div
      className="header-with-hamburger"
      style={{
        padding: '18px 28px 14px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface-1)',
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--ink-500)',
          marginBottom: 8,
        }}
      >
        <button
          onClick={onBackToList}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-500)',
            cursor: 'pointer',
            fontSize: 12,
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          Projects
        </button>
        <ChevronRight size={12} />
        <span
          className="mono"
          style={{ color: 'var(--ink-700)', fontWeight: 500 }}
        >
          {project.project_no}
          {project.job_no ? ` / ${project.job_no}` : ''}
        </span>
      </div>

      <div
        className="project-header-row"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          flexWrap: 'nowrap',
        }}
      >
        {/* Name + chip + meta */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <h1
              className="t-h1"
              style={{
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
              title={project.client_name || project.project_no}
            >
              {project.client_name ||
                `${project.project_no}${project.job_no ? ' / ' + project.job_no : ''}`}
            </h1>
            <span className="chip chip-filled" style={{ flexShrink: 0 }}>
              <span className="chip-dot" style={{ background: statusDot }} />
              {chipText}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '2px 14px',
              color: 'var(--ink-500)',
              fontSize: 13,
            }}
          >
            {project.location && <span>{project.location}</span>}
            {project.location && (project.builtup_area_sqm || project.poc_name) && (
              <span aria-hidden="true">·</span>
            )}
            {project.builtup_area_sqm && (
              <span>
                <span className="mono tnum">
                  {Number(project.builtup_area_sqm).toLocaleString('en-IN')}
                </span>{' '}
                m²
              </span>
            )}
            {project.builtup_area_sqm && project.poc_name && (
              <span aria-hidden="true">·</span>
            )}
            {project.poc_name && <span>{project.poc_name}</span>}
          </div>
        </div>

        {/* Right cluster: target handover · on-track ring */}
        <div
          className="project-header-stats"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexShrink: 0,
          }}
        >
          {project.target_date && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                }}
              >
                <div className="t-overline">Target handover</div>
                <div
                  className="mono"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {formatDate(project.target_date)}
                </div>
              </div>
              <div className="divider-v" style={{ height: 36 }} />
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ring
              value={pct}
              size={40}
              stroke={3.5}
              color={loading ? 'var(--ink-300)' : 'var(--accent)'}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.25,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--ink-500)',
                  letterSpacing: '0.02em',
                }}
              >
                Overall
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: trackingColor,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {tracking.label}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
