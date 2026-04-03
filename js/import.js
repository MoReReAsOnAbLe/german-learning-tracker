/**
 * import.js — YouTube channel import flow.
 *
 * Flow (quota-efficient):
 *  1. Resolve @handle → channelId   (1 unit via /api/channel)
 *  2. Compute uploadsPlaylistId = "UU" + channelId.slice(2)  (0 units)
 *  3. Page through playlistItems  (1 unit / page of 50)
 *  4. Batch-fetch durations in groups of 50  (1 unit / batch)
 *  5. Deduplicate + merge into store
 */

import { fetchChannelInfo, fetchPlaylistPage, fetchDurations, parseHandle, fetchPlaylistInfo, parsePlaylistId } from './youtube.js';
import { bulkSaveVideos, saveChannel, savePlaylist } from './store.js';

// ─── CEFR detection ──────────────────────────────────────────

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Scans a video title for CEFR level markers (A1–C2).
 * If a range is found (e.g. "A1-B1"), returns all levels in that range.
 * Returns [] if none found.
 * @param {string} title
 * @returns {string[]}
 */
export function detectCEFRFromTitle(title) {
  const found = [];
  const re = /\b(A1|A2|B1|B2|C1|C2)\b/gi;
  let m;
  while ((m = re.exec(title)) !== null) {
    const lvl = m[1].toUpperCase();
    if (!found.includes(lvl)) found.push(lvl);
  }
  if (found.length === 0) return [];
  const indices = found.map(l => CEFR_ORDER.indexOf(l));
  const min = Math.min(...indices);
  const max = Math.max(...indices);
  return CEFR_ORDER.slice(min, max + 1);
}

// ─── Modal init ──────────────────────────────────────────────

let activeImportTab = 'channel';

export function initImport() {
  document.getElementById('import-close')?.addEventListener('click', closeImportModal);
  document.getElementById('import-backdrop')?.addEventListener('click', closeImportModal);
  document.getElementById('import-btn')?.addEventListener('click', () => {
    if (activeImportTab === 'playlist') {
      handlePlaylistImport();
    } else {
      handleImport();
    }
  });

  document.getElementById('import-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleImport();
  });
  document.getElementById('import-playlist-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePlaylistImport();
  });

  // Tab switching
  document.querySelectorAll('.import-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.importTab;
      if (tab === activeImportTab) return;
      activeImportTab = tab;
      document.querySelectorAll('.import-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.importTab === tab));
      document.getElementById('import-panel-channel').classList.toggle('hidden', tab !== 'channel');
      document.getElementById('import-panel-playlist').classList.toggle('hidden', tab !== 'playlist');
      resetImportUI();
      if (tab === 'channel') {
        document.getElementById('import-input')?.focus();
      } else {
        document.getElementById('import-playlist-input')?.focus();
      }
    });
  });
}

export function openImportModal() {
  activeImportTab = 'channel';
  resetImportUI();
  // Ensure channel tab is active on open
  document.querySelectorAll('.import-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.importTab === 'channel'));
  document.getElementById('import-panel-channel')?.classList.remove('hidden');
  document.getElementById('import-panel-playlist')?.classList.add('hidden');
  document.getElementById('import-modal').classList.remove('hidden');
  document.getElementById('import-input')?.focus();
}

function closeImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
  resetImportUI();
}

function resetImportUI() {
  const channelInput = document.getElementById('import-input');
  const playlistInput = document.getElementById('import-playlist-input');
  if (channelInput) channelInput.value = '';
  if (playlistInput) playlistInput.value = '';
  setImportProgress(false);
  setImportError(null);
  setImportSuccess(null);
  document.getElementById('import-btn').disabled = false;
}

// ─── Import handler ──────────────────────────────────────────

async function handleImport() {
  const raw = document.getElementById('import-input').value.trim();
  if (!raw) return;

  document.getElementById('import-btn').disabled = true;
  setImportError(null);
  setImportSuccess(null);
  setImportProgress(true, 'Resolving channel…', 0);

  try {
    // Step 1: resolve handle → channelId
    const handle      = parseHandle(raw);
    const channelInfo = await fetchChannelInfo(handle);
    const { channelId, channelTitle } = channelInfo;

    setImportProgress(true, `Found: ${channelTitle}. Fetching videos…`, 5);

    // Step 2: compute uploads playlist ID (deterministic, no API call)
    const uploadsPlaylistId = 'UU' + channelId.slice(2);

    // Step 3: page through playlist
    const allItems = [];
    let pageToken = null;
    let page = 0;

    do {
      const result = await fetchPlaylistPage(uploadsPlaylistId, pageToken);
      allItems.push(...result.items);
      pageToken = result.nextPageToken;
      page++;
      // Estimate progress: playlist pages are unknown in advance, show live count
      setImportProgress(true, `Fetched ${allItems.length} videos…`, Math.min(60, 5 + page * 5));
    } while (pageToken);

    if (allItems.length === 0) {
      throw new Error('No videos found in this channel.');
    }

    setImportProgress(true, `Fetching durations for ${allItems.length} videos…`, 65);

    // Step 4: batch-fetch durations (50 per request)
    const durationMap = {};
    const videoIds = allItems.map(v => v.videoId);
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const durations = await fetchDurations(batch);
      Object.assign(durationMap, durations);
      const pct = 65 + Math.round(((i + batch.length) / videoIds.length) * 30);
      setImportProgress(true, `Fetching durations… ${i + batch.length} / ${videoIds.length}`, pct);
    }

    // Step 5: build video objects and save
    const now = Date.now();
    const skipShorts = document.getElementById('import-skip-shorts')?.checked ?? true;
    const videos = allItems
      .filter(item => durationMap[item.videoId] !== 0) // skip live streams
      .filter(item => !skipShorts || durationMap[item.videoId] > 60) // skip Shorts
      .map(item => ({
        videoId:        item.videoId,
        title:          item.title,
        channelId:      item.channelId || channelId,
        channelTitle:   item.channelTitle || channelTitle,
        thumbnail:      item.thumbnail,
        publishedAt:    item.publishedAt,
        durationSeconds: durationMap[item.videoId] || 0,
        difficulty:     detectCEFRFromTitle(item.title),
        tags:           [],
        addedAt:        now,
        watchedSeconds: 0,
        completed:      false,
      }));

    bulkSaveVideos(videos);

    // Save channel record
    saveChannel({
      channelId,
      channelTitle,
      handle,
      videoCount:  videos.length,
      lastSyncAt:  now,
      importedAt:  now,
    });

    setImportProgress(true, 'Complete!', 100);
    setImportSuccess(`Successfully imported ${videos.length} videos from ${channelTitle}.`);

    // Dispatch event so the library can re-render if visible
    window.dispatchEvent(new CustomEvent('channelImported', { detail: { channelId } }));

  } catch (err) {
    setImportError(err.message || 'Import failed. Check the channel handle and try again.');
    setImportProgress(false);
  } finally {
    document.getElementById('import-btn').disabled = false;
  }
}

// ─── Playlist import handler ─────────────────────────────────

async function handlePlaylistImport() {
  const raw = document.getElementById('import-playlist-input').value.trim();
  if (!raw) return;

  document.getElementById('import-btn').disabled = true;
  setImportError(null);
  setImportSuccess(null);
  setImportProgress(true, 'Resolving playlist…', 0);

  try {
    // Step 1: parse playlist ID
    const playlistId = parsePlaylistId(raw);

    // Step 2: fetch playlist metadata (title, channel)
    const { playlistTitle, channelTitle } = await fetchPlaylistInfo(playlistId);
    setImportProgress(true, `Found: ${playlistTitle}. Fetching videos…`, 5);

    // Step 3: page through playlist items
    const allItems = [];
    let pageToken = null;
    let page = 0;

    do {
      const result = await fetchPlaylistPage(playlistId, pageToken);
      allItems.push(...result.items);
      pageToken = result.nextPageToken;
      page++;
      setImportProgress(true, `Fetched ${allItems.length} videos…`, Math.min(60, 5 + page * 5));
    } while (pageToken);

    if (allItems.length === 0) {
      throw new Error('No videos found in this playlist.');
    }

    setImportProgress(true, `Fetching durations for ${allItems.length} videos…`, 65);

    // Step 4: batch-fetch durations
    const durationMap = {};
    const videoIds = allItems.map(v => v.videoId);
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const durations = await fetchDurations(batch);
      Object.assign(durationMap, durations);
      const pct = 65 + Math.round(((i + batch.length) / videoIds.length) * 30);
      setImportProgress(true, `Fetching durations… ${i + batch.length} / ${videoIds.length}`, pct);
    }

    // Step 5: build video objects and save
    const now = Date.now();
    const skipShorts = document.getElementById('import-skip-shorts')?.checked ?? true;
    const videos = allItems
      .filter(item => durationMap[item.videoId] !== 0)
      .filter(item => !skipShorts || durationMap[item.videoId] > 60)
      .map(item => ({
        videoId:        item.videoId,
        title:          item.title,
        channelId:      item.channelId || '',
        channelTitle:   item.channelTitle || channelTitle,
        thumbnail:      item.thumbnail,
        publishedAt:    item.publishedAt,
        durationSeconds: durationMap[item.videoId] || 0,
        difficulty:     detectCEFRFromTitle(item.title),
        tags:           [],
        addedAt:        now,
        watchedSeconds: 0,
        completed:      false,
        playlistId,
      }));

    bulkSaveVideos(videos);

    // Save playlist record
    savePlaylist({
      playlistId,
      playlistTitle,
      channelTitle,
      videoCount:  videos.length,
      lastSyncAt:  now,
      importedAt:  now,
    });

    setImportProgress(true, 'Complete!', 100);
    setImportSuccess(`Successfully imported ${videos.length} videos from "${playlistTitle}".`);

    window.dispatchEvent(new CustomEvent('playlistImported', { detail: { playlistId } }));

  } catch (err) {
    setImportError(err.message || 'Import failed. Check the playlist URL and try again.');
    setImportProgress(false);
  } finally {
    document.getElementById('import-btn').disabled = false;
  }
}

// ─── UI helpers ──────────────────────────────────────────────

function setImportProgress(visible, text = '', pct = 0) {
  const el   = document.getElementById('import-progress');
  const fill = document.getElementById('import-progress-fill');
  const txt  = document.getElementById('import-progress-text');

  if (visible) {
    el.classList.remove('hidden');
    fill.style.width = `${pct}%`;
    txt.textContent  = text;
  } else {
    el.classList.add('hidden');
  }
}

function setImportError(msg) {
  const el = document.getElementById('import-error');
  if (msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function setImportSuccess(msg) {
  const el = document.getElementById('import-success');
  if (msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}
