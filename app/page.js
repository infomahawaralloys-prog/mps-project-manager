'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import * as db from '../lib/database';

var STAGES = ['cutting','fitting','qc','welding','grinding','painting','dispatch','erection'];
var STAGE_LABELS = { cutting:'Cutting', fitting:'Fitting', qc:'QC', welding:'Welding', grinding:'Grinding', painting:'Painting', dispatch:'Dispatch', erection:'Erection' };
var STAGE_ICONS = { cutting:'✂', fitting:'🔧', qc:'✅', welding:'⚡', grinding:'💎', painting:'🎨', dispatch:'🚚', erection:'🏗' };
var STAGE_COLORS = { cutting:'#fb923c', fitting:'#f59e0b', qc:'#a78bfa', welding:'#f97066', grinding:'#818cf8', painting:'#34d399', dispatch:'#38bdf8', erection:'#f472b6' };
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
        <span className="mono" style={{ fontSize: sz > 50 ? 14 : 10, fontWeight:700, color:color }}>{pct}%</span>
        {label && <span className="mono" style={{ fontSize:7, color:'var(--dim)', marginTop:1 }}>{label}</span>}
      </div>
    </div>
  );
}

function StageBar({ label, pct, color, icon }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'3px 0' }}>
      <span style={{ fontSize:12, width:16, textAlign:'center' }}>{icon}</span>
      <span className="mono" style={{ width:70, fontSize:10, fontWeight:600, color:color }}>{label}</span>
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

export default function App() {
  var auth = useAuth();
  var router = useRouter();
  var [view, setView] = useState('list');
  var [projects, setProjects] = useState([]);
  var [selectedProject, setSelectedProject] = useState(null);
  var [loading, setLoading] = useState(true);
  var [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(function() { if (!auth.loading && !auth.user) router.push('/login'); }, [auth.user, auth.loading]);
  useEffect(function() { if (auth.user) loadProjects(); }, [auth.user]);

  async function loadProjects() {
    try { var data = await db.getProjects(); setProjects(data || []); } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (auth.loading || !auth.user) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ width:40, height:40, border:'3px solid #2a2a3a', borderTop:'3px solid #dc2626', borderRadius:'50%' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh' }}>
      <div style={{ height:3, background:'linear-gradient(90deg, #dc2626, #f472b6, #dc2626)', backgroundSize:'200% 100%' }} className="animate-shimmer" />
      <Header auth={auth} onBack={view === 'detail' ? function() { setView('list'); setSelectedProject(null); } : null} project={selectedProject} />
      {view === 'list' ? (
        <ProjectList projects={projects} auth={auth} onOpen={function(p) { setSelectedProject(p); setView('detail'); }}
          showCreate={showCreateForm} setShowCreate={setShowCreateForm}
          onCreated={function() { loadProjects(); setShowCreateForm(false); }} />
      ) : (
        <ProjectDetail project={selectedProject} auth={auth}
          onUpdated={function(p) { setSelectedProject(p); loadProjects(); }} />
      )}
    </div>
  );
}

function Header({ auth, onBack, project }) {
  return (
    <div className="glass-card" style={{ margin:'12px 12px 0', padding:'10px 16px', display:'flex', alignItems:'center', gap:12 }}>
      {onBack && <button onClick={onBack} className="btn-outline" style={{ padding:'5px 10px', fontSize:11 }}>← Back</button>}
      <div className="animate-glow" style={{ width:38, height:38, borderRadius:'50%', border:'2px solid #dc2626',
        display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(10,10,15,0.9)', flexShrink:0 }}>
        <span className="mono" style={{ color:'#dc2626', fontWeight:700, fontSize:12 }}>MPS</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="mono" style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {project ? (project.project_no + (project.job_no ? ' / ' + project.job_no : '')) : 'MPS Project Manager'}
        </div>
        <div style={{ fontSize:10, color:'var(--dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {project ? [project.location, project.poc_name, project.poc_phone].filter(Boolean).join(' · ') :
            auth.userName + ' · ' + auth.role.toUpperCase() + ' · ' + 'Mahawar Prefab Solutions'}
        </div>
      </div>
      <button onClick={auth.signOut} className="btn-outline" style={{ fontSize:10, padding:'5px 12px' }}>Logout</button>
    </div>
  );
}

function ProjectList({ projects, auth, onOpen, showCreate, setShowCreate, onCreated }) {
  var active = projects.filter(function(p){return p.status==='Active'});
  var hold = projects.filter(function(p){return p.status==='Hold'});
  var completed = projects.filter(function(p){return p.status==='Completed'});

  return (
    <div style={{ padding:'12px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'8px 0 16px' }}>
        <div>
          <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2 }}>ACTIVE PROJECTS ({active.length})</span>
          {(hold.length > 0 || completed.length > 0) && (
            <span style={{ fontSize:10, color:'var(--dim)', marginLeft:12 }}>
              {hold.length > 0 && hold.length + ' on hold'}{hold.length > 0 && completed.length > 0 && ' · '}{completed.length > 0 && completed.length + ' completed'}
            </span>
          )}
        </div>
        {auth.isPM && (
          <button onClick={function() { setShowCreate(!showCreate); }} className="btn-red" style={{ padding:'8px 16px', fontSize:11 }}>
            + New Project
          </button>
        )}
      </div>
      {showCreate && <CreateProjectForm auth={auth} onCreated={onCreated} onCancel={function(){ setShowCreate(false); }} />}
      {projects.map(function(p, idx) {
        var statusColor = p.status === 'Active' ? '#34d399' : p.status === 'Hold' ? '#f59e0b' : '#8888aa';
        return (
          <div key={p.id} className="glass-card animate-fade" style={{ padding:'14px 16px', marginBottom:8, cursor:'pointer', transition:'all 0.2s', borderLeft:'3px solid ' + statusColor }}
            onClick={function() { onOpen(p); }}
            onMouseEnter={function(e){ e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.transform = 'translateX(4px)'; }}
            onMouseLeave={function(e){ e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = statusColor; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:statusColor+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:14 }}>📋</span>
                </div>
                <div>
                  <span className="mono" style={{ fontWeight:700, fontSize:15 }}>{p.project_no}</span>
                  {p.job_no && <span className="mono" style={{ color:'var(--dim)', marginLeft:6, fontSize:12 }}>/ {p.job_no}</span>}
                </div>
              </div>
              <span className="badge" style={{ background: statusColor+'22', color: statusColor }}>{p.status}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:6, paddingLeft:42 }}>
              {[p.location, p.poc_name, p.poc_phone].filter(Boolean).join(' · ') || 'No details added'}
            </div>
          </div>
        );
      })}
      {projects.length === 0 && !showCreate && (
        <div className="glass-card" style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <p className="mono" style={{ fontSize:14, color:'var(--muted)' }}>No projects yet</p>
          {auth.isPM && <p style={{ fontSize:12, color:'var(--dim)', marginTop:8 }}>Click "+ New Project" to get started</p>}
        </div>
      )}
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

function ProjectDetail({ project, auth, onUpdated }) {
  var [tab, setTab] = useState('info');
  var canSeeTab = function(t) {
    if (auth.isPM || auth.isViewer) return true;
    if (t === 'fab') return auth.isFab;
    if (t === 'dispatch') return auth.isDispatch;
    if (t === 'erection') return auth.isSite;
    return t === 'info';
  };
  var tabs = [
    { id:'info', label:'📋 Info' }, { id:'fab', label:'🔧 Fabrication' },
    { id:'dispatch', label:'🚚 Dispatch' }, { id:'erection', label:'🏗 Erection' },
  ].filter(function(t) { return canSeeTab(t.id); });

  useEffect(function() { if (!canSeeTab(tab) && tabs.length > 0) setTab(tabs[0].id); }, [auth.role]);

  return (
    <div style={{ padding:'0 12px 24px', maxWidth:1000, margin:'0 auto' }}>
      <div className="tab-bar" style={{ margin:'12px 0 16px', overflowX:'auto' }}>
        {tabs.map(function(t) {
          return (<div key={t.id} className={'tab-item' + (tab === t.id ? ' active' : '')} onClick={function() { setTab(t.id); }}>{t.label}</div>);
        })}
      </div>
      {tab === 'info' && <InfoTab project={project} auth={auth} onUpdated={onUpdated} />}
      {tab === 'fab' && <FabTab project={project} auth={auth} />}
      {tab === 'dispatch' && <DispatchTab project={project} auth={auth} />}
      {tab === 'erection' && <ErectionTab project={project} auth={auth} />}
    </div>
  );
}

function InfoTab({ project, auth, onUpdated }) {
  var [drawings, setDrawings] = useState([]);
  var [logs, setLogs] = useState([]);
  var [editing, setEditing] = useState(false);
  var [form, setForm] = useState(Object.assign({}, project));

  useEffect(function() {
    db.getDrawings(project.id).then(setDrawings);
    db.getActivityLog(project.id, 30).then(setLogs);
  }, [project.id]);

  async function saveEdit() {
    try {
      var updated = await db.updateProject(project.id, form);
      await db.logActivity({ project_id: project.id, action_type: 'project_edit', details: 'Edited project details', user_name: auth.userName, user_role: auth.role });
      onUpdated(updated); setEditing(false);
    } catch (e) { alert(e.message); }
  }
  function set(field, val) { setForm(function(prev) { var n = Object.assign({}, prev); n[field] = val; return n; }); }

  return (
    <div className="animate-fade">
      {/* Project Info Card */}
      <div className="glass-card" style={{ padding:16, marginBottom:12, borderLeft:'3px solid #dc2626' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>📋</span>
            <span className="mono" style={{ fontWeight:600, fontSize:11, color:'var(--dim)', letterSpacing:2 }}>PROJECT INFO</span>
          </div>
          {auth.isPM && !editing && <button onClick={function(){ setEditing(true); setForm(Object.assign({}, project)); }} className="btn-outline" style={{padding:'4px 10px', fontSize:10}}>✏ Edit</button>}
        </div>
        {editing ? (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {['location','poc_name','poc_phone','paint_color','billing_address','shipping_address'].map(function(f) {
                return (<div key={f}><label className="mono" style={{fontSize:8,color:'var(--muted)',textTransform:'uppercase'}}>{f.replace(/_/g,' ')}</label><input value={form[f] || ''} onChange={function(e){set(f,e.target.value)}} /></div>);
              })}
            </div>
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button onClick={saveEdit} className="btn-red" style={{padding:'6px 16px', fontSize:11}}>✓ Save</button>
              <button onClick={function(){setEditing(false)}} className="btn-outline">Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:12 }}>
              {[
                { l:'Location', v:project.location, ic:'📍' },
                { l:'POC', v:project.poc_name, ic:'👤' },
                { l:'Phone', v:project.poc_phone, ic:'📞' },
                { l:'Paint', v:project.paint_color, ic:'🎨' },
                { l:'Billing', v:project.billing_address, ic:'🧾' },
                { l:'Shipping', v:project.shipping_address, ic:'📦' },
              ].filter(function(x){ return x.v; }).map(function(x, i) {
                return (
                  <div key={i} style={{ padding:'6px 8px', background:'rgba(10,10,15,0.5)', borderRadius:6 }}>
                    <span style={{ fontSize:10 }}>{x.ic}</span>
                    <span className="mono" style={{ fontSize:8, color:'var(--dim)', marginLeft:4 }}>{x.l}</span>
                    <div className="mono" style={{ fontSize:11, color:'var(--text)', marginTop:2 }}>{x.v}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {project.quotation_link && <a href={project.quotation_link} target="_blank" rel="noreferrer" className="badge" style={{background:'rgba(56,189,248,0.1)',color:'#38bdf8',textDecoration:'none',padding:'4px 10px'}}>📄 Quotation ↗</a>}
              {project.weight_excel_link && <a href={project.weight_excel_link} target="_blank" rel="noreferrer" className="badge" style={{background:'rgba(52,211,153,0.1)',color:'#34d399',textDecoration:'none',padding:'4px 10px'}}>📊 Weight Excel ↗</a>}
              {project.location_link && <a href={project.location_link} target="_blank" rel="noreferrer" className="badge" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b',textDecoration:'none',padding:'4px 10px'}}>📍 Location Map ↗</a>}
            </div>
          </div>
        )}
      </div>

      {/* Drawings */}
      <div className="glass-card" style={{ padding:16, marginBottom:12, borderLeft:'3px solid #34d399' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:16 }}>📐</span>
          <span className="mono" style={{ fontSize:11, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>DRAWINGS</span>
        </div>
        {DRAW_TYPES.map(function(type) {
          var d = drawings.find(function(dd){ return dd.drawing_type === type; });
          var st = d?.status || 'Not Started';
          var stColor = st === 'Approved' ? '#34d399' : st === 'Submitted' ? '#38bdf8' : st === 'In Progress' ? '#f59e0b' : st === 'Revised' ? '#a78bfa' : '#555';
          return (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
              <div style={{ width:6, height:6, borderRadius:3, background:stColor, flexShrink:0 }} />
              <span className="mono" style={{ width:90, fontWeight:600, fontSize:12, textTransform:'capitalize' }}>{type}</span>
              <span className="badge" style={{ background:stColor+'22', color:stColor }}>{st}</span>
              <span className="mono" style={{ fontSize:10, color:'var(--dim)' }}>R{d?.revision || 0}</span>
              {d?.link && <a href={d.link} target="_blank" rel="noreferrer" style={{ fontSize:10, color:'#38bdf8', textDecoration:'none' }}>View ↗</a>}
            </div>
          );
        })}
      </div>

      {/* Activity Log */}
      <div className="glass-card" style={{ padding:16, borderLeft:'3px solid #f59e0b' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:16 }}>📝</span>
          <span className="mono" style={{ fontSize:11, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>ACTIVITY LOG</span>
          <span className="badge" style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', marginLeft:'auto' }}>{logs.length} entries</span>
        </div>
        <div style={{ maxHeight:280, overflowY:'auto' }}>
          {logs.map(function(l) {
            var c = LOG_COLORS[l.action_type] || '#555';
            return (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
                <div style={{ width:4, height:20, borderRadius:2, background:c, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:11, lineHeight:1.3 }}>{l.details}</span>
                <span className="mono" style={{ fontSize:9, color:c, whiteSpace:'nowrap' }}>{l.user_name}</span>
                <span style={{ fontSize:9, color:'var(--dim)', whiteSpace:'nowrap' }}>{new Date(l.created_at).toLocaleDateString('en-IN')}</span>
              </div>
            );
          })}
          {logs.length === 0 && <p style={{ fontSize:11, color:'var(--dim)', padding:12, textAlign:'center' }}>No activity yet</p>}
        </div>
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

  useEffect(function() { loadData(); }, [project.id]);
  async function loadData() {
    setLoading(true);
    var [p, fs, w] = await Promise.all([db.getParts(project.id), db.getFabSummary(project.id), db.getWorkers(project.id)]);
    setParts(p || []); setFabSummary(fs || {}); setWorkers(w || []); setLoading(false);
  }

  async function handleBomUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var XLSX = (await import('xlsx')).default;
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        var sheetName = wb.SheetNames.find(function(s){ return s.toLowerCase().indexOf('shipping') >= 0; });
        if (sheetName) {
          XLSX.utils.sheet_to_json(wb.Sheets[sheetName]).forEach(function(r) {
            var mark = r['Assembly Pos'] || r['ASSEMBLY_POS'] || r['Mark'] || ''; if (!mark) return;
            newParts.push({ project_id: project.id, category:'builtup', mark: String(mark).trim(), description: r['Description'] || r['DESC'] || '', qty: parseInt(r['Qty'] || r['QTY'] || 1), weight: parseFloat(r['Weight'] || r['WT'] || 0) });
          });
        }
        ['PURLIN','GIRT','JAMB','HEADER'].forEach(function(prefix) {
          var sn = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf(prefix) >= 0; });
          if (sn) { XLSX.utils.sheet_to_json(wb.Sheets[sn]).forEach(function(r) { var mark = r['Mark'] || r['MARK'] || r['Assembly Pos'] || ''; if (!mark) return; newParts.push({ project_id: project.id, category:'coldform', mark: String(mark).trim(), description: r['Description'] || prefix, qty: parseInt(r['Qty'] || r['QTY'] || 1), weight: parseFloat(r['Weight'] || r['WT'] || 0) }); }); }
        });
        var hwSheet = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('HARDWARE') >= 0; });
        if (hwSheet) { XLSX.utils.sheet_to_json(wb.Sheets[hwSheet]).forEach(function(r) { var mark = r['Mark'] || r['Item'] || r['Description'] || ''; if (!mark) return; newParts.push({ project_id: project.id, category:'hardware', mark: String(mark).trim(), description: r['Description'] || '', qty: parseInt(r['Qty'] || r['QTY'] || 1), weight: parseFloat(r['Weight'] || r['WT'] || 0) }); }); }
        if (newParts.length === 0) { alert('No parts found in BOM'); return; }
        await db.deleteParts(project.id, 'builtup'); await db.deleteParts(project.id, 'coldform'); await db.deleteParts(project.id, 'hardware');
        await db.upsertParts(newParts);
        var counts = {}; newParts.forEach(function(p){ counts[p.category] = (counts[p.category]||0) + 1; });
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded BOM: ' + Object.keys(counts).map(function(k){ return counts[k] + ' ' + k; }).join(', '), user_name: auth.userName, user_role: auth.role });
        loadData();
      } catch (err) { alert('Error reading BOM: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }

  var catParts = parts.filter(function(p){ return p.category === selectedCat; });
  var builtupParts = parts.filter(function(p){ return p.category === 'builtup'; });
  var stageProgress = {};
  STAGES.forEach(function(s) { var total = 0, done = 0; builtupParts.forEach(function(p) { total += p.qty; done += (fabSummary[p.id] && fabSummary[p.id][s]) || 0; }); stageProgress[s] = total > 0 ? Math.round(done / total * 100) : 0; });

  var isBuiltup = selectedCat === 'builtup';
  var personField = STAGE_PERSONS[selectedStage];
  var canEnter = auth.isPM || auth.isFab;
  var pendingEntries = catParts.filter(function(p) { return (entries[p.id] || 0) > 0; });

  // Category-level progress
  var catProgress = {};
  CATEGORIES.forEach(function(cat) {
    var cp = parts.filter(function(p){ return p.category === cat; });
    var total = cp.reduce(function(a,p){ return a + p.qty; }, 0);
    var done = 0;
    cp.forEach(function(p) { var fs = fabSummary[p.id]; if (fs) { done += cat === 'builtup' ? (fs.erection || 0) : (fs.cutting || 0); } });
    catProgress[cat] = total > 0 ? Math.round(done / total * 100) : 0;
  });

  async function handleSave() {
    if (pendingEntries.length === 0) return;
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
      {/* Upload */}
      {auth.isPM && (
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <label className="btn-outline" style={{ cursor:'pointer', color:'#38bdf8', borderColor:'#38bdf8', display:'flex', alignItems:'center', gap:4 }}>
            📁 Upload BOM <input type="file" accept=".xlsx,.xls" onChange={handleBomUpload} style={{ display:'none' }} />
          </label>
        </div>
      )}

      {/* Category cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
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
            </div>
          );
        })}
      </div>

      {/* Stage pipeline */}
      {isBuiltup && (
        <div className="glass-card" style={{ padding:16, marginBottom:16, borderLeft:'3px solid #38bdf8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:14 }}>⚙️</span>
            <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>8-STAGE PIPELINE</span>
          </div>
          {/* Stage progress rings */}
          <div style={{ display:'flex', gap:4, marginBottom:12 }}>
            {STAGES.map(function(s) {
              var sel = selectedStage === s;
              return (
                <button key={s} onClick={function(){ setSelectedStage(s); }} style={{
                  flex:1, padding:'6px 2px', borderRadius:8, border: sel ? '1.5px solid ' + STAGE_COLORS[s] : '1px solid transparent',
                  background: sel ? STAGE_COLORS[s] + '15' : 'transparent', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4
                }}>
                  <ProgressRing pct={stageProgress[s]} color={STAGE_COLORS[s]} size={38} />
                  <span className="mono" style={{ fontSize:7, color: sel ? STAGE_COLORS[s] : 'var(--dim)' }}>{STAGE_LABELS[s]}</span>
                </button>
              );
            })}
          </div>
          {/* Stage bars */}
          {STAGES.map(function(s) {
            return <StageBar key={s} label={STAGE_LABELS[s]} pct={stageProgress[s]} color={STAGE_COLORS[s]} icon={STAGE_ICONS[s]} />;
          })}
        </div>
      )}

      {/* Parts table */}
      <div className="glass-card" style={{ padding:16, borderLeft:'3px solid ' + (STAGE_COLORS[selectedStage] || '#dc2626') }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>{isBuiltup ? STAGE_ICONS[selectedStage] : CAT_ICONS[selectedCat]}</span>
            <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>
              {isBuiltup ? STAGE_LABELS[selectedStage].toUpperCase() : ''} {CAT_LABELS[selectedCat].toUpperCase()} ({catParts.length})
            </span>
          </div>
          {canEnter && pendingEntries.length > 0 && (
            <button onClick={function(){ setShowConfirm(true); }} className="btn-red" style={{ padding:'6px 14px', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
              💾 Save ({pendingEntries.length})
            </button>
          )}
        </div>
        {catParts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px 20px' }}>
            <div style={{ fontSize:30, marginBottom:8 }}>{CAT_ICONS[selectedCat]}</div>
            <p style={{ fontSize:12, color:'var(--dim)' }}>No parts. {auth.isPM ? 'Upload a BOM to get started.' : ''}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Mark</th><th>Desc</th><th>Qty</th><th>Done</th><th>Bal</th>
              {isBuiltup && personField && <th>{personField}</th>}{canEnter && <th>Today</th>}</tr></thead>
            <tbody>
              {catParts.map(function(p) {
                var done = isBuiltup ? ((fabSummary[p.id] && fabSummary[p.id][selectedStage]) || 0) : ((fabSummary[p.id] && fabSummary[p.id]['cutting']) || 0);
                var bal = p.qty - done; var complete = bal <= 0;
                return (
                  <tr key={p.id} style={ complete ? { opacity:0.6 } : {} }>
                    <td><span className="mono" style={{ fontWeight:600, color: complete ? '#34d399' : '#dc2626' }}>{complete ? '✓ ' : ''}{p.mark}</span></td>
                    <td style={{ color:'var(--dim)', fontSize:11 }}>{p.description}</td>
                    <td className="mono">{p.qty}</td>
                    <td className="mono" style={{ color: complete ? '#34d399' : done > 0 ? '#f59e0b' : 'var(--dim)' }}>{done}</td>
                    <td className="mono" style={{ color: complete ? '#34d399' : 'var(--text)' }}>{complete ? '✓' : bal}</td>
                    {isBuiltup && personField && <td>{canEnter && !complete ? <input value={persons[p.id] || ''} onChange={function(e){ setPersons(function(prev){ var n=Object.assign({},prev); n[p.id]=e.target.value; return n; }); }} placeholder={personField} style={{ width:80, fontSize:10, padding:'2px 6px' }} /> : null}</td>}
                    {canEnter && <td>{!complete && <input type="number" min="0" max={bal} value={entries[p.id] || ''} onChange={function(e){ setEntries(function(prev){ var n=Object.assign({},prev); n[p.id]=parseInt(e.target.value)||0; return n; }); }} style={{ width:50, fontSize:12, padding:'2px 6px', textAlign:'center', borderColor: (entries[p.id] || 0) > 0 ? STAGE_COLORS[selectedStage] : 'var(--border)' }} />}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Confirm modal */}
        {showConfirm && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(4px)' }}>
            <div className="glass-card animate-fade" style={{ padding:24, maxWidth:420, width:'90%', borderLeft:'3px solid ' + (STAGE_COLORS[selectedStage] || '#dc2626') }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <span style={{ fontSize:18 }}>✅</span>
                <h3 className="mono" style={{ fontSize:14, color:STAGE_COLORS[selectedStage] || '#dc2626' }}>Confirm Save</h3>
              </div>
              {pendingEntries.map(function(p) {
                return (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(42,42,58,0.3)' }}>
                    <span className="mono" style={{ fontSize:12, fontWeight:600 }}>{p.mark} x{entries[p.id]}</span>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>{persons[p.id] || ''}</span>
                    <span className="mono" style={{ fontSize:11, color:'var(--dim)' }}>{(p.weight * entries[p.id]).toFixed(0)} kg</span>
                  </div>
                );
              })}
              <div style={{ display:'flex', gap:8, marginTop:16 }}>
                <button onClick={function(){ setShowConfirm(false); }} className="btn-outline" style={{ flex:1 }}>← Go Back</button>
                <button onClick={handleSave} disabled={saving} className="btn-red" style={{ flex:1 }}>{saving ? 'Saving...' : '✓ Confirm'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DispatchTab({ project, auth }) {
  var [dispatches, setDispatches] = useState([]);
  var [showCreate, setShowCreate] = useState(false);
  var [form, setForm] = useState({ vehicle_no:'', challan_no:'', driver_name:'', driver_phone:'', net_weight:'', loading_by:'' });
  var [saving, setSaving] = useState(false);
  var [loading, setLoading] = useState(true);

  useEffect(function() { loadDispatches(); }, [project.id]);
  async function loadDispatches() { var data = await db.getDispatches(project.id); setDispatches(data || []); setLoading(false); }

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
      await db.createDispatch(Object.assign({}, form, { project_id: project.id, net_weight: parseFloat(form.net_weight) || 0, created_by: auth.user.id }));
      await db.logActivity({ project_id: project.id, action_type: 'dispatch_create', details: 'Dispatch ' + form.vehicle_no, user_name: auth.userName, user_role: auth.role });
      setForm({ vehicle_no:'', challan_no:'', driver_name:'', driver_phone:'', net_weight:'', loading_by:'' });
      setShowCreate(false); loadDispatches();
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
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

      {showCreate && (
        <div className="glass-card animate-fade" style={{ padding:16, marginBottom:12, borderLeft:'3px solid #38bdf8' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['vehicle_no','Vehicle No *'],['challan_no','Challan No'],['driver_name','Driver Name'],['driver_phone','Driver Phone'],['net_weight','Net Weight (MT)'],['loading_by','Loading By']].map(function(f) {
              return (<div key={f[0]}><label className="mono" style={{fontSize:8,color:'var(--muted)',textTransform:'uppercase'}}>{f[1]}</label><input value={form[f[0]]} onChange={function(e){set(f[0],e.target.value)}} placeholder={f[1]} /></div>);
            })}
          </div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={handleCreate} disabled={saving} className="btn-red" style={{padding:'8px 16px'}}>{saving ? 'Creating...' : '✓ Create'}</button>
            <button onClick={function(){setShowCreate(false)}} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {dispatches.map(function(d) {
        return (
          <div key={d.id} className="glass-card" style={{ padding:14, marginBottom:8, borderLeft:'3px solid ' + statusColors[d.status] }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>{statusIcons[d.status]}</span>
                <span className="mono" style={{ fontWeight:700, fontSize:14 }}>{d.vehicle_no}</span>
              </div>
              <span className="badge" style={{ background:statusColors[d.status]+'22', color:statusColors[d.status] }}>{d.status}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--dim)', marginTop:4, paddingLeft:28 }}>
              Challan: {d.challan_no || '—'} · Driver: {d.driver_name || '—'} · {d.net_weight || 0} MT
            </div>
            {canManage && d.status !== 'Unloaded' && (
              <button onClick={function(){ advanceStatus(d); }} className="btn-outline" style={{ marginTop:8, marginLeft:28, fontSize:10, color:'#34d399', borderColor:'#34d399' }}>
                → {DISPATCH_STATUSES[DISPATCH_STATUSES.indexOf(d.status) + 1]}
              </button>
            )}
          </div>
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
  var [subTab, setSubTab] = useState('dashboard');
  var [parts, setParts] = useState([]);
  var [erectionRecords, setErectionRecords] = useState([]);
  var [snags, setSnags] = useState([]);
  var [bolts, setBolts] = useState([]);
  var [safety, setSafety] = useState([]);
  var [fabSummary, setFabSummary] = useState({});
  var [loading, setLoading] = useState(true);

  useEffect(function() { loadAll(); }, [project.id]);
  async function loadAll() {
    setLoading(true);
    var [p, er, sn, bl, sf, fs] = await Promise.all([
      db.getParts(project.id), db.getErectionRecords(project.id), db.getSnags(project.id),
      db.getBoltRecords(project.id), db.getSafetyChecks(project.id), db.getFabSummary(project.id)
    ]);
    setParts(p||[]); setErectionRecords(er||[]); setSnags(sn||[]); setBolts(bl||[]); setSafety(sf||[]); setFabSummary(fs||{}); setLoading(false);
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

  if (loading) return <div style={{textAlign:'center',padding:40}}><div style={{width:30,height:30,border:'3px solid #2a2a3a',borderTop:'3px solid #dc2626',borderRadius:'50%',margin:'0 auto'}} className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      <div style={{ display:'flex', gap:4, marginBottom:16, overflowX:'auto' }}>
        {[
          { id:'dashboard', label:'📊 Dashboard' }, { id:'marks', label:'🏗 Marks (' + parts.length + ')' },
          { id:'snags', label:'⚠ Snags (' + openSnags + ')' }, { id:'safety', label:'🦺 Safety' }, { id:'bolts', label:'🔩 Bolts' }
        ].map(function(st) {
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
            <span className="mono" style={{ fontSize:10, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>MARKS LIST</span>
          </div>
          {parts.map(function(p) {
            var erected = !!erectedPartIds[p.id];
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(42,42,58,0.2)' }}>
                <div onClick={function() {
                  if (erected && auth.isPM) { if(confirm('Un-erect '+p.mark+'?')){ db.unErectMark(project.id,p.id).then(loadAll); } }
                  else if (!erected && canManage) {
                    var erector = prompt('Erector name:');
                    if (erector) {
                      var crew = prompt('Crew size:', '1');
                      db.erectMark({ project_id:project.id, part_id:p.id, erection_date:new Date().toISOString().split('T')[0],
                        erector_name:erector, crew_size:parseInt(crew)||1, created_by:auth.user.id }).then(function(){
                        db.logActivity({ project_id:project.id, action_type:'erect_toggle', details:p.mark+' ERECTED by '+erector+' crew:'+crew,
                          user_name:auth.userName, user_role:auth.role }).then(loadAll);
                      });
                    }
                  }
                }} style={{
                  width:22, height:22, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
                  border: erected ? '2px solid #34d399' : '2px solid var(--border)',
                  background: erected ? '#34d399' : 'transparent', cursor: canManage ? 'pointer' : 'default', flexShrink:0
                }}>
                  {erected && <span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
                </div>
                <span className="mono" style={{ fontWeight:600, fontSize:12, width:80, color: erected ? '#34d399' : '#dc2626' }}>{p.mark}</span>
                <span style={{ flex:1, fontSize:11, color:'var(--muted)' }}>{p.description}</span>
                <span className="mono" style={{ fontSize:10, color:'var(--dim)' }}>{p.weight} kg</span>
              </div>
            );
          })}
          {parts.length === 0 && <p style={{fontSize:11,color:'var(--dim)',padding:12,textAlign:'center'}}>No parts yet</p>}
        </div>
      )}

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