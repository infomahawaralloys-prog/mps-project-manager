'use client';
// Horizontal progress bar. 4-6px tall.

export default function Bar({ value = 0, color = 'var(--accent)', height = 6 }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'var(--surface-3)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${safe}%`,
          height: '100%',
          background: color,
          borderRadius: 999,
          transition: 'width 500ms cubic-bezier(.2,.6,.2,1)',
        }}
      />
    </div>
  );
}
