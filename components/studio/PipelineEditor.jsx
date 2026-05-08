'use client';
import { useState } from 'react';
import * as db from '../../lib/database';
import {
  PIPELINE_CAT_LABELS,
  PIPELINE_CAT_COLORS,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_COLORS,
} from '../../lib/pipeline';
import { Button } from '../ui';
import * as Icons from '../icons';

export default function PipelineEditor({
  project,
  auth,
  category,
  row,
  onSaved,
  onCancel,
}) {
  const [status, setStatus] = useState(row?.status || 'not_started');
  const [percent, setPercent] = useState(row?.percent ?? 0);
  const [dueDate, setDueDate] = useState(row?.due_date || '');
  const [note, setNote] = useState(row?.note || '');
  const [drawingUrl, setDrawingUrl] = useState(row?.drawing_url || '');
  const [revision, setRevision] = useState(row?.revision || 'Rev 0');
  const [saving, setSaving] = useState(false);

  const catLabel = PIPELINE_CAT_LABELS[category];
  const catColor = PIPELINE_CAT_COLORS[category];

  async function handleSave() {
    setSaving(true);
    try {
      await db.upsertPipeline({
        project_id: project.id,
        category,
        status,
        percent: status === 'in_progress' ? percent : status === 'done' ? 100 : 0,
        due_date: dueDate || null,
        note: note || null,
        drawing_url: drawingUrl.trim() || null,
        revision: revision.trim() || 'Rev 0',
        updated_by: auth.user?.id,
      });

      // Build a readable activity log entry
      const oldStatus = row?.status || 'not_started';
      const statusChanged = oldStatus !== status;
      const noteChanged = (row?.note || '') !== (note || '');
      const dateChanged = (row?.due_date || '') !== (dueDate || '');
      const urlChanged = (row?.drawing_url || '') !== (drawingUrl || '');
      const revChanged = (row?.revision || 'Rev 0') !== (revision || 'Rev 0');
      let parts = [];
      if (statusChanged)
        parts.push(
          `status: ${PIPELINE_STATUS_LABELS[oldStatus]} → ${PIPELINE_STATUS_LABELS[status]}`
        );
      if (status === 'in_progress' && row?.percent !== percent)
        parts.push(`progress: ${percent}%`);
      if (dateChanged)
        parts.push(dueDate ? `due: ${dueDate}` : 'due cleared');
      if (revChanged)
        parts.push(`revision: ${revision}`);
      if (urlChanged)
        parts.push(drawingUrl ? 'drawing link updated' : 'drawing link cleared');
      if (noteChanged && note) parts.push(`note: "${note}"`);
      if (noteChanged && !note) parts.push('note cleared');

      if (parts.length > 0) {
        await db.logActivity({
          project_id: project.id,
          action_type: 'pipeline_update',
          details: `${catLabel}: ${parts.join(', ')}`,
          user_name: auth.userName,
          user_role: auth.role,
        });
      }
      onSaved();
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,16,0.45)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card animate-fade"
        style={{
          maxWidth: 460,
          width: '100%',
          padding: 0,
          background: 'var(--surface-1)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 4,
              height: 28,
              borderRadius: 2,
              background: catColor,
            }}
          />
          <div style={{ flex: 1 }}>
            <div className="t-overline" style={{ marginBottom: 2 }}>
              {project.project_no}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--ink-900)',
                lineHeight: 1.1,
              }}
            >
              {catLabel} drawings
            </div>
          </div>
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ width: 28, height: 28 }}
            aria-label="Close"
          >
            <Icons.X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Status — 4 button group */}
          <div>
            <label
              className="t-overline"
              style={{ display: 'block', marginBottom: 8 }}
            >
              Status
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
            >
              {PIPELINE_STATUSES.map((s) => {
                const active = status === s;
                const color = PIPELINE_STATUS_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      padding: '10px 6px',
                      border: `1.5px solid ${active ? color : 'var(--line)'}`,
                      background: active
                        ? `color-mix(in oklab, ${color} 10%, white)`
                        : 'var(--surface-1)',
                      color: active ? color : 'var(--ink-700)',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'center',
                      transition: 'all 120ms',
                    }}
                  >
                    {PIPELINE_STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Percent — only for in_progress */}
          {status === 'in_progress' && (
            <div>
              <label
                className="t-overline"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Progress: <span className="mono tnum">{percent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={percent}
                onChange={(e) => setPercent(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: catColor }}
              />
            </div>
          )}

          {/* Due date */}
          <div>
            <label
              className="t-overline"
              style={{ display: 'block', marginBottom: 6 }}
            >
              Tentative due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <div className="t-caption" style={{ marginTop: 4 }}>
              When you expect these drawings to be ready / received
            </div>
          </div>

          {/* Drawing link + revision */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px',
              gap: 10,
            }}
          >
            <div>
              <label
                className="t-overline"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Drawing link
              </label>
              <input
                type="url"
                value={drawingUrl}
                onChange={(e) => setDrawingUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
              />
            </div>
            <div>
              <label
                className="t-overline"
                style={{ display: 'block', marginBottom: 6 }}
              >
                Revision
              </label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="Rev 0"
              />
            </div>
          </div>

          {/* Note / blocker */}
          <div>
            <label
              className="t-overline"
              style={{ display: 'block', marginBottom: 6 }}
            >
              {status === 'on_hold' ? 'Blocker (why on hold)' : 'Note'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                status === 'on_hold'
                  ? 'e.g. Awaiting site civil corrections, column footing depth wrong'
                  : 'Optional context — current focus, what to expect…'
              }
              style={{
                width: '100%',
                padding: '8px 10px',
                fontFamily: 'inherit',
                fontSize: 13,
                resize: 'vertical',
                minHeight: 70,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <Button onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="accent"
            icon={Icons.Check}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
