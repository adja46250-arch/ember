import { supabase } from './supabase.js'

// ── Récupérer tous les projets de l'utilisateur ───────────
export async function getProjects() {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
// ── Récupérer les projets archivés ────────────────────────
export async function getArchivedProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ── Créer un projet ───────────────────────────────────────
export async function createProject({ name, description, color, icon, deadline }) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      color,
      icon,
      deadline: deadline || null,
      owner_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  

  // Ajoute le créateur comme admin
  await supabase.from('project_members').insert({
    project_id: data.id,
    user_id: user.id,
    role: 'admin'
  })

  return data
}

// ── Modifier un projet ────────────────────────────────────
export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Archiver un projet ────────────────────────────────────
export async function archiveProject(id) {
  return updateProject(id, { archived: true })
}

// ── Supprimer un projet ───────────────────────────────────
export async function deleteProject(id) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Inviter un membre ─────────────────────────────────────
export async function inviteMember(projectId, email, role = 'member') {
  // Chercher l'utilisateur par email dans auth via profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email)
    .single()

  if (profileError || !profiles) {
    throw new Error('Aucun utilisateur trouvé avec cet email. La personne doit d\'abord créer un compte.')
  }

  // Vérifier s'il est déjà membre
  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', profiles.id)
    .single()

  if (existing) throw new Error('Cet utilisateur est déjà membre du projet.')

  // Ajouter comme membre
  const { error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: profiles.id,
      role
    })

  if (error) throw error
  return profiles
}

// ── Récupérer les membres d'un projet ─────────────────────
export async function getProjectMembers(projectId) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profiles(id, full_name, avatar_url, email)
    `)
    .eq('project_id', projectId)

  if (error) throw error
  return data
}

// ── Changer le rôle d'un membre ───────────────────────────
export async function updateMemberRole(projectId, userId, role) {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}

// ── Retirer un membre ─────────────────────────────────────
export async function removeMember(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}

// ── Stats rapides pour le dashboard ──────────────────────
export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser()

  const [{ count: totalProjects }, { count: myTasks }] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('archived', false),
    supabase.from('task_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  ])

  return { totalProjects, myTasks }
}