import { supabase } from './supabase.js'

// ── Récupérer les notifications ───────────────────────────
export async function getNotifications() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

// ── Compter les non lues ──────────────────────────────────
export async function getUnreadCount() {
  const { data: { user } } = await supabase.auth.getUser()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
  if (error) throw error
  return count
}

// ── Marquer une notif comme lue ───────────────────────────
export async function markAsRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

// ── Marquer toutes comme lues ─────────────────────────────
export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
  if (error) throw error
}

// ── Écouter les nouvelles notifs en temps réel ────────────
export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel('notifications-' + userId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => callback(payload.new))
    .subscribe()
}