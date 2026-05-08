'use client';
import { useEffect, useState, useMemo } from 'react';
import * as db from '../../lib/database';
import { Stat, Avatar, Segmented, SearchInput, Button, StatusPill } from '../ui';
import {
  Upload,
  Download,
  File,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  X,
} from '../icons';
import { formatDate, formatRelative, formatWeight } from '../../lib/format';
import PipelineCard from '../studio/PipelineCard';

// Drawing-type metadata (matches DRAW_TYPES = ['civil','ga','fabrication','sheeting'])
const DRAW_TYPE_META = {
  civil: { label: 'Civil', color: 'var(--cat-anchor)', shortLabel: 'CIV' },
  ga: { label: 'General Arrangement', color: 'var(--cat-builtup)', shortLabel: 'GA' },
  fabrication: { label: 'Fabrication', color: 'var(--status-progress)', shortLabel: 'FAB' },
  sheeting: { label: 'Sheeting', color: 'var(--cat-cladding)', shortLabel: 'SHT' },
};

const DRAW_STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Revised'];

const ROLE_LABEL = {
  pm: 'PM',
  fab: 'FAB',
  dispatch: 'DISP',
  site: 'SITE',
  client: 'CLIENT',
  viewer: 'VIEW',
};

export default function InfoTab({ project, auth, onUpdated }) {
  const [drawings, setDrawings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [parts, setParts] = useState([]);
  const [accessList, setAccessList] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [drawingFilter, setDrawingFilter] = useState('all');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({ ...project }));
  const [drawLinks, setDrawLinks] = useState({});

  useEffect(() => {
    db.getDrawings(project.id).then(setDrawings).catch(() => {});
    db.getActivityLog(project.id, 30).then(setLogs).catch(() => {});
    db.getParts(project.id).then(setParts).catch(() => {});
    if (auth.isPM) {
      db.getProjectAccess(project.id).then(setAccessList).catch(() => {});
      db.getAllUsers().then(setAllUsers).catch(() => {});
    }
  }, [project.id, auth.isPM]);

  // Derived: total weight across all parts
  const totalWeightKg = useMemo(
    () =>
      parts.reduce(
        (a, p) => a + (Number(p.weight) || 0) * (Number(p.qty) || 0),
        0
      ),
    [parts]
  );

  const filteredDrawings = useMemo(() => {
    return DRAW_TYPES_ORDER
      .filter((t) => drawingFilter === 'all' || t === drawingFilter)
      .map((type) => {
        const existing = drawings.find((d) => d.drawing_type === type);
        return {
          type,
          status: existing?.status || 'Not Started',
          revision: existing?.revision || 0,
          link: existing?.link || '',
          remarks: existing?.remarks || '',
          updated_at: existing?.updated_at,
          id: existing?.id,
        };
      });
  }, [drawings, drawingFilter]);

  async function updateDrawing(type, field, value) {
    if (!auth.isPM) return;
    const existing = drawings.find((d) => d.drawing_type === type);
    const drawData = {
      project_id: project.id,
      drawing_type: type,
      status: existing?.status || 'Not Started',
      revision: existing?.revision || 0,
      link: existing?.link || '',
      remarks: existing?.remarks || '',
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    };
    drawData[field] = value;
    if (field === 'status') {
      drawData.revision =
        (existing?.revision || 0) + (value === 'Revised' ? 1 : 0);
      if (existing) {
        await db.addDrawingHistory({
          drawing_id: existing.id,
          old_status: existing.status,
          new_status: value,
          revision: drawData.revision,
          changed_by: auth.user.id,
        });
      }
    }
    await db.upsertDrawing(drawData);
    await db.logActivity({
      project_id: project.id,
      action_type: 'drawing_update',
      details:
        type +
        ' drawing → ' +
        (field === 'status' ? value : 'updated ' + field),
      user_name: auth.userName,
      user_role: auth.role,
    });
    db.getDrawings(project.id).then(setDrawings);
  }

  async function saveEdit() {
    try {
      const updated = await db.updateProject(project.id, form);
      await db.logActivity({
        project_id: project.id,
        action_type: 'project_edit',
        details: 'Edited project details',
        user_name: auth.userName,
        user_role: auth.role,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      alert(e.message);
    }
  }

  function setField(name, val) {
    setForm((prev) => ({ ...prev, [name]: val }));
  }

  async function grantAccess(userId) {
    try {
      await db.grantProjectAccess(project.id, userId);
      const u = allUsers.find((x) => x.id === userId);
      await db.logActivity({
        project_id: project.id,
        action_type: 'project_edit',
        details:
          'Granted access to ' + (u ? `${u.name} (${u.role})` : userId),
        user_name: auth.userName,
        user_role: auth.role,
      });
      db.getProjectAccess(project.id).then(setAccessList);
    } catch (e) {
      if (e.message?.includes('duplicate')) alert('User already has access');
      else alert('Error: ' + e.message);
    }
  }

  async function revokeAccess(userId) {
    const u = allUsers.find((x) => x.id === userId);
    if (!confirm(`Remove access for ${u ? u.name : 'this user'}?`)) return;
    try {
      await db.revokeProjectAccess(project.id, userId);
      await db.logActivity({
        project_id: project.id,
        action_type: 'project_edit',
        details:
          'Revoked access from ' + (u ? `${u.name} (${u.role})` : userId),
        user_name: auth.userName,
        user_role: auth.role,
      });
      db.getProjectAccess(project.id).then(setAccessList);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  const assignedIds = useMemo(() => {
    const m = {};
    accessList.forEach((a) => (m[a.user_id] = true));
    return m;
  }, [accessList]);

  const unassignedUsers = useMemo(
    () => allUsers.filter((u) => !assignedIds[u.id] && u.role !== 'pm'),
    [allUsers, assignedIds]
  );

  return (
    <div
      className="animate-fade grid-stack-mobile grid-2col-rail"
      style={{
        padding: '20px 28px 40px',
      }}
    >
      {/* ==== LEFT COLUMN ==== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {/* Project details card */}
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div className="t-overline">Project details</div>
            {auth.isPM &&
              (editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="accent" onClick={saveEdit}>
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setForm({ ...project });
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              ))}
          </div>

          {editing ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {EDITABLE_FIELDS.map((f) => (
                <div key={f.name} style={f.full ? { gridColumn: 'span 2' } : {}}>
                  <label
                    className="t-overline"
                    style={{ display: 'block', marginBottom: 4 }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.name] || ''}
                    onChange={(e) => setField(f.name, e.target.value)}
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="grid-4col-stats"
              style={{ gap: 20 }}
            >
              <Stat label="Project code" value={project.project_no || '—'} />
              {project.job_no && <Stat label="Job no" value={project.job_no} />}
              {project.client_name && (
                <Stat label="Client" value={project.client_name} mono={false} />
              )}
              {project.location && (
                <Stat label="Location" value={project.location} mono={false} />
              )}
              {project.poc_name && (
                <Stat
                  label="POC"
                  value={project.poc_name}
                  sub={project.poc_phone || undefined}
                  mono={false}
                />
              )}
              {project.builtup_area_sqm && (
                <Stat
                  label="Built-up area"
                  value={Number(project.builtup_area_sqm).toLocaleString('en-IN')}
                  sub="m²"
                />
              )}
              {totalWeightKg > 0 && (
                <Stat
                  label="Total weight"
                  value={formatWeight(totalWeightKg).replace(' MT', '').replace(' kg', '')}
                  sub={totalWeightKg >= 1000 ? 'MT' : 'kg'}
                />
              )}
              {project.start_date && (
                <Stat
                  label="Start date"
                  value={formatDate(project.start_date).slice(0, 6)}
                  sub={formatDate(project.start_date).slice(7)}
                />
              )}
              {project.target_date && (
                <Stat
                  label="Handover"
                  value={formatDate(project.target_date).slice(0, 6)}
                  sub={formatDate(project.target_date).slice(7)}
                  color="var(--accent)"
                />
              )}
              {project.paint_color && (
                <Stat label="Paint" value={project.paint_color} mono={false} />
              )}
            </div>
          )}

          {/* Useful links row (read-only) */}
          {!editing && (project.quotation_link || project.weight_excel_link || project.location_link) && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--line)',
              }}
            >
              {project.quotation_link && (
                <a
                  href={project.quotation_link}
                  target="_blank"
                  rel="noreferrer"
                  className="chip"
                  style={{ textDecoration: 'none', gap: 6 }}
                >
                  <File size={12} />
                  Quotation
                  <ExternalLink size={11} color="var(--ink-400)" />
                </a>
              )}
              {project.weight_excel_link && (
                <a
                  href={project.weight_excel_link}
                  target="_blank"
                  rel="noreferrer"
                  className="chip"
                  style={{ textDecoration: 'none', gap: 6 }}
                >
                  <File size={12} />
                  Weight Excel
                  <ExternalLink size={11} color="var(--ink-400)" />
                </a>
              )}
              {project.location_link && (
                <a
                  href={project.location_link}
                  target="_blank"
                  rel="noreferrer"
                  className="chip"
                  style={{ textDecoration: 'none', gap: 6 }}
                >
                  <LinkIcon size={12} />
                  Location map
                  <ExternalLink size={11} color="var(--ink-400)" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Drawing pipeline card (Pass 4) */}
        <PipelineCard project={project} auth={auth} />
      </div>

      {/* ==== RIGHT COLUMN ==== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {/* Activity feed */}
        <div className="card" style={{ padding: 18 }}>
          <div className="t-overline" style={{ marginBottom: 12 }}>
            Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 360, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-400)', padding: 8 }}>
                No activity yet
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} style={{ display: 'flex', gap: 10 }}>
                  <Avatar name={l.user_name || '?'} size={28} />
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      <b style={{ fontWeight: 600 }}>{l.user_name || '?'}</b>
                      {l.user_role && (
                        <span
                          className="mono"
                          style={{
                            marginLeft: 6,
                            padding: '0 5px',
                            fontSize: 10.5,
                            background: 'var(--surface-2)',
                            color: 'var(--ink-500)',
                            borderRadius: 3,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}
                        >
                          {ROLE_LABEL[l.user_role] || l.user_role.toUpperCase()}
                        </span>
                      )}
                      <span style={{ color: 'var(--ink-700)' }}>
                        {' '}{l.details}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                      {formatRelative(l.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Project access (PM only) */}
        {auth.isPM && (
          <div className="card" style={{ padding: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div className="t-overline">Project team</div>
              <span className="chip">
                <span className="mono tnum">{accessList.length}</span> user
                {accessList.length === 1 ? '' : 's'}
              </span>
            </div>
            {accessList.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-400)', padding: 8, textAlign: 'center' }}>
                Only PMs see this project
              </div>
            ) : (
              accessList.map((a) => {
                const role = a.profiles?.role || '?';
                const name = a.profiles?.name || 'Unknown';
                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <Avatar name={name} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {name}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-500)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {ROLE_LABEL[role] || role}
                      </div>
                    </div>
                    <button
                      onClick={() => revokeAccess(a.user_id)}
                      className="btn btn-ghost btn-sm btn-icon"
                      style={{ width: 26, height: 26, padding: 0 }}
                      title="Revoke access"
                    >
                      <X size={13} color="var(--status-alert)" />
                    </button>
                  </div>
                );
              })
            )}
            {unassignedUsers.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="t-overline" style={{ marginBottom: 8 }}>
                  Add user
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {unassignedUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => grantAccess(u.id)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        justifyContent: 'flex-start',
                        height: 30,
                        padding: '0 8px',
                      }}
                    >
                      <Plus size={12} color="var(--accent)" />
                      <span style={{ flex: 1, textAlign: 'left' }}>
                        {u.name || u.id.substring(0, 8)}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-500)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const DRAW_TYPES_ORDER = ['ga', 'fabrication', 'civil', 'sheeting'];

const EDITABLE_FIELDS = [
  { name: 'project_no', label: 'Project no' },
  { name: 'job_no', label: 'Job no' },
  { name: 'client_name', label: 'Client name' },
  { name: 'location', label: 'Location' },
  { name: 'poc_name', label: 'POC name' },
  { name: 'poc_phone', label: 'POC phone', type: 'tel' },
  { name: 'builtup_area_sqm', label: 'Built-up area (m²)', type: 'number' },
  { name: 'paint_color', label: 'Paint color' },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'target_date', label: 'Target handover date', type: 'date' },
  { name: 'lat', label: 'Latitude', type: 'number' },
  { name: 'lng', label: 'Longitude', type: 'number' },
  { name: 'billing_address', label: 'Billing address', full: true },
  { name: 'shipping_address', label: 'Shipping address', full: true },
  { name: 'quotation_link', label: 'Quotation link', type: 'url', full: true },
  { name: 'weight_excel_link', label: 'Weight Excel link', type: 'url', full: true },
  { name: 'location_link', label: 'Location map link', type: 'url', full: true },
];
