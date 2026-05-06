// ============================================================
// Fabrication constants — moved out of legacy code.
// All values respect the new design system.
// ============================================================

// Stage flow
export const STAGES = ['cutting', 'fitting', 'qc', 'welding', 'painting'];
export const COLDFORM_STAGES = ['cutting'];

export const STAGE_LABELS = {
  cutting: 'Cutting',
  fitting: 'Fitting',
  qc: 'QC',
  welding: 'Welding',
  painting: 'Painting',
};

export const COLDFORM_STAGE_LABELS = {
  cutting: 'Roll Forming',
};

// Stage icons — Lucide names from components/icons.jsx
export const STAGE_ICONS = {
  cutting: 'Cut',
  fitting: 'Fit',
  qc: 'QC',
  welding: 'Weld',
  painting: 'Paint',
};

// Tonal stage colours that read well on light backgrounds
export const STAGE_COLORS = {
  cutting: '#B6711A',   // amber-bronze
  fitting: '#8A6020',   // deeper amber
  qc: '#5B4FBF',        // violet (inspection)
  welding: '#B33030',   // red (energy / heat)
  painting: '#117A4A',  // green (final completion)
};

export const STAGE_PERSONS = {
  fitting: 'Fitter',
  qc: 'Inspector',
  welding: 'Welder',
};

// Categories
export const CATEGORIES = [
  'anchor_bolts',
  'builtup',
  'coldform',
  'hardware',
  'roofing',
  'cladding',
  'accessories',
  'deck',
];

export const CAT_LABELS = {
  anchor_bolts: 'Anchor Bolts',
  builtup: 'Built-up',
  coldform: 'Cold-form',
  hardware: 'Hardware',
  roofing: 'Roofing',
  cladding: 'Cladding',
  accessories: 'Accessories',
  deck: 'Deck Sheet',
};

// Category icons — names from components/icons.jsx
export const CAT_ICONS = {
  anchor_bolts: 'Anchor',
  builtup: 'Beam',
  coldform: 'Coil',
  hardware: 'Bolt',
  roofing: 'Roof',
  cladding: 'Cladding',
  accessories: 'Nut',
  deck: 'Deck',
};

// Token-aligned category accent colours
export const CAT_COLORS = {
  anchor_bolts: 'var(--cat-anchor)',
  builtup: 'var(--cat-builtup)',
  coldform: 'var(--cat-coldform)',
  hardware: 'var(--cat-hardware)',
  roofing: 'var(--cat-roofing)',
  cladding: 'var(--cat-cladding)',
  accessories: 'var(--cat-accessories)',
  deck: 'var(--cat-deck)',
};

// Categories that go through the fabrication pipeline
export const FAB_PIPELINE_CATS = ['anchor_bolts', 'builtup', 'coldform', 'hardware'];

// Categories that are dispatch-only (bought in, no fab needed)
export const DISPATCH_ONLY_CATS = ['roofing', 'cladding', 'accessories', 'deck'];

// Helper: which stages apply for a given category
export function stagesFor(cat) {
  if (cat === 'coldform') return COLDFORM_STAGES;
  if (cat === 'builtup') return STAGES;
  return ['cutting']; // hardware, anchor_bolts: single stage
}

export function stageLabelsFor(cat) {
  if (cat === 'coldform') return COLDFORM_STAGE_LABELS;
  return STAGE_LABELS;
}
