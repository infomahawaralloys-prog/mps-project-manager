import { supabase } from './supabase';

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

export async function getFabEntries(projectId, partId, stage) {
  var query = supabase.from('fab_entries').select('*').eq('project_id', projectId);
  if (partId) query = query.eq('part_id', partId);
  if (stage) query = query.eq('stage', stage);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getFabSummary(projectId) {
  const { data, error } = await supabase.from('fab_entries')
    .select('part_id, stage, qty_done, person_name, entry_date')
    .eq('project_id', projectId);
  if (error) throw error;
  var summary = {};
  (data || []).forEach(function(e) {
    if (!summary[e.part_id]) summary[e.part_id] = {};
    if (!summary[e.part_id][e.stage]) summary[e.part_id][e.stage] = 0;
    summary[e.part_id][e.stage] += e.qty_done;
  });
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

export async function getIfcMarks(projectId) {
  const { data, error } = await supabase.from('ifc_marks')
    .select('*').eq('project_id', projectId);
  if (error) throw error;
  return data;
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
