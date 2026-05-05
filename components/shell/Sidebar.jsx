'use client';
import { useState, useMemo } from 'react';
import Logo from './Logo';
import { Avatar } from '../ui';
import { Plus, Search, LogOut, Settings } from '../icons';

// ---------------------------------------------------------------------
// Sidebar — persistent project list.
//   props:
//     auth         — useAuth() value
//     projects     — array from db.getProjects() (filtered by access for client role)
//     selectedId   — currently-open project id, or null
//     onSelect(p)  — called when user clicks a project row
//     onCreate()   — called when user clicks "+ New Project" (PM only)
// ---------------------------------------------------------------------
export default function Sidebar({
  auth,
  projects = [],
  selectedId,
  onSelect,
  onCreate,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');

  const grouped = useMemo(() => {
    const filtered = projects.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (p.project_no || '').toLowerCase().includes(q) ||
        (p.job_no || '').toLowerCase().includes(q) ||
        (p.client_name || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q)
      );
    });
    return filtered;
  }, [projects, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { All: projects.length, Active: 0, Hold: 0, Completed: 0 };
    projects.forEach((p) => {
      if (c[p.status] != null) c[p.status]++;
    });
    return c;
  }, [projects]);

  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '16px 16px 14px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Logo />
      </div>

      {/* Search + filter */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div className="input" style={{ height: 32, marginBottom: 8 }}>
          <Search size={14} color="var(--ink-400)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Active', 'Hold', 'Completed', 'All'].map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  flex: 1,
                  height: 24,
                  border: 'none',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: active ? 'var(--ink-900)' : 'var(--ink-500)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
                title={`${counts[s]} ${s.toLowerCase()}`}
              >
                {s}
                {counts[s] > 0 && (
                  <span
                    className="mono tnum"
                    style={{
                      fontSize: 10,
                      color: active ? 'var(--ink-500)' : 'var(--ink-400)',
                    }}
                  >
                    {counts[s]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section header + add */}
      <div
        style={{
          padding: '10px 16px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="t-overline">Projects</div>
        {auth.isPM && (
          <button
            onClick={onCreate}
            className="btn-icon btn-sm btn btn-ghost"
            title="New project"
            style={{ width: 24, height: 24, padding: 0 }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Project list */}
      <div style={{ padding: '0 8px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {grouped.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--ink-400)',
            }}
          >
            {search ? 'No matching projects' : 'No projects yet'}
          </div>
        ) : (
          grouped.map((p) => {
            const active = selectedId === p.id;
            const statusColor =
              p.status === 'Active'
                ? 'var(--status-done)'
                : p.status === 'Hold'
                ? 'var(--status-progress)'
                : 'var(--ink-300)';
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  margin: '1px 0',
                  background: active ? 'var(--accent-tint)' : 'transparent',
                  cursor: 'pointer',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: active ? 'var(--accent)' : statusColor,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: active ? 'var(--accent)' : 'var(--ink-400)',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {p.project_no}
                    {p.job_no ? ` · ${p.job_no}` : ''}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--ink-900)' : 'var(--ink-700)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.client_name || p.location || p.project_no}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* User card */}
      <div
        style={{
          padding: 12,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Avatar name={auth.userName || 'User'} size={28} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {auth.userName || '—'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-500)',
              textTransform: 'capitalize',
            }}
          >
            {ROLE_LABELS[auth.role] || auth.role || '—'}
          </div>
        </div>
        <button
          onClick={auth.signOut}
          className="btn btn-ghost btn-sm btn-icon"
          title="Sign out"
          style={{ width: 28, height: 28, padding: 0 }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}

const ROLE_LABELS = {
  pm: 'Project Manager',
  fab: 'Fabrication',
  dispatch: 'Dispatch',
  site: 'Site Engineer',
  client: 'Client',
  viewer: 'Viewer',
};
