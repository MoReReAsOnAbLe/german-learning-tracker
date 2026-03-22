/**
 * app.js — Bootstrap, hash-based router, and global event wiring.
 *
 * Import order is important: store must be loaded before anything
 * that calls into it. All other modules are imported here.
 */

import { boot } from './store.js';
import { updateSidebarStats, renderDashboard, initLogTime } from './stats.js';
import { renderLibrary, setVideoClickHandler, cleanupLibrary } from './library.js';
import { renderCalendar } from './calendar.js';
import { renderSettings } from './settings.js';
import { initPlayer, openPlayer } from './player.js';
import { initImport } from './import.js';
import { initAuth } from './auth.js';

// ─── Router ──────────────────────────────────────────────────

let currentPage = '';

function navigate(page) {
  currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  const main = document.getElementById('main-content');

  // Clean up library selection state / bulk bar before switching pages
  cleanupLibrary();

  switch (page) {
    case 'dashboard': renderDashboard(main); break;
    case 'library':   renderLibrary(main);   break;
    case 'calendar':  renderCalendar(main);  break;
    case 'settings':  renderSettings(main);  break;
    default:          renderDashboard(main); break;
  }
}

// Hash-based routing
function routeFromHash() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
}

window.addEventListener('hashchange', routeFromHash);

// Nav link clicks
document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', () => {
    // Let the default hash change happen, then route
    setTimeout(routeFromHash, 0);
  });
});

// ─── Boot ────────────────────────────────────────────────────

(async () => {
  boot();
  await initAuth();       // check session, load cloud data, wire auth modal
  updateSidebarStats();
  initPlayer();
  initImport();
  initLogTime();

  // Wire library's video-click to open the player
  setVideoClickHandler((videoId) => openPlayer(videoId));

  // Wire recently-watched video clicks on the dashboard
  document.getElementById('main-content').addEventListener('click', (e) => {
    const card = e.target.closest('[data-video-id]');
    if (card && card.classList.contains('recent-video-card')) {
      openPlayer(card.dataset.videoId);
    }
  });

  // Re-render library after a channel import
  window.addEventListener('channelImported', () => {
    if (currentPage === 'library') navigate('library');
    updateSidebarStats();
  });

  // Re-render current page after auth state changes (sign in / sign out)
  window.addEventListener('authChanged', () => {
    updateSidebarStats();
    routeFromHash();
  });

  // Initial route
  routeFromHash();
})();
