'use client';
import { useState, useEffect, useMemo } from 'react';
import * as db from '../../lib/database';
import { createFabUploaders } from '../../lib/fab-parsers';
import {
  STAGES,
  CATEGORIES,
  CAT_LABELS,
  CAT_COLORS,
  CAT_ICONS,
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_PERSONS,
  COLDFORM_STAGE_LABELS,
  FAB_PIPELINE_CATS,
  stagesFor,
  stageLabelsFor,
} from '../../lib/fab-constants';
import { Ring, Bar, Button, SearchInput } from '../ui';
import * as Icons from '../icons';
import { ralToHex } from '../../lib/ral-colors';
import { formatWeight, formatInt } from '../../lib/format';

// Category cards filter strip — Anchor Bolts comes first because PMs
// build out projects in this order
const CAT_ORDER = [
  'anchor_bolts',
  'builtup',
  'coldform',
  'hardware',
  'roofing',
  'cladding',
  'accessories',
  'deck',
];

export default function FabTab({ project, auth }) {
  const [parts, setParts] = useState([]);
  const [fabSummary, setFabSummary] = useState({});
  const [selectedCat, setSelectedCat] = useState('builtup');
  const [selectedStage, setSelectedStage] = useState('cutting');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entries, setEntries] = useState({});
  const [persons, setPersons] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showABForm, setShowABForm] = useState(false);
  const [abForm, setAbForm] = useState({ mark: '', qty: '', weight: '' });
  const [expandedRows, setExpandedRows] = useState({}); // for PM/Viewer collapsed view

  // Load
  useEffect(() => { loadData(); }, [project.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [p, fs] = await Promise.all([
        db.getParts(project.id),
        db.getFabSummary(project.id),
      ]);
      setParts(p || []);
      setFabSummary(fs || {});
    } catch (e) {
      console.error('FabTab loadData', e);
    }
    setLoading(false);
  }

  // Reset selectedStage when changing category to something incompatible
  useEffect(() => {
    const valid = stagesFor(selectedCat);
    if (!valid.includes(selectedStage)) setSelectedStage(valid[0]);
    setEntries({});
    setPersons({});
    setExpandedRows({});
  }, [selectedCat]);

  // Uploaders bound to this project
  const uploaders = useMemo(
    () => createFabUploaders({ project, auth, onComplete: loadData }),
    [project.id, auth.user?.id]
  );

  // Derived data
  const isPipelineCat = FAB_PIPELINE_CATS.includes(selectedCat);
  const isBuiltup = selectedCat === 'builtup';
  const isColdformCat = selectedCat === 'coldform';
  const activeStages = stagesFor(selectedCat);
  const activeStageLabels = stageLabelsFor(selectedCat);

  // Per-category summary (for the grid)
  const catSummary = useMemo(() => {
    const out = {};
    CATEGORIES.forEach((cat) => {
      const cp = parts.filter((p) => p.category === cat);
      const totalQty = cp.reduce((a, p) => a + (p.qty || 0), 0);
      const totalWt = cp.reduce((a, p) => a + (p.weight || 0) * (p.qty || 0), 0);
      const totalArea = cp.reduce((a, p) => a + (p.area || 0), 0);

      // Progress: builtup uses painting (last stage), others use cutting
      let done = 0;
      cp.forEach((p) => {
        const fs = fabSummary[p.id];
        if (!fs) return;
        if (cat === 'builtup') done += fs.painting || 0;
        else done += fs.cutting || 0;
      });
      const pct = totalQty > 0 ? Math.round((done / totalQty) * 100) : 0;

      out[cat] = {
        marks: cp.length,
        totalQty,
        totalWt,
        totalArea,
        pct,
      };
    });
    return out;
  }, [parts, fabSummary]);

  // Per-stage progress for the active pipeline
  const stageProgress = useMemo(() => {
    const out = {};
    const catParts = parts.filter((p) => p.category === selectedCat);
    activeStages.forEach((s) => {
      let total = 0,
        done = 0;
      catParts.forEach((p) => {
        total += p.qty || 0;
        done += (fabSummary[p.id] && fabSummary[p.id][s]) || 0;
      });
      out[s] = total > 0 ? Math.round((done / total) * 100) : 0;
    });
    return out;
  }, [parts, fabSummary, selectedCat, activeStages]);

  // Filtered marks
  const catParts = parts.filter((p) => p.category === selectedCat);
  const filteredParts = searchTerm
    ? catParts.filter(
        (p) =>
          (p.mark || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : catParts;

  // ==== Anchor bolt handler ====
  async function handleAddAB() {
    const m = abForm.mark.trim();
    const q = parseInt(abForm.qty);
    const w = parseFloat(abForm.weight);
    if (!m || !q || q <= 0) {
      alert('Mark and qty are required');
      return;
    }
    try {
      await db.upsertParts([{
        project_id: project.id,
        category: 'anchor_bolts',
        mark: m,
        description: 'Anchor Bolt',
        qty: q,
        weight: w || 0,
      }]);
      await db.logActivity({
        project_id: project.id,
        action_type: 'parts_upload',
        details: `Added anchor bolt ${m} × ${q}`,
        user_name: auth.userName,
        user_role: auth.role,
      });
      setAbForm({ mark: '', qty: '', weight: '' });
      setShowABForm(false);
      loadData();
    } catch (e) {
      alert(e.message || 'Failed to add');
    }
  }

  // ==== Pending entries & save ====
  const pendingEntries = catParts.filter((p) => (entries[p.id] || 0) > 0);
  const canEnter = (auth.isPM || auth.isFab) && isPipelineCat;

  function stageUnlocked(part) {
    if (!isBuiltup) return true;
    const idx = STAGES.indexOf(selectedStage);
    if (idx <= 0) return true;
    if (selectedStage === 'fitting') {
      const cuttingDone = (fabSummary[part.id] && fabSummary[part.id]['cutting']) || 0;
      return cuttingDone >= part.qty;
    }
    return true;
  }

  async function handleSave() {
    if (pendingEntries.length === 0) return;
    setSaving(true);
    try {
      const fabEntries = pendingEntries.map((p) => ({
        project_id: project.id,
        part_id: p.id,
        stage: selectedStage,
        qty_done: entries[p.id],
        person_name: persons[p.id] || '',
        entry_date: new Date().toISOString().split('T')[0],
        entered_by: auth.user.id,
      }));
      await db.addFabEntries(fabEntries);
      await db.logActivity({
        project_id: project.id,
        action_type: 'fab_entry',
        details: `${activeStageLabels[selectedStage]}: ${pendingEntries
          .map((p) => `${p.mark} × ${entries[p.id]}${persons[p.id] ? ' by ' + persons[p.id] : ''}`)
          .join(', ')}`,
        user_name: auth.userName,
        user_role: auth.role,
      });
      setEntries({});
      setPersons({});
      setShowConfirm(false);
      loadData();
    } catch (e) {
      alert(e.message || 'Save failed');
    }
    setSaving(false);
  }

  // ============================================================
  // RENDER
  // ============================================================
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
      {/* Upload row (PM only) */}
      {auth.isPM && (
        <UploadButtons
          uploaders={uploaders}
          showABForm={showABForm}
          setShowABForm={setShowABForm}
        />
      )}

      {/* AB form */}
      {showABForm && auth.isPM && (
        <ABForm
          form={abForm}
          setForm={setAbForm}
          onAdd={handleAddAB}
          onCancel={() => setShowABForm(false)}
        />
      )}

      {/* Category grid */}
      <CategoryGrid
        catSummary={catSummary}
        selectedCat={selectedCat}
        onSelect={setSelectedCat}
      />

      {/* Pipeline (only for fab-pipeline categories) */}
      {isPipelineCat && (
        <PipelineBar
          stages={activeStages}
          stageLabels={activeStageLabels}
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
          stageProgress={stageProgress}
        />
      )}

      {/* Marks table */}
      <MarksSection
        category={selectedCat}
        catParts={catParts}
        filteredParts={filteredParts}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        fabSummary={fabSummary}
        selectedStage={selectedStage}
        activeStages={activeStages}
        activeStageLabels={activeStageLabels}
        isPipelineCat={isPipelineCat}
        isBuiltup={isBuiltup}
        isColdformCat={isColdformCat}
        canEnter={canEnter}
        entries={entries}
        setEntries={setEntries}
        persons={persons}
        setPersons={setPersons}
        stageUnlocked={stageUnlocked}
        auth={auth}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
      />

      {/* Floating save bar */}
      {pendingEntries.length > 0 && canEnter && (
        <FloatingSaveBar
          count={pendingEntries.length}
          totalKg={pendingEntries.reduce(
            (a, p) => a + (p.weight || 0) * (entries[p.id] || 0),
            0
          )}
          onReview={() => setShowConfirm(true)}
        />
      )}

      {/* Slide-in confirm panel */}
      {showConfirm && (
        <ConfirmPanel
          pendingEntries={pendingEntries}
          entries={entries}
          persons={persons}
          stageLabel={activeStageLabels[selectedStage]}
          stageColor={STAGE_COLORS[selectedStage]}
          saving={saving}
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Upload Buttons
// ============================================================
function UploadButtons({ uploaders, showABForm, setShowABForm }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      <UploadLabel
        icon={<Icons.Upload size={14} />}
        label="Upload BOM"
        accent="var(--cat-builtup)"
        onChange={uploaders.handleBomUpload}
      />
      <UploadLabel
        icon={<Icons.Roof size={14} />}
        label="Upload Sheeting BOQ"
        accent="var(--cat-roofing)"
        onChange={uploaders.handleSheetingUpload}
      />
      <UploadLabel
        icon={<Icons.Deck size={14} />}
        label="Upload Deck BOQ"
        accent="var(--cat-deck)"
        onChange={uploaders.handleDeckUpload}
      />
      <Button
        size="md"
        variant={showABForm ? 'accent' : 'default'}
        icon={Icons.Anchor}
        onClick={() => setShowABForm(!showABForm)}
        style={{ borderColor: showABForm ? undefined : 'var(--cat-anchor)', color: showABForm ? undefined : 'var(--cat-anchor)' }}
      >
        {showABForm ? 'Cancel' : '+ Anchor Bolt'}
      </Button>
    </div>
  );
}

function UploadLabel({ icon, label, accent, onChange }) {
  return (
    <label
      className="btn"
      style={{
        cursor: 'pointer',
        color: accent,
        borderColor: accent,
      }}
    >
      {icon}
      {label}
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onChange}
        style={{ display: 'none' }}
      />
    </label>
  );
}

// ============================================================
// AB Form (compact horizontal)
// ============================================================
function ABForm({ form, setForm, onAdd, onCancel }) {
  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
  }
  return (
    <div
      className="card animate-fade"
      style={{
        padding: 14,
        marginBottom: 16,
        borderLeft: '3px solid var(--cat-anchor)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icons.Anchor size={16} color="var(--cat-anchor)" />
        <span style={{ fontWeight: 600, fontSize: 13 }}>New Anchor Bolt</span>
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <label className="t-overline" style={{ display: 'block', marginBottom: 4 }}>
          Mark
        </label>
        <input
          value={form.mark}
          onChange={(e) => set('mark', e.target.value)}
          placeholder="AB-1"
        />
      </div>
      <div style={{ width: 110 }}>
        <label className="t-overline" style={{ display: 'block', marginBottom: 4 }}>
          Qty
        </label>
        <input
          type="number"
          value={form.qty}
          onChange={(e) => set('qty', e.target.value)}
          placeholder="4"
        />
      </div>
      <div style={{ width: 110 }}>
        <label className="t-overline" style={{ display: 'block', marginBottom: 4 }}>
          Weight (kg)
        </label>
        <input
          type="number"
          value={form.weight}
          onChange={(e) => set('weight', e.target.value)}
          placeholder="kg"
        />
      </div>
      <Button variant="accent" size="md" icon={Icons.Plus} onClick={onAdd}>
        Add
      </Button>
    </div>
  );
}

// ============================================================
// Category Grid — 4-col big tiles
// ============================================================
function CategoryGrid({ catSummary, selectedCat, onSelect }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 18,
      }}
    >
      {CAT_ORDER.map((cat) => {
        const summary = catSummary[cat];
        const Icon = Icons[CAT_ICONS[cat]] || Icons.Bolt;
        const sel = selectedCat === cat;
        const empty = summary.marks === 0;
        const accent = CAT_COLORS[cat];

        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="card"
            style={{
              padding: 14,
              cursor: 'pointer',
              borderColor: sel ? accent : 'var(--line)',
              borderWidth: sel ? 2 : 1,
              background: sel
                ? `color-mix(in oklab, ${accent} 4%, var(--surface-1))`
                : 'var(--surface-1)',
              textAlign: 'left',
              transition: 'all 120ms',
              opacity: empty ? 0.55 : 1,
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              minHeight: 102,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: `color-mix(in oklab, ${accent} 12%, white)`,
                  color: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} />
              </div>
              {!empty && (
                <Ring
                  value={summary.pct}
                  size={32}
                  stroke={3}
                  color={accent}
                  showLabel={false}
                />
              )}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>
              {CAT_LABELS[cat]}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 4,
                lineHeight: 1.1,
              }}
            >
              <span
                className="mono tnum"
                style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}
              >
                {empty ? '—' : formatInt(summary.totalQty)}
              </span>
              {!empty && (
                <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>pcs</span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>
              {empty ? (
                'No parts yet'
              ) : (
                <>
                  <span className="mono tnum">{summary.marks}</span> marks
                  {summary.totalWt > 0 && (
                    <>
                      {' · '}
                      <span className="mono tnum">
                        {(summary.totalWt / 1000).toFixed(1)}
                      </span>{' '}
                      MT
                    </>
                  )}
                  {(cat === 'roofing' || cat === 'cladding') && summary.totalArea > 0 && (
                    <>
                      {' · '}
                      <span className="mono tnum">
                        {summary.totalArea.toFixed(0)}
                      </span>{' '}
                      m²
                    </>
                  )}
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Pipeline Bar — connected horizontal stages
// ============================================================
function PipelineBar({ stages, stageLabels, selectedStage, onSelectStage, stageProgress }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div className="t-overline">
          {stages.length === 1 ? '1-Stage Pipeline' : `${stages.length}-Stage Pipeline`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
          Selected stage logs entries
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: stages.map(() => '1fr').join(' '),
          gap: 0,
          alignItems: 'stretch',
        }}
      >
        {stages.map((s, i) => {
          const sel = s === selectedStage;
          const color = STAGE_COLORS[s];
          const pct = stageProgress[s] || 0;
          const Icon = Icons[
            { cutting: 'Cut', fitting: 'Fit', qc: 'QC', welding: 'Weld', painting: 'Paint' }[s] || 'Cut'
          ];
          const isLast = i === stages.length - 1;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
              <button
                onClick={() => onSelectStage(s)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: sel
                    ? `color-mix(in oklab, ${color} 8%, white)`
                    : 'var(--surface-2)',
                  borderRadius: 8,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 8,
                  position: 'relative',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  outline: sel ? `2px solid ${color}` : 'none',
                  transition: 'background 120ms',
                  minHeight: 68,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: `color-mix(in oklab, ${color} 16%, white)`,
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={12} />
                  </div>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: sel ? 600 : 500,
                      color: sel ? 'var(--ink-900)' : 'var(--ink-700)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {stageLabels[s]}
                  </span>
                  <span
                    className="mono tnum"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: sel ? color : 'var(--ink-500)',
                      marginLeft: 'auto',
                    }}
                  >
                    {pct}%
                  </span>
                </div>
                <Bar value={pct} color={color} height={4} />
              </button>
              {!isLast && (
                <div
                  style={{
                    width: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-300)',
                    flexShrink: 0,
                  }}
                >
                  <Icons.ChevronRight size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Marks Section — table with role-aware density
// ============================================================
function MarksSection({
  category,
  catParts,
  filteredParts,
  searchTerm,
  setSearchTerm,
  fabSummary,
  selectedStage,
  activeStages,
  activeStageLabels,
  isPipelineCat,
  isBuiltup,
  isColdformCat,
  canEnter,
  entries,
  setEntries,
  persons,
  setPersons,
  stageUnlocked,
  auth,
  expandedRows,
  setExpandedRows,
}) {
  const stageColor = STAGE_COLORS[selectedStage] || 'var(--accent)';
  const Icon = Icons[CAT_ICONS[category]] || Icons.Bolt;
  const accent = CAT_COLORS[category];

  // Fab role gets always-expanded view; PM/Viewer get rolled-up + click-to-expand
  const showAllStagesInline = auth.isFab && isPipelineCat;

  function tickAll() {
    const next = { ...entries };
    filteredParts.forEach((p) => {
      const done = (fabSummary[p.id] && fabSummary[p.id][selectedStage]) || 0;
      const bal = (p.qty || 0) - done;
      if (bal > 0 && stageUnlocked(p)) next[p.id] = bal;
    });
    setEntries(next);
  }

  function toggleRow(partId) {
    setExpandedRows((p) => ({ ...p, [partId]: !p[partId] }));
  }

  function setEntry(partId, val, max) {
    let v = parseInt(val) || 0;
    if (v < 0) v = 0;
    if (v > max) v = max;
    setEntries((p) => ({ ...p, [partId]: v }));
  }

  function setPerson(partId, val) {
    setPersons((p) => ({ ...p, [partId]: val }));
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--line)',
          background: `color-mix(in oklab, ${accent} 3%, white)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `color-mix(in oklab, ${accent} 12%, white)`,
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={15} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {CAT_LABELS[category]}
              {isPipelineCat && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: stageColor,
                    fontWeight: 500,
                  }}
                >
                  · {activeStageLabels[selectedStage]}
                </span>
              )}
            </div>
            <div className="t-caption">
              {catParts.length} mark{catParts.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search marks…"
          width={220}
        />
        {canEnter && (
          <Button size="sm" icon={Icons.Check} onClick={tickAll}>
            Tick all balance
          </Button>
        )}
      </div>

      {/* Empty state */}
      {catParts.length === 0 ? (
        <div
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
            <Icon size={22} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
            No parts yet.
            {auth.isPM && ' Upload a BOM to get started.'}
          </div>
        </div>
      ) : (
        <table className="t-table">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>Mark</th>
              <th>Description</th>
              {!isPipelineCat && <th>Color</th>}
              <th style={{ textAlign: 'right' }}>Qty</th>
              {!isPipelineCat && <th style={{ textAlign: 'right' }}>Area</th>}
              <th style={{ textAlign: 'right' }}>Wt (kg)</th>
              {/* Stage columns: always-expanded for Fab; rolled up for PM/Viewer */}
              {isPipelineCat && showAllStagesInline ? (
                <>
                  {activeStages.map((s) => (
                    <th
                      key={s}
                      style={{
                        textAlign: 'center',
                        color: s === selectedStage ? STAGE_COLORS[s] : 'var(--ink-500)',
                        background: s === selectedStage ? `color-mix(in oklab, ${STAGE_COLORS[s]} 8%, white)` : 'transparent',
                      }}
                    >
                      {activeStageLabels[s]}
                    </th>
                  ))}
                  {STAGE_PERSONS[selectedStage] && (
                    <th>{STAGE_PERSONS[selectedStage]}</th>
                  )}
                  <th style={{ textAlign: 'center' }}>Today</th>
                </>
              ) : isPipelineCat ? (
                <th style={{ minWidth: 180 }}>Progress</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((p) => {
              const stageDone = isPipelineCat
                ? (fabSummary[p.id] && fabSummary[p.id][selectedStage]) || 0
                : 0;
              const bal = (p.qty || 0) - stageDone;
              const complete = bal <= 0 && isPipelineCat;
              const expanded = !!expandedRows[p.id];
              const hex = ralToHex(p.color);

              return (
                <FragmentBoundary key={p.id}>
                  <tr style={{ opacity: complete ? 0.6 : 1 }}>
                    {/* Expand toggle for PM/Viewer collapsed view */}
                    <td style={{ width: 40, textAlign: 'center' }}>
                      {isPipelineCat && !showAllStagesInline ? (
                        <button
                          onClick={() => toggleRow(p.id)}
                          style={{
                            width: 24,
                            height: 24,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--ink-500)',
                            transform: expanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 120ms',
                          }}
                          aria-label={expanded ? 'Collapse' : 'Expand'}
                        >
                          <Icons.ChevronRight size={14} />
                        </button>
                      ) : (
                        complete && <Icons.Check size={14} color="var(--status-done)" />
                      )}
                    </td>

                    {/* Mark with optional swatch */}
                    <td>
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
                            color: complete ? 'var(--status-done)' : 'var(--ink-900)',
                          }}
                        >
                          {p.mark}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ color: 'var(--ink-500)', fontSize: 12 }}>
                      {p.description || '—'}
                    </td>

                    {/* Color text (non-pipeline categories) */}
                    {!isPipelineCat && (
                      <td style={{ color: 'var(--ink-500)', fontSize: 12 }}>
                        {p.color || '—'}
                      </td>
                    )}

                    {/* Qty */}
                    <td className="mono tnum" style={{ textAlign: 'right' }}>
                      {p.qty || 0}
                    </td>

                    {/* Area */}
                    {!isPipelineCat && (
                      <td className="mono tnum" style={{ textAlign: 'right', fontSize: 12 }}>
                        {p.area
                          ? `${p.area} ${
                              /^(WP|PC|SKY|LT)/i.test(p.mark)
                                ? 'm²'
                                : category === 'accessories'
                                ? 'rmt'
                                : 'm²'
                            }`
                          : '—'}
                      </td>
                    )}

                    {/* Total weight */}
                    <td className="mono tnum" style={{ textAlign: 'right', fontSize: 12 }}>
                      {p.weight ? Math.round(p.weight * (p.qty || 0)) : '—'}
                    </td>

                    {/* Stage cells — Fab role */}
                    {isPipelineCat && showAllStagesInline && (
                      <>
                        {activeStages.map((s) => {
                          const sd =
                            (fabSummary[p.id] && fabSummary[p.id][s]) || 0;
                          const sBal = (p.qty || 0) - sd;
                          const sComplete = sBal <= 0;
                          const sActive = s === selectedStage;
                          return (
                            <td
                              key={s}
                              className="mono tnum"
                              style={{
                                textAlign: 'center',
                                fontSize: 12,
                                background: sActive
                                  ? `color-mix(in oklab, ${STAGE_COLORS[s]} 6%, white)`
                                  : 'transparent',
                                color: sComplete
                                  ? STAGE_COLORS[s]
                                  : sd > 0
                                  ? 'var(--ink-700)'
                                  : 'var(--ink-300)',
                                fontWeight: sd > 0 ? 600 : 400,
                              }}
                            >
                              {sd}/{p.qty}
                            </td>
                          );
                        })}

                        {/* Person input */}
                        {STAGE_PERSONS[selectedStage] && (
                          <td>
                            {!complete && (
                              <input
                                value={persons[p.id] || ''}
                                onChange={(e) => setPerson(p.id, e.target.value)}
                                placeholder={STAGE_PERSONS[selectedStage]}
                                style={{
                                  width: 110,
                                  fontSize: 12,
                                  padding: '4px 8px',
                                  height: 28,
                                }}
                              />
                            )}
                          </td>
                        )}

                        {/* Today entry */}
                        <td style={{ textAlign: 'center' }}>
                          {!complete && stageUnlocked(p) ? (
                            <input
                              type="number"
                              min={0}
                              max={bal}
                              value={entries[p.id] || ''}
                              onChange={(e) => setEntry(p.id, e.target.value, bal)}
                              style={{
                                width: 56,
                                fontSize: 13,
                                padding: '4px 6px',
                                height: 28,
                                textAlign: 'center',
                                borderColor:
                                  (entries[p.id] || 0) > 0
                                    ? STAGE_COLORS[selectedStage]
                                    : undefined,
                              }}
                            />
                          ) : !complete ? (
                            <Icons.Lock size={12} color="var(--ink-400)" />
                          ) : (
                            <Icons.Check size={14} color="var(--status-done)" />
                          )}
                        </td>
                      </>
                    )}

                    {/* Rolled-up progress for PM/Viewer */}
                    {isPipelineCat && !showAllStagesInline && (
                      <td style={{ minWidth: 180 }}>
                        <RolledUpProgress
                          part={p}
                          fabSummary={fabSummary}
                          stages={activeStages}
                        />
                      </td>
                    )}
                  </tr>

                  {/* Expanded detail for PM/Viewer */}
                  {isPipelineCat && !showAllStagesInline && expanded && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, background: 'var(--surface-2)' }}>
                        <ExpandedStageDetail
                          part={p}
                          fabSummary={fabSummary}
                          stages={activeStages}
                          stageLabels={activeStageLabels}
                        />
                      </td>
                    </tr>
                  )}
                </FragmentBoundary>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FragmentBoundary({ children }) {
  return <>{children}</>;
}

// Single-row rolled-up progress: tiny per-stage segments
function RolledUpProgress({ part, fabSummary, stages }) {
  const total = part.qty || 0;
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          flex: 1,
          height: 8,
          display: 'flex',
          gap: 1,
          background: 'var(--surface-3)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {stages.map((s) => {
          const done = (fabSummary[part.id] && fabSummary[part.id][s]) || 0;
          const pct = total > 0 ? (done / total) * 100 : 0;
          return (
            <div
              key={s}
              title={`${STAGE_LABELS[s] || s}: ${done}/${total}`}
              style={{
                width: `${100 / stages.length}%`,
                height: '100%',
                background: 'var(--surface-3)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  background: STAGE_COLORS[s],
                  transition: 'width 300ms',
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        className="mono tnum"
        style={{ fontSize: 11, color: 'var(--ink-500)', minWidth: 38, textAlign: 'right' }}
      >
        {(() => {
          const lastDone =
            (fabSummary[part.id] && fabSummary[part.id][stages[stages.length - 1]]) || 0;
          return `${lastDone}/${total}`;
        })()}
      </div>
    </div>
  );
}

function ExpandedStageDetail({ part, fabSummary, stages, stageLabels }) {
  return (
    <div
      style={{
        padding: '12px 18px',
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
        gap: 14,
      }}
    >
      {stages.map((s) => {
        const done = (fabSummary[part.id] && fabSummary[part.id][s]) || 0;
        const total = part.qty || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: STAGE_COLORS[s],
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {stageLabels[s]}
              </span>
              <span className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-700)' }}>
                {done}/{total}
              </span>
            </div>
            <Bar value={pct} color={STAGE_COLORS[s]} height={4} />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Floating save bar (bottom of viewport)
// ============================================================
function FloatingSaveBar({ count, totalKg, onReview }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 12px 8px 18px',
        background: 'var(--ink-900)',
        color: '#fff',
        borderRadius: 10,
        boxShadow: 'var(--shadow-lg)',
      }}
      className="animate-fade"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>
          <span className="mono tnum">{count}</span> pending entr
          {count === 1 ? 'y' : 'ies'}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {totalKg > 0 ? `${formatWeight(totalKg)}` : ''}
        </span>
      </div>
      <button
        onClick={onReview}
        className="btn btn-accent btn-sm"
        style={{
          height: 32,
          padding: '0 14px',
        }}
      >
        Review & save
        <Icons.ArrowRight size={13} />
      </button>
    </div>
  );
}

// ============================================================
// Slide-in confirm panel (right side)
// ============================================================
function ConfirmPanel({
  pendingEntries,
  entries,
  persons,
  stageLabel,
  stageColor,
  saving,
  onConfirm,
  onCancel,
}) {
  const totalKg = pendingEntries.reduce(
    (a, p) => a + (p.weight || 0) * (entries[p.id] || 0),
    0
  );
  const totalPcs = pendingEntries.reduce((a, p) => a + (entries[p.id] || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(17,17,16,0.32)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 'min(440px, 92vw)',
          background: 'var(--surface-1)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="t-overline" style={{ color: stageColor }}>
              Confirm {stageLabel}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
              {totalPcs} pc{totalPcs === 1 ? '' : 's'} · {(totalKg / 1000).toFixed(2)} MT
            </div>
          </div>
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-icon"
            style={{ width: 32, height: 32 }}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {pendingEntries.map((p, i) => (
            <div
              key={p.id}
              style={{
                padding: '12px 22px',
                borderBottom:
                  i < pendingEntries.length - 1 ? '1px solid var(--line)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>
                  {p.mark}
                </div>
                {persons[p.id] && (
                  <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>
                    by {persons[p.id]}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  className="mono tnum"
                  style={{ fontSize: 14, fontWeight: 600, color: stageColor }}
                >
                  × {entries[p.id]}
                </div>
                <div className="mono tnum" style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                  {((p.weight || 0) * entries[p.id]).toFixed(0)} kg
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 18,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: 8,
          }}
        >
          <Button onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
            Go back
          </Button>
          <Button
            variant="accent"
            onClick={onConfirm}
            disabled={saving}
            icon={Icons.Check}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {saving ? 'Saving…' : 'Confirm save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
