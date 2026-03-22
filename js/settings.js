/**
 * settings.js — Settings page: daily goal, channels list, export, reset.
 */

import { getSettings, saveSettings, getChannels, removeChannel, exportData, resetData } from './store.js';
import { updateSidebarStats } from './stats.js';

export function renderSettings(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = '<h1 class="page-title">Settings</h1>';
  container.appendChild(header);

  container.appendChild(buildGoalSection());
  container.appendChild(buildChannelsSection());
  container.appendChild(buildDataSection());
}

// ─── Daily goal ──────────────────────────────────────────────

function buildGoalSection() {
  const settings = getSettings();

  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML = `
    <div class="settings-section-title">Learning Goal</div>
    <div class="settings-row">
      <div>
        <div class="settings-label">Daily goal</div>
        <div class="settings-desc">Minutes to watch each day to maintain your streak</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" class="settings-input" id="daily-goal-input"
               value="${settings.dailyGoalMinutes}" min="1" max="480" />
        <span style="font-size:13px;color:var(--text-muted)">min / day</span>
      </div>
    </div>
  `;

  section.querySelector('#daily-goal-input').addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (val >= 1 && val <= 480) {
      saveSettings({ dailyGoalMinutes: val });
      updateSidebarStats();
    }
  });

  return section;
}

// ─── Channels ────────────────────────────────────────────────

function buildChannelsSection() {
  const channels = getChannels();
  const list = Object.values(channels);

  const section = document.createElement('div');
  section.className = 'settings-section';
  section.id = 'channels-section';

  section.innerHTML = `
    <div class="settings-section-title">Imported Channels</div>
    ${list.length === 0
      ? '<p style="color:var(--text-muted);font-size:13px;padding:12px 0">No channels imported yet. Use the Import button in the Video Library.</p>'
      : `<table class="channels-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Videos</th>
              <th>Last sync</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map(ch => `
              <tr data-channel-id="${escapeAttr(ch.channelId)}">
                <td>${escapeHTML(ch.channelTitle)}</td>
                <td>${ch.videoCount || 0}</td>
                <td>${ch.lastSyncAt ? formatDate(ch.lastSyncAt) : '—'}</td>
                <td>
                  <button class="channel-remove-btn" data-channel-id="${escapeAttr(ch.channelId)}" title="Remove channel">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
    }
  `;

  // Remove channel handlers
  section.querySelectorAll('.channel-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const channelId = btn.dataset.channelId;
      if (confirm('Remove this channel from your settings? (Videos and watch history are kept.)')) {
        removeChannel(channelId);
        // Re-render the section
        const parent = section.parentElement;
        section.replaceWith(buildChannelsSection());
      }
    });
  });

  return section;
}

// ─── Data management ─────────────────────────────────────────

function buildDataSection() {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML = `
    <div class="settings-section-title">Data Management</div>
    <div class="settings-row">
      <div>
        <div class="settings-label">Export data</div>
        <div class="settings-desc">Download all your watch history and settings as JSON</div>
      </div>
      <button class="btn btn-surface" id="export-btn">Export JSON</button>
    </div>
    <div class="settings-row">
      <div>
        <div class="settings-label">Reset all data</div>
        <div class="settings-desc" style="color:var(--danger)">Permanently deletes all videos, watch history, and settings</div>
      </div>
      <button class="btn btn-danger" id="reset-btn">Reset</button>
    </div>
    <div class="settings-row" style="padding-top:16px;border-bottom:none">
      <div>
        <div class="settings-label">YouTube API Key</div>
        <div class="settings-desc">
          The API key is configured as a server environment variable — never stored in your browser.
          To update it, change the <code>YOUTUBE_API_KEY</code> environment variable in your Vercel project settings.
        </div>
      </div>
    </div>
  `;

  section.querySelector('#export-btn').addEventListener('click', handleExport);
  section.querySelector('#reset-btn').addEventListener('click', handleReset);

  return section;
}

function handleExport() {
  const data    = exportData();
  const json    = JSON.stringify(data, null, 2);
  const blob    = new Blob([json], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href   = url;
  anchor.download = `deutsch-tracker-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function handleReset() {
  const first = confirm(
    'This will permanently delete all videos, watch history, streaks, and settings.\n\nAre you sure?'
  );
  if (!first) return;

  const second = confirm('This cannot be undone. Delete everything?');
  if (!second) return;

  resetData();
  window.location.reload();
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
