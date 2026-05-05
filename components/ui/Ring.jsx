'use client';
// SVG progress ring. Default 44px, 3.5px stroke. Numeric label inside.

export default function Ring({
  value = 0,
  size = 44,
  stroke = 3.5,
  color = 'var(--accent)',
  track = 'var(--surface-3)',
  showLabel = true,
}) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (safe / 100);
  const isComplete = safe >= 100;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 400ms cubic-bezier(.2,.6,.2,1)' }}
        />
      </svg>
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: size * 0.28,
            fontWeight: 600,
            color: isComplete ? color : 'var(--ink-900)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(safe)}
        </div>
      )}
    </div>
  );
}
