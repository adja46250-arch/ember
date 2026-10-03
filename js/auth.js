import { supabase } from './supabase.js'

// ── Inscription ──────────────────────────────────────────
export async function register(fullName, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })
  if (error) throw error
  return data
}

// ── Connexion email/password ──────────────────────────────
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// ── Connexion Google OAuth ────────────────────────────────
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'http://localhost:5500/dashboard.html' }
  })
  if (error) throw error
}

// ── Déconnexion ───────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut()
  window.location.href = '/index.html'
}

// ── Récupérer l'utilisateur connecté ─────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Protection de route ───────────────────────────────────
// Appelle cette fonction en haut de chaque page protégée
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) window.location.href = '/index.html'
  return user
}

// ── Redirection si déjà connecté (page login) ─────────────
export async function redirectIfLoggedIn() {
  const user = await getCurrentUser()
  if (user) window.location.href = '/dashboard.html'
}