// Outils de sécurité communs : à utiliser pour afficher du texte saisi par les utilisateurs.

// Neutralise le HTML : « <script> » devient du texte inoffensif.
export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

// N'accepte que les liens http(s) (refuse « javascript: » et autres) et les échappe.
export function safeUrl(url) {
  try {
    const u = new URL(String(url ?? ''), window.location.href)
    return (u.protocol === 'https:' || u.protocol === 'http:') ? escapeHTML(u.href) : ''
  } catch {
    return ''
  }
}
