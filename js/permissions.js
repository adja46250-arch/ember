// Rôles dans un projet : admin / member (éditeurs) et observer (lecture seule).
// Rappel : la vraie protection est dans la base (RLS). Ici on adapte l'écran.
import { supabase } from './supabase.js'

const EDIT_ROLES  = ['owner', 'admin', 'member']
const ADMIN_ROLES = ['owner', 'admin']

export const canEdit = (role) => EDIT_ROLES.includes(role)
export const isAdmin = (role) => ADMIN_ROLES.includes(role)

// Rôle de l'utilisateur dans le projet (null si introuvable)
export async function getMyRole(projectId, userId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) console.error('Rôle introuvable :', error.message)
  return data?.role ?? null
}

const STYLE = `
  body.read-only .btn-new,
  body.read-only .column-actions,
  body.read-only .column-add,
  body.read-only .add-task-btn,
  body.read-only .add-subtask-row,
  body.read-only .subtask-delete,
  body.read-only .comment-input-row,
  body.read-only .btn-unassign,
  body.read-only #member-picker,
  body.read-only .btn-upload,
  body.read-only .btn-delete-attach,
  body.read-only .btn-danger,
  body.read-only .btn-complete,
  body.read-only #btn-complete,
  body.no-admin #invite-box { display: none !important; }
  body.read-only .subtask-item input[type="checkbox"] { pointer-events: none; }
  body.read-only .task-card { cursor: pointer; }
  .readonly-banner {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 16px; padding: 10px 14px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-left: 3px solid var(--primary); border-radius: var(--radius, 10px);
    color: var(--text-muted); font-size: 0.85rem;
  }
`

// Applique le mode adapté au rôle : bandeau + masquage des actions.
export function applyRoleUI(role) {
  const editor = canEdit(role)
  document.body.classList.toggle('read-only', !editor)
  document.body.classList.toggle('no-admin', !isAdmin(role))

  if (!document.getElementById('role-style')) {
    const style = document.createElement('style')
    style.id = 'role-style'
    style.textContent = STYLE
    document.head.appendChild(style)
  }

  if (!editor && !document.getElementById('readonly-banner')) {
    const banner = document.createElement('div')
    banner.id = 'readonly-banner'
    banner.className = 'readonly-banner'
    banner.innerHTML =
      '<span class="material-symbols-outlined" style="font-size:1.1rem">visibility</span>' +
      '<span>Mode lecture : tu es observateur de ce projet. Tu peux tout consulter, sans rien modifier.</span>'
    const main = document.querySelector('.main-content')
    if (main) main.insertBefore(banner, main.firstChild)
  }
  return editor
}
