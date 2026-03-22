/**
 * library.js — Video library page: card grid, filters, search.
 */

import { getVideos } from './store.js';
import { formatDuration } from './youtube.js';

const LEVELS = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'unrated'];

let currentFilters = {
  level:       'all',
  search:      '',
  hideWatched: false,
};

// Callback set by app.js so library can open the player
let onVideoClick = () => {};

export function setVideoClickHandler(fn) {
  onVideoClick = fn;
}

export function renderLibrary(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <h1 class="page-title">Video Library</h1>
    <button class="btn btn-accent" id="open-import-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Import Channel
    </button>
  `;
  container.appendChild(header);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'library-toolbar';
  toolbar.innerHTML = `
    <input type="text" class="search-input" id="library-search"
           placeholder="Search videos…" value="${escapeAttr(currentFilters.search)}" />
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

  renderGrid(grid);
  attachLibraryEvents(container, grid);
}

function renderGrid(grid) {
  const videos = getVideos();
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
  card.className = 'video-card';
  card.dataset.videoId = video.videoId;

  const progressPct = video.durationSeconds
    ? Math.min(100, Math.round((video.watchedSeconds / video.durationSeconds) * 100))
    : 0;

  const diffClass = `diff-${video.difficulty || 'unrated'}`;
  const diffLabel = video.difficulty || 'Unrated';

  card.innerHTML = `
    <div class="video-thumb-wrap">
      <img class="video-thumb" src="${escapeAttr(video.thumbnail)}"
           alt="${escapeAttr(video.title)}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\'/>'" />
      ${video.completed ? `
        <div class="video-watched-overlay">
          <div class="watch-checkmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>` : ''}
      <span class="video-duration">${formatDuration(video.durationSeconds)}</span>
    </div>
    <div class="video-progress-bar">
      <div class="video-progress-fill" style="width:${progressPct}%"></div>
    </div>
    <div class="video-info">
      <div class="video-title">${escapeHTML(video.title)}</div>
      <div class="video-meta-row">
        <span class="video-channel">${escapeHTML(video.channelTitle || '')}</span>
        <span class="difficulty-badge ${diffClass}">${diffLabel}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => onVideoClick(video.videoId));
  return card;
}

function attachLibraryEvents(container, grid) {
  // Open import modal
  container.querySelector('#open-import-btn')?.addEventListener('click', () => {
    document.getElementById('import-modal').classList.remove('hidden');
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
}

// ─── Filtering ───────────────────────────────────────────────

export function applyFilters(videos, { level, search, hideWatched }) {
  return videos.filter(v => {
    if (hideWatched && v.completed) return false;
    if (level && level !== 'all') {
      if (v.difficulty !== level) return false;
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
