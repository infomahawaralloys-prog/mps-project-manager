'use client';
import { useState, useMemo } from 'react';
import {
  PIPELINE_CATEGORIES,
  PIPELINE_CAT_LABELS,
  PIPELINE_CAT_COLORS,
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_COLORS,
  pipelineMap,
  dueDateLabel,
} from '../../lib/pipeline';
import { SearchInput } from '../ui';
import * as Icons from '../icons';
import { formatDate, formatRelative } from '../../lib/format';
import PipelineEditor from './PipelineEditor';

// Cross-project grid: rows = projects, cols = categories.
// Click any cell → opens PipelineEditor.
//
// Props:
//   projects   — array from db.getProjects()
//   pipelines  — array from db.getAllPipelines()
//   auth       — useAuth()
//   onProjectClick(p)  — drill into a project (called from project name click)
//   onChanged()        — reload data after edit

export default function PipelineGrid({
  projects = [],
  pipelines = [],
  auth,
  onProjectClick,
  onChanged,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [editing, setEditing] = useState(null); // { project, category, row }

  const canEdit = auth.isPM || auth.isFab;

  // Build pipelines-by-project map
  const pipelinesByProject = useMemo(() => {
    const m = {};
    pipelines.forEach((p) => {
      if (!m[p.project_id]) m[p.project_id] = [];
      m[p.project_id].push(p);
    });
    return m;
  }, [pipelines]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (statusFilter !== 'All' && p.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (p.project_no || '').toLowerCase().includes(q) ||
          (p.client_name || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Active projects first, then by most recent updated_at if available
        return (a.project_no || '').localeCompare(b.project_no || '');
      });
  }, [projects, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { All: projects.length, Active: 0, Hold: 0, Completed: 0 };
    projects.forEach((p) => {
      if (c[p.status] != null) c[p.status]++;
    });
    return c;
  }, [projects]);

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {['Active', 'Hold', 'Completed', 'All'].map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  height: 28,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: 'none',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--ink-900)' : 'var(--ink-500)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {s}
                <span
                  className="mono tnum"
                  style={{ fontSize: 10.5, opacity: 0.7 }}
                >
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects…"
          width={220}
        />
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 60,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
          }}
        >
          {projects.length === 0
            ? 'No projects yet. Create one to get started.'
            : 'No projects match the current filter.'}
        </div>
      ) : (
        <div
          className="card scroll-x-mobile"
          style={{ overflow: 'auto', padding: 0 }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 980,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <th
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--ink-500)',
                    minWidth: 240,
                    position: 'sticky',
                    left: 0,
                    background: 'var(--surface-2)',
                    zIndex: 1,
                  }}
                >
                  Project
                </th>
                {PIPELINE_CATEGORIES.map((cat) => (
                  <th
                    key={cat}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: PIPELINE_CAT_COLORS[cat],
                      minWidth: 160,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 4,
                          height: 12,
                          borderRadius: 1,
                          background: PIPELINE_CAT_COLORS[cat],
                        }}
                      />
                      {PIPELINE_CAT_LABELS[cat]}
                    </div>
                  </th>
                ))}
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--ink-500)',
                    minWidth: 110,
                  }}
                >
                  Last update
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p, idx) => {
                const map = pipelineMap(p.id, pipelinesByProject[p.id] || []);
                const lastUpdate = (pipelinesByProject[p.id] || []).reduce(
                  (acc, r) => {
                    if (!r.updated_at) return acc;
                    return !acc || r.updated_at > acc ? r.updated_at : acc;
                  },
                  null
                );
                const isStale =
                  lastUpdate &&
                  Date.now() - new Date(lastUpdate).getTime() >
                    3 * 24 * 60 * 60 * 1000;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom:
                        idx === filteredProjects.length - 1
                          ? 'none'
                          : '1px solid var(--line)',
                    }}
                  >
                    {/* Project name cell */}
                    <td
                      style={{
                        padding: '12px 16px',
                        position: 'sticky',
                        left: 0,
                        background: 'var(--surface-1)',
                        borderRight: '1px solid var(--line)',
                        zIndex: 1,
                      }}
                    >
                      <button
                        onClick={() => onProjectClick && onProjectClick(p)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          width: '100%',
                        }}
                      >
                        <div
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: 'var(--ink-400)',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            marginBottom: 2,
                          }}
                        >
                          {p.project_no}
                          {p.job_no ? ` · ${p.job_no}` : ''}
                          {p.status !== 'Active' && (
                            <span
                              style={{
                                marginLeft: 6,
                                color:
                                  p.status === 'Hold'
                                    ? 'var(--status-progress)'
                                    : 'var(--ink-400)',
                              }}
                            >
                              · {p.status}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--ink-900)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 220,
                          }}
                        >
                          {p.client_name || p.location || p.project_no}
                        </div>
                        {p.target_date && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: 'var(--ink-500)',
                              marginTop: 2,
                            }}
                          >
                            <Icons.Calendar
                              size={9}
                              color="var(--ink-400)"
                              style={{ marginRight: 3, verticalAlign: 'middle' }}
                            />
                            Target {formatDate(p.target_date)}
                          </div>
                        )}
                      </button>
                    </td>

                    {/* Category cells */}
                    {PIPELINE_CATEGORIES.map((cat) => (
                      <td
                        key={cat}
                        style={{
                          padding: 6,
                          background: isStale
                            ? 'color-mix(in oklab, var(--status-progress) 4%, white)'
                            : undefined,
                        }}
                      >
                        <CategoryCell
                          row={map[cat]}
                          canEdit={canEdit}
                          onClick={() =>
                            canEdit &&
                            setEditing({
                              project: p,
                              category: cat,
                              row: map[cat],
                            })
                          }
                        />
                      </td>
                    ))}

                    {/* Last update */}
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 11,
                        color: 'var(--ink-500)',
                      }}
                    >
                      {lastUpdate ? (
                        <span style={{ color: isStale ? 'var(--status-progress)' : 'inherit' }}>
                          {isStale && (
                            <Icons.X
                              size={11}
                              color="var(--status-progress)"
                              style={{ marginRight: 3, verticalAlign: 'middle' }}
                            />
                          )}
                          {formatRelative(lastUpdate)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-400)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <PipelineEditor
          project={editing.project}
          auth={auth}
          category={editing.category}
          row={editing.row}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Category cell — compact view of one project+category
// ============================================================
function CategoryCell({ row, canEdit, onClick }) {
  const statusColor = PIPELINE_STATUS_COLORS[row.status];
  const statusLabel = PIPELINE_STATUS_LABELS[row.status];
  const due = dueDateLabel(row.due_date, row.status);
  const isBlocked = row.status === 'on_hold';

  return (
    <button
      onClick={onClick}
      disabled={!canEdit}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${statusColor}`,
        background: isBlocked
          ? `color-mix(in oklab, ${statusColor} 6%, white)`
          : 'var(--surface-1)',
        borderRadius: 6,
        cursor: canEdit ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 60,
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => {
        if (canEdit) e.currentTarget.style.background = 'var(--surface-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isBlocked
          ? `color-mix(in oklab, ${statusColor} 6%, white)`
          : 'var(--surface-1)';
      }}
      title={row.note || statusLabel}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: statusColor,
          }}
        >
          {statusLabel}
          {row.status === 'in_progress' && row.percent > 0 && (
            <span className="mono tnum" style={{ marginLeft: 4, fontSize: 11 }}>
              · {row.percent}%
            </span>
          )}
        </span>
        {due && (
          <span style={{ marginLeft: 'auto' }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color:
                  due.tone === 'alert'
                    ? 'var(--status-alert)'
                    : due.tone === 'progress'
                    ? 'var(--status-progress)'
                    : 'var(--ink-400)',
                background:
                  due.tone === 'alert'
                    ? 'color-mix(in oklab, var(--status-alert) 12%, white)'
                    : due.tone === 'progress'
                    ? 'color-mix(in oklab, var(--status-progress) 12%, white)'
                    : 'transparent',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              {due.label}
            </span>
          </span>
        )}
      </div>
      {row.note ? (
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--ink-500)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3,
          }}
        >
          {isBlocked && '⚠ '}
          {row.note}
        </div>
      ) : row.due_date ? (
        <div
          className="mono"
          style={{ fontSize: 10.5, color: 'var(--ink-500)' }}
        >
          {formatDate(row.due_date)}
        </div>
      ) : (
        <div style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>
          {canEdit ? 'Click to set' : '—'}
        </div>
      )}
    </button>
  );
}
