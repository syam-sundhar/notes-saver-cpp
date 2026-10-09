/**
 * Notes Saver - Master-Detail UI Logic
 * Interoperable with notes.txt and C++ NotesManager format: id|title|content
 */

// Application State
const state = {
  notes: [],
  selectedId: null,
  isDraft: false,
  searchQuery: '',
  sortOrder: 'id-desc',
  isDirty: false,
  deleteTargetId: null,
};

// DOM Element References
const elements = {
  notesList: document.getElementById('notesList'),
  noteCountPill: document.getElementById('noteCountPill'),
  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  sortOrder: document.getElementById('sortOrder'),
  btnNewNote: document.getElementById('btnNewNote'),
  btnRefresh: document.getElementById('btnRefresh'),
  syncStatus: document.getElementById('syncStatus'),
  emptyListState: document.getElementById('emptyListState'),
  emptyStateMsg: document.getElementById('emptyStateMsg'),
  btnEmptyCreate: document.getElementById('btnEmptyCreate'),

  // Splitter & Panes
  masterPane: document.getElementById('masterPane'),
  paneSplitter: document.getElementById('paneSplitter'),
  detailPane: document.getElementById('detailPane'),

  // Detail Elements
  detailPlaceholder: document.getElementById('detailPlaceholder'),
  detailContent: document.getElementById('detailContent'),
  btnPlaceholderNew: document.getElementById('btnPlaceholderNew'),
  detailIdBadge: document.getElementById('detailIdBadge'),
  detailModeBadge: document.getElementById('detailModeBadge'),
  detailStats: document.getElementById('detailStats'),
  btnCopyNote: document.getElementById('btnCopyNote'),
  btnDeleteNote: document.getElementById('btnDeleteNote'),
  btnSaveNote: document.getElementById('btnSaveNote'),
  noteTitleInput: document.getElementById('noteTitleInput'),
  noteContentInput: document.getElementById('noteContentInput'),
  saveStatusIndicator: document.getElementById('saveStatusIndicator'),
  saveStatusText: document.getElementById('saveStatusText'),

  // Delete Modal
  deleteModal: document.getElementById('deleteModal'),
  deleteModalPreview: document.getElementById('deleteModalPreview'),
  btnCancelDelete: document.getElementById('btnCancelDelete'),
  btnConfirmDelete: document.getElementById('btnConfirmDelete'),

  // Toast
  toastContainer: document.getElementById('toastContainer'),
};

// ==================== API / STORAGE LAYER ====================

const API = {
  async fetchNotes() {
    try {
      const res = await fetch('/api/notes');
      if (!res.ok) throw new Error('API server returned error ' + res.status);
      const data = await res.json();
      updateSyncStatus(true);
      return data;
    } catch (err) {
      console.warn('Backend server unavailable, checking local storage fallback:', err.message);
      updateSyncStatus(false, 'Local offline fallback');
      const cached = localStorage.getItem('notes_saver_cache');
      if (cached) {
        return JSON.parse(cached);
      }
      // Initial default sample notes if completely empty
      return [
        {
          id: 1,
          title: 'Welcome to Notes Saver',
          content: 'This Master-Detail UI seamlessly connects to notes.txt without touching the original C++ file!'
        },
        {
          id: 2,
          title: 'Keyboard Shortcuts',
          content: 'Use Ctrl+N to create a note, Ctrl+S to save, / to search, and Esc to clear.'
        }
      ];
    }
  },

  async saveNote(note) {
    try {
      if (note.id) {
        // Update existing note (PUT)
        const res = await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        });
        if (!res.ok) throw new Error('Failed to update note');
        return await res.json();
      } else {
        // Create new note (POST)
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        });
        if (!res.ok) throw new Error('Failed to create note');
        return await res.json();
      }
    } catch (err) {
      console.warn('Saving via offline cache:', err.message);
      // Fallback
      if (note.id) {
        const idx = state.notes.findIndex((n) => n.id === note.id);
        if (idx !== -1) state.notes[idx] = note;
      } else {
        const maxId = state.notes.reduce((max, n) => Math.max(max, n.id), 0);
        note.id = maxId + 1;
        state.notes.push(note);
      }
      localStorage.setItem('notes_saver_cache', JSON.stringify(state.notes));
      return note;
    }
  },

  async deleteNote(id) {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      return true;
    } catch (err) {
      console.warn('Deleting via offline cache:', err.message);
      state.notes = state.notes.filter((n) => n.id !== id);
      localStorage.setItem('notes_saver_cache', JSON.stringify(state.notes));
      return true;
    }
  },
};

// ==================== UI HELPERS ====================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconSvg = type === 'success' 
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : type === 'error'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function updateSyncStatus(connected, customText) {
  if (connected) {
    elements.syncStatus.className = 'sync-pill';
    elements.syncStatus.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-label">Synchronized with notes.txt</span>
    `;
  } else {
    elements.syncStatus.className = 'sync-pill error';
    elements.syncStatus.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-label">${customText || 'Offline'}</span>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightText(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escapedText.replace(regex, '<span class="highlight-match">$1</span>');
}

// ==================== RENDERING ====================

function getFilteredAndSortedNotes() {
  const query = state.searchQuery.trim().toLowerCase();
  
  // Filtering (matching title OR content - exactly matching C++ searchNote logic)
  let filtered = state.notes.filter((note) => {
    if (!query) return true;
    const titleMatch = (note.title || '').toLowerCase().includes(query);
    const contentMatch = (note.content || '').toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (state.sortOrder === 'id-desc') return b.id - a.id;
    if (state.sortOrder === 'id-asc') return a.id - b.id;
    if (state.sortOrder === 'title-asc') return (a.title || '').localeCompare(b.title || '');
    return 0;
  });

  return filtered;
}

function renderNotesList() {
  const filtered = getFilteredAndSortedNotes();
  elements.noteCountPill.textContent = `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;

  // Clear list
  elements.notesList.innerHTML = '';

  if (filtered.length === 0) {
    elements.emptyListState.classList.remove('hidden');
    elements.emptyStateMsg.textContent = state.searchQuery
      ? `No notes matching "${state.searchQuery}"`
      : 'Create your first note to get started.';
    return;
  }

  elements.emptyListState.classList.add('hidden');

  filtered.forEach((note) => {
    const card = document.createElement('div');
    card.className = `note-card ${state.selectedId === note.id && !state.isDraft ? 'active' : ''}`;
    card.dataset.id = note.id;

    // Decode escaped newlines for display preview
    const cleanContent = (note.content || '').replace(/\\n/g, ' ');

    card.innerHTML = `
      <div class="note-card-header">
        <span class="note-card-id">#${note.id}</span>
        <div class="note-card-title">${highlightText(note.title || 'Untitled Note', state.searchQuery)}</div>
        <div class="note-card-actions">
          <button class="btn-card-delete" title="Delete Note #${note.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="note-card-snippet">${highlightText(cleanContent || 'No content', state.searchQuery)}</div>
      <div class="note-card-footer">
        <span>${cleanContent.length} chars</span>
        <span>ID ${note.id}</span>
      </div>
    `;

    // Click card to open in Detail pane
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-card-delete')) {
        e.stopPropagation();
        openDeleteModal(note.id);
        return;
      }
      selectNote(note.id);
    });

    elements.notesList.appendChild(card);
  });
}

function updateDetailPane() {
  if (state.isDraft) {
    // Show draft in detail pane
    elements.detailPlaceholder.classList.add('hidden');
    elements.detailContent.classList.remove('hidden');

    elements.detailIdBadge.textContent = 'NEW';
    elements.detailModeBadge.textContent = 'Draft';
    elements.detailModeBadge.className = 'badge-mode draft';
    elements.btnDeleteNote.classList.add('hidden');

    updateStats();
    markDirty(false);
    return;
  }

  const selectedNote = state.notes.find((n) => n.id === state.selectedId);

  if (!selectedNote) {
    // Show placeholder
    elements.detailPlaceholder.classList.remove('hidden');
    elements.detailContent.classList.add('hidden');
    return;
  }

  // Show note editor
  elements.detailPlaceholder.classList.add('hidden');
  elements.detailContent.classList.remove('hidden');

  elements.detailIdBadge.textContent = `ID: ${selectedNote.id}`;
  elements.detailModeBadge.textContent = 'Editing';
  elements.detailModeBadge.className = 'badge-mode';
  elements.btnDeleteNote.classList.remove('hidden');

  elements.noteTitleInput.value = selectedNote.title || '';
  // Support displaying multi-line text by unescaping \n
  elements.noteContentInput.value = (selectedNote.content || '').replace(/\\n/g, '\n');

  updateStats();
  markDirty(false);
}

function updateStats() {
  const content = elements.noteContentInput.value;
  const chars = content.length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  elements.detailStats.textContent = `${chars} chars • ${words} words`;
}

function markDirty(dirty = true) {
  state.isDirty = dirty;
  if (dirty) {
    elements.saveStatusIndicator.querySelector('.status-bullet').className = 'status-bullet dirty';
    elements.saveStatusText.textContent = 'Unsaved changes...';
  } else {
    elements.saveStatusIndicator.querySelector('.status-bullet').className = 'status-bullet ready';
    elements.saveStatusText.textContent = 'All changes saved';
  }
}

// ==================== ACTIONS ====================

function selectNote(id) {
  if (state.isDirty && !confirm('You have unsaved changes. Discard them?')) {
    return;
  }
  state.selectedId = id;
  state.isDraft = false;
  renderNotesList();
  updateDetailPane();
}

function startNewNote() {
  if (state.isDirty && !confirm('You have unsaved changes. Discard them?')) {
    return;
  }
  state.selectedId = null;
  state.isDraft = true;

  elements.noteTitleInput.value = '';
  elements.noteContentInput.value = '';

  renderNotesList();
  updateDetailPane();

  elements.noteTitleInput.focus();
}

async function saveCurrentNote() {
  const title = elements.noteTitleInput.value.trim();
  const rawContent = elements.noteContentInput.value.trim();

  if (!title) {
    showToast('Please enter a note title', 'error');
    elements.noteTitleInput.focus();
    return;
  }

  // Escape literal newlines as \n so that the C++ single-line format remains 100% valid
  const escapedContent = rawContent.replace(/\r?\n/g, '\\n');

  elements.btnSaveNote.disabled = true;
  elements.btnSaveNote.classList.add('loading');

  try {
    const noteData = {
      title: title,
      content: escapedContent,
    };

    if (!state.isDraft && state.selectedId) {
      noteData.id = state.selectedId;
    }

    const savedNote = await API.saveNote(noteData);

    // Refresh state list
    await reloadData();

    // Select the saved note
    state.selectedId = savedNote.id;
    state.isDraft = false;

    renderNotesList();
    updateDetailPane();
    markDirty(false);

    showToast(`Note #${savedNote.id} saved successfully!`, 'success');
  } catch (err) {
    showToast('Error saving note: ' + err.message, 'error');
  } finally {
    elements.btnSaveNote.disabled = false;
    elements.btnSaveNote.classList.remove('loading');
  }
}

function openDeleteModal(id) {
  const note = state.notes.find((n) => n.id === id);
  if (!note) return;

  state.deleteTargetId = id;
  elements.deleteModalPreview.textContent = `ID #${note.id}: ${note.title || 'Untitled'}`;
  elements.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  state.deleteTargetId = null;
  elements.deleteModal.classList.add('hidden');
}

async function confirmDelete() {
  const idToDelete = state.deleteTargetId;
  if (!idToDelete) return;

  closeDeleteModal();

  try {
    await API.deleteNote(idToDelete);
    showToast(`Note #${idToDelete} deleted`, 'success');

    if (state.selectedId === idToDelete) {
      state.selectedId = null;
      state.isDraft = false;
    }

    await reloadData();
    renderNotesList();
    updateDetailPane();
  } catch (err) {
    showToast('Failed to delete note: ' + err.message, 'error');
  }
}

async function copyNoteContent() {
  const title = elements.noteTitleInput.value;
  const content = elements.noteContentInput.value;
  const fullText = `${title}\n\n${content}`;

  try {
    await navigator.clipboard.writeText(fullText);
    showToast('Note copied to clipboard!', 'success');
  } catch (err) {
    showToast('Failed to copy text', 'error');
  }
}

async function reloadData() {
  const notes = await API.fetchNotes();
  state.notes = notes;
  renderNotesList();
}

// ==================== SPLITTER DRAGGING ====================

function setupSplitter() {
  let isDragging = false;

  elements.paneSplitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    elements.paneSplitter.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const minWidth = 280;
    const maxWidth = 560;
    const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
    elements.masterPane.style.width = `${newWidth}px`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      elements.paneSplitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ==================== EVENT LISTENERS ====================

function initEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    elements.btnClearSearch.classList.toggle('hidden', !state.searchQuery);
    renderNotesList();
  });

  elements.btnClearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.btnClearSearch.classList.add('hidden');
    renderNotesList();
    elements.searchInput.focus();
  });

  // Sort
  elements.sortOrder.addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    renderNotesList();
  });

  // New Note
  elements.btnNewNote.addEventListener('click', startNewNote);
  elements.btnPlaceholderNew.addEventListener('click', startNewNote);
  elements.btnEmptyCreate.addEventListener('click', startNewNote);

  // Refresh
  elements.btnRefresh.addEventListener('click', async () => {
    await reloadData();
    showToast('Refreshed notes from notes.txt', 'info');
  });

  // Editor Inputs
  elements.noteTitleInput.addEventListener('input', () => {
    markDirty(true);
    updateStats();
  });

  elements.noteContentInput.addEventListener('input', () => {
    markDirty(true);
    updateStats();
  });

  // Detail Actions
  elements.btnSaveNote.addEventListener('click', saveCurrentNote);
  elements.btnDeleteNote.addEventListener('click', () => {
    if (state.selectedId) openDeleteModal(state.selectedId);
  });
  elements.btnCopyNote.addEventListener('click', copyNoteContent);

  // Delete Modal
  elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
  elements.btnConfirmDelete.addEventListener('click', confirmDelete);
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) closeDeleteModal();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl+S / Cmd+S -> Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!elements.detailContent.classList.contains('hidden')) {
        saveCurrentNote();
      }
    }

    // Ctrl+N / Cmd+N -> New Note
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      startNewNote();
    }

    // "/" or Ctrl+K -> Search
    if (e.key === '/' && document.activeElement !== elements.noteTitleInput && document.activeElement !== elements.noteContentInput) {
      e.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
    }

    // Escape -> Blur or close
    if (e.key === 'Escape') {
      if (!elements.deleteModal.classList.contains('hidden')) {
        closeDeleteModal();
      } else if (document.activeElement === elements.searchInput) {
        elements.searchInput.blur();
      }
    }
  });

  setupSplitter();
}

// ==================== INITIALIZATION ====================

async function init() {
  initEventListeners();
  await reloadData();

  // If notes exist, select the first one by default
  const sorted = getFilteredAndSortedNotes();
  if (sorted.length > 0) {
    selectNote(sorted[0].id);
  }
}

document.addEventListener('DOMContentLoaded', init);
