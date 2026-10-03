import { supabase } from './supabase.js'

// ── Recherche globale ─────────────────────────────────────
export async function searchTasks(query, filters = {}) {
  if (!query?.trim() && !filters.priority && !filters.projectId) return []

  let req = supabase
    .from('tasks')
    .select(`
      *,
      columns(name, color, project_id),
      task_members(profiles(full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (query?.trim()) {
    req = req.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
  }

  if (filters.priority) {
    req = req.eq('priority', filters.priority)
  }

  if (filters.projectId) {
    req = req.eq('project_id', filters.projectId)
  }

  if (filters.columnId) {
    req = req.eq('column_id', filters.columnId)
  }

  const { data, error } = await req
  if (error) throw error
  return data
}

// ── Stats d'un projet ─────────────────────────────────────
export async function getProjectStats(projectId) {
  const [
    { data: tasks },
    { data: members },
    { data: columns }
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_id', projectId),
    supabase.from('project_members').select('*, profiles(full_name)').eq('project_id', projectId),
    supabase.from('columns').select('*').eq('project_id', projectId).order('position')
  ])

  const total    = tasks?.length || 0
  const overdue  = tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date()).length || 0
  const byColumn = {}
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 }

  columns?.forEach(col => {
    byColumn[col.id] = {
      name  : col.name,
      color : col.color,
      count : tasks?.filter(t => t.column_id === col.id).length || 0
    }
  })

  tasks?.forEach(t => {
    if (byPriority[t.priority] !== undefined) byPriority[t.priority]++
  })

  return { total, overdue, byColumn, byPriority, members, columns }
}

// ── Stats globales du dashboard ───────────────────────────
export async function getGlobalStats() {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects, error: e1 } = await supabase
    .from('projects')
    .select('id, name, color, icon')
    .eq('owner_id', user.id)
    .eq('archived', false)

  const { data: myTasks, error: e2 } = await supabase
    .from('task_members')
    .select('task_id')
    .eq('user_id', user.id)

  const { data: overdue, error: e3 } = await supabase
    .from('tasks')
    .select('id')
    .eq('created_by', user.id)
    .lt('due_date', new Date().toISOString().split('T')[0])
    .not('due_date', 'is', null)

  return {
    totalProjects : projects?.length  || 0,
    myTasksCount  : myTasks?.length   || 0,
    overdueCount  : overdue?.length   || 0,
    projects      : projects || []
  }
}