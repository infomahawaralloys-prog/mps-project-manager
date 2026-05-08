import { supabase } from './supabase';

// ============================================================
// PROJECTS
// ============================================================
export async function getProjects() {
  const { data, error } = await supabase.from('projects')
    .select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProject(id) {
  const { data, error } = await supabase.from('projects')
    .select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createProject(project) {
  const { data, error } = await supabase.from('projects')
    .insert(project).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase.from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// PARTS
// ============================================================
export async function getParts(projectId, category) {
  var query = supabase.from('parts').select('*').eq('project_id', projectId);
  if (category) query = query.eq('category', category);
  query = query.order('mark');
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function upsertParts(parts) {
  const { data, error } = await supabase.from('parts').upsert(parts).select();
  if (error) throw error;
  return data;
}

export async function deleteParts(projectId, category) {
  const { error } = await supabase.from('parts')
    .delete().eq('project_id', projectId).eq('category', category);
  if (error) throw error;
}

// ============================================================
// FABRICATION ENTRIES
// ============================================================
export async function getFabEntries(projectId, partId, stage) {
  var query = supabase.from('fab_entries').select('*').eq('project_id', projectId);
  if (partId) query = query.eq('part_id', partId);
  if (stage) query = query.eq('stage', stage);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getFabSummary(projectId) {
  // Use server-side aggregation to bypass row limits
  const { data, error } = await supabase.rpc('get_fab_summary', { p_id: projectId });
  if (error) throw error;
  // Transform from { 'partId::stage': total } to { partId: { stage: total } }
  var summary = {};
  if (data) {
    Object.keys(data).forEach(function(key) {
      var parts = key.split('::');
      var partId = parts[0], stage = parts[1];
      if (!summary[partId]) summary[partId] = {};
      summary[partId][stage] = data[key];
    });
  }
  return summary;
}

export async function addFabEntry(entry) {
  const { data, error } = await supabase.from('fab_entries')
    .insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function addFabEntries(entries) {
  const { data, error } = await supabase.from('fab_entries')
    .insert(entries).select();
  if (error) throw error;
  return data;
}

// ============================================================
// WORKERS
// ============================================================
export async function getWorkers(projectId, roleType) {
  var query = supabase.from('workers').select('*').eq('project_id', projectId);
  if (roleType) query = query.eq('role_type', roleType);
  query = query.order('name');
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addWorker(worker) {
  const { data, error } = await supabase.from('workers')
    .insert(worker).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DRAWINGS
// ============================================================
export async function getDrawings(projectId) {
  const { data, error } = await supabase.from('drawings')
    .select('*').eq('project_id', projectId).order('drawing_type');
  if (error) throw error;
  return data;
}

export async function upsertDrawing(drawing) {
  const { data, error } = await supabase.from('drawings')
    .upsert(drawing, { onConflict: 'project_id,drawing_type' }).select().single();
  if (error) throw error;
  return data;
}

export async function addDrawingHistory(history) {
  const { error } = await supabase.from('drawing_history').insert(history);
  if (error) throw error;
}

// ============================================================
// DISPATCHES
// ============================================================
export async function getDispatches(projectId) {
  const { data, error } = await supabase.from('dispatches')
    .select('*, dispatch_parts(*, parts(*))').eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createDispatch(dispatch, partsList) {
  const { data, error } = await supabase.from('dispatches')
    .insert(dispatch).select().single();
  if (error) throw error;
  if (partsList && partsList.length > 0) {
    var dpParts = partsList.map(function(p) {
      return { dispatch_id: data.id, part_id: p.part_id, qty: p.qty };
    });
    await supabase.from('dispatch_parts').insert(dpParts);
  }
  return data;
}

export async function updateDispatchStatus(id, status) {
  const { data, error } = await supabase.from('dispatches')
    .update({ status: status, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// ERECTION
// ============================================================
export async function getErectionRecords(projectId) {
  const { data, error } = await supabase.from('erection_records')
    .select('*, parts(mark, description, weight, category)')
    .eq('project_id', projectId)
    .eq('erected', true)
    .order('erection_date');
  if (error) throw error;
  return data;
}

export async function erectMark(record) {
  const { data, error } = await supabase.from('erection_records')
    .insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function unErectMark(projectId, partId) {
  const { error } = await supabase.from('erection_records')
    .delete().eq('project_id', projectId).eq('part_id', partId);
  if (error) throw error;
}

// ============================================================
// IFC MARKS
// ============================================================
export async function getIfcMarks(projectId) {
  const { data, error } = await supabase.from('ifc_marks')
    .select('*').eq('project_id', projectId).range(0, 49999);
  if (error) throw error;
  return data;
}
export async function clearIfcMarks(projectId) {
  const { error } = await supabase.from('ifc_marks').delete().eq('project_id', projectId);
  if (error) throw error;
}
export async function upsertIfcMarks(marks) {
  const { data, error } = await supabase.from('ifc_marks')
    .upsert(marks).select();
  if (error) throw error;
  return data;
}

export async function updateIfcMapping(id, partId) {
  const { error } = await supabase.from('ifc_marks')
    .update({ part_id: partId, matched: true }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// SNAGS
// ============================================================
export async function getSnags(projectId) {
  const { data, error } = await supabase.from('snags')
    .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addSnag(snag) {
  const { data, error } = await supabase.from('snags')
    .insert(snag).select().single();
  if (error) throw error;
  return data;
}

export async function updateSnag(id, updates) {
  const { data, error } = await supabase.from('snags')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// SAFETY
// ============================================================
export async function getSafetyChecks(projectId) {
  const { data, error } = await supabase.from('safety_checks')
    .select('*').eq('project_id', projectId).order('check_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertSafetyCheck(check) {
  const { data, error } = await supabase.from('safety_checks')
    .upsert(check, { onConflict: 'project_id,check_date' }).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// BOLTS
// ============================================================
export async function getBoltRecords(projectId) {
  const { data, error } = await supabase.from('bolt_records')
    .select('*').eq('project_id', projectId).order('zone');
  if (error) throw error;
  return data;
}

export async function upsertBoltRecord(record) {
  const { data, error } = await supabase.from('bolt_records')
    .upsert(record).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// ACTIVITY LOG
// ============================================================
export async function getActivityLog(projectId, limit) {
  const { data, error } = await supabase.from('activity_log')
    .select('*').eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit || 50);
  if (error) throw error;
  return data;
}

export async function logActivity(entry) {
  const { error } = await supabase.from('activity_log').insert(entry);
  if (error) console.error('Activity log error:', error);
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================
export function subscribeToProject(projectId, table, callback) {
  return supabase.channel('project-' + table + '-' + projectId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: table,
      filter: 'project_id=eq.' + projectId
    }, callback)
    .subscribe();
}

// ============================================================
// PROJECT ACCESS (who can see which project)
// ============================================================
export async function getProjectAccess(projectId) {
  const { data, error } = await supabase.from('project_access')
    .select('*, profiles(name, role)')
    .eq('project_id', projectId);
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase.from('profiles')
    .select('id, name, role')
    .order('name');
  if (error) throw error;
  return data;
}

export async function grantProjectAccess(projectId, userId) {
  const { data, error } = await supabase.from('project_access')
    .insert({ project_id: projectId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function revokeProjectAccess(projectId, userId) {
  const { error } = await supabase.from('project_access')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw error;
}
// ============================================================
// IFC FILE STORAGE (Supabase Storage integration)
// ============================================================
export async function uploadIfcFile(projectId, file) {
  const path = projectId + '/model.ifc';
  const { error: upErr } = await supabase.storage
    .from('ifc-files')
    .upload(path, file, { upsert: true, contentType: 'application/x-step' });
  if (upErr) throw upErr;
  const { error: prErr } = await supabase.from('projects')
    .update({ ifc_file_path: path }).eq('id', projectId);
  if (prErr) throw prErr;
  return path;
}

export async function getIfcFileUrl(projectId) {
  const { data: proj, error } = await supabase.from('projects')
    .select('ifc_file_path').eq('id', projectId).single();
  if (error) throw error;
  if (!proj || !proj.ifc_file_path) return null;
  const { data: signed, error: sigErr } = await supabase.storage
    .from('ifc-files')
    .createSignedUrl(proj.ifc_file_path, 3600);
  if (sigErr) throw sigErr;
  return signed.signedUrl;
}

export async function deleteIfcFile(projectId) {
  const { data: proj } = await supabase.from('projects')
    .select('ifc_file_path').eq('id', projectId).single();
  if (proj && proj.ifc_file_path) {
    await supabase.storage.from('ifc-files').remove([proj.ifc_file_path]);
    await supabase.from('projects').update({ ifc_file_path: null }).eq('id', projectId);
  }
}

// ============================================================
// FAST-TAP ERECTION TOGGLE (for 3D viewer)
// ============================================================
export async function toggleErection(projectId, partId, userId, userName, userRole) {
  const { data: existing } = await supabase.from('erection_records')
    .select('id').eq('project_id', projectId).eq('part_id', partId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('erection_records').delete()
      .eq('project_id', projectId).eq('part_id', partId);
    if (error) throw error;
    return { erected: false };
  } else {
    const { data, error } = await supabase.from('erection_records').insert({
      project_id: projectId,
      part_id: partId,
      erection_date: new Date().toISOString().split('T')[0],
      erector_name: userName,
      crew_size: 1,
      created_by: userId
    }).select().single();
    if (error) throw error;
    return { erected: true, record: data };
  }
}
// ===============================================================
// Drawing Pipeline (Pass 4)
// ===============================================================

// Get pipeline rows for one project (typically up to 4 — one per category)
export async function getProjectPipeline(projectId) {
  const { data, error } = await supabase
    .from('project_pipeline')
    .select('*')
    .eq('project_id', projectId);
  if (error) throw error;
  return data || [];
}

// Get all pipeline rows for ALL projects (for the Studio view).
// Joins with project info so the grid can show name/status.
export async function getAllPipelines() {
  const { data, error } = await supabase
    .from('project_pipeline')
    .select(
      'id, project_id, category, status, percent, due_date, note, updated_at, updated_by, projects ( id, project_no, job_no, client_name, location, status, target_date )'
    );
  if (error) throw error;
  return data || [];
}

// Insert or update one pipeline row.
// row: { project_id, category, status, percent, due_date, note, drawing_url, revision, updated_by }
export async function upsertPipeline(row) {
  const payload = {
    project_id: row.project_id,
    category: row.category,
    status: row.status || 'not_started',
    percent: row.percent != null ? Number(row.percent) : 0,
    due_date: row.due_date || null,
    note: row.note || null,
    drawing_url: row.drawing_url || null,
    revision: row.revision || 'Rev 0',
    updated_by: row.updated_by || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('project_pipeline')
    .upsert(payload, { onConflict: 'project_id,category' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Cross-project activity feed for the Studio "Today" tab.
// dayISO: date in YYYY-MM-DD; if null, returns last 200 entries across portfolio.
export async function getPortfolioActivity(dayISO, limit = 200) {
  let q = supabase
    .from('activity_log')
    .select(
      'id, project_id, action_type, details, user_name, user_role, created_at, projects ( id, project_no, job_no, client_name )'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (dayISO) {
    const start = `${dayISO}T00:00:00`;
    const end = `${dayISO}T23:59:59`;
    q = q.gte('created_at', start).lte('created_at', end);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
