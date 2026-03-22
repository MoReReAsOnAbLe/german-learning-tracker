/**
 * player.js — YouTube player modal + real-time watch-time tracking.
 *
 * Watch-time tracking approach:
 *   - State-gated 1-second setInterval accumulator
 *   - Only counts seconds when YT.PlayerState === PLAYING (1)
 *   - Flushes on pause, end, modal close, and window beforeunload
 */

import { loadIframeAPI, createPlayer } from './youtube.js';
import { getVideo, updateVideoUserFields, endSession } from './store.js';
import { updateSidebarStats } from './stats.js';

let ytPlayer      = null;
let trackInterval = null;
let sessionStart  = null;
let sessionSeconds = 0;
let currentVideoId = null;
let pendingFlush  = false;

// ─── Open / close ────────────────────────────────────────────

export async function openPlayer(videoId) {
  const video = getVideo(videoId);
  if (!video) return;

  currentVideoId = videoId;
  sessionSeconds = 0;
  sessionStart   = Date.now();
  pendingFlush   = false;

  const modal = document.getElementById('player-modal');

  // Populate metadata
  document.getElementById('player-title').textContent   = video.title;
  document.getElementById('player-channel').textContent = video.channelTitle || '';
  document.getElementById('player-session-seconds').textContent = '0s';

  const levels = video.difficulty || [];
  document.querySelectorAll('#player-difficulty-checks input[type=checkbox]')
    .forEach(cb => { cb.checked = levels.includes(cb.value); });

  const tagsInput = document.getElementById('player-tags');
  tagsInput.value = (video.tags || []).join(', ');

  modal.classList.remove('hidden');

  // Load the iframe API if not already loaded
  await loadIframeAPI();

  // Destroy any existing player before creating a new one
  destroyPlayer();

  // Re-create the player container div (iframe API replaces the element)
  const container = document.getElementById('player-container');
  container.innerHTML = '<div id="youtube-player"></div>';

  ytPlayer = createPlayer('youtube-player', videoId, {
    onStateChange: onPlayerStateChange,
    onError:       onPlayerError,
  });
}

export function closePlayer() {
  stopTracking();
  flushSession();
  destroyPlayer();

  // Save user edits to difficulty/tags
  if (currentVideoId) {
    const tagsInput = document.getElementById('player-tags');
    updateVideoUserFields(currentVideoId, {
      difficulty: [...document.querySelectorAll('#player-difficulty-checks input[type=checkbox]:checked')]
        .map(cb => cb.value),
      tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
    });
  }

  document.getElementById('player-modal').classList.add('hidden');
  currentVideoId = null;
}

// ─── Player state handling ───────────────────────────────────

function onPlayerStateChange(event) {
  const YT_PLAYING = 1;
  const YT_PAUSED  = 2;
  const YT_ENDED   = 0;

  if (event.data === YT_PLAYING) {
    startTracking();
  } else if (event.data === YT_PAUSED || event.data === YT_ENDED) {
    stopTracking();
    flushSession();
  }
}

function onPlayerError(event) {
  stopTracking();
  flushSession();
  console.warn('YouTube player error:', event.data);
}

// ─── Interval tracker ────────────────────────────────────────

function startTracking() {
  if (trackInterval) return; // already running
  trackInterval = setInterval(() => {
    sessionSeconds++;
    document.getElementById('player-session-seconds').textContent = formatSessionTime(sessionSeconds);
  }, 1000);
}

function stopTracking() {
  if (trackInterval) {
    clearInterval(trackInterval);
    trackInterval = null;
  }
}

function flushSession() {
  if (pendingFlush || !currentVideoId || sessionSeconds < 1) return;
  pendingFlush = true;
  endSession(currentVideoId, sessionSeconds, sessionStart);
  updateSidebarStats();
  sessionSeconds = 0;
  sessionStart   = Date.now();
  pendingFlush   = false;
}

// ─── Helpers ─────────────────────────────────────────────────

function destroyPlayer() {
  stopTracking();
  if (ytPlayer) {
    try { ytPlayer.destroy(); } catch {}
    ytPlayer = null;
  }
}

function formatSessionTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2,'0')}s`;
}

// ─── beforeunload flush ──────────────────────────────────────
// Synchronous localStorage write — safe inside beforeunload

window.addEventListener('beforeunload', () => {
  stopTracking();
  if (currentVideoId && sessionSeconds >= 1) {
    // endSession writes synchronously to localStorage
    endSession(currentVideoId, sessionSeconds, sessionStart);
  }
});

// ─── Init: attach modal close handlers ───────────────────────

export function initPlayer() {
  document.getElementById('player-close')?.addEventListener('click', closePlayer);

  document.getElementById('player-backdrop')?.addEventListener('click', closePlayer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('player-modal').classList.contains('hidden')) {
      closePlayer();
    }
  });
}
