'use client';
// ============================================================
// Legacy tabs — Fab, Dispatch, Erection — preserved from the
// original app/page.js verbatim, with only top-of-file imports
// and bottom-of-file exports added.
// Will be retired in pass 2-4 as each tab is rebuilt with the
// new design system.
// ============================================================
import { useState, useEffect } from 'react';
import * as db from '../../lib/database';
import ReactDOM from 'react-dom';
import IFC3DReal from '../IFC3DReal';

var STAGES = ['cutting','fitting','qc','welding','painting'];
var COLDFORM_STAGES = ['cutting'];
var COLDFORM_STAGE_LABELS = { cutting:'Roll Forming' };
var STAGE_LABELS = { cutting:'Cutting', fitting:'Fitting', qc:'QC', welding:'Welding', painting:'Painting' };
var STAGE_ICONS = { cutting:'✂', fitting:'🔧', qc:'✅', welding:'⚡', painting:'🎨' };
var STAGE_COLORS = { cutting:'#fb923c', fitting:'#f59e0b', qc:'#a78bfa', welding:'#f97066', painting:'#34d399' };
var STAGE_PERSONS = { fitting:'Fitter', qc:'Inspector', welding:'Welder' };
var CATEGORIES = ['anchor_bolts','builtup','coldform','hardware','roofing','cladding','accessories','deck'];
var CAT_LABELS = { anchor_bolts:'Anchor Bolts', builtup:'Builtup', coldform:'Coldform', hardware:'Hardware', roofing:'Roofing', cladding:'Cladding', accessories:'Accessories', deck:'Deck Sheet' };
var CAT_ICONS = { anchor_bolts:'⚓', builtup:'🏗', coldform:'❄', hardware:'🔩', roofing:'🏠', cladding:'🧱', accessories:'📎', deck:'📐' };
var CAT_COLORS = { anchor_bolts:'#f59e0b', builtup:'#38bdf8', coldform:'#34d399', hardware:'#f97066', roofing:'#a78bfa', cladding:'#818cf8', accessories:'#f472b6', deck:'#06b6d4' };
var DRAW_TYPES = ['civil','ga','fabrication','sheeting'];
var DRAW_STATUSES = ['Not Started','In Progress','Submitted','Approved','Revised'];
var SAFETY_ITEMS = ['PPE (helmets, vests, shoes)','Barricading in place','Crane inspection done','Sling/Shackle condition OK','Weather check (no high wind)','Toolbox Talk conducted','Fall Protection (harness, nets)','Fire Extinguisher available','First Aid kit available','Housekeeping (clean site)'];
var DISPATCH_STATUSES = ['Loaded','In Transit','Delivered','Unloaded'];
var LOG_COLORS = { project_create:'#dc2626', project_edit:'#f59e0b', drawing_update:'#34d399', fab_entry:'#fb923c', parts_upload:'#38bdf8', dispatch_create:'#38bdf8', dispatch_status:'#06b6d4', erect_toggle:'#f472b6', ifc_upload:'#a78bfa', snag_add:'#f97066', snag_update:'#f59e0b', bolt_entry:'#818cf8' };

function ProgressRing({ pct, color, size, label }) {
  var sz = size || 64;
  var r = (sz - 8) / 2;
  var circ = 2 * Math.PI * r;
  var offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position:'relative', width:sz, height:sz, flexShrink:0 }}>
      <svg width={sz} height={sz} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="rgba(42,42,58,0.5)" strokeWidth="4" />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition:'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span className="mono" style={{ fontSize: sz > 50 ? 16 : 12, fontWeight:700, color:color }}>{pct}%</span>
        {label && <span className="mono" style={{ fontSize:7, color:'var(--dim)', marginTop:1 }}>{label}</span>}
      </div>
    </div>
  );
}

function StageBar({ label, pct, color, icon }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'3px 0' }}>
      <span style={{ fontSize:12, width:16, textAlign:'center' }}>{icon}</span>
      <span className="mono" style={{ width:80, fontSize:12, fontWeight:600, color:color }}>{label}</span>
      <div style={{ flex:1, height:6, background:'rgba(20,20,30,0.8)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:pct+'%', height:'100%', background:color, borderRadius:3, transition:'width 0.6s ease', boxShadow:'0 0 6px ' + color + '44' }} />
      </div>
      <span className="mono" style={{ width:35, fontSize:10, color:'var(--dim)', textAlign:'right' }}>{pct}%</span>
    </div>
  );
}

function StatCard({ value, label, color, icon }) {
  return (
    <div className="glass-card" style={{ padding:'12px 14px', textAlign:'center', minWidth:0 }}>
      {icon && <div style={{ fontSize:16, marginBottom:4 }}>{icon}</div>}
      <div className="mono" style={{ fontSize:20, fontWeight:700, color:color, lineHeight:1 }}>{value}</div>
      <div className="mono" style={{ fontSize:8, color:'var(--dim)', marginTop:4, letterSpacing:1, textTransform:'uppercase' }}>{label}</div>
    </div>
  );
}

function CreateProjectForm({ auth, onCreated, onCancel }) {
  var [form, setForm] = useState({
    project_no:'', job_no:'', location:'', location_link:'', poc_name:'', poc_phone:'', poc2_name:'', poc2_phone:'',
    billing_address:'', shipping_address:'', quotation_link:'', weight_excel_link:'', paint_color:'', remarks:'', status:'Active'
  });
  var [saving, setSaving] = useState(false);
  function set(field, val) { setForm(function(prev) { var n = Object.assign({}, prev); n[field] = val; return n; }); }

  async function handleCreate() {
    if (!form.project_no.trim()) return alert('Project No is required');
    setSaving(true);
    try {
      var p = await db.createProject(Object.assign({}, form, { created_by: auth.user.id }));
      await db.logActivity({ project_id: p.id, action_type: 'project_create', details: 'Created project ' + p.project_no, user_name: auth.userName, user_role: auth.role });
      onCreated();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  var fields = [
    ['project_no','Project No *','text'], ['job_no','Job No','text'], ['location','Location','text'], ['location_link','Location Link','url'],
    ['poc_name','POC Name','text'], ['poc_phone','POC Phone','tel'], ['poc2_name','POC 2 Name','text'], ['poc2_phone','POC 2 Phone','tel'],
    ['billing_address','Billing Address','text'], ['shipping_address','Shipping Address','text'],
    ['quotation_link','Quotation Link','url'], ['weight_excel_link','Weight Excel Link','url'],
    ['paint_color','Paint Color','text'], ['remarks','Remarks','text'],
  ];

  return (
    <div className="glass-card animate-fade" style={{ padding:20, marginBottom:16, borderLeft:'3px solid #dc2626' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>🏗</span>
          <span className="mono" style={{ fontWeight:700, fontSize:14 }}>New Project</span>
        </div>
        <button onClick={onCancel} className="btn-outline" style={{ padding:'4px 12px', fontSize:10 }}>✕ Cancel</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {fields.map(function(f) {
          return (
            <div key={f[0]} style={ f[0] === 'billing_address' || f[0] === 'shipping_address' ? { gridColumn:'span 2' } : {} }>
              <label className="mono" style={{ fontSize:8, color:'var(--muted)', letterSpacing:1, display:'block', marginBottom:2, textTransform:'uppercase' }}>{f[1]}</label>
              <input type={f[2]} value={form[f[0]]} onChange={function(e) { set(f[0], e.target.value); }} placeholder={f[1]} />
            </div>
          );
        })}
        <div>
          <label className="mono" style={{ fontSize:8, color:'var(--muted)', letterSpacing:1, display:'block', marginBottom:2 }}>STATUS</label>
          <select value={form.status} onChange={function(e) { set('status', e.target.value); }}>
            <option value="Active">Active</option><option value="Hold">Hold</option><option value="Completed">Completed</option>
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
        <button onClick={onCancel} className="btn-outline">Cancel</button>
        <button onClick={handleCreate} disabled={saving} className="btn-red" style={{ padding:'10px 24px' }}>
          {saving ? 'Creating...' : '✓ Create Project'}
        </button>
      </div>
    </div>
  );
}

function FabTab({ project, auth }) {
  var [parts, setParts] = useState([]);
  var [fabSummary, setFabSummary] = useState({});
  var [selectedStage, setSelectedStage] = useState('cutting');
  var [selectedCat, setSelectedCat] = useState('builtup');
  var [workers, setWorkers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [entries, setEntries] = useState({});
  var [persons, setPersons] = useState({});
  var [showConfirm, setShowConfirm] = useState(false);
  var [saving, setSaving] = useState(false);
  var [showABForm, setShowABForm] = useState(false);
  var [searchTerm, setSearchTerm] = useState('');
  var [abForm, setAbForm] = useState({ mark:'', qty:'', weight:'' });

  useEffect(function() { loadData(); }, [project.id]);
  async function loadData() {
    setLoading(true);
    var [p, fs, w] = await Promise.all([db.getParts(project.id), db.getFabSummary(project.id), db.getWorkers(project.id)]);
    setParts(p || []); setFabSummary(fs || {}); setWorkers(w || []); setLoading(false);
  }


  // ===== SMART AUTO-PARSER (works with any Excel format) =====
  function findCol(headers, keywords, excludeKw) {
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').toLowerCase().replace(/\u00a0/g, ' ').trim();
      var found = false;
      for (var k = 0; k < keywords.length; k++) { if (h.indexOf(keywords[k]) >= 0) { found = true; break; } }
      if (found && excludeKw && excludeKw.length > 0) {
        for (var e = 0; e < excludeKw.length; e++) { if (h.indexOf(excludeKw[e]) >= 0) { found = false; break; } }
      }
      if (found) return headers[i];
    }
    return null;
  }

  function findHeaderRow(XLSX, ws) {
    var aoa = XLSX.utils.sheet_to_json(ws, {header:1});
    var markKw = ['mark', 'assembly', 'standard', 'item', 'part'];
    var qtyKw = ['qty', 'quantity', 'nos', 'pcs'];
    for (var i = 0; i < Math.min(25, aoa.length); i++) {
      var row = aoa[i];
      if (!row) continue;
      var rowStr = row.map(function(c){ return String(c || '').toLowerCase().replace(/\u00a0/g, ' '); });
      var hasMark = rowStr.some(function(c){ return markKw.some(function(k){ return c.indexOf(k) >= 0; }); });
      var hasQty = rowStr.some(function(c){ return qtyKw.some(function(k){ return c.indexOf(k) >= 0; }); });
      if (hasMark && hasQty) return i;
    }
    return 0;
  }

  function smartParseSheet(XLSX, ws) {
    var headerIdx = findHeaderRow(XLSX, ws);
    var rows = XLSX.utils.sheet_to_json(ws, { range: headerIdx, defval: '' });
    if (!rows || rows.length === 0) return [];
    var headers = Object.keys(rows[0]);
    var markCol = findCol(headers, ['mark', 'assembly', 'pos', 'part no', 'standard', 'item'], []);
    var descCol = findCol(headers, ['desc', 'type', 'name'], ['net', 'weight', 'qty']);
    var qtyCol = findCol(headers, ['qty', 'quantity', 'nos', 'pcs'], []);
    var wtCol = findCol(headers, ['weight', 'wt', 'kg'], ['all', 'total', 'for all', 'gross']);
    if (!wtCol) wtCol = findCol(headers, ['weight', 'wt', 'kg'], []);
    var areaCol = findCol(headers, ['area', 'sq'], []);
    var colorCol = findCol(headers, ['color', 'colour', 'shade'], []);
    if (!markCol) return [];
    var results = [];
    rows.forEach(function(r) {
      var mark = String(r[markCol] || '').replace(/\u00a0/g, '').trim();
      if (!mark) return;
      var ml = mark.toLowerCase();
      if (ml.indexOf('legend') >= 0 || ml.indexOf('total') >= 0 || ml.indexOf('grand') >= 0 || ml === 'sno' || ml === 'sr' || ml.indexOf('---') >= 0) return;
      var qty = qtyCol ? (parseInt(r[qtyCol]) || 0) : 1;
      if (qty <= 0) return;
      results.push({
        mark: mark,
        description: descCol ? String(r[descCol] || '').replace(/\u00a0/g, ' ').trim() : '',
        qty: qty,
        weight: wtCol ? (parseFloat(r[wtCol]) || 0) : 0,
        area: areaCol ? (parseFloat(r[areaCol]) || 0) : 0,
        color: colorCol ? String(r[colorCol] || '').trim() : ''
      });
    });
    return results;
  }

  async function handleBomUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var XLSX = await import('xlsx');
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        var sheetName = wb.SheetNames.find(function(s){ var l = s.toLowerCase(); return l.indexOf('shipping') >= 0 || (l.indexOf('boq') >= 0 && l.indexOf('built') < 0); })
          || wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('PEB') >= 0 && s.toUpperCase().indexOf('BUILT') >= 0; })
          || wb.SheetNames[0];
        if (sheetName) {
          smartParseSheet(XLSX, wb.Sheets[sheetName]).forEach(function(p) {
            var m = (p.mark || '').trim().toUpperCase();
            var d = (p.description || '').toUpperCase();
            var isColdform =
              /^PUR/.test(m) ||
              /^GT/.test(m) ||
              /^C_GT/.test(m) ||
              /^HD/.test(m) ||
              (/^JB/.test(m) && d.indexOf('JAMB') >= 0);
            newParts.push({
              project_id: project.id,
              category: isColdform ? 'coldform' : 'builtup',
              mark: p.mark,
              description: p.description,
              qty: p.qty,
              weight: p.weight
            });
          });
        }
        ['PURLIN','GIRT','JAMB','HEADER'].forEach(function(prefix) {
          var sn = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf(prefix) >= 0; });
          if (sn) {
            smartParseSheet(XLSX, wb.Sheets[sn]).forEach(function(p) {
              newParts.push({ project_id: project.id, category:'coldform', mark: p.mark, description: p.description || prefix, qty: p.qty, weight: p.weight });
            });
          }
        });
        var hwSheet = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('HARDWARE') >= 0; });
        if (hwSheet) {
          smartParseSheet(XLSX, wb.Sheets[hwSheet]).forEach(function(p) {
            newParts.push({ project_id: project.id, category:'hardware', mark: p.mark, description: p.description, qty: p.qty, weight: p.weight });
          });
        }
        if (newParts.length === 0) { alert('No parts found in BOM. Make sure file has Mark/Assembly and Qty/Weight columns.'); return; }
        await db.deleteParts(project.id, 'builtup'); await db.deleteParts(project.id, 'coldform'); await db.deleteParts(project.id, 'hardware');
        await db.upsertParts(newParts);
        var counts = {}; newParts.forEach(function(p){ counts[p.category] = (counts[p.category]||0) + 1; });
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded BOM: ' + Object.keys(counts).map(function(k){ return counts[k] + ' ' + k; }).join(', '), user_name: auth.userName, user_role: auth.role });
        loadData();
        alert('BOM uploaded: ' + newParts.length + ' parts');
      } catch (err) { alert('Error reading BOM: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }


  async function handleSheetingUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var unitWt = prompt('Enter unit weight of sheet material (kg/m\u00b2):\n\nCommon values:\n0.50mm Hi-Rib = 4.4\n0.60mm Hi-Rib = 5.3\n0.47mm Hi-Rib = 4.1', '4.4');
    if (!unitWt) return;
    unitWt = parseFloat(unitWt) || 4.4;
    var XLSX = await import('xlsx');
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        var POLY_PREFIXES = ['WP','PC','SKY','LT'];

        // Dedicated sheeting parser: find Dwg. Ref. header in each sheet
        wb.SheetNames.forEach(function(sn) {
          var su = sn.toUpperCase();
          var defaultCat = null;
          if (su.indexOf('ROOF') >= 0) defaultCat = 'roofing';
          else if (su.indexOf('CLAD') >= 0 || su.indexOf('WALL') >= 0) defaultCat = 'cladding';
          else if (su.indexOf('FLASH') >= 0 || su.indexOf('TRIM') >= 0 || su.indexOf('ACCESS') >= 0) defaultCat = 'accessories';
          if (!defaultCat) return;

          var aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1});
          var headerIdx = -1;
          for (var i = 0; i < Math.min(25, aoa.length); i++) {
            if (!aoa[i]) continue;
            var found = aoa[i].some(function(c) {
              var s = String(c || '').toLowerCase();
              return s.indexOf('dwg') >= 0 && s.indexOf('ref') >= 0;
            });
            if (found) { headerIdx = i; break; }
          }
          if (headerIdx < 0) return;

          // Build rows from aoa directly — xlsx-js range/header indices can diverge
          // on sheets with blank leading rows (caused ROOF SHEET parse failure).
          var headerRow = aoa[headerIdx].map(function(h) { return String(h || '').trim(); });
          var rows = [];
          for (var ri = headerIdx + 1; ri < aoa.length; ri++) {
            if (!aoa[ri]) continue;
            var obj = {};
            var hasVal = false;
            for (var ci = 0; ci < headerRow.length; ci++) {
              var key = headerRow[ci] || ('__col_' + ci);
              var val = aoa[ri][ci];
              obj[key] = (val === undefined || val === null) ? '' : val;
              if (obj[key] !== '') hasVal = true;
            }
            if (hasVal) rows.push(obj);
          }
          if (!rows || rows.length === 0) return;
          var headers = headerRow.filter(function(h) { return h; });

          var markCol = findCol(headers, ['dwg', 'ref'], []);
          var descCol = findCol(headers, ['item', 'sketch'], ['weight','qty','nos']);
          var qtyCol = findCol(headers, ['nos'], []);
          var areaSqCol = null;
          for (var ai = 0; ai < headers.length; ai++) {
            var ahl = headers[ai].toLowerCase();
            if (ahl.indexOf('sq') >= 0 && ahl.indexOf('mtr') >= 0) { areaSqCol = headers[ai]; break; }
          }
          var lengthCol = null;
          for (var li = 0; li < headers.length; li++) {
            var lhl = headers[li].toLowerCase();
            if (lhl.indexOf('mtr') >= 0 && lhl.indexOf('sq') < 0) { lengthCol = headers[li]; break; }
          }
          var wtCol = findCol(headers, ['weight', 'wt'], []);
          var colorCol = findCol(headers, ['colour', 'color'], []);
          if (!colorCol) colorCol = findCol(headers, ['remark'], []);
          if (!markCol) return;

          rows.forEach(function(r) {
            var rawMark = String(r[markCol] || '').replace(/\u00a0/g, '').trim();
            if (!rawMark || rawMark === 'NaN' || rawMark.toLowerCase() === 'nan') return;
            if (/^\d+\.?\d*$/.test(rawMark.replace(/-/g, ''))) return;
            var ml = rawMark.toLowerCase();
            if (ml.indexOf('total') >= 0 || ml.indexOf('dwg') >= 0 || ml.indexOf('grand') >= 0) return;

            var qtyRaw = parseFloat(r[qtyCol]) || 0;
            var qty = qtyRaw > 0 ? Math.ceil(qtyRaw) : 0;
            if (qty <= 0) return;

            var areaSqm = areaSqCol ? (parseFloat(r[areaSqCol]) || 0) : 0;
            var lengthM = lengthCol ? (parseFloat(r[lengthCol]) || 0) : 0;

            var mu = rawMark.toUpperCase();
            var category = defaultCat;
            if (/^FT/.test(mu)) category = 'accessories';
            var isPoly = POLY_PREFIXES.some(function(px) { return mu.indexOf(px) === 0; });
            if (isPoly) category = 'accessories';

            var totalWeight = 0;
            if (wtCol) { var wv = parseFloat(r[wtCol]); if (wv > 0) totalWeight = wv; }
            if (totalWeight === 0 && areaSqm > 0 && (category === 'roofing' || category === 'cladding')) {
              totalWeight = areaSqm * unitWt;
            }
            var perPieceWt = qty > 0 ? Math.round(totalWeight / qty * 1000) / 1000 : 0;
            if (category === 'accessories') { perPieceWt = 0; }

            var areaField = 0;
            if (category === 'accessories') {
              areaField = isPoly ? areaSqm : lengthM;
            } else {
              areaField = areaSqm;
            }

            var color = '';
            if (colorCol) {
              var cv = String(r[colorCol] || '').trim().toUpperCase();
              if (cv && cv !== 'NAN' && !/^\d+\.?\d*$/.test(cv)) color = cv;
            }
            var desc = descCol ? String(r[descCol] || '').replace(/\u00a0/g, ' ').trim() : '';
            if (desc.toLowerCase() === 'nan') desc = '';

            newParts.push({ project_id: project.id, category: category, mark: rawMark, description: desc, qty: qty, weight: perPieceWt, area: Math.round(areaField * 100) / 100, color: color });
          });
        });

        // Deduplicate: suffix ALL duplicates with color
        var byCatMark = {};
        newParts.forEach(function(p) { var k = p.category + '::' + p.mark; if (!byCatMark[k]) byCatMark[k] = []; byCatMark[k].push(p); });
        Object.keys(byCatMark).forEach(function(k) { var g = byCatMark[k]; if (g.length <= 1) return; g.forEach(function(p) { if (p.color) p.mark = p.mark + '-' + p.color; }); });
        // Second pass: running number for remaining dups
        var byCatMark2 = {};
        newParts.forEach(function(p) { var k = p.category + '::' + p.mark; if (!byCatMark2[k]) byCatMark2[k] = []; byCatMark2[k].push(p); });
        Object.keys(byCatMark2).forEach(function(k) { var g = byCatMark2[k]; if (g.length <= 1) return; for (var di = 1; di < g.length; di++) { g[di].mark = g[di].mark + '-' + (di + 1); } });

        if (newParts.length === 0) { alert('No sheeting parts found. Make sure the file has Dwg. Ref. column.'); return; }
        await db.deleteParts(project.id, 'roofing'); await db.deleteParts(project.id, 'cladding'); await db.deleteParts(project.id, 'accessories');
        await db.upsertParts(newParts);
        var counts = {}; newParts.forEach(function(p) { counts[p.category] = (counts[p.category] || 0) + 1; });
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded Sheeting BOQ: ' + Object.keys(counts).map(function(k) { return counts[k] + ' ' + k; }).join(', '), user_name: auth.userName, user_role: auth.role });
        loadData();
        alert('Sheeting BOQ uploaded: ' + newParts.length + ' parts (' + Object.keys(counts).map(function(k) { return counts[k] + ' ' + k; }).join(', ') + ')');
      } catch (err) { alert('Error reading Sheeting BOQ: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }

  async function handleDeckUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var XLSX = await import('xlsx');
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        // Look for DECK sheet first, then try all sheets for DS* marks
        var deckSheet = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('DECK') >= 0; });
        var sheetsToCheck = deckSheet ? [deckSheet] : wb.SheetNames;
        sheetsToCheck.forEach(function(sn) {
          var parsed = smartParseSheet(XLSX, wb.Sheets[sn]);
          parsed.forEach(function(p) {
            if (deckSheet || p.mark.toUpperCase().indexOf('DS') === 0) {
              newParts.push({ project_id: project.id, category:'deck', mark: p.mark, description: p.description || 'Deck Sheet', qty: p.qty, weight: p.weight, area: p.area });
            }
          });
        });
        if (newParts.length === 0) { alert('No deck parts found. Use a file with DECK sheet or DS* marks.'); return; }
        await db.deleteParts(project.id, 'deck');
        await db.upsertParts(newParts);
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded Deck BOQ: ' + newParts.length + ' parts', user_name: auth.userName, user_role: auth.role });
        loadData();
        alert('Deck BOQ uploaded: ' + newParts.length + ' parts');
      } catch (err) { alert('Error reading Deck BOQ: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }

  async function handleAddAB() {
    if (!abForm.mark.trim()) return alert('Mark is required');
    try {
      await db.upsertParts([{
        project_id: project.id, category: 'anchor_bolts', mark: abForm.mark.trim(),
        description: 'Anchor Bolt', qty: parseInt(abForm.qty) || 1,
        weight: parseFloat(abForm.weight) || 0
      }]);
      await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Added Anchor Bolt: ' + abForm.mark, user_name: auth.userName, user_role: auth.role });
      setAbForm({ mark:'', qty:'', weight:'' });
      loadData();
    } catch (err) { alert('Error: ' + err.message); }
  }

  function stageUnlocked(part) {
    if (!isBuiltup) return true;
    var stageIdx = STAGES.indexOf(selectedStage);
    if (stageIdx <= 0) return true;
    var prevStage = STAGES[stageIdx - 1];
    if (prevStage === 'cutting' && selectedStage === 'fitting') {
      var cuttingDone = (fabSummary[part.id] && fabSummary[part.id]['cutting']) || 0;
      return cuttingDone >= part.qty;
    }
    return true;
  }

  var catParts = parts.filter(function(p){ return p.category === selectedCat; });
  var filteredParts = searchTerm ? catParts.filter(function(p){ return p.mark.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0 || (p.description || "").toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0; }) : catParts;
  var builtupParts = parts.filter(function(p){ return p.category === 'builtup'; });
  var stageProgress = {};
  var isColdformCat = selectedCat === 'coldform';
  var activeStages = isColdformCat ? COLDFORM_STAGES : STAGES;
  var activeStageLabels = isColdformCat ? COLDFORM_STAGE_LABELS : STAGE_LABELS;
  var stagePartsSource = (isBuiltup || isColdformCat) ? catParts : builtupParts;
  activeStages.forEach(function(s) { var total = 0, done = 0; stagePartsSource.forEach(function(p) { total += p.qty; done += (fabSummary[p.id] && fabSummary[p.id][s]) || 0; }); stageProgress[s] = total > 0 ? Math.round(done / total * 100) : 0; });

  var isBuiltup = selectedCat === 'builtup';
  // Reset selectedStage to 'cutting' if it's not valid for current category
  useEffect(function() {
    if (isColdformCat && !COLDFORM_STAGES.includes(selectedStage)) setSelectedStage('cutting');
    if (!isBuiltup && !isColdformCat) setSelectedStage('cutting');
  }, [selectedCat]);
  var personField = STAGE_PERSONS[selectedStage];
  var canEnter = auth.isPM || auth.isFab;
  var pendingEntries = catParts.filter(function(p) { return (entries[p.id] || 0) > 0; });

  // Category-level progress
  var catProgress = {};
  CATEGORIES.forEach(function(cat) {
    var cp = parts.filter(function(p){ return p.category === cat; });
    var total = cp.reduce(function(a,p){ return a + p.qty; }, 0);
    var done = 0;
    cp.forEach(function(p) { var fs = fabSummary[p.id]; if (fs) { done += cat === 'builtup' ? (fs.painting || 0) : (fs.cutting || 0); } });
    catProgress[cat] = total > 0 ? Math.round(done / total * 100) : 0;
  });

  async function handleSave() {
    if (pendingEntries.length === 0) return;
    // Safety: clamp any entry that somehow exceeded balance
    var oversize = pendingEntries.filter(function(p) {
      var d = (isBuiltup || isColdformCat) ? ((fabSummary[p.id] && fabSummary[p.id][selectedStage]) || 0) : ((fabSummary[p.id] && fabSummary[p.id]['cutting']) || 0);
      return (entries[p.id] || 0) > (p.qty - d);
    });
    if (oversize.length > 0) {
      alert('Cannot save: ' + oversize.map(function(p){ return p.mark; }).join(', ') + ' exceeds balance. Fix and retry.');
      return;
    }
    setSaving(true);
    try {
      var fabEntries = pendingEntries.map(function(p) {
        return { project_id: project.id, part_id: p.id, stage: isBuiltup ? selectedStage : 'cutting',
          qty_done: entries[p.id], person_name: persons[p.id] || '',
          entry_date: new Date().toISOString().split('T')[0], entered_by: auth.user.id };
      });
      await db.addFabEntries(fabEntries);
      var details = (isBuiltup ? STAGE_LABELS[selectedStage] : CAT_LABELS[selectedCat]) + ': ' +
        pendingEntries.map(function(p){ return p.mark + ' x' + entries[p.id] + (persons[p.id] ? ' by ' + persons[p.id] : ''); }).join(', ');
      await db.logActivity({ project_id: project.id, action_type: 'fab_entry', details: details, user_name: auth.userName, user_role: auth.role });
      setEntries({}); setPersons({}); setShowConfirm(false); loadData();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  if (loading) return <div style={{textAlign:'center',padding:40}}><div style={{width:30,height:30,border:'3px solid #2a2a3a',borderTop:'3px solid #dc2626',borderRadius:'50%',margin:'0 auto'}} className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      {/* Upload Buttons - PM Only */}
      {auth.isPM && (
        <div className="upload-row">
          <label className="btn-outline" style={{ cursor:'pointer', color:'#38bdf8', borderColor:'#38bdf8', display:'flex', alignItems:'center', gap:4 }}>
            📁 Upload BOM <input type="file" accept=".xlsx,.xls" onChange={handleBomUpload} style={{ display:'none' }} />
          </label>
          <label className="btn-outline" style={{ cursor:'pointer', color:'#a78bfa', borderColor:'#a78bfa', display:'flex', alignItems:'center', gap:4 }}>
            🏠 Upload Sheeting BOQ <input type="file" accept=".xlsx,.xls" onChange={handleSheetingUpload} style={{ display:'none' }} />
          </label>
          <label className="btn-outline" style={{ cursor:'pointer', color:'#06b6d4', borderColor:'#06b6d4', display:'flex', alignItems:'center', gap:4 }}>
            📐 Upload Deck BOQ <input type="file" accept=".xlsx,.xls" onChange={handleDeckUpload} style={{ display:'none' }} />
          </label>
          <button onClick={function(){ setShowABForm(!showABForm); }} className="btn-outline" style={{ color:'#f59e0b', borderColor:'#f59e0b', display:'flex', alignItems:'center', gap:4 }}>
            ⚓ + Anchor Bolt
          </button>
        </div>
      )}

      {/* Anchor Bolt Manual Entry Form */}
      {showABForm && auth.isPM && (
        <div className="glass-card animate-fade" style={{ padding:16, marginBottom:12, borderLeft:'3px solid #f59e0b' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:16 }}>⚓</span>
            <span className="mono" style={{ fontWeight:600, fontSize:12 }}>Add Anchor Bolt</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <div style={{flex:1}}><label className="mono" style={{fontSize:8,color:'var(--dim)'}}>MARK</label><input value={abForm.mark} onChange={function(e){setAbForm(function(p){return Object.assign({},p,{mark:e.target.value})})}} placeholder="AB-1" /></div>
            <div style={{width:80}}><label className="mono" style={{fontSize:8,color:'var(--dim)'}}>QTY</label><input type="number" value={abForm.qty} onChange={function(e){setAbForm(function(p){return Object.assign({},p,{qty:e.target.value})})}} placeholder="4" /></div>
            <div style={{width:80}}><label className="mono" style={{fontSize:8,color:'var(--dim)'}}>WEIGHT</label><input type="number" value={abForm.weight} onChange={function(e){setAbForm(function(p){return Object.assign({},p,{weight:e.target.value})})}} placeholder="kg" /></div>
            <button onClick={handleAddAB} className="btn-red" style={{padding:'8px 12px',fontSize:10,height:36}}>+ Add</button>
          </div>
        </div>
      )}

      {/* Category cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {CATEGORIES.map(function(cat) {
          var cp = parts.filter(function(p){ return p.category === cat; });
          var total = cp.reduce(function(a,p){ return a+p.qty; }, 0);
          var sel = selectedCat === cat;
          return (
            <div key={cat} className="glass-card" style={{ padding:'10px 12px', cursor:'pointer', borderColor: sel ? CAT_COLORS[cat] : 'var(--border)', borderWidth: sel ? 2 : 1, transition:'all 0.2s' }}
              onClick={function(){ setSelectedCat(cat); }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:16 }}>{CAT_ICONS[cat]}</span>
                <ProgressRing pct={catProgress[cat]} color={CAT_COLORS[cat]} size={36} />
              </div>
              <div className="mono" style={{ fontSize:9, fontWeight:700, color:CAT_COLORS[cat], marginTop:6 }}>{CAT_LABELS[cat]}</div>
              <div className="mono" style={{ fontSize:14, fontWeight:700, marginTop:2 }}>{total}</div>
              <div style={{ fontSize:8, color:'var(--dim)' }}>{cp.length} marks</div>
              {(cat === 'builtup' || cat === 'coldform' || cat === 'hardware' || cat === 'anchor_bolts' || cat === 'deck') && cp.length > 0 && (
                <div style={{ fontSize:7, color:'var(--muted)', marginTop:2 }}>
                  {(cp.reduce(function(a,p){ return a + (p.weight * p.qty); }, 0) / 1000).toFixed(2)} MT
                </div>
              )}
              {(cat === 'roofing' || cat === 'cladding') && cp.length > 0 && (
                <div style={{ fontSize:7, color:'var(--muted)', marginTop:2 }}>
                  {cp.reduce(function(a,p){ return a + (p.area || 0); }, 0).toFixed(0)} m² · {cp.reduce(function(a,p){ return a + (p.weight * p.qty); }, 0).toFixed(0)} kg
                </div>
              )}
              {cat === 'accessories' && cp.length > 0 && (
                <div style={{ fontSize:7, color:'var(--muted)', marginTop:2 }}>
                  {(function() {
                    var polyParts = cp.filter(function(p) { return /^(WP|PC|SKY|LT)/i.test(p.mark); });
                    var otherParts = cp.filter(function(p) { return !/^(WP|PC|SKY|LT)/i.test(p.mark); });
                    var polyArea = polyParts.reduce(function(a,p){ return a + (p.area || 0); }, 0);
                    var otherRmt = otherParts.reduce(function(a,p){ return a + (p.area || 0); }, 0);
                    var parts = [];
                    if (polyArea > 0) parts.push(polyArea.toFixed(0) + ' m\u00b2 poly');
                    if (otherRmt > 0) parts.push(otherRmt.toFixed(0) + ' rmt');
                    return parts.join(' \u00b7 ') || '';
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage pipeline */}
      {(isBuiltup || isColdformCat) && (
        <div className="glass-card" style={{ padding:16, marginBottom:16, borderLeft:'3px solid #38bdf8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:14 }}>⚙️</span>
            <span className="mono" style={{ fontSize:12, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>
              {isColdformCat ? '1-STAGE PIPELINE' : '5-STAGE PIPELINE'}
            </span>
          </div>
          {/* Stage progress rings */}
          <div style={{ display:'flex', gap:4, marginBottom:12 }}>
            {activeStages.map(function(s) {
              var sel = selectedStage === s;
              return (
                <button key={s} onClick={function(){ setSelectedStage(s); }} style={{
                  flex:1, padding:'6px 2px', borderRadius:8, border: sel ? '1.5px solid ' + STAGE_COLORS[s] : '1px solid transparent',
                  background: sel ? STAGE_COLORS[s] + '15' : 'transparent', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4
                }}>
                  <ProgressRing pct={stageProgress[s]} color={STAGE_COLORS[s]} size={38} />
                  <span className="mono" style={{ fontSize:7, color: sel ? STAGE_COLORS[s] : 'var(--dim)' }}>{activeStageLabels[s]}</span>
                </button>
              );
            })}
          </div>
          {/* Stage bars */}
          {activeStages.map(function(s) {
            return <StageBar key={s} label={activeStageLabels[s]} pct={stageProgress[s]} color={STAGE_COLORS[s]} icon={STAGE_ICONS[s]} />;
          })}
        </div>
      )}

      {/* Parts table */}
      <div className="glass-card" style={{ padding:16, borderLeft:'3px solid ' + (STAGE_COLORS[selectedStage] || '#dc2626') }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>{isBuiltup ? STAGE_ICONS[selectedStage] : CAT_ICONS[selectedCat]}</span>
            <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>
              {isBuiltup ? STAGE_LABELS[selectedStage].toUpperCase() + ' ' : isColdformCat ? (COLDFORM_STAGE_LABELS[selectedStage] || '').toUpperCase() + ' ' : ''}{CAT_LABELS[selectedCat].toUpperCase()} ({catParts.length})
            </span>
          </div>
          {canEnter && (isBuiltup || isColdformCat) && pendingEntries.length > 0 && (
            <button onClick={function(){ setShowConfirm(true); }} className="btn-red" style={{ padding:'6px 14px', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
              💾 Save ({pendingEntries.length})
            </button>
          )}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
          <input placeholder="Search marks..." value={searchTerm} onChange={function(e){ setSearchTerm(e.target.value); }} style={{ flex:1, fontSize:11, padding:'6px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)' }} />
          {canEnter && (isBuiltup || isColdformCat) && (
            <button onClick={function(){ var ne = Object.assign({}, entries); filteredParts.forEach(function(p){ var d = (isBuiltup || isColdformCat) ? ((fabSummary[p.id] && fabSummary[p.id][selectedStage]) || 0) : 0; var b = p.qty - d; if(b > 0 && stageUnlocked(p)) ne[p.id] = b; }); setEntries(ne); }} className="btn-outline" style={{ fontSize:10, padding:'5px 12px', whiteSpace:'nowrap' }}>Tick All</button>
          )}
          {searchTerm && <button onClick={function(){ setSearchTerm(''); }} className="btn-outline" style={{ fontSize:10, padding:'5px 10px' }}>x</button>}
        </div>
        {catParts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px 20px' }}>
            <div style={{ fontSize:30, marginBottom:8 }}>{CAT_ICONS[selectedCat]}</div>
            <p style={{ fontSize:12, color:'var(--dim)' }}>No parts. {auth.isPM ? 'Upload a BOM to get started.' : ''}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Mark</th><th>Desc</th>{!(isBuiltup || isColdformCat) && <th>Color</th>}<th>Qty</th>{!(isBuiltup || isColdformCat) && <th>Area</th>}<th>Done</th><th>Bal</th>
              {(isBuiltup || isColdformCat) && personField && <th>{personField}</th>}{canEnter && (isBuiltup || isColdformCat) && <th>Today</th>}</tr></thead>
            <tbody>
              {filteredParts.map(function(p) {
                var done = (isBuiltup || isColdformCat) ? ((fabSummary[p.id] && fabSummary[p.id][selectedStage]) || 0) : ((fabSummary[p.id] && fabSummary[p.id]['cutting']) || 0);
                var bal = p.qty - done; var complete = bal <= 0;
                return (
                  <tr key={p.id} style={ complete ? { opacity:0.6 } : {} }>
                    <td><span className="mono" style={{ fontWeight:600, color: complete ? '#34d399' : '#dc2626' }}>{complete ? '✓ ' : ''}{p.mark}</span></td>
                    <td style={{ color:'var(--dim)', fontSize:11 }}>{p.description}</td>
                    {!(isBuiltup || isColdformCat) && <td style={{ color:'var(--muted)', fontSize:10 }}>{p.color || '-'}</td>}
                    <td className="mono">{p.qty}</td>
                    {!(isBuiltup || isColdformCat) && <td className="mono" style={{ fontSize:10 }}>{p.area ? (p.area + (/^(WP|PC|SKY|LT)/i.test(p.mark) ? ' m\u00b2' : (selectedCat === 'accessories' ? ' rmt' : ' m\u00b2'))) : '-'}</td>}
                    <td className="mono" style={{ color: complete ? '#34d399' : done > 0 ? '#f59e0b' : 'var(--dim)' }}>{done}</td>
                    <td className="mono" style={{ color: complete ? '#34d399' : 'var(--text)' }}>{complete ? '✓' : bal}</td>
                    {isBuiltup && personField && <td>{canEnter && !complete ? <input value={persons[p.id] || ''} onChange={function(e){ setPersons(function(prev){ var n=Object.assign({},prev); n[p.id]=e.target.value; return n; }); }} placeholder={personField} style={{ width:80, fontSize:10, padding:'2px 6px' }} /> : null}</td>}
                    {canEnter && (isBuiltup || isColdformCat) && <td>{!complete && stageUnlocked(p) ? <input type="number" min="0" max={bal} value={entries[p.id] || ''} onChange={function(e){ setEntries(function(prev){ var n=Object.assign({},prev); var v=parseInt(e.target.value)||0; if(v<0)v=0; if(v>bal)v=bal; n[p.id]=v; return n; }); }} style={{ width:50, fontSize:12, padding:'2px 6px', textAlign:'center', borderColor: (entries[p.id] || 0) > 0 ? STAGE_COLORS[selectedStage] : 'var(--border)' }} /> : !complete && !stageUnlocked(p) ? <span style={{fontSize:8,color:'#f97066'}}>🔒</span> : null}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Confirm modal */}
        {showConfirm && typeof document !== 'undefined' && ReactDOM.createPortal((
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(4px)' }}>
            <div className="glass-card animate-fade" style={{ padding:24, maxWidth:420, width:'90%', borderLeft:'3px solid ' + (STAGE_COLORS[selectedStage] || '#dc2626') }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <span style={{ fontSize:18 }}>✅</span>
                <h3 className="mono" style={{ fontSize:14, color:STAGE_COLORS[selectedStage] || '#dc2626' }}>Confirm Save</h3>
              </div>
              <div style={{ maxHeight:'50vh', overflowY:'auto' }}>
              {pendingEntries.map(function(p) {
                return (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(42,42,58,0.3)' }}>
                    <span className="mono" style={{ fontSize:12, fontWeight:600 }}>{p.mark} x{entries[p.id]}</span>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>{persons[p.id] || ''}</span>
                    <span className="mono" style={{ fontSize:11, color:'var(--dim)' }}>{(p.weight * entries[p.id]).toFixed(0)} kg</span>
                  </div>
                );
              })}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:16 }}>
                <button onClick={function(){ setShowConfirm(false); }} className="btn-outline" style={{ flex:1 }}>← Go Back</button>
                <button onClick={handleSave} disabled={saving} className="btn-red" style={{ flex:1 }}>{saving ? 'Saving...' : '✓ Confirm'}</button>
              </div>
            </div>
          </div>
        ), document.body)}
      </div>
    </div>
  );
}

function DispatchTab({ project, auth }) {
  var [dispatches, setDispatches] = useState([]);
  var [showCreate, setShowCreate] = useState(false);
  var [form, setForm] = useState({ vehicle_no:'', challan_no:'', driver_name:'', driver_phone:'', net_weight:'', loading_by:'', weight_slip_url:'', challan_url:'' });
  var [otherItems, setOtherItems] = useState([]);
  var [saving, setSaving] = useState(false);
  var [loading, setLoading] = useState(true);
  var [allParts, setAllParts] = useState([]);
  var [dispatchParts, setDispatchParts] = useState([]);

  useEffect(function() { loadDispatches(); }, [project.id]);
  async function loadDispatches() {
    var [data, pts] = await Promise.all([db.getDispatches(project.id), db.getParts(project.id)]);
    setDispatches(data || []); setAllParts(pts || []); setLoading(false);
  }

  async function advanceStatus(d) {
    var idx = DISPATCH_STATUSES.indexOf(d.status); if (idx >= DISPATCH_STATUSES.length - 1) return;
    var next = DISPATCH_STATUSES[idx + 1];
    await db.updateDispatchStatus(d.id, next);
    await db.logActivity({ project_id: project.id, action_type: 'dispatch_status', details: d.vehicle_no + ' → ' + next, user_name: auth.userName, user_role: auth.role });
    loadDispatches();
  }

  function set(f, v) { setForm(function(prev){ var n = Object.assign({}, prev); n[f] = v; return n; }); }
  async function handleCreate() {
    if (!form.vehicle_no.trim()) return alert('Vehicle No required');
    setSaving(true);
    try {
      var partsList = dispatchParts.filter(function(dp){ return dp.qty > 0; }).map(function(dp){ return { part_id: dp.part_id, qty: dp.qty }; });
      await db.createDispatch(Object.assign({}, form, {
        project_id: project.id,
        net_weight: parseFloat(form.net_weight) || 0,
        created_by: auth.user.id,
        other_items: otherItems.length > 0 ? JSON.stringify(otherItems) : '[]'
      }), partsList);
      var details = 'Dispatch ' + form.vehicle_no + ': ' + partsList.length + ' parts' + (otherItems.length > 0 ? ' + ' + otherItems.length + ' other items' : '') + ', ' + (form.net_weight || 0) + ' MT';
      await db.logActivity({ project_id: project.id, action_type: 'dispatch_create', details: details, user_name: auth.userName, user_role: auth.role });
      setForm({ vehicle_no:'', challan_no:'', driver_name:'', driver_phone:'', net_weight:'', loading_by:'', weight_slip_url:'', challan_url:'' });
      setOtherItems([]); setDispatchParts([]); setShowCreate(false); loadDispatches();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  var statusCounts = {}; DISPATCH_STATUSES.forEach(function(s){ statusCounts[s] = 0; });
  dispatches.forEach(function(d){ statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
  var statusColors = { Loaded:'#f59e0b', 'In Transit':'#38bdf8', Delivered:'#34d399', Unloaded:'#a78bfa' };
  var statusIcons = { Loaded:'📦', 'In Transit':'🚛', Delivered:'✅', Unloaded:'🏗' };
  var canManage = auth.isPM || auth.isDispatch;

  return (
    <div className="animate-fade">
      {/* Status cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {DISPATCH_STATUSES.map(function(s) {
          return (
            <div key={s} className="glass-card" style={{ padding:12, textAlign:'center' }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{statusIcons[s]}</div>
              <div className="mono" style={{ fontSize:22, fontWeight:700, color:statusColors[s] }}>{statusCounts[s]}</div>
              <div className="mono" style={{ fontSize:8, color:'var(--dim)', letterSpacing:1, marginTop:2 }}>{s.toUpperCase()}</div>
            </div>
          );
        })}
      </div>

      {canManage && <button onClick={function(){ setShowCreate(!showCreate); }} className="btn-outline" style={{ marginBottom:12, color:'#38bdf8', borderColor:'#38bdf8' }}>🚚 + New Dispatch</button>}

      {showCreate && <DispatchCreateForm project={project} auth={auth} form={form} set={set} saving={saving} handleCreate={handleCreate} onCancel={function(){setShowCreate(false)}} dispatchParts={dispatchParts} setDispatchParts={setDispatchParts} otherItems={otherItems} setOtherItems={setOtherItems} />}

      {dispatches.map(function(d) {
        var theoWeight = 0;
        var dpList = d.dispatch_parts || [];
        dpList.forEach(function(dp) { if(dp.parts) theoWeight += (dp.parts.weight || 0) * dp.qty; });
        var otherList = [];
        try { otherList = typeof d.other_items === 'string' ? JSON.parse(d.other_items) : (d.other_items || []); } catch(e) { otherList = []; }
        return (
          <details key={d.id} className="glass-card" style={{ padding:14, marginBottom:8, borderLeft:'3px solid ' + statusColors[d.status] }}>
            <summary style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', listStyle:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>{statusIcons[d.status]}</span>
                <span className="mono" style={{ fontWeight:700, fontSize:14 }}>{d.vehicle_no}</span>
                <span style={{ fontSize:10, color:'var(--dim)' }}>{new Date(d.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="mono" style={{ fontSize:10, color:'var(--muted)' }}>{dpList.length} parts · {(theoWeight/1000).toFixed(2)} MT</span>
                <span className="badge" style={{ background:statusColors[d.status]+'22', color:statusColors[d.status] }}>{d.status}</span>
              </div>
            </summary>
            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(42,42,58,0.3)' }}>
              <div style={{ fontSize:11, color:'var(--dim)', marginBottom:8 }}>
                Challan: {d.challan_no || '—'} · Driver: {d.driver_name || '—'} · Phone: {d.driver_phone || '—'} · Net Weight: {d.net_weight || 0} MT · Loading: {d.loading_by || '—'}
              </div>
              {(d.weight_slip_url || d.challan_url) && (
                <div style={{ display:'flex', gap:12, marginBottom:8 }}>
                  {d.weight_slip_url && <a href={d.weight_slip_url} target="_blank" rel="noopener" style={{ fontSize:10, color:'#38bdf8', textDecoration:'underline' }}>Weight Slip Photo</a>}
                  {d.challan_url && <a href={d.challan_url} target="_blank" rel="noopener" style={{ fontSize:10, color:'#38bdf8', textDecoration:'underline' }}>Challan Photo</a>}
                </div>
              )}
              {dpList.length > 0 && (
                <div style={{ marginBottom:8 }}>
                  <span className="mono" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1 }}>PARTS ({dpList.length})</span>
                  <table className="data-table" style={{ marginTop:4 }}>
                    <thead><tr><th>Mark</th><th>Category</th><th>Qty</th><th>Weight</th></tr></thead>
                    <tbody>
                      {dpList.map(function(dp, i) {
                        var pInfo = dp.parts || {};
                        return (
                          <tr key={i}>
                            <td className="mono" style={{ fontWeight:600, fontSize:11 }}>{pInfo.mark || '—'}</td>
                            <td style={{ fontSize:10, color:'var(--muted)' }}>{pInfo.category || '—'}</td>
                            <td className="mono" style={{ fontSize:11 }}>{dp.qty}</td>
                            <td className="mono" style={{ fontSize:10, color:'var(--dim)' }}>{((pInfo.weight || 0) * dp.qty).toFixed(1)} kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ textAlign:'right', fontSize:10, color:'var(--muted)', marginTop:4 }}>
                    Theoretical: {(theoWeight/1000).toFixed(2)} MT · Net: {d.net_weight || 0} MT
                  </div>
                </div>
              )}
              {otherList.length > 0 && (
                <div style={{ marginBottom:8 }}>
                  <span className="mono" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1 }}>OTHER ITEMS ({otherList.length})</span>
                  {otherList.map(function(item, i) {
                    return <div key={i} style={{ fontSize:11, color:'var(--text)', padding:'2px 0' }}>{item.name} — {item.qty} {item.unit}</div>;
                  })}
                </div>
              )}
              {canManage && d.status !== 'Unloaded' && (
                <button onClick={function(){ advanceStatus(d); }} className="btn-outline" style={{ fontSize:10, color:'#34d399', borderColor:'#34d399' }}>
                  Advance → {DISPATCH_STATUSES[DISPATCH_STATUSES.indexOf(d.status) + 1]}
                </button>
              )}
            </div>
          </details>
        );
      })}
      {dispatches.length === 0 && !showCreate && (
        <div className="glass-card" style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:30, marginBottom:8 }}>🚚</div>
          <p style={{ fontSize:12, color:'var(--dim)' }}>No dispatches yet</p>
        </div>
      )}
    </div>
  );
}

function ErectionTab({ project, auth }) {
  var [subTab, setSubTab] = useState(auth.role === 'client' ? '3d' : 'dashboard');
  var [parts, setParts] = useState([]);
  var [erectionRecords, setErectionRecords] = useState([]);
  var [snags, setSnags] = useState([]);
  var [bolts, setBolts] = useState([]);
  var [safety, setSafety] = useState([]);
  var [fabSummary, setFabSummary] = useState({});
  var [loading, setLoading] = useState(true);
  var [erectModal, setErectModal] = useState(null);
  var [erectionSearch, setErectionSearch] = useState('');

  useEffect(function() { loadAll(); }, [project.id]);
  async function loadAll() {
    setLoading(true);
    var [p, er, sn, bl, sf, fs, disp] = await Promise.all([
      db.getParts(project.id), db.getErectionRecords(project.id), db.getSnags(project.id),
      db.getBoltRecords(project.id), db.getSafetyChecks(project.id), db.getFabSummary(project.id),
      db.getDispatches(project.id)
    ]);
    setParts(p||[]); setErectionRecords(er||[]); setSnags(sn||[]); setBolts(bl||[]); setSafety(sf||[]); setFabSummary(fs||{});
    // Build dispatched qty map from dispatch data
    var dispMap = {};
    (disp || []).forEach(function(d) {
      if (d.dispatch_parts) {
        d.dispatch_parts.forEach(function(dp) {
          if (!dispMap[dp.part_id]) dispMap[dp.part_id] = 0;
          dispMap[dp.part_id] += dp.qty;
        });
      }
    });
    setDispatchedPartIds(dispMap);
    setLoading(false);
  }

  var erectedPartIds = {}; erectionRecords.forEach(function(r){ erectedPartIds[r.part_id] = r; });
  var totalWeight = parts.reduce(function(a,p){ return a + p.weight * p.qty; }, 0);
  var erectedWeight = 0;
  erectionRecords.forEach(function(r){ var p = parts.find(function(pp){ return pp.id === r.part_id; }); if (p) erectedWeight += p.weight; });
  var pctErected = totalWeight > 0 ? Math.round(erectedWeight / totalWeight * 100) : 0;
  var totalBoltsInstalled = bolts.reduce(function(a,b){ return a+b.installed; }, 0);
  var totalBoltsTorqued = bolts.reduce(function(a,b){ return a+b.torqued; }, 0);
  var boltPct = totalBoltsInstalled > 0 ? Math.round(totalBoltsTorqued/totalBoltsInstalled*100) : 0;
  var openSnags = snags.filter(function(s){ return s.status === 'Open'; }).length;
  var canManage = auth.isPM || auth.isSite;

  // Dispatched qty per part (loaded in loadAll)
  var [dispatchedPartIds, setDispatchedPartIds] = useState({});

  function canErectMark(part) {
    // Check fabrication complete
    if (part.category === 'builtup') {
      var fs = fabSummary[part.id];
      if (!fs || !fs.painting || fs.painting < part.qty) return { ok: false, reason: 'Painting incomplete' };
    }
    if (part.category === 'coldform') {
      var fs = fabSummary[part.id];
      if (!fs || !fs.cutting || fs.cutting < part.qty) return { ok: false, reason: 'Roll Forming incomplete' };
    }
    // Check dispatched
    var dispQty = dispatchedPartIds[part.id] || 0;
    if (dispQty < part.qty) return { ok: false, reason: 'Not dispatched (' + dispQty + '/' + part.qty + ')' };
    return { ok: true, reason: '' };
  }

  if (loading) return <div style={{textAlign:'center',padding:40}}><div style={{width:30,height:30,border:'3px solid #2a2a3a',borderTop:'3px solid #dc2626',borderRadius:'50%',margin:'0 auto'}} className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      <div className="tabs-row">
        {[
          { id:'dashboard', label:'📊 Dashboard' }, { id:'marks', label:'🏗 Marks (' + parts.length + ')' },
          { id:'3d', label:'🧊 3D View' },
          { id:'ifc', label:'📄 IFC Upload' },
          { id:'daily', label:'📅 Daily Log' },
          { id:'snags', label:'⚠ Snags (' + openSnags + ')' }, { id:'safety', label:'🦺 Safety' }, { id:'bolts', label:'🔩 Bolts' }
        ].filter(function(st) {
          if (auth.role === 'client') return st.id === 'dashboard' || st.id === '3d';
          return true;
        }).map(function(st) {
          var sel = subTab === st.id;
          return (
            <button key={st.id} onClick={function(){ setSubTab(st.id); }} style={{
              padding:'8px 12px', borderRadius:6, border: sel ? '1px solid #f472b6' : '1px solid var(--border)',
              background: sel ? 'rgba(244,114,182,0.15)' : 'transparent', color: sel ? '#f472b6' : 'var(--dim)',
              fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap'
            }}>{st.label}</button>
          );
        })}
      </div>

      {subTab === 'dashboard' && (
        <div>
          <div className="glass-card" style={{ padding:20, marginBottom:12, borderLeft:'3px solid #f472b6' }}>
            <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
              <ProgressRing pct={pctErected} color="#f472b6" size={90} label="ERECTED" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, flex:1 }}>
                <StatCard value={(erectedWeight/1000).toFixed(1)+' MT'} label="Erected" color="#34d399" icon="✅" />
                <StatCard value={(totalWeight/1000).toFixed(1)+' MT'} label="Total" color="#38bdf8" icon="📦" />
                <StatCard value={boltPct+'%'} label="Bolts" color="#06b6d4" icon="🔩" />
                <StatCard value={openSnags} label="Open Snags" color="#f97066" icon="⚠" />
                <StatCard value={parts.length} label="Total Parts" color="#a78bfa" icon="📋" />
                <StatCard value={erectionRecords.length} label="Erected" color="#f472b6" icon="🏗" />
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'marks' && (
        <div className="glass-card" style={{ padding:16, borderLeft:'3px solid #f472b6' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontSize:16 }}>🏗</span>
            <span className="mono" style={{ fontSize:13, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>MARKS LIST</span>
            <span style={{ fontSize:9, color:'var(--dim)', marginLeft:'auto' }}>🔒 = Fab or dispatch incomplete</span>
          </div>
          {canManage && (
            <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
              <button onClick={function() {
                var erector = prompt('Enter erector/supervisor name for Erect All:');
                if (!erector) return;
                var today = new Date().toISOString().split('T')[0];
                var eligible = parts.filter(function(p) { return !erectedPartIds[p.id] && canErectMark(p).ok; });
                if (eligible.length === 0) { alert('No eligible parts to erect. Check dispatch and fabrication status.'); return; }
                if (!confirm('Erect ' + eligible.length + ' parts as erected by ' + erector + '?')) return;
                Promise.all(eligible.map(function(p) {
                  return db.erectMark({ project_id: project.id, part_id: p.id, erection_date: today, erector_name: erector, crew_size: 1, created_by: auth.user.id });
                })).then(function() {
                  db.logActivity({ project_id: project.id, action_type: 'erect_toggle', details: 'Bulk erect: ' + eligible.length + ' parts by ' + erector, user_name: auth.userName, user_role: auth.role });
                  loadAll();
                  alert(eligible.length + ' parts erected successfully!');
                }).catch(function(err) { alert('Error: ' + err.message); });
              }} className="btn-red" style={{ padding:'6px 14px', fontSize:11 }}>Erect All Eligible</button>
              <span style={{ fontSize:9, color:'var(--dim)' }}>{parts.filter(function(p) { return !erectedPartIds[p.id] && canErectMark(p).ok; }).length} parts ready</span>
            </div>
          )}
          {parts.filter(function(p){ return !erectionSearch || p.mark.toLowerCase().indexOf(erectionSearch.toLowerCase()) >= 0 || (p.description || '').toLowerCase().indexOf(erectionSearch.toLowerCase()) >= 0; }).map(function(p) {
            var erected = !!erectedPartIds[p.id];
            var gate = canErectMark(p);
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
                <div onClick={function() {
                  if (erected && auth.isPM) { if(confirm('Un-erect '+p.mark+'?')){ db.unErectMark(project.id,p.id).then(loadAll); } }
                  else if (!erected && canManage) {
                    var canE = canErectMark(p);
                    if (!canE.ok) { alert('Cannot erect ' + p.mark + ': ' + canE.reason); return; }
                    setErectModal(p);
                  }
                }} style={{
                  width:22, height:22, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
                  border: erected ? '2px solid #34d399' : gate.ok ? '2px solid var(--border)' : '2px solid #555',
                  background: erected ? '#34d399' : 'transparent', cursor: canManage && gate.ok ? 'pointer' : 'default', flexShrink:0,
                  opacity: !erected && !gate.ok ? 0.5 : 1
                }}>
                  {erected && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
                  {!erected && !gate.ok && <span style={{ fontSize:9 }}>🔒</span>}
                </div>
                <span className="mono" style={{ fontWeight:600, fontSize:12, width:80, color: erected ? '#34d399' : gate.ok ? '#dc2626' : '#555' }}>{p.mark}</span>
                <span style={{ flex:1, fontSize:11, color:'var(--muted)' }}>{p.description}</span>
                <span className="mono" style={{ fontSize:10, color:'var(--dim)' }}>{p.weight} kg</span>
                {!erected && !gate.ok && <span style={{ fontSize:9, color:'#f97066', whiteSpace:'nowrap' }}>{gate.reason}</span>}
              </div>
            );
          })}
          {parts.length === 0 && <p style={{fontSize:11,color:'var(--dim)',padding:12,textAlign:'center'}}>No parts yet</p>}
        </div>
      )}

      {/* Erection Entry Modal */}
      {erectModal && typeof document !== 'undefined' && ReactDOM.createPortal((
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(4px)' }}>
          <ErectEntryModal part={erectModal} onConfirm={function(date, erector, crew) {
            db.erectMark({ project_id:project.id, part_id:erectModal.id, erection_date:date,
              erector_name:erector, crew_size:parseInt(crew)||1, created_by:auth.user.id }).then(function(){
              db.logActivity({ project_id:project.id, action_type:'erect_toggle', details:erectModal.mark+' ERECTED by '+erector+' crew:'+crew,
                user_name:auth.userName, user_role:auth.role }).then(function(){ setErectModal(null); loadAll(); });
            });
          }} onCancel={function(){ setErectModal(null); }} />
        </div>
      ), document.body)}

      {subTab === 'daily' && (
        <div className="glass-card" style={{ padding:16, borderLeft:'3px solid #38bdf8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:16 }}>📅</span>
            <span className="mono" style={{ fontSize:13, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>DAILY ERECTION LOG</span>
            <span className="badge" style={{ background:'rgba(56,189,248,0.15)', color:'#38bdf8', marginLeft:'auto' }}>{erectionRecords.length} records</span>
          </div>
          {erectionRecords.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Mark</th><th>Type</th><th>Weight</th><th>Erector</th><th>Crew</th></tr></thead>
              <tbody>
                {erectionRecords.map(function(r) {
                  return (
                    <tr key={r.id}>
                      <td className="mono" style={{ color:'var(--muted)' }}>{r.erection_date}</td>
                      <td><span className="mono" style={{ fontWeight:600, color:'#34d399' }}>{r.parts?.mark || '?'}</span></td>
                      <td style={{ fontSize:10, color:'var(--dim)' }}>{r.parts?.description || r.parts?.category || ''}</td>
                      <td className="mono" style={{ fontSize:10 }}>{r.parts?.weight || 0} kg</td>
                      <td style={{ color:'var(--muted)' }}>{r.erector_name || '—'}</td>
                      <td className="mono" style={{ textAlign:'center' }}>{r.crew_size || 1}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign:'center', padding:20 }}>
              <div style={{ fontSize:30, marginBottom:8 }}>📅</div>
              <p style={{ fontSize:12, color:'var(--dim)' }}>No erection records yet</p>
            </div>
          )}
        </div>
      )}

      {subTab === '3d' && <IFC3DReal project={project} parts={parts} auth={auth} erectedPartIds={erectedPartIds} dispatchedPartIds={dispatchedPartIds} onChanged={loadAll} />}
      {subTab === 'ifc' && <IFCUploadSection project={project} parts={parts} auth={auth} canManage={canManage} onChanged={loadAll} />}

      {subTab === 'snags' && <SnagSection project={project} snags={snags} auth={auth} canManage={canManage} onChanged={loadAll} />}
      {subTab === 'safety' && <SafetySection project={project} safety={safety} auth={auth} canManage={canManage} onChanged={loadAll} />}
      {subTab === 'bolts' && <BoltSection project={project} bolts={bolts} auth={auth} canManage={canManage} onChanged={loadAll} />}
    </div>
  );
}

function SnagSection({ project, snags, auth, canManage, onChanged }) {
  var [showAdd, setShowAdd] = useState(false);
  var [form, setForm] = useState({ description:'', location_mark:'', severity:'Minor' });
  function set(f,v) { setForm(function(prev){ var n=Object.assign({},prev); n[f]=v; return n; }); }

  async function handleAdd() {
    if (!form.description.trim()) return;
    await db.addSnag(Object.assign({}, form, { project_id: project.id, created_by: auth.user.id }));
    await db.logActivity({ project_id: project.id, action_type: 'snag_add', details: 'Snag: ' + form.description + ' (' + form.severity + ')', user_name: auth.userName, user_role: auth.role });
    setForm({ description:'', location_mark:'', severity:'Minor' }); setShowAdd(false); onChanged();
  }

  var sevColors = { Critical:'#dc2626', Major:'#f59e0b', Minor:'#38bdf8' };
  var sevIcons = { Critical:'🔴', Major:'🟡', Minor:'🔵' };
  var statColors = { Open:'#dc2626', 'In Progress':'#f59e0b', Closed:'#34d399' };

  return (
    <div className="glass-card" style={{ padding:16, borderLeft:'3px solid #f97066' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>⚠</span>
          <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>SNAG LOG</span>
        </div>
        {canManage && <button onClick={function(){setShowAdd(!showAdd)}} className="btn-outline" style={{fontSize:10,color:'#f97066',borderColor:'#f97066'}}>+ Add Snag</button>}
      </div>
      {showAdd && (
        <div style={{ padding:12, background:'rgba(10,10,15,0.5)', borderRadius:8, marginBottom:10 }}>
          <input value={form.description} onChange={function(e){set('description',e.target.value)}} placeholder="Description" style={{marginBottom:6}} />
          <div style={{display:'flex',gap:6}}>
            <input value={form.location_mark} onChange={function(e){set('location_mark',e.target.value)}} placeholder="Location/Mark" style={{flex:1}} />
            <select value={form.severity} onChange={function(e){set('severity',e.target.value)}} style={{width:100}}>
              <option>Critical</option><option>Major</option><option>Minor</option>
            </select>
          </div>
          <button onClick={handleAdd} className="btn-red" style={{marginTop:8,padding:'6px 14px',fontSize:10}}>✓ Save Snag</button>
        </div>
      )}
      {snags.map(function(s) {
        return (
          <div key={s.id} style={{ padding:'8px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12 }}>{sevIcons[s.severity]}</span>
                <span style={{ fontSize:12 }}>{s.description}</span>
              </div>
              <div style={{display:'flex',gap:4}}>
                <span className="badge" style={{ background:sevColors[s.severity]+'22', color:sevColors[s.severity] }}>{s.severity}</span>
                {canManage ? (
                  <select value={s.status} onChange={function(e){ db.updateSnag(s.id,{status:e.target.value}).then(onChanged); }}
                    style={{ width:90, fontSize:10, padding:'2px 4px', color:statColors[s.status] }}>
                    <option>Open</option><option>In Progress</option><option>Closed</option>
                  </select>
                ) : <span className="badge" style={{ background:statColors[s.status]+'22', color:statColors[s.status] }}>{s.status}</span>}
              </div>
            </div>
          </div>
        );
      })}
      {snags.length === 0 && <p style={{fontSize:11,color:'var(--dim)',padding:12,textAlign:'center'}}>No snags recorded ✨</p>}
    </div>
  );
}

function SafetySection({ project, safety, auth, canManage, onChanged }) {
  var today = new Date().toISOString().split('T')[0];
  var todayCheck = safety.find(function(s){ return s.check_date === today; });
  var items = todayCheck ? (typeof todayCheck.items === 'string' ? JSON.parse(todayCheck.items) : todayCheck.items) : {};

  async function toggleItem(idx) {
    if (!canManage) return;
    var newItems = Object.assign({}, items); newItems[idx] = !newItems[idx];
    await db.upsertSafetyCheck({ project_id: project.id, check_date: today, items: newItems, created_by: auth.user.id });
    onChanged();
  }

  var passed = SAFETY_ITEMS.filter(function(_,i){ return items[i]; }).length;

  return (
    <div className="glass-card" style={{ padding:16, borderLeft:'3px solid ' + (passed === 10 ? '#34d399' : '#f59e0b') }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>🦺</span>
          <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>SAFETY — {today}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <ProgressRing pct={Math.round(passed/10*100)} color={passed === 10 ? '#34d399' : '#f59e0b'} size={40} />
          <span className="mono" style={{ fontSize:13, fontWeight:700, color: passed === 10 ? '#34d399' : '#f59e0b' }}>{passed}/10</span>
        </div>
      </div>
      {SAFETY_ITEMS.map(function(item, i) {
        var checked = !!items[i];
        return (
          <div key={i} onClick={function(){ toggleItem(i); }} style={{
            display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(42,42,58,0.2)', cursor: canManage ? 'pointer' : 'default'
          }}>
            <div style={{ width:20, height:20, borderRadius:4, border: checked ? '2px solid #34d399' : '2px solid var(--border)',
              background: checked ? '#34d399' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
              {checked && <span style={{color:'white',fontSize:11,fontWeight:700}}>✓</span>}
            </div>
            <span style={{ fontSize:12, color: checked ? 'var(--text)' : 'var(--muted)', transition:'color 0.2s' }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
}

function BoltSection({ project, bolts, auth, canManage, onChanged }) {
  var [zone, setZone] = useState('');
  var [installed, setInstalled] = useState('');
  var [torqued, setTorqued] = useState('');

  async function handleAdd() {
    if (!zone.trim()) return;
    await db.upsertBoltRecord({ project_id: project.id, zone: zone, installed: parseInt(installed) || 0, torqued: parseInt(torqued) || 0, created_by: auth.user.id });
    await db.logActivity({ project_id: project.id, action_type: 'bolt_entry', details: 'Bolts ' + zone + ': ' + installed + ' installed, ' + torqued + ' torqued', user_name: auth.userName, user_role: auth.role });
    setZone(''); setInstalled(''); setTorqued(''); onChanged();
  }

  var totalInstalled = bolts.reduce(function(a,b){ return a+b.installed; }, 0);
  var totalTorqued = bolts.reduce(function(a,b){ return a+b.torqued; }, 0);
  var totalPct = totalInstalled > 0 ? Math.round(totalTorqued/totalInstalled*100) : 0;

  return (
    <div className="glass-card" style={{ padding:16, borderLeft:'3px solid #06b6d4' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>🔩</span>
          <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>BOLT TRACKING</span>
        </div>
        {bolts.length > 0 && <ProgressRing pct={totalPct} color="#06b6d4" size={44} />}
      </div>
      {canManage && (
        <div style={{ display:'flex', gap:6, marginBottom:12, alignItems:'flex-end' }}>
          <div style={{flex:1}}><label className="mono" style={{fontSize:8,color:'var(--dim)'}}>ZONE</label><input value={zone} onChange={function(e){setZone(e.target.value)}} placeholder="Zone name" /></div>
          <div style={{width:90}}><label className="mono" style={{fontSize:8,color:'var(--dim)'}}>INSTALLED</label><input type="number" value={installed} onChange={function(e){setInstalled(e.target.value)}} placeholder="0" /></div>
          <div style={{width:90}}><label className="mono" style={{fontSize:8,color:'var(--dim)'}}>TORQUED</label><input type="number" value={torqued} onChange={function(e){setTorqued(e.target.value)}} placeholder="0" /></div>
          <button onClick={handleAdd} className="btn-red" style={{padding:'8px 12px',fontSize:10,height:36}}>+ Add</button>
        </div>
      )}
      {bolts.map(function(b) {
        var pct = b.installed > 0 ? Math.round(b.torqued / b.installed * 100) : 0;
        var barColor = pct >= 90 ? '#34d399' : pct >= 70 ? '#f59e0b' : '#dc2626';
        return (
          <div key={b.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
            <span className="mono" style={{ width:80, fontSize:12, fontWeight:600 }}>{b.zone}</span>
            <div style={{ flex:1, height:8, background:'rgba(20,20,30,0.8)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:pct+'%', height:'100%', background:barColor, borderRadius:4, transition:'width 0.5s', boxShadow:'0 0 6px ' + barColor + '44' }} />
            </div>
            <span className="mono" style={{ fontSize:11, fontWeight:600, color:barColor, width:35, textAlign:'right' }}>{pct}%</span>
            <span className="mono" style={{ fontSize:9, color:'var(--dim)', width:60, textAlign:'right' }}>{b.torqued}/{b.installed}</span>
          </div>
        );
      })}
      {bolts.length === 0 && <p style={{fontSize:11,color:'var(--dim)',padding:12,textAlign:'center'}}>No bolt records yet</p>}
    </div>
  );
}

function IFCUploadSection({ project, parts, auth, canManage, onChanged }) {
  var [ifcMarks, setIfcMarks] = useState([]);
  var [loading, setLoading] = useState(true);
  var [parsing, setParsing] = useState(false);

  useEffect(function() { loadIfc(); }, [project.id]);
  async function loadIfc() {
    try { var data = await db.getIfcMarks(project.id); setIfcMarks(data || []); } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function handleIfcUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    setParsing(true);
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var text = ev.target.result;
        var lines = text.split('\n');
        var elements = {};
        var propSets = {};
        var relDefines = {};

        // Parse IFC STEP file
        lines.forEach(function(line) {
          line = line.trim();
          if (!line || line.charAt(0) !== '#') return;
          var eqIdx = line.indexOf('=');
          if (eqIdx < 0) return;
          var id = line.substring(0, eqIdx).trim();
          var rest = line.substring(eqIdx + 1).trim();

          if (rest.indexOf('IFCELEMENTASSEMBLY') >= 0) {
            elements[id] = { id: id, raw: rest };
          }
          if (rest.indexOf('IFCPROPERTYSINGLEVALUE') >= 0 && rest.indexOf('ASSEMBLY_POS') >= 0) {
            var valMatch = rest.match(/IFCTEXT\('([^']*)'\)/i) || rest.match(/IFCLABEL\('([^']*)'\)/i);
            if (valMatch) propSets[id] = valMatch[1];
          }
          if (rest.indexOf('IFCRELDEFINESBYPROPERTIES') >= 0) {
            var parts2 = rest.match(/\(([^)]+)\)/g);
            if (parts2 && parts2.length > 0) {
              relDefines[id] = { raw: rest };
            }
          }
        });

        // Extract marks from elements
        var extractedMarks = [];
        var markSet = {};

        // Method 1: From IFCPROPERTYSINGLEVALUE ASSEMBLY_POS
        Object.keys(propSets).forEach(function(psId) {
          var mark = propSets[psId];
          if (mark && !markSet[mark]) {
            markSet[mark] = true;
            extractedMarks.push({ ifc_element_id: psId, ifc_mark: mark, ifc_type: 'ASSEMBLY_POS' });
          }
        });

        // Method 2: From element names
        if (extractedMarks.length === 0) {
          Object.keys(elements).forEach(function(eId) {
            var raw = elements[eId].raw;
            var nameMatch = raw.match(/'([^']+)'/);
            if (nameMatch) {
              var mark = nameMatch[1];
              if (!markSet[mark]) {
                markSet[mark] = true;
                extractedMarks.push({ ifc_element_id: eId, ifc_mark: mark, ifc_type: 'ELEMENT_NAME' });
              }
            }
          });
        }

        if (extractedMarks.length === 0) { alert('No marks found in IFC file'); setParsing(false); return; }

        // Auto-match with existing parts
        var matched = 0;
        var ifcData = extractedMarks.map(function(em) {
          var normalizedMark = em.ifc_mark.trim().toUpperCase().replace(/[\s_-]/g, '');
          var matchedPart = parts.find(function(p) {
            var normalizedPartMark = p.mark.trim().toUpperCase().replace(/[\s_-]/g, '');
            return normalizedPartMark === normalizedMark;
          });
          if (matchedPart) matched++;
          return {
            project_id: project.id,
            ifc_element_id: em.ifc_element_id,
            ifc_mark: em.ifc_mark,
            ifc_type: em.ifc_type,
            part_id: matchedPart ? matchedPart.id : null,
            matched: !!matchedPart
          };
        });

        await db.clearIfcMarks(project.id);
        await db.upsertIfcMarks(ifcData);
        try { await db.uploadIfcFile(project.id, file); } catch(upErr) { console.warn('Storage upload failed:', upErr); }
        await db.logActivity({ project_id: project.id, action_type: 'ifc_upload',
          details: 'IFC uploaded: ' + extractedMarks.length + ' elements, ' + matched + ' matched',
          user_name: auth.userName, user_role: auth.role });
        loadIfc();
        alert('IFC parsed: ' + extractedMarks.length + ' marks found, ' + matched + ' auto-matched');
      } catch(err) { alert('Error parsing IFC: ' + err.message); }
      setParsing(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function manualMatch(ifcId, partId) {
    try {
      await db.updateIfcMapping(ifcId, partId);
      loadIfc();
    } catch(e) { alert(e.message); }
  }

  var matchedCount = ifcMarks.filter(function(m){ return m.matched; }).length;
  var unmatchedCount = ifcMarks.length - matchedCount;

  if (loading) return <div style={{textAlign:'center',padding:20,color:'var(--dim)'}}>Loading IFC data...</div>;

  return (
    <div className="glass-card" style={{ padding:16, borderLeft:'3px solid #a78bfa' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>📄</span>
          <span className="mono" style={{ fontSize:13, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>IFC MARK MATCHING</span>
        </div>
        {auth.isPM && (
          <label className="btn-outline" style={{ cursor:'pointer', color:'#a78bfa', borderColor:'#a78bfa', fontSize:10 }}>
            {parsing ? 'Parsing...' : '📁 Upload IFC'}
            <input type="file" accept=".ifc" onChange={handleIfcUpload} disabled={parsing} style={{ display:'none' }} />
          </label>
        )}
      </div>

      {ifcMarks.length > 0 && (
        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          <div className="glass-card" style={{ padding:10, flex:1, textAlign:'center' }}>
            <div className="mono" style={{ fontSize:18, fontWeight:700, color:'#a78bfa' }}>{ifcMarks.length}</div>
            <div style={{ fontSize:8, color:'var(--dim)' }}>TOTAL</div>
          </div>
          <div className="glass-card" style={{ padding:10, flex:1, textAlign:'center' }}>
            <div className="mono" style={{ fontSize:18, fontWeight:700, color:'#34d399' }}>{matchedCount}</div>
            <div style={{ fontSize:8, color:'var(--dim)' }}>MATCHED</div>
          </div>
          <div className="glass-card" style={{ padding:10, flex:1, textAlign:'center' }}>
            <div className="mono" style={{ fontSize:18, fontWeight:700, color: unmatchedCount > 0 ? '#f97066' : '#34d399' }}>{unmatchedCount}</div>
            <div style={{ fontSize:8, color:'var(--dim)' }}>UNMATCHED</div>
          </div>
        </div>
      )}

      {/* Unmatched marks first */}
      {ifcMarks.filter(function(m){ return !m.matched; }).map(function(m) {
        return (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
            <span style={{ fontSize:10, color:'#f97066' }}>❌</span>
            <span className="mono" style={{ fontSize:11, fontWeight:600, color:'#f97066', flex:1 }}>{m.ifc_mark}</span>
            {auth.isPM && (
              <select onChange={function(e){ if(e.target.value) manualMatch(m.id, e.target.value); }}
                style={{ width:140, fontSize:10, padding:'3px 6px', color:'var(--muted)' }}>
                <option value="">Map to...</option>
                {parts.map(function(p) { return <option key={p.id} value={p.id}>{p.mark} ({p.category})</option>; })}
              </select>
            )}
          </div>
        );
      })}

      {/* Matched marks */}
      {ifcMarks.filter(function(m){ return m.matched; }).map(function(m) {
        var matchedPart = parts.find(function(p){ return p.id === m.part_id; });
        return (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:'1px solid rgba(42,42,58,0.15)' }}>
            <span style={{ fontSize:10, color:'#34d399' }}>✅</span>
            <span className="mono" style={{ fontSize:11, color:'#34d399' }}>{m.ifc_mark}</span>
            <span style={{ fontSize:10, color:'var(--dim)' }}>→ {matchedPart ? matchedPart.mark : '?'}</span>
          </div>
        );
      })}

      {ifcMarks.length === 0 && (
        <div style={{ textAlign:'center', padding:20 }}>
          <div style={{ fontSize:30, marginBottom:8 }}>📄</div>
          <p style={{ fontSize:12, color:'var(--dim)' }}>No IFC file uploaded yet</p>
          <p style={{ fontSize:10, color:'var(--dim)', marginTop:4 }}>Upload a .ifc file exported from Tekla to auto-match marks</p>
        </div>
      )}
    </div>
  );
}

function ErectEntryModal({ part, onConfirm, onCancel }) {
  var [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  var [erector, setErector] = useState('');
  var [crew, setCrew] = useState('1');

  return (
    <div className="glass-card animate-fade" style={{ padding:24, maxWidth:380, width:'90%', borderLeft:'3px solid #f472b6' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <span style={{ fontSize:18 }}>🏗</span>
        <h3 className="mono" style={{ fontSize:14, color:'#f472b6' }}>Erect: {part.mark}</h3>
      </div>
      <div style={{ fontSize:11, color:'var(--dim)', marginBottom:12 }}>
        {part.description} · {part.weight} kg · {part.category}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div>
          <label className="mono" style={{fontSize:8,color:'var(--muted)',letterSpacing:1}}>DATE</label>
          <input type="date" value={date} onChange={function(e){setDate(e.target.value)}} />
        </div>
        <div>
          <label className="mono" style={{fontSize:8,color:'var(--muted)',letterSpacing:1}}>ERECTOR NAME</label>
          <input value={erector} onChange={function(e){setErector(e.target.value)}} placeholder="Erector name" />
        </div>
        <div>
          <label className="mono" style={{fontSize:8,color:'var(--muted)',letterSpacing:1}}>CREW SIZE</label>
          <input type="number" min="1" value={crew} onChange={function(e){setCrew(e.target.value)}} />
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:16 }}>
        <button onClick={onCancel} className="btn-outline" style={{ flex:1 }}>Cancel</button>
        <button onClick={function(){ if(!erector.trim()){ alert('Enter erector name'); return; } onConfirm(date, erector, parseInt(crew)||1); }} className="btn-red" style={{ flex:1 }}>✓ Erect</button>
      </div>
    </div>
  );
}

function DispatchCreateForm({ project, auth, form, set, saving, handleCreate, onCancel, dispatchParts, setDispatchParts, otherItems, setOtherItems }) {
  var [parts, setParts] = useState([]);
  var [search, setSearch] = useState('');
  var [catFilter, setCatFilter] = useState('all');

  var [dispatchedQty, setDispatchedQty] = useState({});
  useEffect(function() {
    Promise.all([db.getParts(project.id), db.getDispatches(project.id)]).then(function(res) {
      setParts(res[0] || []);
      var dqty = {};
      (res[1] || []).forEach(function(d) {
        if (d.dispatch_parts) {
          d.dispatch_parts.forEach(function(dp) {
            if (!dqty[dp.part_id]) dqty[dp.part_id] = 0;
            dqty[dp.part_id] += dp.qty;
          });
        }
      });
      setDispatchedQty(dqty);
    });
  }, []);

  function addPart(part) {
    var existing = dispatchParts.find(function(dp){ return dp.part_id === part.id; });
    if (existing) return;
    var remaining = part.qty - (dispatchedQty[part.id] || 0);
    if (remaining <= 0) return;
    setDispatchParts(function(prev){ return prev.concat([{ part_id: part.id, mark: part.mark, category: part.category, qty: remaining, weight: part.weight }]); });
  }

  function removePart(partId) {
    setDispatchParts(function(prev){ return prev.filter(function(dp){ return dp.part_id !== partId; }); });
  }

  function updateQty(partId, qty) {
    setDispatchParts(function(prev){ return prev.map(function(dp){ if(dp.part_id === partId){ return Object.assign({}, dp, {qty: parseInt(qty)||0}); } return dp; }); });
  }

  var filteredParts = parts.filter(function(p) {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (search && p.mark.toLowerCase().indexOf(search.toLowerCase()) < 0) return false;
    return true;
  });

  var totalPcs = dispatchParts.reduce(function(a,dp){ return a + dp.qty; }, 0);
  var totalWt = dispatchParts.reduce(function(a,dp){ return a + (dp.weight * dp.qty); }, 0);

  var CAT_LABELS_SHORT = { anchor_bolts:'AB', builtup:'BU', coldform:'CF', hardware:'HW', roofing:'RF', cladding:'CL', accessories:'AC', deck:'DK' };

  return (
    <div className="glass-card animate-fade" style={{ padding:16, marginBottom:12, borderLeft:'3px solid #38bdf8' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:16 }}>🚚</span>
        <span className="mono" style={{ fontWeight:600, fontSize:12 }}>New Dispatch</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[['vehicle_no','Vehicle No *'],['challan_no','Challan No'],['driver_name','Driver Name'],['driver_phone','Driver Phone'],['net_weight','Net Weight (MT)'],['loading_by','Loading By']].map(function(f) {
          return (<div key={f[0]}><label className="mono" style={{fontSize:8,color:'var(--muted)',textTransform:'uppercase'}}>{f[1]}</label><input value={form[f[0]]} onChange={function(e){set(f[0],e.target.value)}} placeholder={f[1]} /></div>);
        })}
      </div>

      {/* Parts Picker */}
      <div style={{ marginTop:12, padding:12, background:'rgba(10,10,15,0.5)', borderRadius:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:1 }}>SELECT PARTS</span>
          {dispatchParts.length > 0 && <span className="mono" style={{ fontSize:10, color:'#38bdf8' }}>{totalPcs} pcs · {(totalWt/1000).toFixed(2)} MT</span>}
        </div>
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          <input value={search} onChange={function(e){setSearch(e.target.value)}} placeholder="Search mark..." style={{ flex:1, fontSize:10, padding:'4px 8px' }} />
          <select value={catFilter} onChange={function(e){setCatFilter(e.target.value)}} style={{ width:80, fontSize:10, padding:'4px' }}>
            <option value="all">All</option>
            <option value="builtup">Builtup</option>
            <option value="coldform">Coldform</option>
            <option value="hardware">Hardware</option>
            <option value="roofing">Roofing</option>
            <option value="cladding">Cladding</option>
            <option value="accessories">Acc</option>
            <option value="deck">Deck</option>
            <option value="anchor_bolts">AB</option>
          </select>
        </div>
        {/* Available parts */}
        <div style={{ maxHeight:300, overflowY:'auto', marginBottom:8 }}>
          {filteredParts.filter(function(p) {
            var remaining = p.qty - (dispatchedQty[p.id] || 0);
            return remaining > 0;
          }).map(function(p) {
            var alreadyAdded = dispatchParts.some(function(dp){ return dp.part_id === p.id; });
            var remaining = p.qty - (dispatchedQty[p.id] || 0);
            return (
              <div key={p.id} onClick={function(){ if(!alreadyAdded) addPart(p); }} style={{
                display:'flex', alignItems:'center', gap:6, padding:'3px 0', cursor: alreadyAdded ? 'default' : 'pointer',
                opacity: alreadyAdded ? 0.4 : 1, borderBottom:'1px solid rgba(42,42,58,0.15)'
              }}>
                <span className="mono" style={{ fontSize:10, fontWeight:600, width:70 }}>{p.mark}</span>
                <span className="badge" style={{ fontSize:7, background:'rgba(56,189,248,0.1)', color:'#38bdf8' }}>{CAT_LABELS_SHORT[p.category] || p.category}</span>
                <span style={{ flex:1, fontSize:9, color:'var(--dim)' }}>bal:{remaining}/{p.qty} · {p.weight}kg</span>
                {!alreadyAdded && <span style={{ fontSize:10, color:'#34d399' }}>+ Add</span>}
              </div>
            );
          })}
        </div>
        {/* Selected parts */}
        {dispatchParts.length > 0 && (
          <div>
            <span className="mono" style={{ fontSize:9, color:'#34d399', letterSpacing:1 }}>SELECTED ({dispatchParts.length})</span>
            {dispatchParts.map(function(dp) {
              return (
                <div key={dp.part_id} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 0', borderBottom:'1px solid rgba(42,42,58,0.15)' }}>
                  <span className="mono" style={{ fontSize:10, fontWeight:600, color:'#34d399', width:70 }}>{dp.mark}</span>
                  <input type="number" min="1" max={dp.qty} value={dp.qty} onChange={function(e){ var v=parseInt(e.target.value)||0; var maxQ = dp.qty; if(v>maxQ)v=maxQ; if(v<0)v=0; updateQty(dp.part_id, v); }}
                    style={{ width:45, fontSize:10, padding:'2px 4px', textAlign:'center' }} />
                  <span style={{ flex:1, fontSize:9, color:'var(--dim)' }}>{dp.weight}kg ea</span>
                  <button onClick={function(){ removePart(dp.part_id); }} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:12 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo URLs */}
      <div style={{ marginTop:12 }}>
        <span className="mono" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1 }}>PHOTO LINKS</span>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:4 }}>
          <div><label className="mono" style={{fontSize:8,color:'var(--muted)',textTransform:'uppercase'}}>Weight Slip URL</label><input value={form.weight_slip_url} onChange={function(e){set('weight_slip_url',e.target.value)}} placeholder="Paste link to weight slip photo" /></div>
          <div><label className="mono" style={{fontSize:8,color:'var(--muted)',textTransform:'uppercase'}}>Challan Photo URL</label><input value={form.challan_url} onChange={function(e){set('challan_url',e.target.value)}} placeholder="Paste link to challan photo" /></div>
        </div>
      </div>

      {/* Other Items */}
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span className="mono" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1 }}>OTHER ITEMS</span>
          <button onClick={function(){ setOtherItems(function(prev){ return prev.concat([{ name:'', qty:'', unit:'pcs' }]); }); }} className="btn-outline" style={{ fontSize:9, padding:'3px 8px' }}>+ Add Item</button>
        </div>
        {(otherItems || []).map(function(item, i) {
          return (
            <div key={i} style={{ display:'flex', gap:6, marginBottom:4, alignItems:'center' }}>
              <input value={item.name} onChange={function(e){ setOtherItems(function(prev){ var n=prev.slice(); n[i]=Object.assign({},n[i],{name:e.target.value}); return n; }); }} placeholder="Item name" style={{ flex:2, fontSize:10, padding:'4px 6px' }} />
              <input type="number" value={item.qty} onChange={function(e){ setOtherItems(function(prev){ var n=prev.slice(); n[i]=Object.assign({},n[i],{qty:e.target.value}); return n; }); }} placeholder="Qty" style={{ width:50, fontSize:10, padding:'4px 6px', textAlign:'center' }} />
              <select value={item.unit} onChange={function(e){ setOtherItems(function(prev){ var n=prev.slice(); n[i]=Object.assign({},n[i],{unit:e.target.value}); return n; }); }} style={{ width:60, fontSize:10, padding:'4px' }}>
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
                <option value="rolls">rolls</option>
                <option value="ltrs">ltrs</option>
                <option value="boxes">boxes</option>
                <option value="sets">sets</option>
                <option value="nos">nos</option>
                <option value="rmt">rmt</option>
              </select>
              <button onClick={function(){ setOtherItems(function(prev){ return prev.filter(function(_,j){return j!==i;}); }); }} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:12 }}>x</button>
            </div>
          );
        })}
      </div>

      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button onClick={handleCreate} disabled={saving} className="btn-red" style={{padding:'8px 16px'}}>{saving ? 'Creating...' : '✓ Create Dispatch'}</button>
        <button onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </div>
  );
}

// ----- Public exports -----
export {
  FabTab,
  DispatchTab,
  ErectionTab,
  CreateProjectForm,
};
