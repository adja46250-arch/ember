import { supabase } from './supabase.js'

// ── Tâche ─────────────────────────────────────────────────
export async function getTask(taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_members(
        user_id,
        profiles(id, full_name, avatar_url)
      ),
      columns(name, color)
    `)
    .eq('id', taskId)
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

// ── Sous-tâches ───────────────────────────────────────────
export async function getSubtasks(taskId) {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('position')
  if (error) throw error
  return data
}

export async function createSubtask(taskId, title, position) {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, title, position })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleSubtask(id, completed) {
  const { data, error } = await supabase
    .from('subtasks')
    .update({ completed })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSubtask(id) {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Commentaires ──────────────────────────────────────────
export async function getComments(taskId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`*, profiles(id, full_name, avatar_url)`)
    .eq('task_id', taskId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createComment(taskId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: user.id, content })
    .select(`*, profiles(id, full_name, avatar_url)`)
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(id) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Assignations ──────────────────────────────────────────
export async function getProjectMembers(projectId) {
  const { data: { user } } = await supabase.auth.getUser()

  // Récupérer le projet pour connaître l'owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  // Récupérer tous les membres
  const { data, error } = await supabase
    .from('project_members')
    .select('user_id, role, profiles(id, full_name, avatar_url)')
    .eq('project_id', projectId)

  if (error) throw error

  const isAdmin = project?.owner_id === user.id

  // Si admin → peut assigner tout le monde
  // Si membre → peut assigner seulement les autres membres (pas l'admin)
  const members = data
    .map(m => ({ ...m.profiles, role: m.role }))
    .filter(m => {
      if (!m) return false
      if (isAdmin) return true
      // Membre normal : exclure l'owner du projet
      return m.id !== project?.owner_id
    })

  return members
}

export async function assignMember(taskId, userId) {
  const { error } = await supabase
    .from('task_members')
    .insert({ task_id: taskId, user_id: userId })
  if (error && !error.message.includes('duplicate')) throw error
}

export async function unassignMember(taskId, userId) {
  const { error } = await supabase
    .from('task_members')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Pièces jointes ────────────────────────────────────────
export async function getAttachments(taskId) {
  const { data, error } = await supabase
    .from('attachments')
    .select(`*, profiles(full_name)`)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function safeFileName(name) {
  const dot = name.lastIndexOf('.')
  const ext  = dot > -1 ? name.slice(dot) : ''
  const base = dot > -1 ? name.slice(0, dot) : name
  const clean = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .replace(/[^a-zA-Z0-9_-]+/g, '-')                  // remplace le reste (espaces, apostrophes...) par -
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return (clean || 'fichier') + ext
}

export async function uploadAttachment(taskId, file) {
  const { data: { user } } = await supabase.auth.getUser()
  const fileName = `${taskId}/${Date.now()}-${safeFileName(file.name)}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(fileName, file)
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName)

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      task_id  : taskId,
      user_id  : user.id,
      name     : file.name,
      url      : publicUrl,
      size     : file.size
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAttachment(id, url) {
  const path = url.split('/attachments/')[1]
  await supabase.storage.from('attachments').remove([path])
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)
  if (error) throw error
}