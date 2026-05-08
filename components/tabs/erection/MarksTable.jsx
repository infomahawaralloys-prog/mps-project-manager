'use client';
import { useState, useMemo } from 'react';
import * as db from '../../../lib/database';
import { Button, SearchInput } from '../../ui';
import * as Icons from '../../icons';
import { ralToHex } from '../../../lib/ral-colors';

// Marks table for the Erection tab.
// PM/Site role: bulk-select checkboxes + inline tap-to-toggle erected status.
// Client/Viewer: read-only progress.

export default function MarksTable({
  project,
  auth,
  parts,
  fabSummary,
  erectionRecords,
  dispatchedPartIds,
  onChanged,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | erected | ready | locked
  const [selected, setSelected] = useState({}); // partId → bool
  const [erectModal, setErectModal] = useState(null);
  const [bulkPanel, setBulkPanel] = useState(false);

  const erectedById = useMemo(() => {
    const m = {};
    (erectionRecords || []).forEach((r) => (m[r.part_id] = r));
    return m;
  }, [erectionRecords]);

  const canManage = auth.isPM || auth.isSite;

  function canErect(part) {
    if (part.category === 'builtup') {
      const fs = fabSummary[part.id];
      if (!fs || (fs.painting || 0) < part.qty) {
        return { ok: false, reason: 'Painting incomplete' };
      }
    }
    if (part.category === 'coldform') {
      const fs = fabSummary[part.id];
      if (!fs || (fs.cutting || 0) < part.qty) {
        return { ok: false, reason: 'Roll Forming incomplete' };
      }
    }
    const dispQty = dispatchedPartIds[part.id] || 0;
    if (dispQty < part.qty) {
      return { ok: false, reason: `Not dispatched (${dispQty}/${part.qty})` };
    }
    return { ok: true };
  }

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !(p.mark || '').toLowerCase().includes(q) &&
          !(p.description || '').toLowerCase().includes(q)
        )
          return false;
      }
      const erected = !!erectedById[p.id];
      const gate = canErect(p);
      if (filter === 'erected' && !erected) return false;
      if (filter === 'ready' && (erected || !gate.ok)) return false;
      if (filter === 'locked' && (erected || gate.ok)) return false;
      return true;
    });
  }, [parts, search, filter, erectedById, canErect]);

  const eligibleForBulk = filtered.filter(
    (p) => !erectedById[p.id] && canErect(p).ok
  );
  const selectedCount = eligibleForBulk.filter((p) => selected[p.id]).length;
  const allEligibleSelected =
    eligibleForBulk.length > 0 &&
    eligibleForBulk.every((p) => selected[p.id]);

  const counts = useMemo(() => {
    let erected = 0,
      ready = 0,
      locked = 0;
    parts.forEach((p) => {
      if (erectedById[p.id]) erected++;
      else if (canErect(p).ok) ready++;
      else locked++;
    });
    return { all: parts.length, erected, ready, locked };
  }, [parts, erectedById, canErect]);

  function toggleSelect(partId) {
    setSelected((p) => ({ ...p, [partId]: !p[partId] }));
  }

  function selectAll() {
    if (allEligibleSelected) {
      setSelected({});
    } else {
      const next = {};
      eligibleForBulk.forEach((p) => (next[p.id] = true));
      setSelected(next);
    }
  }

  async function handleInlineToggle(part) {
    const erected = !!erectedById[part.id];
    if (erected) {
      if (!auth.isPM) return; // only PM can un-erect
      if (!confirm(`Un-erect ${part.mark}?`)) return;
      try {
        await db.unErectMark(project.id, part.id);
        await db.logActivity({
          project_id: project.id,
          action_type: 'erect_toggle',
          details: `${part.mark} UN-ERECTED`,
          user_name: auth.userName,
          user_role: auth.role,
        });
        onChanged();
      } catch (e) {
        alert(e.message);
      }
      return;
    }
    if (!canManage) return;
    const gate = canErect(part);
    if (!gate.ok) {
      alert(`Cannot erect ${part.mark}: ${gate.reason}`);
      return;
    }
    setErectModal(part);
  }

  async function handleBulkErect(erector, crewSize) {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (ids.length === 0) return;
    const eligible = parts.filter(
      (p) => ids.includes(p.id) && !erectedById[p.id] && canErect(p).ok
    );
    if (eligible.length === 0) {
      alert('No eligible parts in selection.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    try {
      await Promise.all(
        eligible.map((p) =>
          db.erectMark({
            project_id: project.id,
            part_id: p.id,
            erection_date: today,
            erector_name: erector,
            crew_size: parseInt(crewSize) || 1,
            created_by: auth.user.id,
          })
        )
      );
      await db.logActivity({
        project_id: project.id,
        action_type: 'erect_toggle',
        details: `Bulk erect: ${eligible.length} parts by ${erector}, crew ${crewSize}`,
        user_name: auth.userName,
        user_role: auth.role,
      });
      setSelected({});
      setBulkPanel(false);
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          background: 'var(--surface-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <Icons.Crane size={16} color="var(--ink-700)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Marks</span>
          <span className="t-caption">({parts.length})</span>
        </div>

        {/* Filter pills */}
        <FilterPill label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterPill
          label="Erected"
          count={counts.erected}
          active={filter === 'erected'}
          color="var(--status-done)"
          onClick={() => setFilter('erected')}
        />
        <FilterPill
          label="Ready"
          count={counts.ready}
          active={filter === 'ready'}
          color="var(--accent)"
          onClick={() => setFilter('ready')}
        />
        <FilterPill
          label="Locked"
          count={counts.locked}
          active={filter === 'locked'}
          color="var(--ink-500)"
          onClick={() => setFilter('locked')}
        />

        <div style={{ flex: 1 }} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search marks…"
          width={220}
        />
      </div>

      {/* Bulk action bar */}
      {canManage && eligibleForBulk.length > 0 && (
        <div
          style={{
            padding: '8px 18px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
          }}
        >
          <button
            onClick={selectAll}
            className="btn btn-ghost btn-sm"
            style={{ height: 26 }}
          >
            <CheckBox checked={allEligibleSelected} indeterminate={selectedCount > 0 && !allEligibleSelected} />
            <span style={{ marginLeft: 4 }}>
              {allEligibleSelected ? 'Clear selection' : `Select all ready (${eligibleForBulk.length})`}
            </span>
          </button>
          {selectedCount > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <span className="mono tnum" style={{ color: 'var(--ink-700)', fontWeight: 500 }}>
                {selectedCount} selected
              </span>
              <Button
                size="sm"
                variant="accent"
                icon={Icons.Crane}
                onClick={() => setBulkPanel(true)}
              >
                Erect selected
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
          }}
        >
          {parts.length === 0 ? 'No parts yet.' : 'No marks match.'}
        </div>
      ) : (
        <table className="t-table marks-table-mobile">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Mark</th>
              <th>Description</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Wt (kg)</th>
              <th>Status</th>
              {canManage && <th style={{ width: 80, textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const erected = !!erectedById[p.id];
              const gate = canErect(p);
              const hex = ralToHex(p.color);
              return (
                <tr key={p.id} style={{ opacity: erected ? 0.7 : 1 }}>
                  <td style={{ width: 40, textAlign: 'center' }}>
                    {canManage && !erected && gate.ok ? (
                      <button
                        onClick={() => toggleSelect(p.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <CheckBox checked={!!selected[p.id]} />
                      </button>
                    ) : erected ? (
                      <Icons.Check size={14} color="var(--status-done)" />
                    ) : !gate.ok ? (
                      <Icons.Lock size={12} color="var(--ink-400)" />
                    ) : null}
                  </td>
                  <td data-label="Mark">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {hex && (
                        <span
                          title={p.color}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: hex,
                            border: '1px solid var(--line-strong)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        className="mono"
                        style={{
                          fontWeight: 600,
                          color: erected
                            ? 'var(--status-done)'
                            : gate.ok
                            ? 'var(--ink-900)'
                            : 'var(--ink-400)',
                        }}
                      >
                        {p.mark}
                      </span>
                    </div>
                  </td>
                  <td data-label="Description" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                    {p.description || '—'}
                  </td>
                  <td data-label="Category" style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                    {p.category}
                  </td>
                  <td data-label="Wt (kg)" className="mono tnum" style={{ textAlign: 'right' }}>
                    {p.weight || 0}
                  </td>
                  <td data-label="Status">
                    {erected ? (
                      <span className="badge-done">
                        Erected · {erectedById[p.id]?.erection_date || ''}
                      </span>
                    ) : gate.ok ? (
                      <span className="badge-progress">Ready</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                        {gate.reason}
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td style={{ textAlign: 'center' }}>
                      {erected ? (
                        auth.isPM ? (
                          <button
                            onClick={() => handleInlineToggle(p)}
                            className="btn btn-ghost btn-sm"
                            style={{ height: 26, fontSize: 11 }}
                          >
                            Un-erect
                          </button>
                        ) : null
                      ) : gate.ok ? (
                        <button
                          onClick={() => handleInlineToggle(p)}
                          className="btn btn-accent btn-sm"
                          style={{ height: 26, fontSize: 11 }}
                        >
                          Erect
                        </button>
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Single-erect modal */}
      {erectModal && (
        <ErectModal
          part={erectModal}
          onCancel={() => setErectModal(null)}
          onConfirm={async (date, erector, crew) => {
            try {
              await db.erectMark({
                project_id: project.id,
                part_id: erectModal.id,
                erection_date: date,
                erector_name: erector,
                crew_size: parseInt(crew) || 1,
                created_by: auth.user.id,
              });
              await db.logActivity({
                project_id: project.id,
                action_type: 'erect_toggle',
                details: `${erectModal.mark} ERECTED by ${erector} crew:${crew}`,
                user_name: auth.userName,
                user_role: auth.role,
              });
              setErectModal(null);
              onChanged();
            } catch (e) {
              alert(e.message);
            }
          }}
        />
      )}

      {/* Bulk erect modal */}
      {bulkPanel && (
        <BulkErectModal
          count={selectedCount}
          onCancel={() => setBulkPanel(false)}
          onConfirm={handleBulkErect}
        />
      )}
    </div>
  );
}

// ============================================================
// Filter pill
// ============================================================
function FilterPill({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: '0 10px',
        borderRadius: 999,
        border: 'none',
        background: active
          ? color
            ? `color-mix(in oklab, ${color} 12%, white)`
            : 'var(--surface-2)'
          : 'transparent',
        color: active ? color || 'var(--ink-900)' : 'var(--ink-500)',
        fontSize: 11.5,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
      <span
        className="mono tnum"
        style={{ fontSize: 11, opacity: 0.85 }}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================
// Checkbox
// ============================================================
function CheckBox({ checked, indeterminate }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: checked || indeterminate ? 'var(--accent)' : 'var(--line-strong)',
        background: checked || indeterminate ? 'var(--accent)' : 'var(--surface-1)',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {checked && <Icons.Check size={10} />}
      {indeterminate && !checked && (
        <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} />
      )}
    </span>
  );
}

// ============================================================
// Single Erect Modal
// ============================================================
function ErectModal({ part, onConfirm, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [erector, setErector] = useState('');
  const [crew, setCrew] = useState('1');

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
          maxWidth: 380,
          width: '100%',
          padding: 22,
          background: 'var(--surface-1)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icons.Crane size={16} color="var(--accent)" />
          <span className="t-overline" style={{ color: 'var(--accent)' }}>
            Erect mark
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          {part.mark}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 16 }}>
          {part.description || '—'} · {part.weight} kg · {part.category}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Erector name">
            <input
              value={erector}
              onChange={(e) => setErector(e.target.value)}
              placeholder="Erector / supervisor"
              autoFocus
            />
          </Field>
          <Field label="Crew size">
            <input type="number" min={1} value={crew} onChange={(e) => setCrew(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </Button>
          <Button
            variant="accent"
            icon={Icons.Check}
            onClick={() => {
              if (!erector.trim()) {
                alert('Enter erector name');
                return;
              }
              onConfirm(date, erector, parseInt(crew) || 1);
            }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Erect
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Bulk Erect Modal
// ============================================================
function BulkErectModal({ count, onConfirm, onCancel }) {
  const [erector, setErector] = useState('');
  const [crew, setCrew] = useState('1');

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
          maxWidth: 380,
          width: '100%',
          padding: 22,
          background: 'var(--surface-1)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icons.Crane size={16} color="var(--accent)" />
          <span className="t-overline" style={{ color: 'var(--accent)' }}>
            Bulk erect
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Erect {count} mark{count === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Erector name (applies to all)">
            <input
              value={erector}
              onChange={(e) => setErector(e.target.value)}
              placeholder="Erector / supervisor"
              autoFocus
            />
          </Field>
          <Field label="Crew size">
            <input type="number" min={1} value={crew} onChange={(e) => setCrew(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </Button>
          <Button
            variant="accent"
            icon={Icons.Check}
            onClick={() => {
              if (!erector.trim()) {
                alert('Enter erector name');
                return;
              }
              onConfirm(erector, crew);
            }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Erect {count}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="t-overline" style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
