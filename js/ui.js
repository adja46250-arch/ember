import { supabase } from './supabase.js'
import { safeUrl } from './utils.js'

export async function loadSidebarUser() {
  // Vérifier la session
  const { data: { user } } = await supabase.auth.getUser()

  // Rediriger si pas connecté
  if (!user) {
    window.location.href = '/index.html'
    return {}
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, email')
    .eq('id', user.id)
    .single()

  const name     = profile?.full_name || user.email.split('@')[0]
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)

  // Avatar sidebar
  const sidebarAv = document.getElementById('sidebar-avatar')
  if (sidebarAv) {
    if (profile?.avatar_url) {
      sidebarAv.innerHTML = `
        <img src="${safeUrl(profile.avatar_url)}"
          style="width:100%;height:100%;object-fit:cover;border-radius:50%"
          alt="avatar">`
    } else {
      sidebarAv.textContent = initials
    }
  }

  // Nom et email sidebar
  const nameEl  = document.getElementById('sidebar-name')
  const emailEl = document.getElementById('sidebar-email')
  if (nameEl)  nameEl.textContent  = name
  if (emailEl) emailEl.textContent = user.email

  return { user, profile, name, initials }
}