import { supabase }                               from './supabase.js'
import { getColumns, createColumn, updateColumn,
         deleteColumn, reorderColumns }            from './tasks.js'
import { getTasks, createTask, updateTask,
         deleteTask, moveTask, reorderTasks }      from './tasks.js'

let projectId   = null
let currentUser = null
let allTasks    = []
let allColumns  = []

// ── Init ──────────────────────────────────────────────────
export async function initKanban(pid, user) {
  projectId   = pid
  currentUser = user
  await renderBoard()
  initRealtime()
}

// ── Rendu principal ───────────────────────────────────────
async function renderBoard() {
  const board = document.getElementById('kanban-board')
  board.innerHTML = '<div class="kanban-loading">Chargement...</div>'

  try {
    allColumns = await getColumns(projectId)
    allTasks   = await getTasks(projectId)

    if (!allColumns.length) {
      await createDefaultColumns()
      allColumns = await getColumns(projectId)
    }

    renderColumns()
  } catch (e) {
    board.innerHTML = `<div class="kanban-loading">Erreur : ${e.message}</div>`
  }
}

// ── Colonnes par défaut ───────────────────────────────────
async function createDefaultColumns() {
  const defaults = [
    { name: 'À faire',    color: '#ff5a36', position: 0 },
    { name: 'En cours',   color: '#f59e0b', position: 1 },
    { name: 'Terminé',    color: '#10b981', position: 2 },
  ]
  for (const col of defaults) {
    await createColumn(projectId, col.name, col.position)
  }
}

// ── Rendu colonnes ────────────────────────────────────────
function renderColumns() {
  const board = document.getElementById('kanban-board')
  board.innerHTML = ''

  allColumns.forEach(col => {
    const tasks = allTasks.filter(t => t.column_id === col.id)
    const colEl = createColumnElement(col, tasks)
    board.appendChild(colEl)
  })

  // Bouton ajouter colonne
  const addBtn = document.createElement('div')
  addBtn.className = 'column-add'
  addBtn.innerHTML = `<button onclick="window.addColumn()">＋ Ajouter une colonne</button>`
  board.appendChild(addBtn)

  initDragDrop()
}

// ── Créer élément colonne ─────────────────────────────────
function createColumnElement(col, tasks) {
  const div = document.createElement('div')
  div.className = 'kanban-column'
  div.dataset.columnId = col.id

  div.innerHTML = `
    <div class="column-header">
      <div class="column-header-left">
        <span class="column-dot" style="background:${col.color}"></span>
        <span class="column-name" ondblclick="window.editColumnName('${col.id}', this)">${col.name}</span>
        <span class="column-count">${tasks.length}</span>
      </div>
      <div class="column-actions">
        <button class="col-btn" onclick="window.openAddTask('${col.id}')" title="Ajouter une tâche">＋</button>
        <button class="col-btn col-btn-danger" onclick="window.confirmDeleteColumn('${col.id}')" title="Supprimer">✕</button>
      </div>
    </div>
    <div class="task-list" id="tasks-${col.id}">
      ${tasks.map(t => createTaskHTML(t)).join('')}
    </div>
    <button class="add-task-btn" onclick="window.openAddTask('${col.id}')">
      ＋ Ajouter une tâche
    </button>
  `
  return div
}

// ── HTML d'une carte tâche ────────────────────────────────
function createTaskHTML(task) {
  const priorityColors = {
    low:    '#10b981',
    medium: '#3b82f6',
    high:   '#f59e0b',
    urgent: '#ef4444'
  }
  const priorityLabels = {
    low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente'
  }

  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
    : null
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  const assignees = task.task_members?.map(m => {
    const name = m.profiles?.full_name || '?'
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
    return `<div class="task-avatar" title="${name}">${initials}</div>`
  }).join('') || ''

  return `
    <div class="task-card" data-task-id="${task.id}"
         onclick="window.openTaskDetail('${task.id}')">
      <div class="task-priority-bar" style="background:${priorityColors[task.priority]}"></div>
      <div class="task-content">
        <p class="task-title">${task.title}</p>
        ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
        <div class="task-footer">
          <div class="task-footer-left">
            <span class="priority-badge" style="color:${priorityColors[task.priority]}">
              ${priorityLabels[task.priority]}
            </span>
            ${dueDate ? `<span class="task-date ${isOverdue ? 'overdue' : ''}"><span class="material-symbols-outlined" style="font-size:0.95em;vertical-align:-2px">calendar_month</span> ${dueDate}</span>` : ''}
          </div>
          <div class="task-assignees">${assignees}</div>
        </div>
      </div>
    </div>
  `
}

// ── Drag & Drop avec SortableJS ───────────────────────────
function initDragDrop() {
  document.querySelectorAll('.task-list').forEach(list => {
    Sortable.create(list, {
      group: 'tasks',
      animation: 150,
      ghostClass: 'task-ghost',
      dragClass: 'task-dragging',
      onEnd: async (evt) => {
        const taskId    = evt.item.dataset.taskId
        const newColId  = evt.to.id.replace('tasks-', '')
        const newPos    = evt.newIndex

        // Met à jour localement
        const task = allTasks.find(t => t.id === taskId)
        if (task) {
          task.column_id = newColId
          task.position  = newPos
        }

        // Met à jour les positions dans la colonne destination
        const colTasks = [...evt.to.querySelectorAll('.task-card')]
          .map((el, i) => ({ id: el.dataset.taskId, position: i, column_id: newColId }))

        try {
          await reorderTasks(colTasks)
        } catch (e) {
          console.error('Erreur reorder:', e)
        }
      }
    })
  })
}

// ── Ajouter une colonne ───────────────────────────────────
window.addColumn = async () => {
  const name = prompt('Nom de la nouvelle colonne :')
  if (!name?.trim()) return

  try {
    const position = allColumns.length
    const col = await createColumn(projectId, name.trim(), position)
    allColumns.push(col)
    renderColumns()
    showToast('Colonne créée ✓', 'success')
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error')
  }
}

// ── Renommer une colonne (double-clic) ────────────────────
window.editColumnName = async (colId, el) => {
  const oldName = el.textContent
  el.contentEditable = true
  el.focus()

  const range = document.createRange()
  range.selectNodeContents(el)
  window.getSelection().removeAllRanges()
  window.getSelection().addRange(range)

  el.onblur = async () => {
    el.contentEditable = false
    const newName = el.textContent.trim()
    if (newName && newName !== oldName) {
      try {
        await updateColumn(colId, { name: newName })
        const col = allColumns.find(c => c.id === colId)
        if (col) col.name = newName
        showToast('Colonne renommée ✓', 'success')
      } catch (e) {
        el.textContent = oldName
        showToast('Erreur', 'error')
      }
    } else {
      el.textContent = oldName
    }
  }

  el.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur() }
    if (e.key === 'Escape') { el.textContent = oldName; el.blur() }
  }
}

// ── Supprimer une colonne ─────────────────────────────────
window.confirmDeleteColumn = async (colId) => {
  const col = allColumns.find(c => c.id === colId)
  const taskCount = allTasks.filter(t => t.column_id === colId).length

  const msg = taskCount > 0
    ? `Supprimer "${col.name}" et ses ${taskCount} tâche(s) ?`
    : `Supprimer la colonne "${col.name}" ?`

  if (!confirm(msg)) return

  try {
    await deleteColumn(colId)
    allColumns = allColumns.filter(c => c.id !== colId)
    allTasks   = allTasks.filter(t => t.column_id !== colId)
    renderColumns()
    showToast('Colonne supprimée', 'info')
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error')
  }
}

// ── Ouvrir formulaire ajout tâche ─────────────────────────
window.openAddTask = (colId) => {
  const modal = document.getElementById('task-modal')
  document.getElementById('task-modal-title').textContent = 'Nouvelle tâche'
  document.getElementById('task-title-input').value       = ''
  document.getElementById('task-desc-input').value        = ''
  document.getElementById('task-priority-input').value    = 'medium'
  document.getElementById('task-date-input').value        = ''
  document.getElementById('task-modal-error').classList.remove('show')

  modal.dataset.mode     = 'create'
  modal.dataset.columnId = colId
  modal.dataset.taskId   = ''

  document.getElementById('task-modal-overlay').classList.add('open')
}

// ── Ouvrir détail/édition tâche ───────────────────────────
window.openTaskDetail = (taskId) => {
  window.location.href = `task-detail.html?id=${taskId}`
}

// ── Fermer modale tâche ───────────────────────────────────
window.closeTaskModal = () => {
  document.getElementById('task-modal-overlay').classList.remove('open')
}

// ── Sauvegarder tâche ─────────────────────────────────────
window.saveTask = async () => {
  const modal    = document.getElementById('task-modal')
  const title    = document.getElementById('task-title-input').value.trim()
  const errEl    = document.getElementById('task-modal-error')
  const btn      = document.getElementById('btn-save-task')

  if (!title) {
    errEl.textContent = 'Le titre est requis.'
    errEl.classList.add('show')
    return
  }

  btn.disabled = true
  btn.textContent = 'Enregistrement...'

  const payload = {
    title,
    description : document.getElementById('task-desc-input').value.trim() || null,
    priority    : document.getElementById('task-priority-input').value,
    due_date    : document.getElementById('task-date-input').value || null,
  }

  try {
    if (modal.dataset.mode === 'create') {
      const colId    = modal.dataset.columnId
      const position = allTasks.filter(t => t.column_id === colId).length
      const newTask  = await createTask(colId, projectId, title, position)
      const fullTask = { ...newTask, ...payload, task_members: [] }
      await updateTask(newTask.id, { description: payload.description, priority: payload.priority, due_date: payload.due_date })
      allTasks.push({ ...fullTask, id: newTask.id })
      showToast('Tâche créée ✓', 'success')

    } else {
      const taskId = modal.dataset.taskId
      await updateTask(taskId, payload)
      const idx = allTasks.findIndex(t => t.id === taskId)
      if (idx !== -1) allTasks[idx] = { ...allTasks[idx], ...payload }
      showToast('Tâche mise à jour ✓', 'success')
    }

    closeTaskModal()
    renderColumns()

  } catch (e) {
    errEl.textContent = e.message || 'Erreur lors de la sauvegarde.'
    errEl.classList.add('show')
  } finally {
    btn.disabled = false
    btn.textContent = 'Enregistrer'
  }
}

// ── Supprimer tâche ───────────────────────────────────────
window.deleteCurrentTask = async () => {
  const taskId = document.getElementById('task-modal').dataset.taskId
  if (!taskId || !confirm('Supprimer cette tâche ?')) return

  try {
    await deleteTask(taskId)
    allTasks = allTasks.filter(t => t.id !== taskId)
    closeTaskModal()
    renderColumns()
    showToast('Tâche supprimée', 'info')
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error')
  }
}

// ── Realtime ──────────────────────────────────────────────
function initRealtime() {
  supabase
    .channel(`project-${projectId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'tasks',
      filter: `project_id=eq.${projectId}`
    }, () => renderBoard())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'columns',
      filter: `project_id=eq.${projectId}`
    }, () => renderBoard())
    .subscribe()
}

// ── Toast ─────────────────────────────────────────────────
const escapeHTML = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]))
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container')
  if (!container) return
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  const glyph = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:1.1em;vertical-align:-3px">${glyph}</span>
    <span>${escapeHTML(msg)}</span>`
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}