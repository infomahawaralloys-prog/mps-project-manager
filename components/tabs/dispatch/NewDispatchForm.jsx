'use client';
import { useState, useEffect, useMemo } from 'react';
import * as db from '../../../lib/database';
import { Button, SearchInput } from '../../ui';
import * as Icons from '../../icons';

const CAT_LABELS_SHORT = {
  anchor_bolts: 'AB',
  builtup: 'BU',
  coldform: 'CF',
  hardware: 'HW',
  roofing: 'RF',
  cladding: 'CL',
  accessories: 'AC',
  deck: 'DK',
};

export default function NewDispatchForm({
  project,
  auth,
  parts,
  existingDispatches,
  onCreated,
  onCancel,
}) {
  const [form, setForm] = useState({
    vehicle_no: '',
    challan_no: '',
    driver_name: '',
    driver_phone: '',
    net_weight: '',
    loading_by: '',
    weight_slip_url: '',
    challan_url: '',
  });
  const [dispatchParts, setDispatchParts] = useState([]);
  const [otherItems, setOtherItems] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  // Compute already-dispatched qty per part (for "remaining")
  const dispatchedQty = useMemo(() => {
    const m = {};
    (existingDispatches || []).forEach((d) => {
      (d.dispatch_parts || []).forEach((dp) => {
        m[dp.part_id] = (m[dp.part_id] || 0) + dp.qty;
      });
    });
    return m;
  }, [existingDispatches]);

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function addPart(part) {
    if (dispatchParts.some((dp) => dp.part_id === part.id)) return;
    const remaining = (part.qty || 0) - (dispatchedQty[part.id] || 0);
    if (remaining <= 0) return;
    setDispatchParts((prev) => [
      ...prev,
      {
        part_id: part.id,
        mark: part.mark,
        category: part.category,
        qty: remaining,
        weight: part.weight || 0,
      },
    ]);
  }

  function removePart(partId) {
    setDispatchParts((prev) => prev.filter((dp) => dp.part_id !== partId));
  }

  function updateQty(partId, qty) {
    setDispatchParts((prev) =>
      prev.map((dp) =>
        dp.part_id === partId ? { ...dp, qty: parseInt(qty) || 0 } : dp
      )
    );
  }

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (search && !(p.mark || '').toLowerCase().includes(search.toLowerCase()))
        return false;
      const remaining = (p.qty || 0) - (dispatchedQty[p.id] || 0);
      return remaining > 0;
    });
  }, [parts, catFilter, search, dispatchedQty]);

  const totalPcs = dispatchParts.reduce((a, dp) => a + dp.qty, 0);
  const totalWt = dispatchParts.reduce((a, dp) => a + dp.weight * dp.qty, 0);

  async function handleCreate() {
    if (!form.vehicle_no.trim()) {
      alert('Vehicle No is required');
      return;
    }
    setSaving(true);
    try {
      const partsList = dispatchParts
        .filter((dp) => dp.qty > 0)
        .map((dp) => ({ part_id: dp.part_id, qty: dp.qty }));
      await db.createDispatch(
        {
          ...form,
          project_id: project.id,
          net_weight: parseFloat(form.net_weight) || 0,
          created_by: auth.user.id,
          other_items:
            otherItems.length > 0 ? JSON.stringify(otherItems) : '[]',
        },
        partsList
      );
      const details =
        `Dispatch ${form.vehicle_no}: ${partsList.length} parts` +
        (otherItems.length > 0 ? ` + ${otherItems.length} other items` : '') +
        `, ${form.net_weight || 0} MT`;
      await db.logActivity({
        project_id: project.id,
        action_type: 'dispatch_create',
        details,
        user_name: auth.userName,
        user_role: auth.role,
      });
      onCreated();
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  }

  function addOtherItem() {
    setOtherItems((prev) => [...prev, { name: '', qty: '', unit: 'pcs' }]);
  }
  function updateOther(i, field, value) {
    setOtherItems((prev) => {
      const n = prev.slice();
      n[i] = { ...n[i], [field]: value };
      return n;
    });
  }
  function removeOther(i) {
    setOtherItems((prev) => prev.filter((_, j) => j !== i));
  }

  const FIELD_ROW_1 = [
    ['vehicle_no', 'Vehicle no *', 'PB-08-XX-1234'],
    ['challan_no', 'Challan no', '#1234'],
    ['driver_name', 'Driver name', 'Full name'],
    ['driver_phone', 'Driver phone', '+91…'],
    ['net_weight', 'Net weight (MT)', '12.5'],
    ['loading_by', 'Loading by', 'Crew name'],
  ];

  return (
    <div
      className="card animate-fade"
      style={{
        padding: 18,
        marginBottom: 16,
        borderLeft: '3px solid var(--accent)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Icons.Truck size={16} color="var(--accent)" />
        <span style={{ fontWeight: 600, fontSize: 14 }}>New dispatch</span>
      </div>

      {/* Top fields grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {FIELD_ROW_1.map(([key, label, ph]) => (
          <div key={key}>
            <label
              className="t-overline"
              style={{ display: 'block', marginBottom: 4 }}
            >
              {label}
            </label>
            <input
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={ph}
            />
          </div>
        ))}
      </div>

      {/* Parts picker */}
      <div
        style={{
          padding: 14,
          background: 'var(--surface-2)',
          borderRadius: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div className="t-overline">Select parts</div>
          {dispatchParts.length > 0 && (
            <span
              className="mono tnum"
              style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}
            >
              {totalPcs} pcs · {(totalWt / 1000).toFixed(2)} MT
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search marks…"
            width={260}
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{ width: 120, height: 32, fontSize: 12 }}
          >
            <option value="all">All</option>
            <option value="builtup">Built-up</option>
            <option value="coldform">Cold-form</option>
            <option value="hardware">Hardware</option>
            <option value="anchor_bolts">Anchor Bolts</option>
            <option value="roofing">Roofing</option>
            <option value="cladding">Cladding</option>
            <option value="accessories">Accessories</option>
            <option value="deck">Deck</option>
          </select>
        </div>

        {/* Available parts */}
        <div
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid var(--line)',
            borderRadius: 6,
            background: 'var(--surface-1)',
            marginBottom: 12,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--ink-400)',
              }}
            >
              No parts to dispatch
            </div>
          ) : (
            filtered.map((p) => {
              const alreadyAdded = dispatchParts.some(
                (dp) => dp.part_id === p.id
              );
              const remaining = (p.qty || 0) - (dispatchedQty[p.id] || 0);
              return (
                <button
                  key={p.id}
                  onClick={() => !alreadyAdded && addPart(p)}
                  disabled={alreadyAdded}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: alreadyAdded ? 'default' : 'pointer',
                    opacity: alreadyAdded ? 0.4 : 1,
                    border: 'none',
                    borderBottom: '1px solid var(--line)',
                    background: 'transparent',
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 12, fontWeight: 600, width: 80 }}
                  >
                    {p.mark}
                  </span>
                  <span
                    className="chip"
                    style={{
                      height: 18,
                      padding: '0 6px',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {CAT_LABELS_SHORT[p.category] || p.category}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: 'var(--ink-500)',
                    }}
                  >
                    bal{' '}
                    <span className="mono tnum">
                      {remaining}/{p.qty}
                    </span>{' '}
                    · {p.weight} kg ea
                  </span>
                  {!alreadyAdded && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--accent)',
                        fontWeight: 500,
                      }}
                    >
                      + Add
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Selected parts */}
        {dispatchParts.length > 0 && (
          <div>
            <div
              className="t-overline"
              style={{ color: 'var(--status-done)', marginBottom: 6 }}
            >
              Selected ({dispatchParts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dispatchParts.map((dp) => (
                <div
                  key={dp.part_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--status-done)',
                      width: 80,
                    }}
                  >
                    {dp.mark}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={dp.qty}
                    onChange={(e) =>
                      updateQty(dp.part_id, parseInt(e.target.value) || 0)
                    }
                    style={{
                      width: 60,
                      height: 28,
                      fontSize: 12,
                      padding: '2px 8px',
                      textAlign: 'center',
                    }}
                  />
                  <span
                    style={{ flex: 1, fontSize: 11, color: 'var(--ink-500)' }}
                  >
                    {dp.weight} kg ea ·{' '}
                    <span className="mono tnum">
                      {(dp.weight * dp.qty).toFixed(0)} kg total
                    </span>
                  </span>
                  <button
                    onClick={() => removePart(dp.part_id)}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ width: 24, height: 24 }}
                  >
                    <Icons.X size={12} color="var(--status-alert)" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo URLs */}
      <div style={{ marginBottom: 14 }}>
        <div className="t-overline" style={{ marginBottom: 8 }}>
          Photo links
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          <div>
            <label
              className="t-caption"
              style={{ display: 'block', marginBottom: 4 }}
            >
              Weight slip URL
            </label>
            <input
              value={form.weight_slip_url}
              onChange={(e) => set('weight_slip_url', e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <label
              className="t-caption"
              style={{ display: 'block', marginBottom: 4 }}
            >
              Challan photo URL
            </label>
            <input
              value={form.challan_url}
              onChange={(e) => set('challan_url', e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
      </div>

      {/* Other items */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div className="t-overline">Other items</div>
          <Button size="sm" icon={Icons.Plus} onClick={addOtherItem}>
            Add item
          </Button>
        </div>
        {otherItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {otherItems.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <input
                  value={item.name}
                  onChange={(e) => updateOther(i, 'name', e.target.value)}
                  placeholder="Item name"
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateOther(i, 'qty', e.target.value)}
                  placeholder="Qty"
                  style={{ width: 80, textAlign: 'center' }}
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateOther(i, 'unit', e.target.value)}
                  style={{ width: 90 }}
                >
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="rolls">rolls</option>
                  <option value="ltrs">ltrs</option>
                  <option value="boxes">boxes</option>
                  <option value="sets">sets</option>
                  <option value="nos">nos</option>
                  <option value="rmt">rmt</option>
                </select>
                <button
                  onClick={() => removeOther(i)}
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ width: 28, height: 28 }}
                >
                  <Icons.X size={12} color="var(--status-alert)" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="accent"
          icon={Icons.Check}
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create dispatch'}
        </Button>
      </div>
    </div>
  );
}
