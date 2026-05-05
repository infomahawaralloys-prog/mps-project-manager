'use client';

export default function Logo({ compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'var(--ink-900)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 13,
            color: '#fff',
            letterSpacing: '-0.02em',
          }}
        >
          M
        </div>
        <div
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--accent)',
          }}
        />
      </div>
      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Mahawar
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-500)',
              letterSpacing: '0.03em',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            PREFAB OS
          </div>
        </div>
      )}
    </div>
  );
}
