/**
 * auth.js — Supabase authentication and cloud sync.
 *
 * Setup:
 *  1. Create a free project at supabase.com
 *  2. Run the SQL schema in supabase/schema.sql
 *  3. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your project values
 *     (the anon key is intentionally public — Row Level Security protects data)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  setCloudSyncHook,
  getSettings, getVideos, getWatchSessions,
  getDailyLog, getChannels, getPlaylists, getMeta, boot,
} from './store.js';

// ── Supabase config — replace with your project values ──────
const SUPABASE_URL      = 'https://fakmhvaxdqjupctofbjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha21odmF4ZHFqdXBjdG9mYmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDY1MjAsImV4cCI6MjA4OTc4MjUyMH0.APBlsI8zm6T3qnijbrSFm8r7DHuzTfd9MyZ55ExNivs';
// ────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KEYS = {
  SETTINGS:       'glt_settings',
  VIDEOS:         'glt_videos',
  WATCH_SESSIONS: 'glt_watch_sessions',
  DAILY_LOG:      'glt_daily_log',
  CHANNELS:       'glt_channels',
  PLAYLISTS:      'glt_playlists',
  META:           'glt_meta',
};

// ─── Session + sync state ────────────────────────────────────

let _currentSession = null;
let _lastSyncAt     = null;
let syncTimer       = null;

export function getCurrentSession() { return _currentSession; }
export function getLastSyncAt()     { return _lastSyncAt; }

// ─── Debounced cloud sync ────────────────────────────────────

function scheduleSyncToCloud() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToCloud, 2000);
}

async function syncToCloud() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { error } = await supabase.from('user_data').upsert({
    user_id:        session.user.id,
    settings:       getSettings(),
    videos:         getVideos(),
    watch_sessions: getWatchSessions(),
    daily_log:      getDailyLog(),
    channels:       getChannels(),
    playlists:      getPlaylists(),
    meta:           getMeta(),
    updated_at:     new Date().toISOString(),
  });
  if (!error) {
    _lastSyncAt = Date.now();
    window.dispatchEvent(new Event('cloudSynced'));
  }
}

/** Cancels the debounce and syncs immediately. Use for manual push or tab-hide flush. */
export async function pushToCloud() {
  clearTimeout(syncTimer);
  await syncToCloud();
}

// ─── Load cloud data into localStorage ───────────────────────

export async function loadFromCloud() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (!data) {
    // First sign-in: upload existing local data to the cloud
    syncToCloud();
    return;
  }

  if (data.settings)       localStorage.setItem(KEYS.SETTINGS,       JSON.stringify(data.settings));
  if (data.videos)         localStorage.setItem(KEYS.VIDEOS,         JSON.stringify(data.videos));
  if (data.watch_sessions) localStorage.setItem(KEYS.WATCH_SESSIONS, JSON.stringify(data.watch_sessions));
  if (data.daily_log)      localStorage.setItem(KEYS.DAILY_LOG,      JSON.stringify(data.daily_log));
  if (data.channels)       localStorage.setItem(KEYS.CHANNELS,       JSON.stringify(data.channels));
  if (data.playlists)      localStorage.setItem(KEYS.PLAYLISTS,      JSON.stringify(data.playlists));
  if (data.meta)           localStorage.setItem(KEYS.META,           JSON.stringify(data.meta));

  boot();
}

// ─── Auth actions ────────────────────────────────────────────

/** @returns {string|null} error message, or null on success */
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error?.message || null;
}

/** @returns {string|null} error message, or null on success */
export async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  return error?.message || null;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Init ────────────────────────────────────────────────────

export async function initAuth() {
  // Hook into store so every write schedules a debounced cloud push
  setCloudSyncHook(scheduleSyncToCloud);

  // Restore session from a previous page load
  const session = await getSession();
  _currentSession = session;
  if (session) {
    await loadFromCloud();
    updateAuthUI(session.user.email);
  } else {
    updateAuthUI(null);
  }

  // Flush any pending debounced sync immediately when the tab is hidden/closed
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && _currentSession) {
      pushToCloud();
    }
  });

  // React to sign-in / sign-out across tabs or after OAuth redirects
  supabase.auth.onAuthStateChange(async (event, session) => {
    _currentSession = session;
    if (event === 'SIGNED_IN') {
      await loadFromCloud();
      updateAuthUI(session.user.email);
      window.dispatchEvent(new Event('authChanged'));
    } else if (event === 'SIGNED_OUT') {
      updateAuthUI(null);
      window.dispatchEvent(new Event('authChanged'));
    }
  });

  wireAuthModal();
}

// ─── Sidebar user widget ──────────────────────────────────────

function updateAuthUI(email) {
  const widget = document.getElementById('auth-widget');
  if (!widget) return;

  if (email) {
    widget.innerHTML = `
      <div class="auth-user">
        <span class="auth-email" title="${escapeAttr(email)}">${escapeHTML(email)}</span>
        <button class="auth-signout-btn" id="auth-signout-btn" title="Sign out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>`;
    document.getElementById('auth-signout-btn')?.addEventListener('click', signOut);
  } else {
    widget.innerHTML = `
      <button class="auth-signin-btn" id="auth-open-btn">Sign in / Sign up</button>`;
    document.getElementById('auth-open-btn')?.addEventListener('click', () => {
      document.getElementById('auth-modal').classList.remove('hidden');
    });
  }
}

// ─── Auth modal ───────────────────────────────────────────────

function wireAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  // Tab switching
  modal.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modal.querySelectorAll('.auth-tab-panel').forEach(p => p.classList.add('hidden'));
      modal.querySelector(`#auth-panel-${btn.dataset.tab}`)?.classList.remove('hidden');
      const errEl = modal.querySelector('#auth-error');
      errEl.textContent = '';
      delete errEl.dataset.type;
    });
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    const errEl = modal.querySelector('#auth-error');
    errEl.textContent = '';
    delete errEl.dataset.type;
  };
  modal.querySelector('#auth-close')?.addEventListener('click', closeModal);
  modal.querySelector('#auth-backdrop')?.addEventListener('click', closeModal);

  // Sign in
  modal.querySelector('#auth-signin-submit')?.addEventListener('click', async () => {
    const email  = modal.querySelector('#auth-signin-email').value.trim();
    const pass   = modal.querySelector('#auth-signin-pass').value;
    const btn    = modal.querySelector('#auth-signin-submit');
    const errEl  = modal.querySelector('#auth-error');

    btn.disabled = true;
    btn.textContent = 'Signing in…';
    const err = await signIn(email, pass);
    btn.disabled = false;
    btn.textContent = 'Sign In';

    if (err) {
      errEl.textContent = err;
      errEl.dataset.type = 'error';
    } else {
      closeModal();
    }
  });

  // Sign up
  modal.querySelector('#auth-signup-submit')?.addEventListener('click', async () => {
    const email  = modal.querySelector('#auth-signup-email').value.trim();
    const pass   = modal.querySelector('#auth-signup-pass').value;
    const btn    = modal.querySelector('#auth-signup-submit');
    const errEl  = modal.querySelector('#auth-error');

    btn.disabled = true;
    btn.textContent = 'Creating account…';
    const err = await signUp(email, pass);
    btn.disabled = false;
    btn.textContent = 'Create Account';

    if (err) {
      errEl.textContent = err;
      errEl.dataset.type = 'error';
    } else {
      errEl.textContent = 'Account created! Check your email to confirm, then sign in.';
      errEl.dataset.type = 'success';
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
