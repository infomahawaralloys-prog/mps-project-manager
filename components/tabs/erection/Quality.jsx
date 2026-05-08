'use client';
import { useState } from 'react';
import * as db from '../../../lib/database';
import { Ring, Bar, Button, StatusPill } from '../../ui';
import * as Icons from '../../icons';
import { formatDate } from '../../../lib/format';

const SAFETY_ITEMS = [
  'PPE (helmets, vests, shoes)',
  'Barricading in place',
  'Crane inspection done',
  'Sling/Shackle condition OK',
  'Weather check (no high wind)',
  'Toolbox Talk conducted',
  'Fall Protection (harness, nets)',
  'Fire Extinguisher available',
  'First Aid kit available',
  'Housekeeping (clean site)',
];

export default function Quality({
  project,
  auth,
  snags,
  safety,
  bolts,
  onChanged,
}) {
  const canManage = auth.isPM || auth.isSite;
  const today = new Date().toISOString().split('T')[0];
  const todayCheck = safety.find((s) => s.check_date === today);
  const todayItems = todayCheck
    ? typeof todayCheck.items === 'string'
      ? JSON.parse(todayCheck.items)
      : todayCheck.items
    : {};
  const passed = SAFETY_ITEMS.filter((_, i) => todayItems[i]).length;

  return (
    <div
      className="grid-stack-mobile grid-2col-rail-wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Snags
          project={project}
          auth={auth}
          snags={snags}
          canManage={canManage}
          onChanged={onChanged}
        />
        <Bolts
          project={project}
          auth={auth}
          bolts={bolts}
          canManage={canManage}
          onChanged={onChanged}
        />
      </div>
      <div>
        <Safety
          project={project}
          auth={auth}
          today={today}
          items={todayItems}
          passed={passed}
          canManage={canManage}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}

// ============================================================
// Snags
// ============================================================
function Snags({ project, auth, snags, canManage, onChanged }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    description: '',
    location_mark: '',
    severity: 'Minor',
  });
  const [statusFilter, setStatusFilter] = useState('all');

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
  }

  async function handleAdd() {
    if (!form.description.trim()) return;
    try {
      await db.addSnag({ ...form, project_id: project.id, created_by: auth.user.id });
      await db.logActivity({
        project_id: project.id,
        action_type: 'snag_add',
        details: `Snag: ${form.description} (${form.severity})`,
        user_name: auth.userName,
        user_role: auth.role,
      });
      setForm({ description: '', location_mark: '', severity: 'Minor' });
      setShowAdd(false);
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleStatusChange(s, newStatus) {
    try {
      await db.updateSnag(s.id, { status: newStatus });
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  const filtered =
    statusFilter === 'all'
      ? snags
      : snags.filter((s) => s.status === statusFilter);

  const counts = {
    all: snags.length,
    Open: snags.filter((s) => s.status === 'Open').length,
    'In Progress': snags.filter((s) => s.status === 'In Progress').length,
    Closed: snags.filter((s) => s.status === 'Closed').length,
  };

  return (
    <div className="card">
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <Icons.X size={15} color="var(--status-alert)" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Snags</span>
        <Pill label="All" count={counts.all} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <Pill label="Open" count={counts.Open} active={statusFilter === 'Open'} color="var(--status-alert)" onClick={() => setStatusFilter('Open')} />
        <Pill label="In Progress" count={counts['In Progress']} active={statusFilter === 'In Progress'} color="var(--status-progress)" onClick={() => setStatusFilter('In Progress')} />
        <Pill label="Closed" count={counts.Closed} active={statusFilter === 'Closed'} color="var(--status-done)" onClick={() => setStatusFilter('Closed')} />
        <div style={{ flex: 1 }} />
        {canManage && (
          <Button
            size="sm"
            variant={showAdd ? 'default' : 'accent'}
            icon={showAdd ? Icons.X : Icons.Plus}
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? 'Cancel' : 'Add snag'}
          </Button>
        )}
      </div>

      {showAdd && (
        <div
          style={{
            padding: 14,
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What's the issue?"
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.location_mark}
              onChange={(e) => set('location_mark', e.target.value)}
              placeholder="Location / mark code"
              style={{ flex: 1 }}
            />
            <select
              value={form.severity}
              onChange={(e) => set('severity', e.target.value)}
              style={{ width: 130 }}
            >
              <option>Critical</option>
              <option>Major</option>
              <option>Minor</option>
            </select>
            <Button variant="accent" icon={Icons.Check} onClick={handleAdd}>
              Save
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
          }}
        >
          {snags.length === 0 ? 'No snags recorded yet.' : 'No snags match.'}
        </div>
      ) : (
        <div>
          {filtered.map((s) => {
            const sevColor = {
              Critical: 'var(--status-alert)',
              Major: 'var(--status-progress)',
              Minor: 'var(--accent)',
            }[s.severity];

            return (
              <div
                key={s.id}
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: sevColor,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-900)' }}>
                    {s.description}
                  </div>
                  {s.location_mark && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-500)',
                        marginTop: 2,
                      }}
                    >
                      <Icons.Crane
                        size={10}
                        color="var(--ink-400)"
                        style={{ marginRight: 4, verticalAlign: 'middle' }}
                      />
                      {s.location_mark}
                    </div>
                  )}
                </div>
                <span
                  className="badge-progress"
                  style={{
                    color: sevColor,
                    background: `color-mix(in oklab, ${sevColor} 10%, white)`,
                  }}
                >
                  {s.severity}
                </span>
                {canManage ? (
                  <select
                    value={s.status}
                    onChange={(e) => handleStatusChange(s, e.target.value)}
                    style={{ width: 120, height: 28, fontSize: 11.5 }}
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Closed</option>
                  </select>
                ) : (
                  <StatusPill status={s.status}>{s.status}</StatusPill>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Bolts
// ============================================================
function Bolts({ project, auth, bolts, canManage, onChanged }) {
  const [zone, setZone] = useState('');
  const [installed, setInstalled] = useState('');
  const [torqued, setTorqued] = useState('');

  async function handleAdd() {
    if (!zone.trim()) return;
    try {
      await db.upsertBoltRecord({
        project_id: project.id,
        zone,
        installed: parseInt(installed) || 0,
        torqued: parseInt(torqued) || 0,
        created_by: auth.user.id,
      });
      await db.logActivity({
        project_id: project.id,
        action_type: 'bolt_entry',
        details: `Bolts ${zone}: ${installed} installed, ${torqued} torqued`,
        user_name: auth.userName,
        user_role: auth.role,
      });
      setZone('');
      setInstalled('');
      setTorqued('');
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  const totalInstalled = bolts.reduce((a, b) => a + (b.installed || 0), 0);
  const totalTorqued = bolts.reduce((a, b) => a + (b.torqued || 0), 0);
  const totalPct =
    totalInstalled > 0 ? Math.round((totalTorqued / totalInstalled) * 100) : 0;

  return (
    <div className="card">
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icons.Bolt size={15} color="var(--cat-coldform)" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Bolt tracking</span>
        <span className="t-caption">
          {bolts.length} zone{bolts.length === 1 ? '' : 's'}
        </span>
        <div style={{ flex: 1 }} />
        {totalInstalled > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ring value={totalPct} size={32} stroke={3} color="var(--cat-coldform)" />
            <span
              className="mono tnum"
              style={{ fontSize: 12, color: 'var(--ink-700)' }}
            >
              {totalTorqued}/{totalInstalled}
            </span>
          </div>
        )}
      </div>

      {canManage && (
        <div
          style={{
            padding: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Field label="Zone" style={{ flex: 1 }}>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Zone / area name"
            />
          </Field>
          <Field label="Installed" style={{ width: 100 }}>
            <input
              type="number"
              value={installed}
              onChange={(e) => setInstalled(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Torqued" style={{ width: 100 }}>
            <input
              type="number"
              value={torqued}
              onChange={(e) => setTorqued(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Button variant="accent" icon={Icons.Plus} onClick={handleAdd}>
            Add
          </Button>
        </div>
      )}

      {bolts.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-500)',
          }}
        >
          No bolt records yet.
        </div>
      ) : (
        <div>
          {bolts.map((b) => {
            const pct =
              b.installed > 0 ? Math.round((b.torqued / b.installed) * 100) : 0;
            const color =
              pct >= 90
                ? 'var(--status-done)'
                : pct >= 70
                ? 'var(--status-progress)'
                : 'var(--status-alert)';
            return (
              <div
                key={b.id}
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 13, fontWeight: 600, width: 100, minWidth: 100 }}
                >
                  {b.zone}
                </span>
                <div style={{ flex: 1 }}>
                  <Bar value={pct} color={color} height={6} />
                </div>
                <span
                  className="mono tnum"
                  style={{ fontSize: 12, fontWeight: 600, color, width: 40, textAlign: 'right' }}
                >
                  {pct}%
                </span>
                <span
                  className="mono tnum"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-500)',
                    width: 80,
                    textAlign: 'right',
                  }}
                >
                  {b.torqued}/{b.installed}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Safety — daily checklist
// ============================================================
function Safety({ project, auth, today, items, passed, canManage, onChanged }) {
  async function toggleItem(idx) {
    if (!canManage) return;
    const next = { ...items, [idx]: !items[idx] };
    try {
      await db.upsertSafetyCheck({
        project_id: project.id,
        check_date: today,
        items: next,
        created_by: auth.user.id,
      });
      onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  const allPassed = passed === SAFETY_ITEMS.length;
  const ringColor = allPassed
    ? 'var(--status-done)'
    : passed >= 7
    ? 'var(--status-progress)'
    : 'var(--status-alert)';

  return (
    <div className="card">
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icons.ShieldCheck size={15} color={ringColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Safety</div>
          <div className="t-caption">{formatDate(today)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ring
            value={Math.round((passed / SAFETY_ITEMS.length) * 100)}
            size={36}
            stroke={3.5}
            color={ringColor}
            showLabel={false}
          />
          <span
            className="mono tnum"
            style={{ fontSize: 14, fontWeight: 600, color: ringColor }}
          >
            {passed}/{SAFETY_ITEMS.length}
          </span>
        </div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {SAFETY_ITEMS.map((item, i) => {
          const checked = !!items[i];
          return (
            <button
              key={i}
              onClick={() => toggleItem(i)}
              disabled={!canManage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                cursor: canManage ? 'pointer' : 'default',
                fontFamily: 'inherit',
                textAlign: 'left',
                borderBottom:
                  i < SAFETY_ITEMS.length - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: '1.5px solid',
                  borderColor: checked
                    ? 'var(--status-done)'
                    : 'var(--line-strong)',
                  background: checked ? 'var(--status-done)' : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#fff',
                  transition: 'all 120ms',
                }}
              >
                {checked && <Icons.Check size={11} />}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: checked ? 'var(--ink-900)' : 'var(--ink-700)',
                  flex: 1,
                }}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 24,
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
      <span className="mono tnum" style={{ fontSize: 11, opacity: 0.85 }}>
        {count}
      </span>
    </button>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label className="t-overline" style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
