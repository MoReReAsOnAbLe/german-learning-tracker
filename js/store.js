/**
 * store.js — Single source of truth for all localStorage operations.
 * No other module should read/write localStorage directly.
 *
 * Key prefix: glt_ (German Language Tracker)
 */

const KEYS = {
  SETTINGS:       'glt_settings',
  VIDEOS:         'glt_videos',
  WATCH_SESSIONS: 'glt_watch_sessions',
  DAILY_LOG:      'glt_daily_log',
  CHANNELS:       'glt_channels',
  META:           'glt_meta',
};

const DEFAULTS = {
  settings: {
    dailyGoalMinutes: 30,
    version: 1,
  },
};

// ─── Helpers ────────────────────────────────────────────────

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Cannot save data.');
      alert('Storage limit reached. Please export and reset old data in Settings.');
    }
    throw e;
  }
}

/** Returns today's date as YYYY-MM-DD */
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns yesterday's date as YYYY-MM-DD */
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Settings ───────────────────────────────────────────────

export function getSettings() {
  return { ...DEFAULTS.settings, ...readJSON(KEYS.SETTINGS, {}) };
}

export function saveSettings(patch) {
  const current = getSettings();
  writeJSON(KEYS.SETTINGS, { ...current, ...patch });
}

// ─── Videos ─────────────────────────────────────────────────

export function getVideos() {
  return readJSON(KEYS.VIDEOS, {});
}

export function getVideo(videoId) {
  return getVideos()[videoId] || null;
}

export function saveVideo(videoObj) {
  const videos = getVideos();
  videos[videoObj.videoId] = videoObj;
  writeJSON(KEYS.VIDEOS, videos);
}

/**
 * Bulk-saves an array of video objects.
 * Preserves user-editable fields (difficulty, tags, watchedSeconds, completed)
 * when a video already exists in the store.
 */
export function bulkSaveVideos(arr) {
  const videos = getVideos();
  for (const v of arr) {
    if (videos[v.videoId]) {
      // Merge: keep user edits, update API-sourced fields
      videos[v.videoId] = {
        ...videos[v.videoId],
        title:           v.title,
        thumbnail:       v.thumbnail,
        durationSeconds: v.durationSeconds,
        publishedAt:     v.publishedAt,
        channelId:       v.channelId,
        channelTitle:    v.channelTitle,
      };
    } else {
      videos[v.videoId] = v;
    }
  }
  writeJSON(KEYS.VIDEOS, videos);
}

export function updateVideoUserFields(videoId, patch) {
  const videos = getVideos();
  if (!videos[videoId]) return;
  videos[videoId] = { ...videos[videoId], ...patch };
  writeJSON(KEYS.VIDEOS, videos);
}

// ─── Watch Sessions ──────────────────────────────────────────

export function getWatchSessions() {
  return readJSON(KEYS.WATCH_SESSIONS, []);
}

/**
 * Records a completed watch session and updates daily log + video stats.
 * @param {string} videoId
 * @param {number} secondsWatched
 * @param {number} startedAt  — epoch ms
 */
export function endSession(videoId, secondsWatched, startedAt) {
  if (secondsWatched < 1) return;

  const now = Date.now();
  const sessions = getWatchSessions();
  sessions.push({ videoId, startedAt: startedAt || now, endedAt: now, secondsWatched });
  writeJSON(KEYS.WATCH_SESSIONS, sessions);

  // Update video's cumulative watchedSeconds
  const videos = getVideos();
  if (videos[videoId]) {
    videos[videoId].watchedSeconds = (videos[videoId].watchedSeconds || 0) + secondsWatched;
    // Mark complete if watched >= 90% of duration
    const dur = videos[videoId].durationSeconds;
    if (dur && videos[videoId].watchedSeconds >= dur * 0.9) {
      videos[videoId].completed = true;
    }
    writeJSON(KEYS.VIDEOS, videos);
  }

  // Update daily log
  const today = todayStr();
  const daily = getDailyLog();
  daily[today] = (daily[today] || 0) + secondsWatched;
  writeJSON(KEYS.DAILY_LOG, daily);

  // Recalculate meta
  recalculateMeta();
}

// ─── Daily Log ───────────────────────────────────────────────

export function getDailyLog() {
  return readJSON(KEYS.DAILY_LOG, {});
}

// ─── Channels ────────────────────────────────────────────────

export function getChannels() {
  return readJSON(KEYS.CHANNELS, {});
}

export function saveChannel(channelObj) {
  const channels = getChannels();
  channels[channelObj.channelId] = channelObj;
  writeJSON(KEYS.CHANNELS, channels);
}

export function removeChannel(channelId) {
  const channels = getChannels();
  delete channels[channelId];
  writeJSON(KEYS.CHANNELS, channels);
}

// ─── Meta (cached aggregates) ────────────────────────────────

export function getMeta() {
  return readJSON(KEYS.META, {
    totalSecondsWatched: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
  });
}

export function recalculateMeta() {
  const sessions = getWatchSessions();
  const daily    = getDailyLog();
  const settings = getSettings();

  // Total seconds from sessions
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.secondsWatched || 0), 0);

  // Streak: count consecutive days (going backwards from today) that met the daily goal
  const goalSeconds = settings.dailyGoalMinutes * 60;
  const today = todayStr();

  let streak = 0;
  const d = new Date();

  // Check today first, then go back day by day
  for (let i = 0; i < 3650; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    const watched = daily[dateStr] || 0;

    if (watched >= goalSeconds) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (i === 0) {
      // Today not yet completed — check yesterday to continue streak
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  const existing = getMeta();
  const longestStreak = Math.max(streak, existing.longestStreak || 0);

  const meta = {
    totalSecondsWatched: totalSeconds,
    currentStreak: streak,
    longestStreak,
    lastActiveDate: today,
  };
  writeJSON(KEYS.META, meta);
  return meta;
}

// ─── Data export / reset ─────────────────────────────────────

export function exportData() {
  return {
    exportedAt: new Date().toISOString(),
    settings:  getSettings(),
    videos:    getVideos(),
    sessions:  getWatchSessions(),
    dailyLog:  getDailyLog(),
    channels:  getChannels(),
    meta:      getMeta(),
  };
}

export function resetData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

// ─── Boot ────────────────────────────────────────────────────

export function boot() {
  // Ensure meta is up-to-date on app start
  recalculateMeta();
}
