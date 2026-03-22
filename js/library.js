/**
 * library.js — Video library page: card grid, filters, search, multi-select.
 */

import { getVideos, getChannels, updateVideoUserFields, markVideoWatched } from './store.js';
import { formatDuration } from './youtube.js';
import { updateSidebarStats } from './stats.js';

const LEVELS = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'unrated'];

let currentFilters = {
  level:       'all',
  search:      '',
  hideWatched: false,
  channel:     'all',
};

// Multi-select state
let selectionMode    = false;
let selectedVideoIds = new Set();

// Callback set by app.js so library can open the player
let onVideoClick = () => {};

export function setVideoClickHandler(fn) {
  onVideoClick = fn;
}

export function renderLibrary(container) {
  container.innerHTML = '';
  selectionMode    = false;
  selectedVideoIds = new Set();

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h1 class="page-title">Video Library</h1>
    <div class="page-header-actions">
      <button class="btn btn-surface" id="select-toggle-btn">Select</button>
      <button class="btn btn-accent" id="open-import-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Import Channel
      </button>
    </div>
  `;
  container.appendChild(header);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'library-toolbar';
  toolbar.innerHTML = `
    <input type="text" class="search-input" id="library-search"
           placeholder="Search videos…" value="${escapeAttr(currentFilters.search)}" />
    <select class="channel-filter" id="channel-filter">
      <option value="all">All channels</option>
      ${Object.values(getChannels()).map(ch =>
        `<option value="${escapeAttr(ch.channelId)}"${currentFilters.channel === ch.channelId ? ' selected' : ''}>${escapeHTML(ch.channelTitle)}</option>`
      ).join('')}
    </select>
    <div class="filter-chips" id="difficulty-chips">
      ${LEVELS.map(l => `
        <button class="chip ${currentFilters.level === l ? 'active' : ''}" data-level="${l}">
          ${l === 'all' ? 'All' : l === 'unrated' ? 'Unrated' : l}
        </button>
      `).join('')}
    </div>
    <div class="toolbar-right">
      <label class="toggle-label">
        <input type="checkbox" class="toggle-checkbox" id="hide-watched-toggle"
               ${currentFilters.hideWatched ? 'checked' : ''} />
        Hide watched
      </label>
    </div>
  `;
  container.appendChild(toolbar);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'video-grid';
  grid.id = 'video-grid';
  container.appendChild(grid);

  // Bulk action bar (hidden until items selected)
  const bulkBar = document.createElement('div');
  bulkBar.className = 'bulk-bar hidden';
  bulkBar.id = 'bulk-bar';
  bulkBar.innerHTML = `
    <span class="bulk-count" id="bulk-count">0 selected</span>
    <button class="btn btn-surface btn-sm" id="bulk-select-all">Select All</button>
    <button class="btn btn-surface btn-sm" id="bulk-mark-watched">Mark Watched</button>
    <div class="bulk-difficulty-group">
      <span class="bulk-label">Set difficulty:</span>
      <div class="bulk-difficulty-checks">
        ${['A1','A2','B1','B2','C1','C2'].map(l =>
          `<label class="bulk-diff-label"><input type="checkbox" value="${l}" /> ${l}</label>`
        ).join('')}
      </div>
      <button class="btn btn-accent btn-sm" id="bulk-apply-diff">Apply</button>
    </div>
    <button class="btn btn-surface btn-sm" id="bulk-cancel">Cancel</button>
  `;
  document.body.appendChild(bulkBar);

  renderGrid(grid);
  attachLibraryEvents(container, grid, bulkBar);

  // Cleanup bulk bar when navigating away
  container._cleanupBulkBar = () => {
    bulkBar.remove();
    selectionMode    = false;
    selectedVideoIds = new Set();
  };
}

// Called by app.js on navigation away
export function cleanupLibrary() {
  const main = document.getElementById('main-content');
  if (main._cleanupBulkBar) {
    main._cleanupBulkBar();
    delete main._cleanupBulkBar;
  }
}

function renderGrid(grid) {
  const videos   = getVideos();
  const filtered = applyFilters(Object.values(videos), currentFilters);

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>${Object.keys(videos).length === 0 ? 'Your library is empty' : 'No videos match your filters'}</h3>
        <p>${Object.keys(videos).length === 0
          ? 'Click "Import Channel" to add videos from a YouTube channel.'
          : 'Try changing the difficulty filter or search term.'}</p>
        ${Object.keys(videos).length === 0
          ? '<button class="btn btn-accent" id="empty-import-btn">Import Channel</button>'
          : ''}
      </div>
    `;
    if (Object.keys(videos).length === 0) {
      grid.querySelector('#empty-import-btn')?.addEventListener('click', () => {
        document.getElementById('import-modal').classList.remove('hidden');
      });
    }
    return;
  }

  for (const video of filtered) {
    grid.appendChild(buildVideoCard(video));
  }
}

function buildVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card' + (selectionMode ? ' video-card--selectable' : '');
  card.dataset.videoId = video.videoId;

  const progressPct = video.durationSeconds
    ? Math.min(100, Math.round((video.watchedSeconds / video.durationSeconds) * 100))
    : 0;

  const diffLevels = video.difficulty || [];
  const diffBadgesHTML = diffLevels.length === 0
    ? '<span class="difficulty-badge diff-unrated">Unrated</span>'
    : diffLevels.map(l => `<span class="difficulty-badge diff-${l}">${l}</span>`).join('');

  const isSelected = selectedVideoIds.has(video.videoId);

  card.innerHTML = `
    <div class="video-thumb-wrap">
      <img class="video-thumb" src="${escapeAttr(video.thumbnail)}"
           alt="${escapeAttr(video.title)}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\'/>'"/>
      ${selectionMode ? `
        <div class="card-select-overlay${isSelected ? ' checked' : ''}">
          <div class="card-checkbox">
            ${isSelected ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
          </div>
        </div>` : ''}
      ${!selectionMode && video.completed ? `
        <div class="video-watched-overlay">
          <div class="watch-checkmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>` : ''}
      ${!selectionMode && !video.completed ? `
        <button class="card-mark-watched-btn" title="Mark as watched" data-action="mark-watched">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>` : ''}
      <span class="video-duration">${formatDuration(video.durationSeconds)}</span>
    </div>
    <div class="video-progress-bar">
      <div class="video-progress-fill" style="width:${progressPct}%"></div>
    </div>
    <div class="video-info">
      <div class="video-title">${escapeHTML(video.title)}</div>
      <div class="video-meta-row">
        <span class="video-channel">${escapeHTML(video.channelTitle || '')}</span>
        <div class="difficulty-badges">${diffBadgesHTML}</div>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    // Mark-watched button
    if (e.target.closest('[data-action="mark-watched"]')) {
      e.stopPropagation();
      markVideoWatched(video.videoId);
      updateSidebarStats();
      const grid = document.getElementById('video-grid');
      if (grid) renderGrid(grid);
      return;
    }

    if (selectionMode) {
      toggleSelection(video.videoId, card);
    } else {
      onVideoClick(video.videoId);
    }
  });

  return card;
}

function toggleSelection(videoId, card) {
  if (selectedVideoIds.has(videoId)) {
    selectedVideoIds.delete(videoId);
    card.querySelector('.card-select-overlay')?.classList.remove('checked');
    card.querySelector('.card-checkbox svg')?.remove();
  } else {
    selectedVideoIds.add(videoId);
    const overlay = card.querySelector('.card-select-overlay');
    const checkbox = card.querySelector('.card-checkbox');
    overlay?.classList.add('checked');
    if (checkbox && !checkbox.querySelector('svg')) {
      checkbox.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
  }
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (!bar) return;
  const count = selectedVideoIds.size;
  if (selectionMode) {
    bar.classList.remove('hidden');
    const countEl = document.getElementById('bulk-count');
    if (countEl) countEl.textContent = `${count} selected`;
  } else {
    bar.classList.add('hidden');
  }
}

function attachLibraryEvents(container, grid, bulkBar) {
  // Open import modal
  container.querySelector('#open-import-btn')?.addEventListener('click', () => {
    document.getElementById('import-modal').classList.remove('hidden');
  });

  // Select toggle
  container.querySelector('#select-toggle-btn')?.addEventListener('click', () => {
    selectionMode = !selectionMode;
    selectedVideoIds.clear();
    const btn = container.querySelector('#select-toggle-btn');
    if (btn) btn.textContent = selectionMode ? 'Cancel Select' : 'Select';
    renderGrid(grid);
    updateBulkBar();
  });

  // Search
  container.querySelector('#library-search')?.addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    renderGrid(grid);
  });

  // Difficulty chips
  container.querySelector('#difficulty-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    currentFilters.level = chip.dataset.level;
    container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderGrid(grid);
  });

  // Hide watched toggle
  container.querySelector('#hide-watched-toggle')?.addEventListener('change', (e) => {
    currentFilters.hideWatched = e.target.checked;
    renderGrid(grid);
  });

  // Channel filter
  container.querySelector('#channel-filter')?.addEventListener('change', (e) => {
    currentFilters.channel = e.target.value;
    renderGrid(grid);
  });

  // ── Bulk bar actions ──────────────────────────────────────

  // Mark watched (bulk)
  bulkBar.querySelector('#bulk-mark-watched')?.addEventListener('click', () => {
    for (const id of selectedVideoIds) {
      markVideoWatched(id);
    }
    updateSidebarStats();
    selectedVideoIds.clear();
    bulkBar.classList.add('hidden');
    renderGrid(grid);
  });

  // Apply difficulty (bulk)
  bulkBar.querySelector('#bulk-apply-diff')?.addEventListener('click', () => {
    const checked = [...bulkBar.querySelectorAll('.bulk-difficulty-checks input:checked')]
      .map(cb => cb.value);
    for (const id of selectedVideoIds) {
      updateVideoUserFields(id, { difficulty: checked });
    }
    selectedVideoIds.clear();
    bulkBar.classList.add('hidden');
    renderGrid(grid);
  });

  // Select all visible videos
  bulkBar.querySelector('#bulk-select-all')?.addEventListener('click', () => {
    const videos = getVideos();
    const filtered = applyFilters(Object.values(videos), currentFilters);
    filtered.forEach(v => selectedVideoIds.add(v.videoId));
    renderGrid(grid);
    updateBulkBar();
  });

  // Cancel selection
  bulkBar.querySelector('#bulk-cancel')?.addEventListener('click', () => {
    selectionMode = false;
    selectedVideoIds.clear();
    const btn = container.querySelector('#select-toggle-btn');
    if (btn) btn.textContent = 'Select';
    bulkBar.classList.add('hidden');
    renderGrid(grid);
  });
}

// ─── Filtering ───────────────────────────────────────────────

export function applyFilters(videos, { level, search, hideWatched, channel }) {
  return videos.filter(v => {
    if (hideWatched && v.completed) return false;
    if (channel && channel !== 'all') {
      if (v.channelId !== channel) return false;
    }
    if (level && level !== 'all') {
      if (level === 'unrated') {
        if ((v.difficulty || []).length > 0) return false;
      } else {
        if (!(v.difficulty || []).includes(level)) return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      if (!v.title.toLowerCase().includes(q) &&
          !(v.channelTitle || '').toLowerCase().includes(q) &&
          !(v.tags || []).join(' ').toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => b.addedAt - a.addedAt);
}

// ─── Utilities ───────────────────────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
