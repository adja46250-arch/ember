import { supabase } from './supabase.js'

// ── Colonnes ──────────────────────────────────────────────

export async function getColumns(projectId) {
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('project_id', projectId)
    .order('position')
  if (error) throw error
  return data
}

export async function createColumn(projectId, name, position) {
  const { data, error } = await supabase
    .from('columns')
    .insert({ project_id: projectId, name, position })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateColumn(id, updates) {
  const { data, error } = await supabase
    .from('columns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteColumn(id) {
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderColumns(updates) {
  // updates = [{id, position}, ...]
  const promises = updates.map(({ id, position }) =>
    supabase.from('columns').update({ position }).eq('id', id)
  )
  await Promise.all(promises)
}

// ── Tâches ────────────────────────────────────────────────

export async function getTasks(projectId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_members(user_id, profiles(id, full_name, avatar_url))
    `)
    .eq('project_id', projectId)
    .order('position')
  if (error) throw error
  return data
}

export async function createTask(columnId, projectId, title, position) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      column_id: columnId,
      project_id: projectId,
      title,
      position,
      created_by: user.id
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function moveTask(taskId, newColumnId, newPosition) {
  return updateTask(taskId, {
    column_id: newColumnId,
    position: newPosition
  })
}

export async function reorderTasks(updates) {
  const promises = updates.map(({ id, position, column_id }) =>
    supabase.from('tasks').update({ position, column_id }).eq('id', id)
  )
  await Promise.all(promises)
}