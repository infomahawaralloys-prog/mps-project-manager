'use client';
import { useState, useEffect, useMemo } from 'react';
import * as db from '../../lib/database';
import { Segmented } from '../ui';
import * as Icons from '../icons';
import Dashboard from './erection/Dashboard';
import Viewer3D from './erection/Viewer3D';
import Quality from './erection/Quality';
import Setup from './erection/Setup';
import MarksTable from './erection/MarksTable';

const SUB_TABS = [
  { value: 'dashboard', label: 'Dashboard', icon: 'Grid' },
  { value: 'marks', label: 'Marks', icon: 'List' },
  { value: '3d', label: '3D View', icon: 'Cube3D' },
  { value: 'quality', label: 'Quality', icon: 'ShieldCheck' },
  { value: 'setup', label: 'Setup', icon: 'Settings' },
];

export default function ErectionTab({ project, auth }) {
  const [subTab, setSubTab] = useState(
    auth.role === 'client' ? '3d' : 'dashboard'
  );

  const [parts, setParts] = useState([]);
  const [erectionRecords, setErectionRecords] = useState([]);
  const [snags, setSnags] = useState([]);
  const [bolts, setBolts] = useState([]);
  const [safety, setSafety] = useState([]);
  const [fabSummary, setFabSummary] = useState({});
  const [dispatchedPartIds, setDispatchedPartIds] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [project.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, er, sn, bl, sf, fs, disp] = await Promise.all([
        db.getParts(project.id),
        db.getErectionRecords(project.id),
        db.getSnags(project.id),
        db.getBoltRecords(project.id),
        db.getSafetyChecks(project.id),
        db.getFabSummary(project.id),
        db.getDispatches(project.id),
      ]);
      setParts(p || []);
      setErectionRecords(er || []);
      setSnags(sn || []);
      setBolts(bl || []);
      setSafety(sf || []);
      setFabSummary(fs || {});

      const dispMap = {};
      (disp || []).forEach((d) => {
        if (d.dispatch_parts) {
          d.dispatch_parts.forEach((dp) => {
            dispMap[dp.part_id] = (dispMap[dp.part_id] || 0) + dp.qty;
          });
        }
      });
      setDispatchedPartIds(dispMap);
    } catch (e) {
      console.error('Erection loadAll', e);
    }
    setLoading(false);
  }

  const erectedPartIds = useMemo(() => {
    const m = {};
    erectionRecords.forEach((r) => (m[r.part_id] = r));
    return m;
  }, [erectionRecords]);

  const visibleSubTabs = SUB_TABS.filter((st) => {
    if (auth.role === 'client') return st.value === 'dashboard' || st.value === '3d';
    if (st.value === 'setup') return auth.isPM;
    return true;
  });

  useEffect(() => {
    if (!visibleSubTabs.find((st) => st.value === subTab)) {
      setSubTab(visibleSubTabs[0]?.value || 'dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.role]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div
          className="animate-spin"
          style={{
            width: 24,
            height: 24,
            border: '2px solid var(--surface-3)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            margin: '0 auto',
          }}
        />
      </div>
    );
  }

  const openSnags = snags.filter((s) => s.status === 'Open').length;

  return (
    <div className="animate-fade" style={{ padding: '20px 28px 60px' }}>
      <div
        style={{
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Segmented
          value={subTab}
          onChange={setSubTab}
          options={visibleSubTabs}
          size="md"
        />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {openSnags > 0 && (
            <span className="badge-alert">
              {openSnags} open snag{openSnags === 1 ? '' : 's'}
            </span>
          )}
          <span className="badge-progress">
            {erectionRecords.length}/{parts.length} erected
          </span>
        </div>
      </div>

      {subTab === 'dashboard' && (
        <Dashboard
          project={project}
          parts={parts}
          erectionRecords={erectionRecords}
          snags={snags}
          bolts={bolts}
          fabSummary={fabSummary}
          dispatchedPartIds={dispatchedPartIds}
        />
      )}

      {subTab === 'marks' && (
        <MarksTable
          project={project}
          auth={auth}
          parts={parts}
          fabSummary={fabSummary}
          erectionRecords={erectionRecords}
          dispatchedPartIds={dispatchedPartIds}
          onChanged={loadAll}
        />
      )}

      {subTab === '3d' && (
        <Viewer3D
          project={project}
          parts={parts}
          auth={auth}
          erectedPartIds={erectedPartIds}
          dispatchedPartIds={dispatchedPartIds}
          onChanged={loadAll}
        />
      )}

      {subTab === 'quality' && (
        <Quality
          project={project}
          auth={auth}
          snags={snags}
          safety={safety}
          bolts={bolts}
          onChanged={loadAll}
        />
      )}

      {subTab === 'setup' && auth.isPM && (
        <Setup project={project} auth={auth} parts={parts} onChanged={loadAll} />
      )}
    </div>
  );
}
