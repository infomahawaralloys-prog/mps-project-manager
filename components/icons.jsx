// ============================================================
// Icons — hand-picked Lucide-style line icons, no emoji.
// Stroke 1.75, round caps, round joins.
// Usage: <Icon.Anchor size={16} /> or import { Anchor } from '../icons';
// ============================================================

function makeIcon(paths, vb = 24) {
  function Icon({ size = 16, stroke = 1.75, color = 'currentColor', style, className }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${vb} ${vb}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
        className={className}
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  }
  return Icon;
}

const p = (d, key, extra = {}) => <path d={d} key={key || d} {...extra} />;
const c = (cx, cy, r, key, extra = {}) => <circle cx={cx} cy={cy} r={r} key={key || `${cx}-${cy}-${r}`} {...extra} />;
const l = (x1, y1, x2, y2, key, extra = {}) => <line x1={x1} y1={y1} x2={x2} y2={y2} key={key || `${x1}-${y1}-${x2}-${y2}`} {...extra} />;
const r = (x, y, w, h, rx, key, extra = {}) => <rect x={x} y={y} width={w} height={h} rx={rx} key={key || `${x}-${y}-${w}-${h}`} {...extra} />;

// ---- Building / structure ----
export const Anchor   = makeIcon([c(12, 5, 3, 'a1'), l(12, 22, 12, 8, 'a2'), p('M5 12H2a10 10 0 0 0 20 0h-3', 'a3')]);
export const Beam     = makeIcon([r(3, 8, 18, 8, 1, 'b1'), l(3, 12, 21, 12, 'b2'), l(8, 8, 8, 16, 'b3'), l(16, 8, 16, 16, 'b4')]);
export const Coil     = makeIcon([c(12, 12, 8, 'co1'), c(12, 12, 5, 'co2'), c(12, 12, 2.5, 'co3')]);
export const Bolt     = makeIcon([p('M12 2l3 3-3 3-3-3z', 'bo1'), l(12, 8, 12, 22, 'bo2'), l(9, 12, 15, 12, 'bo3'), l(9, 16, 15, 16, 'bo4')]);
export const Roof     = makeIcon([p('M3 12l9-7 9 7', 'r1'), p('M5 10v10h14V10', 'r2'), l(9, 20, 9, 14, 'r3'), l(15, 20, 15, 14, 'r4')]);
export const Cladding = makeIcon([r(3, 4, 18, 16, 1, 'cl1'), l(3, 9, 21, 9, 'cl2'), l(3, 14, 21, 14, 'cl3'), l(3, 19, 21, 19, 'cl4')]);
export const Nut      = makeIcon([p('M6 3h12l3 9-9 9-9-9z', 'n1'), c(12, 12, 3, 'n2')]);
export const Deck     = makeIcon([p('M3 9h18', 'd1'), p('M3 15h18', 'd2'), p('M6 9v6', 'd3'), p('M10 9v6', 'd4'), p('M14 9v6', 'd5'), p('M18 9v6', 'd6')]);

// ---- Pipeline stages ----
export const Cut      = makeIcon([c(6, 6, 3, 'cu1'), c(6, 18, 3, 'cu2'), l(20, 4, 8.12, 15.88, 'cu3'), l(14.47, 14.48, 20, 20, 'cu4'), l(8.12, 8.12, 12, 12, 'cu5')]);
export const Fit      = makeIcon([p('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z', 'f1')]);
export const QC       = makeIcon([p('M22 11.08V12a10 10 0 1 1-5.93-9.14', 'q1'), p('M22 4L12 14.01l-3-3', 'q2')]);
export const Weld     = makeIcon([p('M13 2L3 14h9l-1 8 10-12h-9l1-8z', 'w1')]);
export const Paint    = makeIcon([r(3, 2, 18, 6, 1, 'pa1'), p('M8 8v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8', 'pa2'), r(10, 13, 4, 9, 1, 'pa3')]);

// ---- App / nav ----
export const Info     = makeIcon([c(12, 12, 10, 'i1'), l(12, 16, 12, 12, 'i2'), l(12, 8, 12.01, 8, 'i3')]);
export const Fab      = makeIcon([p('M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z', 'f1')]);
export const Truck    = makeIcon([r(1, 3, 15, 13, 1, 't1'), p('M16 8h4l3 5v3h-7', 't2'), c(5.5, 18.5, 2.5, 't3'), c(18.5, 18.5, 2.5, 't4')]);
export const Crane    = makeIcon([l(3, 22, 21, 22, 'cr1'), l(6, 22, 6, 4, 'cr2'), l(6, 4, 20, 4, 'cr3'), l(20, 4, 18, 8, 'cr4'), l(6, 8, 18, 8, 'cr5'), l(10, 8, 10, 12, 'cr6'), r(8, 12, 4, 4, 0.5, 'cr7')]);
export const Search   = makeIcon([c(11, 11, 8, 's1'), l(21, 21, 16.65, 16.65, 's2')]);
export const Upload   = makeIcon([p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'u1'), p('M17 8l-5-5-5 5', 'u2'), l(12, 3, 12, 15, 'u3')]);
export const Plus     = makeIcon([l(12, 5, 12, 19, 'pl1'), l(5, 12, 19, 12, 'pl2')]);
export const Filter   = makeIcon([p('M22 3H2l8 9.46V19l4 2v-8.54L22 3z', 'fi1')]);
export const Settings = makeIcon([c(12, 12, 3, 'se1'), p('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z', 'se2')]);
export const Bell     = makeIcon([p('M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'b1'), p('M13.73 21a2 2 0 0 1-3.46 0', 'b2')]);
export const ChevronDown  = makeIcon([p('M6 9l6 6 6-6', 'cd')]);
export const ChevronRight = makeIcon([p('M9 18l6-6-6-6', 'cr')]);
export const ChevronLeft  = makeIcon([p('M15 18l-9-6 9-6', 'cl')]);
export const MoreH    = makeIcon([c(12, 12, 1, 'm1'), c(19, 12, 1, 'm2'), c(5, 12, 1, 'm3')]);
export const ArrowUp    = makeIcon([l(12, 19, 12, 5, 'au1'), p('M5 12l7-7 7 7', 'au2')]);
export const ArrowDown  = makeIcon([l(12, 5, 12, 19, 'ad1'), p('M19 12l-7 7-7-7', 'ad2')]);
export const ArrowRight = makeIcon([l(5, 12, 19, 12, 'ar1'), p('M12 5l7 7-7 7', 'ar2')]);
export const Check    = makeIcon([p('M20 6L9 17l-5-5', 'ch1')]);
export const X        = makeIcon([l(18, 6, 6, 18, 'x1'), l(6, 6, 18, 18, 'x2')]);
export const Menu     = makeIcon([l(3, 6, 21, 6, 'me1'), l(3, 12, 21, 12, 'me2'), l(3, 18, 21, 18, 'me3')]);
export const Dot      = makeIcon([c(12, 12, 4, 'd', { fill: 'currentColor', stroke: 'none' })]);
export const Cube3D   = makeIcon([p('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'cu1'), p('M3.27 6.96L12 12.01l8.73-5.05', 'cu2'), l(12, 22.08, 12, 12, 'cu3')]);
export const Calendar = makeIcon([r(3, 4, 18, 18, 2, 'ca1'), l(16, 2, 16, 6, 'ca2'), l(8, 2, 8, 6, 'ca3'), l(3, 10, 21, 10, 'ca4')]);
export const Clock    = makeIcon([c(12, 12, 10, 'cl1'), p('M12 6v6l4 2', 'cl2')]);
export const User     = makeIcon([p('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'us1'), c(12, 7, 4, 'us2')]);
export const File     = makeIcon([p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'fi1'), p('M14 2v6h6', 'fi2'), l(16, 13, 8, 13, 'fi3'), l(16, 17, 8, 17, 'fi4'), l(10, 9, 8, 9, 'fi5')]);
export const Image    = makeIcon([r(3, 3, 18, 18, 2, 'im1'), c(8.5, 8.5, 1.5, 'im2'), p('M21 15l-5-5L5 21', 'im3')]);
export const Download = makeIcon([p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'do1'), p('M7 10l5 5 5-5', 'do2'), l(12, 15, 12, 3, 'do3')]);
export const Trash    = makeIcon([p('M3 6h18', 'tr1'), p('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'tr2'), p('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'tr3')]);
export const Eye      = makeIcon([p('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'e1'), c(12, 12, 3, 'e2')]);
export const Lock     = makeIcon([r(3, 11, 18, 11, 2, 'lo1'), p('M7 11V7a5 5 0 0 1 10 0v4', 'lo2')]);
export const Grid     = makeIcon([r(3, 3, 7, 7, 1, 'g1'), r(14, 3, 7, 7, 1, 'g2'), r(14, 14, 7, 7, 1, 'g3'), r(3, 14, 7, 7, 1, 'g4')]);
export const List     = makeIcon([l(8, 6, 21, 6, 'li1'), l(8, 12, 21, 12, 'li2'), l(8, 18, 21, 18, 'li3'), l(3, 6, 3.01, 6, 'li4'), l(3, 12, 3.01, 12, 'li5'), l(3, 18, 3.01, 18, 'li6')]);
export const ExternalLink = makeIcon([p('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'el1'), p('M15 3h6v6', 'el2'), l(10, 14, 21, 3, 'el3')]);
export const Link     = makeIcon([p('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'lk1'), p('M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', 'lk2')]);
export const Camera   = makeIcon([p('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', 'cm1'), c(12, 13, 4, 'cm2')]);
export const ShieldCheck = makeIcon([p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'sh1'), p('M9 12l2 2 4-4', 'sh2')]);
export const LogOut   = makeIcon([p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'lo1'), p('M16 17l5-5-5-5', 'lo2'), l(21, 12, 9, 12, 'lo3')]);
export const Sun      = makeIcon([c(12, 12, 5, 'su1'), l(12, 1, 12, 3, 'su2'), l(12, 21, 12, 23, 'su3'), l(4.22, 4.22, 5.64, 5.64, 'su4'), l(18.36, 18.36, 19.78, 19.78, 'su5'), l(1, 12, 3, 12, 'su6'), l(21, 12, 23, 12, 'su7'), l(4.22, 19.78, 5.64, 18.36, 'su8'), l(18.36, 5.64, 19.78, 4.22, 'su9')]);
export const Cloud    = makeIcon([p('M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z', 'cl1')]);
export const CloudRain = makeIcon([p('M16 13v8', 'cr1'), p('M8 13v8', 'cr2'), p('M12 15v8', 'cr3'), p('M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25', 'cr4')]);
export const Wind     = makeIcon([p('M9.59 4.59A2 2 0 1 1 11 8H2', 'wi1'), p('M17.73 2.27A2.5 2.5 0 1 1 19.5 6.5H2', 'wi2'), p('M9.6 16A2 2 0 1 1 11 19.4H2', 'wi3')]);
