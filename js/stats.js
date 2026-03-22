/**
 * stats.js — Dashboard page and sidebar stats.
 */

import { getMeta, getSettings, getDailyLog, getVideos, getWatchSessions } from './store.js';

const TOTAL_GOAL_HOURS = 1500;

// ─── Sidebar (always visible) ────────────────────────────────

export function updateSidebarStats() {
  const meta     = getMeta();
  const settings = getSettings();
  const daily    = getDailyLog();

  const totalHours   = meta.totalSecondsWatched / 3600;
  const goalPct      = Math.min(100, (totalHours / TOTAL_GOAL_HOURS) * 100);
  const todaySeconds = daily[todayStr()] || 0;
  const goalSeconds  = settings.dailyGoalMinutes * 60;
  const todayPct     = Math.min(100, (todaySeconds / goalSeconds) * 100);

  setText('sidebar-total-hours', formatHours(totalHours));
  setWidth('sidebar-progress-fill', goalPct);
  setText('sidebar-progress-pct', `${goalPct.toFixed(1)}% of ${TOTAL_GOAL_HOURS.toLocaleString()}h goal`);
  setText('sidebar-streak', `${meta.currentStreak} ${meta.currentStreak === 1 ? 'day' : 'days'}`);
  setText('sidebar-today', `${Math.round(todaySeconds / 60)} / ${settings.dailyGoalMinutes} min`);
  setWidth('sidebar-today-fill', todayPct);
}

// ─── Dashboard page ──────────────────────────────────────────

export function renderDashboard(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = '<h1 class="page-title">Dashboard</h1>';
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'dashboard-grid';
  container.appendChild(grid);

  const meta     = getMeta();
  const settings = getSettings();
  const daily    = getDailyLog();
  const videos   = getVideos();

  const totalHours   = meta.totalSecondsWatched / 3600;
  const goalPct      = Math.min(100, (totalHours / TOTAL_GOAL_HOURS) * 100);
  const todaySeconds = daily[todayStr()] || 0;
  const goalSeconds  = settings.dailyGoalMinutes * 60;
  const todayPct     = Math.min(100, (todaySeconds / Math.max(goalSeconds, 1)) * 100);
  const todayMins    = Math.round(todaySeconds / 60);
  const goalComplete = todaySeconds >= goalSeconds;

  // Progress ring card
  const ringCard = document.createElement('div');
  ringCard.className = 'card progress-ring-card';
  const circumference = 2 * Math.PI * 68; // r=68
  const offset = circumference - (goalPct / 100) * circumference;
  ringCard.innerHTML = `
    <div class="card-title">Total Progress</div>
    <div class="progress-ring-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle class="progress-ring-track" cx="80" cy="80" r="68"/>
        <circle class="progress-ring-fill" cx="80" cy="80" r="68"
                stroke-dasharray="${circumference.toFixed(2)}"
                stroke-dashoffset="${offset.toFixed(2)}"/>
      </svg>
      <div class="progress-ring-label">
        <span class="ring-hours">${formatHours(totalHours)}</span>
        <span class="ring-sub">of ${TOTAL_GOAL_HOURS.toLocaleString()}h</span>
      </div>
    </div>
    <span class="ring-goal-label">${goalPct.toFixed(2)}% toward fluency</span>
  `;
  grid.appendChild(ringCard);

  // Streak card
  const streakCard = document.createElement('div');
  streakCard.className = 'card streak-card';
  streakCard.innerHTML = `
    <div class="card-title">🔥 Streak</div>
    <div class="streak-number">${meta.currentStreak}</div>
    <div class="streak-label">${meta.currentStreak === 1 ? 'day' : 'days'} in a row</div>
    <div class="streak-best">Best: ${meta.longestStreak} ${meta.longestStreak === 1 ? 'day' : 'days'}</div>
  `;
  grid.appendChild(streakCard);

  // Daily goal card
  const goalCard = document.createElement('div');
  goalCard.className = 'card daily-goal-card';
  goalCard.innerHTML = `
    <div class="card-title">Today's Goal</div>
    <div class="card-big-number">${todayMins}<span style="font-size:18px;font-weight:400"> min</span></div>
    <div class="card-sub">of ${settings.dailyGoalMinutes} min goal</div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-track">
        <div class="goal-bar-fill ${goalComplete ? 'complete' : ''}" style="width:${todayPct}%"></div>
      </div>
      <div class="goal-numbers">
        <span>0</span><span>${settings.dailyGoalMinutes} min</span>
      </div>
    </div>
    ${goalComplete ? '<span class="goal-complete-badge">✓ Goal met today!</span>' : ''}
  `;
  grid.appendChild(goalCard);

  // Recently watched
  const recentCard = document.createElement('div');
  recentCard.className = 'card recent-card';

  const sessions  = getWatchSessions();
  const recentIds = [...new Set(
    [...sessions].reverse().map(s => s.videoId)
  )].slice(0, 12);
  const recentVideos = recentIds.map(id => videos[id]).filter(Boolean);

  recentCard.innerHTML = `
    <div class="card-title">Recently Watched</div>
    <div class="recent-scroll" id="recent-scroll"></div>
  `;
  grid.appendChild(recentCard);

  if (recentVideos.length === 0) {
    recentCard.querySelector('#recent-scroll').innerHTML =
      '<p class="text-muted" style="padding:12px 0">No videos watched yet.</p>';
  } else {
    const scroll = recentCard.querySelector('#recent-scroll');
    for (const v of recentVideos) {
      const el = document.createElement('div');
      el.className = 'recent-video-card';
      el.dataset.videoId = v.videoId;
      el.innerHTML = `
        <img class="recent-thumb" src="${escapeAttr(v.thumbnail)}" alt="${escapeAttr(v.title)}" loading="lazy" />
        <div class="recent-info">
          <div class="recent-title">${escapeHTML(v.title)}</div>
        </div>
      `;
      scroll.appendChild(el);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${pct}%`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
