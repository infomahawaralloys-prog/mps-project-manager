'use client';
import { LOGO_SRC } from '../../lib/logo';

export default function Logo({ compact = false, size = 28 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={LOGO_SRC}
        alt="Mahawar Prefab Solutions"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          flexShrink: 0,
          borderRadius: 6,
        }}
      />
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