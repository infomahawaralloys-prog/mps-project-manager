'use client';
import { Info, Fab, Truck, Crane } from '../icons';
import { SearchInput } from '../ui';

const ALL_TABS = [
  { key: 'info', label: 'Info', Icon: Info },
  { key: 'fab', label: 'Fabrication', Icon: Fab },
  { key: 'dispatch', label: 'Dispatch', Icon: Truck },
  { key: 'erection', label: 'Erection', Icon: Crane },
];

export default function Tabs({ active, onChange, auth, search, onSearchChange }) {
  // Role gating identical to the original page.js logic
  function visible(t) {
    if (auth.isPM) return true;
    if (auth.role === 'client') return t === 'erection' || t === 'info';
    if (t === 'fab') return auth.isFab;
    if (t === 'dispatch') return auth.isDispatch;
    if (t === 'erection') return auth.isSite;
    return t === 'info';
  }

  const tabs = ALL_TABS.filter((t) => visible(t.key));

  return (
    <div
      className="tabs-strip"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '0 28px',
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: on ? 'var(--ink-900)' : 'var(--ink-500)',
              fontSize: 13.5,
              fontWeight: on ? 600 : 500,
              position: 'relative',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <t.Icon size={15} />
            {t.label}
            {on && (
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  bottom: -1,
                  height: 2,
                  background: 'var(--ink-900)',
                  borderRadius: 2,
                }}
              />
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <div
        className="hide-on-mobile"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
        }}
      >
        <SearchInput
          value={search || ''}
          onChange={onSearchChange || (() => {})}
          placeholder="Search marks, drawings, dispatches…"
          width={280}
        />
      </div>
    </div>
  );
}
