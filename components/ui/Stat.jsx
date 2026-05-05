'use client';

export default function Stat({
  label,
  value,
  sub,
  color = 'var(--ink-900)',
  mono = true,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <div className="t-overline">{label}</div>
      <div
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          fontSize: 22,
          fontWeight: 600,
          color,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      {sub && <div className="t-caption">{sub}</div>}
    </div>
  );
}
