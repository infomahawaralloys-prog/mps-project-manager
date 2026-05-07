'use client';
import IFC3DReal from '../../IFC3DReal';

// Thin wrapper around IFC3DReal. The internal Three.js scene
// keeps its dark CAD-style background (recommendation 3a).
// We just place it inside a card with full-tab height and a
// subtle border, so it visually integrates with the rest of
// the new design.

export default function Viewer3D({
  project,
  parts,
  auth,
  erectedPartIds,
  dispatchedPartIds,
  onChanged,
}) {
  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        background: 'var(--surface-1)',
      }}
    >
      <IFC3DReal
        project={project}
        parts={parts}
        auth={auth}
        erectedPartIds={erectedPartIds}
        dispatchedPartIds={dispatchedPartIds}
        onChanged={onChanged}
      />
    </div>
  );
}
