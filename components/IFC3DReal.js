'use client';
import { useState, useEffect, useRef } from 'react';
import * as db from '../lib/database';

// ════════════════════════════════════════════════════════════════
// IFC TYPE MAPPINGS (from your working standalone viewer)
// ════════════════════════════════════════════════════════════════
const TM = {
  'RAFTER':'raf','CANOPY_RAFTER':'raf','MONITOR_RAFTER':'raf',
  'SIDE WALL COLUMN':'col','SIDE_WALL_COLUMN':'col','PORTAL_COLUMN':'col',
  'END_WALL_COLUMN':'col','INTERMEDIATE COLUMN':'col','IC_COLUMN':'col',
  'MONITOR_COLUMN':'col','COLUMN':'col','FACIA_BRACKET':'col',
  'STRUT_PIPE':'sp','PIPE_BRACING':'pb','ROD_BRACING':'pb',
  'CRANE BEAM':'gnt','PORTAL_BEAM':'mb','BEAM':'mb',
  'PURLIN':'purlin','GIRT':'girt','C_GIRT':'girt','ANGLE':'sp'
};
const SK = new Set(['CLEAT','FLANGE_ANGLE','GUSSET PLATE','SAG_ROD','SagRod','JAMB','CLIT','END_WALL_CLIP','STIFFNER','LADDER','PLATE']);
const TC = { col:0x378ADD, raf:0xD85A30, sp:0x888780, pb:0x639922, gnt:0xEAB308, mb:0xEF4444, purlin:0x7C3AED, girt:0x0D9488 };
const TL = { col:'Column', raf:'Rafter', sp:'Strut Pipe', pb:'Bracing', gnt:'Crane Beam', mb:'Beam', purlin:'Purlin', girt:'Girt' };

// ════════════════════════════════════════════════════════════════
// IFC PARSER (verbatim from your standalone viewer)
// ════════════════════════════════════════════════════════════════
function parseIFC(text, cb) {
  const lines = text.split(/\r?\n/), E = {};
  let cur = '', n = 0;
  for (const line of lines) {
    n++;
    if (n % 50000 === 0 && cb) cb(n/lines.length*0.3);
    const t = line.trim();
    if (!t || t.startsWith('/*') || t.startsWith('FILE_') ||
        ['ISO-10303-21;','HEADER;','DATA;','ENDSEC;','END-ISO-10303-21;'].includes(t)) continue;
    cur += t;
    if (!cur.endsWith(';')) continue;
    const m = cur.match(/^#(\d+)\s*=\s*(\w+)\s*\((.*)\)\s*;$/s);
    if (m) E[parseInt(m[1])] = { id:parseInt(m[1]), type:m[2].toUpperCase(), raw:m[3] };
    cur = '';
  }
  return E;
}

function pA(raw) {
  const a = []; let d = 0, c = '', s = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "'" && !s) { s = true; c += ch; continue; }
    if (ch === "'" && s) {
      if (i+1 < raw.length && raw[i+1] === "'") { c += "''"; i++; continue; }
      s = false; c += ch; continue;
    }
    if (s) { c += ch; continue; }
    if (ch === '(') { d++; c += ch; continue; }
    if (ch === ')') { d--; c += ch; continue; }
    if (ch === ',' && d === 0) { a.push(c.trim()); c = ''; continue; }
    c += ch;
  }
  if (c.trim()) a.push(c.trim());
  return a;
}

function R(E, r) {
  if (!r || r === '$' || r === '*') return null;
  const m = r.match(/^#(\d+)$/);
  return m ? E[parseInt(m[1])] || null : null;
}

function cs(s) {
  return (s || '').replace(/^'|'$/g, '').replace(/''/g, "'").replace(/^\$$/, '');
}

function gXf(E, e) {
  if (!e || e.type !== 'IFCLOCALPLACEMENT') return { o:[0,0,0], x:[1,0,0], y:[0,1,0], z:[0,0,1] };
  const a = pA(e.raw);
  const par = R(E, a[0]), rp = R(E, a[1]);
  let lo = [0,0,0], lz = [0,0,1], lx = [1,0,0];
  if (rp) {
    const ra = pA(rp.raw);
    const loc = R(E, ra[0]);
    if (loc && loc.type === 'IFCCARTESIANPOINT') {
      const c = loc.raw.match(/([-\d.eE+]+)/g);
      if (c) lo = [+c[0], +c[1], c[2] ? +c[2] : 0];
    }
    const ax = R(E, ra[1]);
    if (ax && ax.type === 'IFCDIRECTION') {
      const c = ax.raw.match(/([-\d.eE+]+)/g);
      if (c) lz = [+c[0], +c[1], c[2] ? +c[2] : 0];
    }
    const rd = R(E, ra[2]);
    if (rd && rd.type === 'IFCDIRECTION') {
      const c = rd.raw.match(/([-\d.eE+]+)/g);
      if (c) lx = [+c[0], +c[1], c[2] ? +c[2] : 0];
    }
  }
  const ly = [lz[1]*lx[2]-lz[2]*lx[1], lz[2]*lx[0]-lz[0]*lx[2], lz[0]*lx[1]-lz[1]*lx[0]];
  if (par && par.type === 'IFCLOCALPLACEMENT') {
    const pt = gXf(E, par);
    return { o:tP(pt, lo), x:rV(pt, lx), y:rV(pt, ly), z:rV(pt, lz) };
  }
  return { o:lo, x:lx, y:ly, z:lz };
}

function tP(xf, p) {
  return [
    xf.o[0] + xf.x[0]*p[0] + xf.y[0]*p[1] + xf.z[0]*p[2],
    xf.o[1] + xf.x[1]*p[0] + xf.y[1]*p[1] + xf.z[1]*p[2],
    xf.o[2] + xf.x[2]*p[0] + xf.y[2]*p[1] + xf.z[2]*p[2]
  ];
}

function rV(xf, v) {
  return [
    xf.x[0]*v[0] + xf.y[0]*v[1] + xf.z[0]*v[2],
    xf.x[1]*v[0] + xf.y[1]*v[1] + xf.z[1]*v[2],
    xf.x[2]*v[0] + xf.y[2]*v[1] + xf.z[2]*v[2]
  ];
}

function pPFS(E, ent) {
  const a = pA(ent.raw);
  const ce = R(E, a[0]); if (!ce) return null;
  const pts = ce.raw.match(/\(([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\)/g);
  if (!pts) return null;
  const v = [];
  for (const p of pts) {
    const m = p.match(/([-\d.eE+]+)/g);
    v.push(+m[0], +m[1], +m[2]);
  }
  const fr = a[2] ? a[2].match(/#\d+/g) : [];
  const idx = [];
  if (fr) for (const r of fr) {
    const f = R(E, r); if (!f) continue;
    const fi = f.raw.match(/\d+/g); if (!fi || fi.length < 3) continue;
    const ix = fi.map(x => x - 1);
    for (let i = 1; i < ix.length - 1; i++) idx.push(ix[0], ix[i], ix[i+1]);
  }
  return { v:new Float32Array(v), i:new Uint32Array(idx) };
}

function pFB(E, ent) {
  const a = pA(ent.raw);
  const shell = R(E, a[0]); if (!shell || shell.type !== 'IFCCLOSEDSHELL') return null;
  const faceRefs = shell.raw.match(/#\d+/g); if (!faceRefs) return null;
  const vMap = new Map(); const vArr = []; const idx = [];
  for (const fr of faceRefs) {
    const face = R(E, fr); if (!face || face.type !== 'IFCFACE') continue;
    const bRefs = face.raw.match(/#\d+/g); if (!bRefs) continue;
    for (const br of bRefs) {
      const bound = R(E, br); if (!bound) continue;
      const ba = pA(bound.raw);
      const loop = R(E, ba[0]); if (!loop || loop.type !== 'IFCPOLYLOOP') continue;
      const ptRefs = loop.raw.match(/#\d+/g); if (!ptRefs || ptRefs.length < 3) continue;
      const fv = [];
      for (const pr of ptRefs) {
        const pt = R(E, pr); if (!pt) continue;
        const c = pt.raw.match(/([-\d.eE+]+)/g); if (!c) continue;
        const key = `${c[0]},${c[1]},${c[2]||0}`;
        if (!vMap.has(key)) {
          vMap.set(key, vArr.length/3);
          vArr.push(+c[0], +c[1], c[2] ? +c[2] : 0);
        }
        fv.push(vMap.get(key));
      }
      for (let i = 1; i < fv.length - 1; i++) idx.push(fv[0], fv[i], fv[i+1]);
    }
  }
  if (!vArr.length) return null;
  return { v:new Float32Array(vArr), i:new Uint32Array(idx) };
}

function pEAS(E, ent) {
  const a = pA(ent.raw);
  const pe = R(E, a[0]), de = R(E, a[2]), dep = parseFloat(a[3]);
  if (!pe || !de) return null;
  let pts = null;
  if (pe.type === 'IFCARBITRARYCLOSEDPROFILEDEF') {
    const pa = pA(pe.raw);
    const cv = R(E, pa[2]);
    if (cv) pts = g2d(E, cv);
  } else if (pe.type === 'IFCRECTANGLEPROFILEDEF') {
    const pa = pA(pe.raw);
    const xd = parseFloat(pa[3]), yd = parseFloat(pa[4]);
    pts = [[-xd/2,-yd/2],[xd/2,-yd/2],[xd/2,yd/2],[-xd/2,yd/2]];
  } else if (pe.type === 'IFCCIRCLEPROFILEDEF') {
    const pa = pA(pe.raw);
    const r2 = parseFloat(pa[3]);
    pts = [];
    for (let i = 0; i < 16; i++) {
      const a2 = i*Math.PI*2/16;
      pts.push([r2*Math.cos(a2), r2*Math.sin(a2)]);
    }
  } else if (pe.type === 'IFCCIRCLEHOLLOWPROFILEDEF') {
    const pa = pA(pe.raw);
    const r2 = parseFloat(pa[3]), wt = parseFloat(pa[4]);
    pts = [];
    for (let i = 0; i < 16; i++) { const a2 = i*Math.PI*2/16; pts.push([r2*Math.cos(a2), r2*Math.sin(a2)]); }
    for (let i = 15; i >= 0; i--) { const a2 = i*Math.PI*2/16; pts.push([(r2-wt)*Math.cos(a2), (r2-wt)*Math.sin(a2)]); }
  } else if (pe.type === 'IFCLSHAPEPROFILEDEF') {
    const pa = pA(pe.raw);
    const dd = parseFloat(pa[3]), w = parseFloat(pa[4]), t = parseFloat(pa[5]);
    pts = [[-w/2,-dd/2],[w/2,-dd/2],[w/2,-dd/2+t],[-w/2+t,-dd/2+t],[-w/2+t,dd/2],[-w/2,dd/2]];
  } else if (pe.type === 'IFCCSHAPEPROFILEDEF') {
    const pa = pA(pe.raw);
    const dd = parseFloat(pa[3]), w = parseFloat(pa[4]), t = parseFloat(pa[5]), g = parseFloat(pa[6]||w);
    pts = [[-w/2,-dd/2],[g-w/2,-dd/2],[g-w/2,-dd/2+t],[-w/2+t,-dd/2+t],[-w/2+t,dd/2-t],[g-w/2,dd/2-t],[g-w/2,dd/2],[-w/2,dd/2]];
  }
  if (!pts || pts.length < 3) return null;
  const dc = de.raw.match(/([-\d.eE+]+)/g);
  const dir = dc ? [+dc[0], +dc[1], dc[2]?+dc[2]:0] : [0,0,1];
  const posE = R(E, a[1]);
  let px = { o:[0,0,0], x:[1,0,0], y:[0,1,0], z:[0,0,1] };
  if (posE) {
    const pa = pA(posE.raw);
    let po = [0,0,0], pz = [0,0,1], ppx = [1,0,0];
    const loc = R(E, pa[0]);
    if (loc && loc.type === 'IFCCARTESIANPOINT') {
      const c = loc.raw.match(/([-\d.eE+]+)/g);
      if (c) po = [+c[0], +c[1], c[2]?+c[2]:0];
    }
    const ax = R(E, pa[1]);
    if (ax && ax.type === 'IFCDIRECTION') {
      const c = ax.raw.match(/([-\d.eE+]+)/g);
      if (c) pz = [+c[0], +c[1], c[2]?+c[2]:0];
    }
    const rd = R(E, pa[2]);
    if (rd && rd.type === 'IFCDIRECTION') {
      const c = rd.raw.match(/([-\d.eE+]+)/g);
      if (c) ppx = [+c[0], +c[1], c[2]?+c[2]:0];
    }
    const py = [pz[1]*ppx[2]-pz[2]*ppx[1], pz[2]*ppx[0]-pz[0]*ppx[2], pz[0]*ppx[1]-pz[1]*ppx[0]];
    px = { o:po, x:ppx, y:py, z:pz };
  }
  const n = pts.length, v = [];
  for (const p of pts) {
    const lp = tP(px, [p[0], p[1], 0]);
    v.push(lp[0], lp[1], lp[2]);
  }
  for (const p of pts) {
    const lp = tP(px, [p[0]+dir[0]*dep, p[1]+dir[1]*dep, dir[2]*dep]);
    v.push(lp[0], lp[1], lp[2]);
  }
  const idx = [];
  for (let i = 1; i < n-1; i++) idx.push(0, i, i+1);
  for (let i = 1; i < n-1; i++) idx.push(n, n+i+1, n+i);
  for (let i = 0; i < n; i++) {
    const j = (i+1) % n;
    idx.push(i, j, n+j, i, n+j, n+i);
  }
  return { v:new Float32Array(v), i:new Uint32Array(idx) };
}

function g2d(E, cv) {
  if (cv.type === 'IFCINDEXEDPOLYCURVE') {
    const ca = pA(cv.raw);
    const pl = R(E, ca[0]);
    if (pl && pl.type === 'IFCCARTESIANPOINTLIST2D') {
      const pts = pl.raw.match(/\(([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\)/g);
      if (pts) return pts.map(p => { const m = p.match(/([-\d.eE+]+)/g); return [+m[0], +m[1]]; });
    }
  }
  if (cv.type === 'IFCPOLYLINE') {
    const pa = pA(cv.raw);
    const refs = (pa[0] || '').match(/#\d+/g);
    if (refs) {
      const pts = [];
      for (const r of refs) {
        const pt = R(E, r);
        if (pt && pt.type === 'IFCCARTESIANPOINT') {
          const c = pt.raw.match(/([-\d.eE+]+)/g);
          if (c) pts.push([+c[0], +c[1]]);
        }
      }
      return pts;
    }
  }
  return null;
}

function pItem(E, it) {
  if (it.type === 'IFCPOLYGONALFACESET') return pPFS(E, it);
  if (it.type === 'IFCEXTRUDEDAREASOLID') return pEAS(E, it);
  if (it.type === 'IFCFACETEDBREP') return pFB(E, it);
  if (it.type === 'IFCBOOLEANCLIPPINGRESULT') {
    const ba = pA(it.raw);
    const op1 = R(E, ba[1]);
    if (op1) return pItem(E, op1);
  }
  return null;
}

function gBody(E, ent) {
  const a = pA(ent.raw);
  const re = R(E, a[6]);
  if (!re) return [];
  const ra = pA(re.raw);
  const O = [];
  for (const arg of ra) {
    const refs = arg.match(/#\d+/g);
    if (!refs) continue;
    for (const r of refs) {
      const sr = R(E, r);
      if (!sr || sr.type !== 'IFCSHAPEREPRESENTATION' || !sr.raw.includes("'Body'")) continue;
      const sa = pA(sr.raw);
      for (const s2 of sa) {
        const cr = s2.match(/#\d+/g);
        if (!cr) continue;
        for (const c2 of cr) {
          const it = R(E, c2);
          if (!it) continue;
          const g = pItem(E, it);
          if (g) O.push(g);
          if (it.type === 'IFCMAPPEDITEM') {
            const ma = pA(it.raw);
            const ms = R(E, ma[0]);
            if (ms && ms.type === 'IFCREPRESENTATIONMAP') {
              const msa = pA(ms.raw);
              const mr = R(E, msa[1]);
              if (mr && mr.type === 'IFCSHAPEREPRESENTATION') {
                const mra = pA(mr.raw);
                for (const ma2 of mra) {
                  const mr2 = ma2.match(/#\d+/g);
                  if (!mr2) continue;
                  for (const m2 of mr2) {
                    const mi = R(E, m2);
                    if (!mi) continue;
                    const mg = pItem(E, mi);
                    if (mg) O.push(mg);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return O;
}

function guessType(cn) {
  const u = cn.toUpperCase().replace(/_/g, ' ');
  if (/SWC\d|EWC\d|COL\d|P.COL|ICO\d|M.COL|FC.BKT|EW.COL/.test(u) || u.includes('COLUMN')) return 'col';
  if (/RAF\d|C.RAF|M.RAF|EPR\d/.test(u) || u.includes('RAFTER')) return 'raf';
  if (/^CB\d/.test(u) || u.includes('CRANE')) return 'gnt';
  if (/^MB\d|^JB\d|^PBM\d|^P.B\d/.test(u) || u.includes('BEAM')) return 'mb';
  if (/^SP\d|^SS\d/.test(u) || u.includes('STRUT')) return 'sp';
  if (/^PB\d|^RB\d|^HR\d/.test(u) || u.includes('BRAC')) return 'pb';
  if (/^PUR\d|^DU\d/.test(u) || u.includes('PURLIN')) return 'purlin';
  if (/^GT\d/.test(u) || u.includes('GIRT')) return 'girt';
  return null;
}

const normalizeMark = (m) => (m || '').trim().toUpperCase().replace(/[\s_-]/g, '');

// ════════════════════════════════════════════════════════════════
// REACT COMPONENT
// ════════════════════════════════════════════════════════════════
export default function IFC3DReal({ project, parts, auth, erectedPartIds, onChanged }) {
  const canvasRef = useRef(null);
  const mountRef = useRef(null);
  const THREE_ref = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const allAsmRef = useRef([]);
  const ghostRef = useRef(true);
  const tgtRef = useRef(null);
  const distRef = useRef(120);
  const thRef = useRef(Math.PI/4);
  const phRef = useRef(Math.PI/5);
  const erectedPartIdsRef = useRef(erectedPartIds);
  const subscriptionRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('Initializing...');
  const [noFile, setNoFile] = useState(false);
  const [error, setError] = useState(null);
  const [bottomSheet, setBottomSheet] = useState(null);
  const [ghost, setGhost] = useState(true);
  const [stats, setStats] = useState({ total: 0, erected: 0, pct: 0, byType: {} });
  const [toast, setToast] = useState(null);

  const canMark = auth.isPM || auth.isSite;

  function applyMaterial(grp) {
    const THREE = THREE_ref.current;
    if (!THREE) return;
    const e = grp.userData.erected;
    const col = TC[grp.userData.mt] || 0x666666;
    grp.traverse(c => {
      if (!c.isMesh) return;
      if (e) {
        c.material.color.setHex(col);
        c.material.opacity = 1;
        c.material.transparent = false;
        c.material.wireframe = false;
        c.material.emissive.setHex(col);
        c.material.emissiveIntensity = 0.35;
        c.visible = true;
      } else if (ghostRef.current) {
        c.material.color.setHex(0x283050);
        c.material.opacity = 0.08;
        c.material.transparent = true;
        c.material.wireframe = true;
        c.material.emissive.setHex(0);
        c.material.emissiveIntensity = 0;
        c.visible = true;
      } else {
        c.visible = false;
      }
    });
  }

  function updateStats() {
    const all = allAsmRef.current;
    const total = all.length;
    const erected = all.filter(a => a.group.userData.erected).length;
    const pct = total ? Math.round(erected/total*100) : 0;
    const byType = {};
    for (const t of Object.keys(TL)) {
      const of = all.filter(a => a.mt === t);
      if (!of.length) continue;
      const er = of.filter(a => a.group.userData.erected).length;
      byType[t] = { total: of.length, erected: er, pct: Math.round(er/of.length*100) };
    }
    setStats({ total, erected, pct, byType });
  }

  function refreshAllMaterials() {
    const all = allAsmRef.current;
    for (const a of all) {
      const isErected = a.partId ? !!erectedPartIdsRef.current[a.partId] : false;
      a.group.userData.erected = isErected;
      applyMaterial(a.group);
    }
    updateStats();
  }

  function toggleGhost() {
    ghostRef.current = !ghostRef.current;
    setGhost(ghostRef.current);
    for (const a of allAsmRef.current) applyMaterial(a.group);
  }

  function handleClick(x, y) {
    const THREE = THREE_ref.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!THREE || !camera || !scene || !canvas) return;
    const ray = new THREE.Raycaster();
    const mpos = new THREE.Vector2();
    mpos.x = (x/canvas.clientWidth)*2 - 1;
    mpos.y = -(y/canvas.clientHeight)*2 + 1;
    ray.setFromCamera(mpos, camera);
    const hits = ray.intersectObjects(scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o.parent && !o.userData.asmId) o = o.parent;
      if (o.userData.asmId) {
        setBottomSheet({
          asmId: o.userData.asmId,
          mark: o.userData.mark,
          mt: o.userData.mt,
          cn: o.userData.cn,
          erected: o.userData.erected,
          partId: o.userData.partId,
          matched: o.userData.matched
        });
        return;
      }
    }
  }

  async function fastToggleErection() {
    if (!bottomSheet) return;
    if (!canMark) { setToast('Read-only mode'); setBottomSheet(null); return; }
    if (!bottomSheet.matched || !bottomSheet.partId) {
      setToast(`Mark "${bottomSheet.mark}" not found in BOM. Upload BOM first.`);
      setBottomSheet(null);
      setTimeout(() => setToast(null), 3500);
      return;
    }
    try {
      const result = await db.toggleErection(
        project.id,
        bottomSheet.partId,
        auth.user.id,
        auth.userName,
        auth.role
      );
      await db.logActivity({
        project_id: project.id,
        action_type: 'erect_toggle',
        details: bottomSheet.mark + (result.erected ? ' ERECTED (fast-tap)' : ' UN-ERECTED (fast-tap)'),
        user_name: auth.userName,
        user_role: auth.role
      });
      setBottomSheet(null);
      setToast(result.erected ? `✓ ${bottomSheet.mark} erected` : `${bottomSheet.mark} un-erected`);
      setTimeout(() => setToast(null), 2000);
      if (onChanged) onChanged();
    } catch (err) {
      setToast('Error: ' + err.message);
      setTimeout(() => setToast(null), 3500);
    }
  }

  useEffect(() => {
    erectedPartIdsRef.current = erectedPartIds;
    refreshAllMaterials();
  }, [erectedPartIds]);

  useEffect(() => {
    if (!project.id) return;
    let cancelled = false;
    let animFrame = null;

    (async () => {
      try {
        setProgress('Loading 3D engine...');
        const THREE = await import('three');
        if (cancelled) return;
        THREE_ref.current = THREE;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setClearColor(0x0a0a0f);
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.0025);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
        camera.position.set(80, 50, 80);
        cameraRef.current = camera;
        tgtRef.current = new THREE.Vector3(0, 5, 0);

        scene.add(new THREE.AmbientLight(0x8899cc, 0.7));
        scene.add(new THREE.HemisphereLight(0xaabbdd, 0x223344, 0.5));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8);
        dl.position.set(60, 100, 80);
        scene.add(dl);
        scene.add(new THREE.DirectionalLight(0x6688bb, 0.5).translateX(-60).translateY(60).translateZ(-80));
        scene.add(new THREE.DirectionalLight(0x556688, 0.4).translateX(0).translateY(50).translateZ(100));

        const gnd = new THREE.GridHelper(400, 40, 0x1a2040, 0x141830);
        scene.add(gnd);

        const resize = () => {
          const w = mountRef.current ? mountRef.current.clientWidth : 800;
          const h = mountRef.current ? mountRef.current.clientHeight : 500;
          if (w && h) {
            renderer.setSize(w, h, false);
            camera.aspect = w/h;
            camera.updateProjectionMatrix();
          }
        };
        resize();
        window.addEventListener('resize', resize);

        const updCam = () => {
          const t = tgtRef.current;
          const d = distRef.current, th = thRef.current, ph = phRef.current;
          camera.position.set(
            t.x + d*Math.sin(th)*Math.cos(ph),
            t.y + d*Math.sin(ph),
            t.z + d*Math.cos(th)*Math.cos(ph)
          );
          camera.lookAt(t);
        };
        updCam();

        let drag = false, pan = false, pm = {x:0, y:0}, moved = false, pinchD0 = 0;
        const onMouseDown = (e) => {
          if (e.button === 0) drag = true;
          if (e.button === 2) pan = true;
          pm = {x:e.clientX, y:e.clientY}; moved = false;
        };
        const onMouseMove = (e) => {
          const dx = e.clientX - pm.x, dy = e.clientY - pm.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
          if (drag) {
            thRef.current -= dx * 0.005;
            phRef.current = Math.max(0.05, Math.min(1.5, phRef.current + dy * 0.005));
            updCam();
          }
          if (pan) {
            const r = new THREE.Vector3();
            camera.getWorldDirection(r);
            r.cross(camera.up).normalize();
            tgtRef.current.add(r.multiplyScalar(-dx * distRef.current * 0.0008));
            tgtRef.current.y += dy * distRef.current * 0.0008;
            updCam();
          }
          pm = {x:e.clientX, y:e.clientY};
        };
        const onMouseUp = (e) => {
          if (!moved && drag) {
            const rect = canvas.getBoundingClientRect();
            handleClick(e.clientX - rect.left, e.clientY - rect.top);
          }
          drag = false; pan = false;
        };
        const onWheel = (e) => {
          e.preventDefault();
          distRef.current *= e.deltaY > 0 ? 1.08 : 0.92;
          distRef.current = Math.max(3, Math.min(600, distRef.current));
          updCam();
        };
        const onContext = (e) => e.preventDefault();

        const onTouchStart = (e) => {
          if (e.touches.length === 1) {
            drag = true;
            pm = {x:e.touches[0].clientX, y:e.touches[0].clientY};
            moved = false;
          }
          if (e.touches.length === 2) {
            drag = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchD0 = Math.hypot(dx, dy);
            pm = {
              x:(e.touches[0].clientX + e.touches[1].clientX)/2,
              y:(e.touches[0].clientY + e.touches[1].clientY)/2
            };
          }
        };
        const onTouchMove = (e) => {
          e.preventDefault();
          if (e.touches.length === 1 && drag) {
            const dx = e.touches[0].clientX - pm.x, dy = e.touches[0].clientY - pm.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
            thRef.current -= dx * 0.005;
            phRef.current = Math.max(0.05, Math.min(1.5, phRef.current + dy * 0.005));
            updCam();
            pm = {x:e.touches[0].clientX, y:e.touches[0].clientY};
          }
          if (e.touches.length === 2) {
            moved = true;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const d = Math.hypot(dx, dy);
            if (pinchD0 > 0) {
              distRef.current *= pinchD0/d;
              distRef.current = Math.max(3, Math.min(600, distRef.current));
              pinchD0 = d;
              updCam();
            }
            const cx = (e.touches[0].clientX + e.touches[1].clientX)/2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY)/2;
            const pdx = cx - pm.x, pdy = cy - pm.y;
            const r = new THREE.Vector3();
            camera.getWorldDirection(r);
            r.cross(camera.up).normalize();
            tgtRef.current.add(r.multiplyScalar(-pdx * distRef.current * 0.001));
            tgtRef.current.y += pdy * distRef.current * 0.001;
            updCam();
            pm = {x:cx, y:cy};
          }
        };
        const onTouchEnd = (e) => {
          if (e.touches.length === 0) {
            if (!moved && drag && e.changedTouches && e.changedTouches[0]) {
              const rect = canvas.getBoundingClientRect();
              handleClick(
                e.changedTouches[0].clientX - rect.left,
                e.changedTouches[0].clientY - rect.top
              );
            }
            drag = false;
          }
          if (e.touches.length < 2) pinchD0 = 0;
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('contextmenu', onContext);
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: true });

        const animate = () => {
          animFrame = requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();

        setProgress('Fetching IFC file...');
        const url = await db.getIfcFileUrl(project.id);
        if (cancelled) return;
        if (!url) {
          setNoFile(true);
          setLoading(false);
          return;
        }

        setProgress('Downloading IFC...');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed: ' + response.status);
        const text = await response.text();
        if (cancelled) return;

        setProgress('Parsing STEP...');
        await new Promise(r => setTimeout(r, 30));
        const E = parseIFC(text, p => setProgress(`Parsing ${Math.round(p*100)}%`));
        if (cancelled) return;

        setProgress('Building hierarchy...');
        await new Promise(r => setTimeout(r, 30));
        const p2c = new Map(), c2p = new Map();
        for (const id in E) {
          const e = E[id];
          if (e.type !== 'IFCRELAGGREGATES') continue;
          const a = pA(e.raw);
          const par = R(E, a[4]);
          if (!par) continue;
          const cr = (a[5] || '').match(/#\d+/g) || [];
          for (const r of cr) {
            const ch = R(E, r);
            if (ch) {
              c2p.set(ch.id, par.id);
              const ex = p2c.get(par.id) || [];
              ex.push(ch.id);
              p2c.set(par.id, ex);
            }
          }
        }
        const allCh = new Set(c2p.keys());

        setProgress('Reading part marks...');
        await new Promise(r => setTimeout(r, 30));
        const eToMk = new Map();
        for (const id in E) {
          const e = E[id];
          if (e.type !== 'IFCRELDEFINESBYPROPERTIES') continue;
          const a = pA(e.raw);
          const pd = R(E, a[5]);
          if (!pd || pd.type !== 'IFCPROPERTYSET') continue;
          const pa = pA(pd.raw);
          const prefs = (pa[4] || '').match(/#\d+/g) || [];
          let mk = null;
          for (const pr of prefs) {
            const prop = R(E, pr);
            if (!prop || prop.type !== 'IFCPROPERTYSINGLEVALUE') continue;
            const pa2 = pA(prop.raw);
            if (cs(pa2[0]) === 'ASSEMBLY_POS') {
              const vm = (pa2[2] || '').match(/IFCLABEL\('([^']+)'\)/i);
              if (vm) mk = vm[1];
            }
          }
          if (!mk) continue;
          const rr = (a[4] || '').match(/#\d+/g) || [];
          for (const r of rr) eToMk.set(parseInt(r.substring(1)), mk);
        }

        const GENERIC = new Set(['STEEL ASSEMBLY', 'ASSEMBLY', 'ELEMENT', 'MEMBER', 'PART', '']);
        const asms = [];
        for (const id in E) {
          const e = E[id];
          if (e.type !== 'IFCELEMENTASSEMBLY') continue;
          if (allCh.has(e.id)) continue;
          const a = pA(e.raw);
          const cn = cs(a[2]);
          if (SK.has(cn)) continue;
          const tag = cs(a[7]);
          const mark = eToMk.get(e.id) || tag || cn;
          let mt = TM[cn];
          if (mt === undefined && !GENERIC.has(cn.toUpperCase())) mt = guessType(cn);
          if (!mt) mt = guessType(mark);
          if (!mt) continue;
          asms.push({ id: e.id, cn: GENERIC.has(cn.toUpperCase()) ? mark : cn, mt, mark });
        }

        const partByMark = {};
        for (const p of parts) {
          partByMark[normalizeMark(p.mark)] = p;
        }

        for (const a of allAsmRef.current) scene.remove(a.group);
        allAsmRef.current = [];

        setProgress(`Building 3D: 0/${asms.length}`);
        let mnX = Infinity, mxX = -Infinity;
        let mnY = Infinity, mxY = -Infinity;
        let mnZ = Infinity, mxZ = -Infinity;
        const S = 0.001;

        for (let i = 0; i < asms.length; i++) {
          if (cancelled) return;
          if (i % 15 === 0) {
            setProgress(`Building 3D: ${i}/${asms.length}`);
            await new Promise(r => setTimeout(r, 0));
          }
          const asm = asms[i];
          const ch = p2c.get(asm.id) || [];
          const grp = new THREE.Group();

          const normMark = normalizeMark(asm.mark);
          const matchedPart = partByMark[normMark];
          const partId = matchedPart ? matchedPart.id : null;
          const isErected = partId ? !!erectedPartIdsRef.current[partId] : false;

          grp.userData = {
            asmId: asm.id, cn: asm.cn, mt: asm.mt, mark: asm.mark,
            partId, matched: !!matchedPart, erected: isErected
          };

          let hasG = false;
          for (const cid of ch) {
            const c = E[cid];
            if (!c) continue;
            if (c.type !== 'IFCBEAM' && c.type !== 'IFCCOLUMN' &&
                c.type !== 'IFCMEMBER' && c.type !== 'IFCPLATE') continue;
            const ca = pA(c.raw);
            const xf = gXf(E, R(E, ca[5]));
            const geoms = gBody(E, c);
            for (const g of geoms) {
              if (!g.v.length || !g.i.length) continue;
              const tv = new Float32Array(g.v.length);
              for (let j = 0; j < g.v.length; j += 3) {
                const gp = tP(xf, [g.v[j], g.v[j+1], g.v[j+2]]);
                tv[j] = gp[0]*S;
                tv[j+1] = gp[2]*S;
                tv[j+2] = -gp[1]*S;
                if (tv[j] < mnX) mnX = tv[j]; if (tv[j] > mxX) mxX = tv[j];
                if (tv[j+1] < mnY) mnY = tv[j+1]; if (tv[j+1] > mxY) mxY = tv[j+1];
                if (tv[j+2] < mnZ) mnZ = tv[j+2]; if (tv[j+2] > mxZ) mxZ = tv[j+2];
              }
              const bg = new THREE.BufferGeometry();
              bg.setAttribute('position', new THREE.BufferAttribute(tv, 3));
              bg.setIndex(new THREE.BufferAttribute(g.i, 1));
              bg.computeVertexNormals();
              const mat = new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide, shininess: 20,
                specular: 0x222244, flatShading: true
              });
              grp.add(new THREE.Mesh(bg, mat));
              hasG = true;
            }
          }
          if (hasG) {
            scene.add(grp);
            allAsmRef.current.push({ group: grp, mt: asm.mt, cn: asm.cn, mark: asm.mark, id: asm.id, partId });
            applyMaterial(grp);
          }
        }

        if (isFinite(mnX)) {
          const cx = (mnX + mxX)/2, cy = (mnY + mxY)/2, cz = (mnZ + mxZ)/2;
          tgtRef.current.set(cx, cy, cz);
          distRef.current = Math.max(mxX - mnX, mxZ - mnZ, 20) * 1.1;
          gnd.position.set(cx, mnY - 0.1, cz);
          updCam();
        }

        updateStats();
        setLoading(false);
        setProgress('');

        try {
          const sub = db.subscribeToProject(project.id, 'erection_records', () => {
            if (onChanged) onChanged();
          });
          subscriptionRef.current = sub;
        } catch (e) {
          console.warn('Realtime subscription failed:', e);
        }
      } catch (err) {
        console.error('IFC 3D error:', err);
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (subscriptionRef.current) {
        try { subscriptionRef.current.unsubscribe(); } catch(e){}
        subscriptionRef.current = null;
      }
      if (rendererRef.current) {
        try { rendererRef.current.dispose(); } catch(e){}
      }
    };
  }, [project.id, parts.length]);

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid #a78bfa', position: 'relative' }}>
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(42,42,58,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏗</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--dim)', letterSpacing: 2, fontWeight: 600 }}>3D ERECTION VIEW</span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {!loading && !noFile && (
            <>
              <span className="mono" style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>
                {stats.erected}/{stats.total}
              </span>
              <span style={{ background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 10 }}>
                {stats.pct}%
              </span>
            </>
          )}
        </div>
      </div>

      <div ref={mountRef} style={{ position: 'relative', height: 500, width: '100%', background: '#0a0a0f' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: loading ? 'default' : 'grab' }} />

        {!loading && !noFile && (
          <button onClick={toggleGhost} style={{
            position: 'absolute', top: 8, right: 8, padding: '5px 12px',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6,
            background: 'rgba(74,158,255,0.1)', color: '#4a9eff',
            fontSize: 10, fontWeight: 700, cursor: 'pointer', zIndex: 10
          }}>
            👁 Ghost: {ghost ? 'ON' : 'OFF'}
          </button>
        )}

        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,15,0.9)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 30, height: 30, border: '3px solid #2a2a3a', borderTop: '3px solid #a78bfa', borderRadius: '50%', margin: '0 auto 12px' }} className="animate-spin" />
              <span className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>{progress}</span>
            </div>
          </div>
        )}

        {noFile && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: 300, padding: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
              <p className="mono" style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 6 }}>No IFC file uploaded yet</p>
              <p style={{ fontSize: 10, color: 'var(--dim)' }}>
                {auth.isPM ? 'Go to IFC Upload tab to upload the 3D model.' : 'Ask your project manager to upload the IFC.'}
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,15,0.9)' }}>
            <div style={{ textAlign: 'center', maxWidth: 320, padding: 20 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>⚠️</div>
              <p className="mono" style={{ fontSize: 11, color: '#f97066' }}>Error loading 3D</p>
              <p style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{error}</p>
            </div>
          </div>
        )}

        {!loading && !noFile && stats.total > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(6px)', borderTop: '1px solid rgba(42,42,58,0.3)', maxHeight: 100, overflowY: 'auto' }}>
            {Object.keys(TL).map(t => {
              const s = stats.byType[t];
              if (!s) return null;
              const col = '#' + TC[t].toString(16).padStart(6, '0');
              return (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, fontSize:10 }}>
                  <span style={{ width: 70, color:'var(--dim)', fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{TL[t]}</span>
                  <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width: s.pct+'%', height:'100%', background: col, borderRadius:3, transition:'width 0.3s' }} />
                  </div>
                  <span style={{ width: 42, textAlign:'right', fontSize:9, color:'var(--dim)', fontFamily:'monospace' }}>{s.erected}/{s.total}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {bottomSheet && (
        <>
          <div onClick={() => setBottomSheet(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000
          }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0,
            background: '#1c1c26', borderTopLeftRadius: 16, borderTopRightRadius: 16,
            zIndex: 1001, padding: '10px 20px 24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0))'
          }}>
            <div style={{ padding: '10px 0', textAlign: 'center' }}>
              <div style={{ display:'inline-block', width:36, height:4, background:'rgba(255,255,255,0.15)', borderRadius:2 }} />
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{bottomSheet.mark}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 14 }}>
              {TL[bottomSheet.mt]} · {bottomSheet.cn}
              {!bottomSheet.matched && <span style={{ color: '#f97066', marginLeft: 8 }}>⚠ Not in BOM</span>}
            </div>
            {canMark && bottomSheet.matched ? (
              <>
                <button onClick={fastToggleErection} style={{
                  width: '100%', padding: 13, borderRadius: 10,
                  background: bottomSheet.erected ? 'rgba(255,255,255,0.04)' : '#dc2626',
                  color: bottomSheet.erected ? 'var(--muted)' : '#fff',
                  border: bottomSheet.erected ? '1px solid rgba(255,255,255,0.14)' : 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 6
                }}>
                  {bottomSheet.erected ? 'Mark as NOT Erected' : 'Mark as ERECTED'}
                </button>
                <button onClick={() => setBottomSheet(null)} style={{
                  width: '100%', padding: 13, border: 'none', background: 'transparent',
                  color: 'var(--dim)', fontSize: 12, cursor: 'pointer'
                }}>Cancel</button>
              </>
            ) : (
              <>
                <div style={{ padding: 12, background: 'rgba(74,158,255,0.08)', borderRadius: 8, marginBottom: 10, fontSize: 11, color: 'var(--dim)' }}>
                  {!bottomSheet.matched
                    ? `Mark "${bottomSheet.mark}" is not in the BOM. Upload BOM first, then marks will auto-link.`
                    : 'Read-only view. Only Site and PM roles can toggle erection status.'}
                </div>
                <button onClick={() => setBottomSheet(null)} style={{
                  width: '100%', padding: 13, border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent', color: 'var(--muted)', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}>Close</button>
              </>
            )}
          </div>
        </>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(34,34,46,0.95)', color: '#fff', padding: '10px 16px',
          borderRadius: 8, fontSize: 12, fontWeight: 500, zIndex: 1100,
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
        }}>
          {toast}
        </div>
      )}

      {!loading && !noFile && (
        <div style={{ padding: '6px 14px', textAlign: 'center', borderTop: '1px solid rgba(42,42,58,0.2)' }}>
          <span style={{ fontSize: 9, color: 'var(--dim)' }}>
            🖱 Drag: rotate · Right-drag: pan · Scroll: zoom · Click part to {canMark ? 'mark erected' : 'view'}
          </span>
        </div>
      )}
    </div>
  );
}