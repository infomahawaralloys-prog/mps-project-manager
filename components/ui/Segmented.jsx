'use client';
import * as Icons from '../icons';

// Segmented control. options: [{ value, label, icon? }]
export default function Segmented({ options, value, onChange, size = 'md' }) {
  const h = size === 'sm' ? 28 : 32;
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 2,
        gap: 2,
        background: 'var(--surface-2)',
        borderRadius: 8,
        border: '1px solid var(--line)',
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const IconComp = o.icon ? Icons[o.icon] : null;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              height: h,
              padding: size === 'sm' ? '0 10px' : '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: size === 'sm' ? 12 : 13,
              fontWeight: 500,
              border: 'none',
              background: active ? 'var(--surface-1)' : 'transparent',
              color: active ? 'var(--ink-900)' : 'var(--ink-500)',
              borderRadius: 6,
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 120ms, color 120ms',
              fontFamily: 'inherit',
            }}
          >
            {IconComp && <IconComp size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
