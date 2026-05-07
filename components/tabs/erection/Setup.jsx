'use client';
import { useState, useEffect } from 'react';
import * as db from '../../../lib/database';
import { Button } from '../../ui';
import * as Icons from '../../icons';
import { formatRelative } from '../../../lib/format';

export default function Setup({ project, auth, parts, onChanged }) {
  const [ifcMarks, setIfcMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);

  useEffect(() => { loadIfc(); }, [project.id]);

  async function loadIfc() {
    try {
      const data = await db.getIfcMarks(project.id);
      setIfcMarks(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split('\n');
        const elements = {};
        const propSets = {};

        lines.forEach((line) => {
          line = line.trim();
          if (!line || line.charAt(0) !== '#') return;
          const eqIdx = line.indexOf('=');
          if (eqIdx < 0) return;
          const id = line.substring(0, eqIdx).trim();
          const rest = line.substring(eqIdx + 1).trim();

          if (rest.indexOf('IFCELEMENTASSEMBLY') >= 0) {
            elements[id] = { id, raw: rest };
          }
          if (
            rest.indexOf('IFCPROPERTYSINGLEVALUE') >= 0 &&
            rest.indexOf('ASSEMBLY_POS') >= 0
          ) {
            const valMatch =
              rest.match(/IFCTEXT\('([^']*)'\)/i) ||
              rest.match(/IFCLABEL\('([^']*)'\)/i);
            if (valMatch) propSets[id] = valMatch[1];
          }
        });

        const extractedMarks = [];
        const markSet = {};

        Object.keys(propSets).forEach((psId) => {
          const mark = propSets[psId];
          if (mark && !markSet[mark]) {
            markSet[mark] = true;
            extractedMarks.push({
              ifc_element_id: psId,
              ifc_mark: mark,
              ifc_type: 'ASSEMBLY_POS',
            });
          }
        });

        if (extractedMarks.length === 0) {
          Object.keys(elements).forEach((eId) => {
            const raw = elements[eId].raw;
            const nameMatch = raw.match(/'([^']+)'/);
            if (nameMatch) {
              const mark = nameMatch[1];
              if (!markSet[mark]) {
                markSet[mark] = true;
                extractedMarks.push({
                  ifc_element_id: eId,
                  ifc_mark: mark,
                  ifc_type: 'ELEMENT_NAME',
                });
              }
            }
          });
        }

        if (extractedMarks.length === 0) {
          alert('No marks found in IFC file');
          setParsing(false);
          return;
        }

        let matched = 0;
        const ifcData = extractedMarks.map((em) => {
          const normalizedMark = em.ifc_mark.trim().toUpperCase().replace(/[\s_-]/g, '');
          const matchedPart = parts.find((p) => {
            const np = (p.mark || '').trim().toUpperCase().replace(/[\s_-]/g, '');
            return np === normalizedMark;
          });
          if (matchedPart) matched++;
          return {
            project_id: project.id,
            ifc_element_id: em.ifc_element_id,
            ifc_mark: em.ifc_mark,
            ifc_type: em.ifc_type,
            part_id: matchedPart ? matchedPart.id : null,
            matched: !!matchedPart,
          };
        });

        await db.clearIfcMarks(project.id);
        await db.upsertIfcMarks(ifcData);
        try {
          await db.uploadIfcFile(project.id, file);
        } catch (upErr) {
          console.warn('Storage upload failed:', upErr);
        }
        await db.logActivity({
          project_id: project.id,
          action_type: 'ifc_upload',
          details: `IFC uploaded: ${extractedMarks.length} elements, ${matched} matched`,
          user_name: auth.userName,
          user_role: auth.role,
        });
        loadIfc();
        if (onChanged) onChanged();
        alert(`IFC parsed: ${extractedMarks.length} marks found, ${matched} auto-matched`);
      } catch (err) {
        alert('Error parsing IFC: ' + err.message);
      }
      setParsing(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function manualMatch(ifcId, partId) {
    try {
      await db.updateIfcMapping(ifcId, partId);
      loadIfc();
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-500)' }}>
        Loading IFC data…
      </div>
    );
  }

  const matched = ifcMarks.filter((m) => m.matched);
  const unmatched = ifcMarks.filter((m) => !m.matched);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload card */}
      <div className="card" style={{ padding: 22 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="t-overline" style={{ marginBottom: 4 }}>
              IFC mark matching
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {ifcMarks.length === 0
                ? 'No IFC file uploaded yet'
                : `${ifcMarks.length} marks parsed`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>
              Upload a .ifc file from Tekla, Revit or Advance Steel — marks
              auto-match to your BOM.
            </div>
          </div>
          {auth.isPM && (
            <label
              className="btn btn-accent"
              style={{ cursor: parsing ? 'wait' : 'pointer' }}
            >
              <Icons.Upload size={14} />
              {parsing ? 'Parsing…' : 'Upload IFC'}
              <input
                type="file"
                accept=".ifc"
                onChange={handleUpload}
                disabled={parsing}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {ifcMarks.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 16,
            }}
          >
            <SummaryStat label="Total" value={ifcMarks.length} color="var(--ink-700)" />
            <SummaryStat
              label="Matched"
              value={matched.length}
              color="var(--status-done)"
            />
            <SummaryStat
              label="Unmatched"
              value={unmatched.length}
              color={unmatched.length > 0 ? 'var(--status-alert)' : 'var(--status-done)'}
            />
          </div>
        )}
      </div>

      {/* Unmatched first */}
      {unmatched.length > 0 && (
        <div className="card">
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icons.X size={14} color="var(--status-alert)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Unmatched</span>
            <span className="t-caption">{unmatched.length}</span>
          </div>
          <div>
            {unmatched.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 18px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <Icons.X size={11} color="var(--status-alert)" />
                <span
                  className="mono"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--status-alert)',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {m.ifc_mark}
                </span>
                {auth.isPM && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) manualMatch(m.id, e.target.value);
                    }}
                    style={{ width: 200, height: 28, fontSize: 11.5 }}
                    defaultValue=""
                  >
                    <option value="">Map to part…</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.mark} ({p.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matched */}
      {matched.length > 0 && (
        <div className="card">
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icons.Check size={14} color="var(--status-done)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Matched</span>
            <span className="t-caption">{matched.length}</span>
          </div>
          <div>
            {matched.map((m) => {
              const matchedPart = parts.find((p) => p.id === m.part_id);
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 18px',
                    borderBottom: '1px solid var(--line)',
                    fontSize: 12,
                  }}
                >
                  <Icons.Check size={11} color="var(--status-done)" />
                  <span
                    className="mono"
                    style={{ fontWeight: 600, color: 'var(--status-done)', minWidth: 100 }}
                  >
                    {m.ifc_mark}
                  </span>
                  <Icons.ArrowRight size={11} color="var(--ink-400)" />
                  <span className="mono" style={{ color: 'var(--ink-700)', flex: 1 }}>
                    {matchedPart?.mark || '?'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                    {matchedPart?.category || ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ifcMarks.length === 0 && (
        <div
          className="card"
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'var(--surface-2)',
              color: 'var(--ink-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icons.File size={26} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-700)', fontWeight: 500 }}>
            No IFC file yet
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-500)',
              maxWidth: 360,
              lineHeight: 1.5,
            }}
          >
            Upload an IFC4 export from Tekla to enable the 3D viewer with mark
            highlighting and erection state visualisation.
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, color }) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--surface-2)',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <div
        className="mono tnum"
        style={{ fontSize: 22, fontWeight: 600, color, lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div className="t-caption" style={{ marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
