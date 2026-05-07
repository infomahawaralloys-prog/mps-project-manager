'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactDOM from 'react-dom';
import { useAuth } from '../lib/auth-context';
import * as db from '../lib/database';

import Sidebar from '../components/shell/Sidebar';
import ProjectHeader from '../components/shell/ProjectHeader';
import Tabs from '../components/shell/Tabs';
import Logo from '../components/shell/Logo';
import InfoTab from '../components/tabs/InfoTab';
import FabTab from '../components/tabs/FabTab';
import DispatchTab from '../components/tabs/DispatchTab';
import ErectionTab from '../components/tabs/ErectionTab';
import { CreateProjectForm } from '../components/tabs/legacy-tabs';
import { Button } from '../components/ui';
import { Plus, X } from '../components/icons';

// localStorage keys
const LS_TAB = 'mps_tab';
const LS_PROJECT = 'mps_project_id';

export default function Page() {
  const auth = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('info');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth gate
  useEffect(() => {
    if (!auth.loading && !auth.user) router.push('/login');
  }, [auth.loading, auth.user, router]);

  // Restore tab from localStorage (or set role-appropriate default)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem(LS_TAB);
    if (t && ['info', 'fab', 'dispatch', 'erection'].includes(t)) {
      setTab(t);
    } else if (auth.role === 'client') {
      setTab('erection');
    } else if (auth.role === 'fab') {
      setTab('fab');
    } else if (auth.role === 'dispatch') {
      setTab('dispatch');
    } else if (auth.role === 'site') {
      setTab('erection');
    }
  }, [auth.role]);

  // Persist tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LS_TAB, tab);
  }, [tab]);

  // Load projects (with client-role access filtering)
  useEffect(() => {
    if (!auth.user) return;
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, auth.role]);

  async function loadProjects() {
    setLoading(true);
    try {
      let list = await db.getProjects();
      if (auth.role === 'client' && auth.user) {
        // Match original pattern: filter projects to those the client has access to.
        const accessible = [];
        for (let i = 0; i < list.length; i++) {
          const access = await db.getProjectAccess(list[i].id);
          if (access.some((a) => a.user_id === auth.user.id)) {
            accessible.push(list[i]);
          }
        }
        list = accessible;
      }
      setProjects(list || []);

      // Restore last-opened project
      let restoreId = null;
      if (typeof window !== 'undefined') {
        restoreId = localStorage.getItem(LS_PROJECT);
      }
      if (restoreId && (list || []).find((p) => p.id === restoreId)) {
        setSelectedId(restoreId);
      } else if (list && list.length > 0 && !selectedId) {
        // Auto-select the first active project
        const firstActive = list.find((p) => p.status === 'Active') || list[0];
        setSelectedId(firstActive.id);
      }
    } catch (e) {
      console.error('loadProjects', e);
    }
    setLoading(false);
  }

  function handleSelectProject(p) {
    setSelectedId(p.id);
    if (typeof window !== 'undefined') localStorage.setItem(LS_PROJECT, p.id);
  }

  async function handleCreated() {
    setShowCreate(false);
    await loadProjects();
  }

  const selectedProject = projects.find((p) => p.id === selectedId);

  // ----- Render guards -----
  if (auth.loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="t-caption">Loading…</div>
      </div>
    );
  }
  if (!auth.user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        auth={auth}
        projects={projects}
        selectedId={selectedId}
        onSelect={handleSelectProject}
        onCreate={() => setShowCreate(true)}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedProject ? (
          <>
            <ProjectHeader
              project={selectedProject}
              onBackToList={() => setSelectedId(null)}
            />
            <Tabs
              active={tab}
              onChange={setTab}
              auth={auth}
              search={search}
              onSearchChange={setSearch}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {tab === 'info' && (
                <InfoTab
                  project={selectedProject}
                  auth={auth}
                  onUpdated={(p) => {
                    setProjects((prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, ...p } : x))
                    );
                  }}
                />
              )}
              {tab === 'fab' && (
                <FabTab project={selectedProject} auth={auth} />
              )}
              {tab === 'dispatch' && (
                <DispatchTab project={selectedProject} auth={auth} />
              )}
              {tab === 'erection' && (
                <ErectionTab project={selectedProject} auth={auth} />
              )}
            </div>
          </>
        ) : (
          <EmptyState
            loading={loading}
            isPM={auth.isPM}
            onCreate={() => setShowCreate(true)}
          />
        )}
      </main>

      {showCreate && (
        <CreateModal
          auth={auth}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------
// Empty state when no project is selected
// -----------------------------------------------------------------
function EmptyState({ loading, isPM, onCreate }) {
  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-500)',
        }}
      >
        <div className="t-caption">Loading projects…</div>
      </div>
    );
  }
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 380,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
        >
          <Logo compact />
        </div>
        <div>
          <h2 className="t-h2" style={{ marginBottom: 6 }}>
            Pick a project
          </h2>
          <p
            style={{
              color: 'var(--ink-500)',
              fontSize: 13.5,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Choose one from the list on the left to see its info, fabrication,
            dispatch and erection status.
          </p>
        </div>
        {isPM && (
          <Button variant="accent" icon={Plus} onClick={onCreate}>
            New project
          </Button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// Create-project modal — wraps the legacy CreateProjectForm in a
// portal-rendered overlay for now.
// -----------------------------------------------------------------
function CreateModal({ auth, onCreated, onCancel }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,16,0.45)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card animate-fade"
        style={{
          width: '100%',
          maxWidth: 720,
          padding: 24,
          boxShadow: 'var(--shadow-lg)',
          background: 'var(--surface-1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 className="t-h2" style={{ margin: 0 }}>
            New project
          </h2>
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-icon btn-sm"
            title="Close"
            style={{ width: 32, height: 32 }}
          >
            <X size={16} />
          </button>
        </div>
        <CreateProjectForm
          auth={auth}
          onCreated={onCreated}
          onCancel={onCancel}
        />
      </div>
    </div>,
    document.body
  );
}
