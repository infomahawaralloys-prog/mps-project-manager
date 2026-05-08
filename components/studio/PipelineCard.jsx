'use client';
import { useState, useEffect } from 'react';
import * as db from '../../lib/database';
import {
  PIPELINE_CATEGORIES,
  PIPELINE_CAT_LABELS,
  PIPELINE_CAT_COLORS,
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_COLORS,
  pipelineMap,
  dueDateLabel,
} from '../../lib/pipeline';
import * as Icons from '../icons';
import { Bar } from '../ui';
import { formatDate, formatRelative } from '../../lib/format';
import PipelineEditor from './PipelineEditor';

// Drawing pipeline card shown on the Info tab.
// PM and Fab roles can edit. Other roles see read-only view.
export default function PipelineCard({ project, auth }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // category being edited

  useEffect(() => { load(); }, [project.id]);

  async function load() {
    setLoading(true);
    try {
      const d = await db.getProjectPipeline(project.id);
      setRows(d || []);
    } catch (e) {
      console.error('PipelineCard load', e);
    }
    setLoading(false);
  }

  const map = pipelineMap(project.id, rows);
  const canEdit = auth.isPM || auth.isFab;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icons.File size={15} color="var(--ink-700)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Drawing pipeline</div>
          <div className="t-caption">
            Status & tentative dates per category
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding: 30,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ink-400)',
          }}
        >
          Loading…
        </div>
      ) : (
        <div>
          {PIPELINE_CATEGORIES.map((cat, i) => (
            <PipelineRow
              key={cat}
              row={map[cat]}
              canEdit={canEdit}
              isLast={i === PIPELINE_CATEGORIES.length - 1}
              onEdit={() => canEdit && setEditing(cat)}
            />
          ))}
        </div>
      )}

      {editing && (
        <PipelineEditor
          project={project}
          auth={auth}
          category={editing}
          row={map[editing]}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PipelineRow({ row, canEdit, isLast, onEdit }) {
  const cat = row.category;
  const label = PIPELINE_CAT_LABELS[cat];
  const catColor = PIPELINE_CAT_COLORS[cat];
  const statusLabel = PIPELINE_STATUS_LABELS[row.status];
  const statusColor = PIPELINE_STATUS_COLORS[row.status];
  const due = dueDateLabel(row.due_date, row.status);

  return (
    <button
      onClick={onEdit}
      disabled={!canEdit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        width: '100%',
        textAlign: 'left',
        border: 'none',
        background: 'transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
        cursor: canEdit ? 'pointer' : 'default',
        fontFamily: 'inherit',
      }}
      title={canEdit ? 'Click to update' : ''}
    >
      {/* Category badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 130,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 4,
            height: 28,
            borderRadius: 2,
            background: catColor,
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--ink-900)',
              lineHeight: 1.2,
            }}
          >
            {label}
          </div>
          <div className="t-caption" style={{ marginTop: 1 }}>
            {row.updated_at ? `Updated ${formatRelative(row.updated_at)}` : 'No status yet'}
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          background: `color-mix(in oklab, ${statusColor} 12%, white)`,
          color: statusColor,
          fontSize: 11.5,
          fontWeight: 600,
          flexShrink: 0,
          minWidth: 100,
        }}
      >
        <StatusDot status={row.status} color={statusColor} />
        {statusLabel}
      </div>

      {/* Revision badge */}
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: 'var(--ink-500)',
          background: 'var(--surface-2)',
          padding: '3px 7px',
          borderRadius: 4,
          flexShrink: 0,
          letterSpacing: '0.02em',
        }}
        title={`Revision ${row.revision || 'Rev 0'}`}
      >
        {row.revision || 'Rev 0'}
      </div>

      {/* Link chip (only when drawing_url is set) */}
      {row.drawing_url && (
        <a
          href={row.drawing_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--accent) 10%, white)',
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid color-mix(in oklab, var(--accent) 25%, white)',
            flexShrink: 0,
          }}
          title="Open drawing"
        >
          <Icons.ExternalLink size={11} />
          Open
        </a>
      )}

      {/* Progress bar (if in progress) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {row.status === 'in_progress' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Bar value={row.percent || 0} color={statusColor} height={5} />
            </div>
            <span
              className="mono tnum"
              style={{ fontSize: 11.5, color: 'var(--ink-500)', width: 32 }}
            >
              {row.percent || 0}%
            </span>
          </div>
        )}
        {row.note && (
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--ink-500)',
              marginTop: row.status === 'in_progress' ? 4 : 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={row.note}
          >
            {row.note}
          </div>
        )}
      </div>

      {/* Due date */}
      <div
        style={{
          minWidth: 90,
          textAlign: 'right',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {row.due_date ? (
          <>
            <div
              className="mono"
              style={{
                fontSize: 11.5,
                color: 'var(--ink-700)',
                fontWeight: 500,
              }}
            >
              {formatDate(row.due_date)}
            </div>
            {due && (
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color:
                    due.tone === 'alert'
                      ? 'var(--status-alert)'
                      : due.tone === 'progress'
                      ? 'var(--status-progress)'
                      : 'var(--ink-400)',
                }}
              >
                {due.label}
              </div>
            )}
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
            {canEdit ? 'Set date' : '—'}
          </span>
        )}
      </div>

      {canEdit && (
        <Icons.ChevronRight size={14} color="var(--ink-400)" style={{ flexShrink: 0 }} />
      )}
    </button>
  );
}

function StatusDot({ status, color }) {
  if (status === 'done') {
    return (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
    );
  }
  if (status === 'in_progress') {
    return (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: `linear-gradient(90deg, ${color} 50%, transparent 50%)`,
          border: `1.5px solid ${color}`,
          flexShrink: 0,
        }}
      />
    );
  }
  if (status === 'on_hold') {
    return (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 1,
          background: color,
          flexShrink: 0,
        }}
      />
    );
  }
  // not_started — empty circle
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        border: `1.5px solid ${color}`,
        flexShrink: 0,
      }}
    />
  );
}
