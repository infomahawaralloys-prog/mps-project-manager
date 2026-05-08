'use client';
import { useState, useEffect, useMemo } from 'react';
import * as db from '../../lib/database';
import { Button, StatusPill } from '../ui';
import * as Icons from '../icons';
import { formatDate, formatRelative, formatWeight } from '../../lib/format';
import NewDispatchForm from './dispatch/NewDispatchForm';

const DISPATCH_STATUSES = ['Loaded', 'In Transit', 'Delivered', 'Unloaded'];
const STATUS_KIND = {
  Loaded: 'progress',
  'In Transit': 'progress',
  Delivered: 'done',
  Unloaded: 'done',
};
const STATUS_ICON = {
  Loaded: 'Truck',
  'In Transit': 'Truck',
  Delivered: 'Check',
  Unloaded: 'Check',
};
const STATUS_COLOR = {
  Loaded: 'var(--status-progress)',
  'In Transit': 'var(--accent)',
  Delivered: 'var(--status-done)',
  Unloaded: 'var(--ink-500)',
};

export default function DispatchTab({ project, auth }) {
  const [dispatches, setDispatches] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadAll(); }, [project.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        db.getDispatches(project.id),
        db.getParts(project.id),
      ]);
      setDispatches(d || []);
      setAllParts(p || []);
    } catch (e) {
      console.error('loadAll dispatch', e);
    }
    setLoading(false);
  }

  async function advanceStatus(d) {
    const idx = DISPATCH_STATUSES.indexOf(d.status);
    if (idx >= DISPATCH_STATUSES.length - 1) return;
    const next = DISPATCH_STATUSES[idx + 1];
    try {
      await db.updateDispatchStatus(d.id, next);
      await db.logActivity({
        project_id: project.id,
        action_type: 'dispatch_status',
        details: `${d.vehicle_no} → ${next}`,
        user_name: auth.userName,
        user_role: auth.role,
      });
      loadAll();
    } catch (e) {
      alert(e.message);
    }
  }

  const counts = useMemo(() => {
    const c = { all: dispatches.length };
    DISPATCH_STATUSES.forEach((s) => (c[s] = 0));
    dispatches.forEach((d) => {
      if (c[d.status] != null) c[d.status]++;
    });
    return c;
  }, [dispatches]);

  const totalWeight = useMemo(
    () =>
      dispatches.reduce((acc, d) => {
        const t = (d.dispatch_parts || []).reduce(
          (a, dp) => a + (dp.parts?.weight || 0) * dp.qty,
          0
        );
        return acc + t;
      }, 0),
    [dispatches]
  );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return dispatches;
    return dispatches.filter((d) => d.status === statusFilter);
  }, [dispatches, statusFilter]);

  const canManage = auth.isPM || auth.isDispatch;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div
          className="animate-spin"
          style={{
            width: 24,
            height: 24,
            border: '2px solid var(--surface-3)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            margin: '0 auto',
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ padding: '20px 28px 60px' }}>
      {/* Summary stats row */}
      <div
        className="grid-5col-cards"
        style={{
          marginBottom: 18,
        }}
      >
        <SummaryStat
          label="Total"
          value={dispatches.length}
          sub={`${(totalWeight / 1000).toFixed(1)} MT shipped`}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        {DISPATCH_STATUSES.map((s) => (
          <SummaryStat
            key={s}
            label={s}
            value={counts[s] || 0}
            color={STATUS_COLOR[s]}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {/* Action row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div className="t-overline">
          {statusFilter === 'all' ? 'All dispatches' : statusFilter}
          {filtered.length > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--ink-400)' }}>
              ({filtered.length})
            </span>
          )}
        </div>
        {canManage && (
          <Button
            variant={showCreate ? 'default' : 'accent'}
            icon={showCreate ? Icons.X : Icons.Plus}
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? 'Cancel' : 'New dispatch'}
          </Button>
        )}
      </div>

      {/* New dispatch form */}
      {showCreate && canManage && (
        <NewDispatchForm
          project={project}
          auth={auth}
          parts={allParts}
          existingDispatches={dispatches}
          onCreated={() => {
            setShowCreate(false);
            loadAll();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Empty */}
      {filtered.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: 'var(--surface-2)',
              color: 'var(--ink-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icons.Truck size={22} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
            {statusFilter === 'all'
              ? 'No dispatches yet'
              : `No ${statusFilter.toLowerCase()} dispatches`}
            {canManage && statusFilter === 'all' && '. Create one to get started.'}
          </div>
        </div>
      ) : (
        // Timeline
        <Timeline
          dispatches={filtered}
          canManage={canManage}
          onAdvance={advanceStatus}
        />
      )}
    </div>
  );
}

function SummaryStat({ label, value, sub, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        padding: 14,
        cursor: 'pointer',
        borderColor: active ? color || 'var(--ink-900)' : 'var(--line)',
        borderWidth: active ? 2 : 1,
        background: active
          ? color
            ? `color-mix(in oklab, ${color} 6%, white)`
            : 'var(--surface-2)'
          : 'var(--surface-1)',
        textAlign: 'left',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 76,
      }}
    >
      <div className="t-overline">{label}</div>
      <div
        className="mono tnum"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: color || 'var(--ink-900)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{sub}</div>}
    </button>
  );
}

// ============================================================
// Timeline list
// ============================================================
function Timeline({ dispatches, canManage, onAdvance }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {/* Vertical timeline line */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 11,
          top: 16,
          bottom: 16,
          width: 1,
          background: 'var(--line-strong)',
        }}
      />
      {dispatches.map((d) => (
        <DispatchEntry
          key={d.id}
          d={d}
          canManage={canManage}
          onAdvance={onAdvance}
        />
      ))}
    </div>
  );
}

function DispatchEntry({ d, canManage, onAdvance }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = Icons[STATUS_ICON[d.status]] || Icons.Truck;
  const color = STATUS_COLOR[d.status];

  const dpList = d.dispatch_parts || [];
  const theoWeight = dpList.reduce(
    (a, dp) => a + (dp.parts?.weight || 0) * dp.qty,
    0
  );

  let otherList = [];
  try {
    otherList =
      typeof d.other_items === 'string'
        ? JSON.parse(d.other_items || '[]')
        : d.other_items || [];
  } catch {
    otherList = [];
  }

  const nextStatus =
    DISPATCH_STATUSES[DISPATCH_STATUSES.indexOf(d.status) + 1];

  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      {/* Dot on timeline */}
      <div
        style={{
          position: 'absolute',
          left: -28 + 4,
          top: 16,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--surface-1)',
          border: `2px solid ${color}`,
          boxShadow: `0 0 0 4px var(--surface-0)`,
          zIndex: 1,
        }}
      />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: 14,
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: `color-mix(in oklab, ${color} 12%, white)`,
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 2,
              }}
            >
              <span className="mono" style={{ fontWeight: 600, fontSize: 14 }}>
                {d.vehicle_no || '—'}
              </span>
              <StatusPill status={d.status} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-500)' }}>
              <span className="mono tnum">{dpList.length}</span> part
              {dpList.length === 1 ? '' : 's'}
              {' · '}
              <span className="mono tnum">{formatWeight(theoWeight)}</span>
              {' · '}
              {formatRelative(d.created_at)}
            </div>
          </div>
          <Icons.ChevronRight
            size={14}
            color="var(--ink-400)"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 120ms',
              flexShrink: 0,
            }}
          />
        </button>

        {/* Expanded content */}
        {expanded && (
          <div
            style={{
              padding: '0 14px 14px 14px',
              borderTop: '1px solid var(--line)',
              paddingTop: 12,
            }}
          >
            {/* Meta grid */}
            <div
              className="grid-stack-mobile"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                marginBottom: 14,
                fontSize: 12,
              }}
            >
              <Meta label="Challan" value={d.challan_no || '—'} />
              <Meta label="Driver" value={d.driver_name || '—'} />
              <Meta label="Phone" value={d.driver_phone || '—'} />
              <Meta
                label="Net weight"
                value={d.net_weight ? `${d.net_weight} MT` : '—'}
              />
              <Meta label="Loading" value={d.loading_by || '—'} />
              <Meta label="Created" value={formatDate(d.created_at)} />
            </div>

            {/* Photo links */}
            {(d.weight_slip_url || d.challan_url) && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                {d.weight_slip_url && (
                  <a
                    href={d.weight_slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip"
                    style={{ textDecoration: 'none', gap: 6 }}
                  >
                    <Icons.Image size={12} />
                    Weight slip
                    <Icons.ExternalLink size={11} color="var(--ink-400)" />
                  </a>
                )}
                {d.challan_url && (
                  <a
                    href={d.challan_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip"
                    style={{ textDecoration: 'none', gap: 6 }}
                  >
                    <Icons.File size={12} />
                    Challan photo
                    <Icons.ExternalLink size={11} color="var(--ink-400)" />
                  </a>
                )}
              </div>
            )}

            {/* Parts list */}
            {dpList.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="t-overline" style={{ marginBottom: 6 }}>
                  Parts ({dpList.length})
                </div>
                <table className="t-table">
                  <thead>
                    <tr>
                      <th>Mark</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dpList.map((dp, i) => (
                      <tr key={i}>
                        <td>
                          <span className="mono" style={{ fontWeight: 600 }}>
                            {dp.parts?.mark || '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ink-500)' }}>
                          {dp.parts?.category || '—'}
                        </td>
                        <td className="mono tnum" style={{ textAlign: 'right' }}>
                          {dp.qty}
                        </td>
                        <td
                          className="mono tnum"
                          style={{ textAlign: 'right', color: 'var(--ink-500)' }}
                        >
                          {((dp.parts?.weight || 0) * dp.qty).toFixed(0)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-500)',
                    textAlign: 'right',
                    marginTop: 6,
                  }}
                >
                  Theoretical:{' '}
                  <span className="mono tnum">{(theoWeight / 1000).toFixed(2)}</span>{' '}
                  MT · Net:{' '}
                  <span className="mono tnum">{d.net_weight || 0}</span> MT
                </div>
              </div>
            )}

            {/* Other items */}
            {otherList.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div className="t-overline" style={{ marginBottom: 6 }}>
                  Other items ({otherList.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {otherList.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-700)',
                        display: 'flex',
                        gap: 6,
                      }}
                    >
                      <span style={{ flex: 1 }}>{item.name}</span>
                      <span className="mono tnum" style={{ color: 'var(--ink-500)' }}>
                        {item.qty} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action */}
            {canManage && nextStatus && (
              <Button
                variant="default"
                icon={Icons.ArrowRight}
                onClick={() => onAdvance(d)}
              >
                Advance to {nextStatus}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <div className="t-overline">{label}</div>
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--ink-900)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </div>
  );
}
