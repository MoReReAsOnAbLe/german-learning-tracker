/**
 * youtube.js — YouTube iframe API loader + Data API proxy wrappers.
 *
 * Data API calls go through /api/* Vercel serverless functions so the
 * YouTube API key never reaches the browser.
 *
 * The YouTube iframe API (for embedding/playing) is public — no key needed.
 */

// ─── Iframe API ──────────────────────────────────────────────

let iframeAPIReady = false;
let iframeAPIPromise = null;

/**
 * Injects the YouTube iframe API script and returns a Promise that
 * resolves when the API is ready to use.
 */
export function loadIframeAPI() {
  if (iframeAPIReady) return Promise.resolve();
  if (iframeAPIPromise) return iframeAPIPromise;

  iframeAPIPromise = new Promise((resolve) => {
    // The API calls window.onYouTubeIframeAPIReady when ready.
    // Must be on window — ES module scope is not visible to the API.
    window.onYouTubeIframeAPIReady = () => {
      iframeAPIReady = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return iframeAPIPromise;
}

/**
 * Creates a YouTube player in the given DOM element.
 * @param {string|Element} elementOrId
 * @param {string} videoId
 * @param {{ onStateChange, onReady, onError }} callbacks
 * @returns {YT.Player}
 */
export function createPlayer(elementOrId, videoId, { onStateChange, onReady, onError } = {}) {
  return new YT.Player(elementOrId, {
    videoId,
    playerVars: {
      autoplay:       1,
      rel:            0,
      modestbranding: 1,
      origin:         window.location.origin || 'http://localhost',
    },
    events: {
      onReady:       onReady       || (() => {}),
      onStateChange: onStateChange || (() => {}),
      onError:       onError       || (() => {}),
    },
  });
}

// ─── Data API proxy helpers ──────────────────────────────────

/**
 * Resolves a channel handle or URL to { channelId, channelTitle }.
 * @param {string} handleOrUrl  e.g. "@ComprehensibleGerman" or full URL
 */
export async function fetchChannelInfo(handleOrUrl) {
  const handle = parseHandle(handleOrUrl);
  const res = await fetch(`/api/channel?handle=${encodeURIComponent(handle)}`);
  if (!res.ok) throw new Error(`Channel API error: ${res.status}`);
  return res.json(); // { channelId, channelTitle }
}

/**
 * Fetches one page of a channel's uploads playlist.
 * @param {string} playlistId   Uploads playlist ID ("UU" + channelId.slice(2))
 * @param {string|null} pageToken
 * @returns {{ items: Array, nextPageToken: string|null }}
 */
export async function fetchPlaylistPage(playlistId, pageToken = null) {
  let url = `/api/playlist?playlistId=${encodeURIComponent(playlistId)}`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Playlist API error: ${res.status}`);
  return res.json(); // { items: [{videoId, title, thumbnail, publishedAt, channelId, channelTitle}], nextPageToken }
}

/**
 * Fetches durations for up to 50 video IDs.
 * @param {string[]} videoIds
 * @returns {Object} { videoId: durationSeconds }
 */
export async function fetchDurations(videoIds) {
  if (!videoIds.length) return {};
  const res = await fetch(`/api/durations?ids=${encodeURIComponent(videoIds.join(','))}`);
  if (!res.ok) throw new Error(`Durations API error: ${res.status}`);
  return res.json(); // { videoId: seconds, ... }
}

// ─── Utilities ───────────────────────────────────────────────

/**
 * Extracts a @handle from various YouTube URL formats, or returns
 * the input if it already looks like a handle.
 */
export function parseHandle(input) {
  const s = input.trim();
  // Already a handle
  if (s.startsWith('@')) return s;
  // Full URL: youtube.com/@handle or youtube.com/c/handle or youtube.com/user/handle
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    const parts = url.pathname.split('/').filter(Boolean);
    for (const p of parts) {
      if (p.startsWith('@')) return p;
    }
    // /channel/UCxxx
    if (parts[0] === 'channel') return parts[1];
    // /c/name or /user/name
    if (parts[0] === 'c' || parts[0] === 'user') return `@${parts[1]}`;
    // fallback: first path segment
    if (parts[0]) return `@${parts[0]}`;
  } catch {
    // Not a URL — try adding @
    return s.startsWith('@') ? s : `@${s}`;
  }
  return s;
}

/**
 * Parses an ISO 8601 duration string into seconds.
 * e.g. "PT1H23M45S" → 5025, "PT45S" → 45, "P0D" → 0
 */
export function parseISODuration(str) {
  if (!str || str === 'P0D') return 0;
  const m = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) +
         (parseInt(m[2] || 0) * 60)   +
          parseInt(m[3] || 0);
}

/**
 * Formats seconds into a human-readable duration string.
 * e.g. 3665 → "1:01:05", 125 → "2:05"
 */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
