/**
 * calendar.js — GitHub-style activity heatmap + calendar stats.
 */

import { getDailyLog, getMeta, getSettings } from './store.js';

const WEEKS = 52;
const DAYS  = 7; // rows: Sun=0 … Sat=6

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Main render ─────────────────────────────────────────────

export function renderCalendar(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = '<h1 class="page-title">Activity Calendar</h1>';
  container.appendChild(header);

  // Stats row
  container.appendChild(buildStatsRow());

  // Heatmap
  const heatmapSection = document.createElement('div');
  heatmapSection.className = 'card';
  heatmapSection.innerHTML = '<div class="card-title" style="margin-bottom:16px">Watch History (past year)</div>';

  const heatmapWrap = document.createElement('div');
  heatmapWrap.className = 'heatmap-wrap';
  heatmapSection.appendChild(heatmapWrap);
  heatmapSection.appendChild(buildLegend());
  container.appendChild(heatmapSection);

  buildHeatmap(heatmapWrap);
}

// ─── Stats summary row ───────────────────────────────────────

function buildStatsRow() {
  const daily    = getDailyLog();
  const meta     = getMeta();
  const settings = getSettings();

  const totalSeconds = meta.totalSecondsWatched || 0;
  const totalHours   = totalSeconds / 3600;

  // Days active (any watch time at all)
  const activeDays = Object.values(daily).filter(s => s > 0).length;

  // Average daily minutes (over active days)
  const avgMins = activeDays > 0
    ? Math.round(Object.values(daily).reduce((a, b) => a + b, 0) / activeDays / 60)
    : 0;

  // Longest single day
  const maxSecs  = Math.max(0, ...Object.values(daily));
  const maxMins  = Math.round(maxSecs / 60);

  const row = document.createElement('div');
  row.className = 'calendar-stats-row';
  row.innerHTML = `
    ${statCard('Total Hours',    formatHours(totalHours),    'cumulative watch time')}
    ${statCard('🔥 Streak',      `${meta.currentStreak}d`,   'consecutive days at goal')}
    ${statCard('Active Days',    activeDays,                  'days with any watch time')}
    ${statCard('Best Day',       `${maxMins} min`,            'most minutes in a single day')}
  `;
  return row;
}

function statCard(title, value, sub) {
  return `
    <div class="calendar-stat-card">
      <div class="card-title">${escapeHTML(title)}</div>
      <div class="card-big-number">${escapeHTML(String(value))}</div>
      <div class="card-sub">${escapeHTML(sub)}</div>
    </div>
  `;
}

// ─── Heatmap ─────────────────────────────────────────────────

function buildHeatmap(container) {
  const daily = getDailyLog();

  // Build date grid: 52 weeks × 7 days, ending today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday of the week that was 52 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * 7) + 1);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build columns (weeks), each with 7 days
  const columns = []; // columns[week][day] = Date
  const monthPositions = []; // { month, weekIndex }

  let cursor = new Date(startDate);
  for (let w = 0; w < WEEKS + 1; w++) {
    const week = [];
    for (let d = 0; d < DAYS; d++) {
      week.push(new Date(cursor));
      // Track month transitions for labels
      if (d === 0 && cursor.getDate() <= 7) {
        monthPositions.push({ month: cursor.getMonth(), weekIndex: w });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(week);
  }

  // Max seconds in any day (for color scaling)
  const maxSecs = Math.max(1, ...Object.values(daily));

  // Build outer layout
  const outer = document.createElement('div');
  outer.className = 'heatmap-outer';

  // Weekday labels (Mon/Wed/Fri only to avoid crowding)
  const weekdayLabels = document.createElement('div');
  weekdayLabels.className = 'heatmap-weekday-labels';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let d = 0; d < 7; d++) {
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-weekday-label';
    lbl.textContent = (d === 1 || d === 3 || d === 5) ? dayNames[d] : '';
    weekdayLabels.appendChild(lbl);
  }
  outer.appendChild(weekdayLabels);

  const gridWrap = document.createElement('div');
  gridWrap.className = 'heatmap-grid-wrap';

  // Month labels row
  const monthRow = document.createElement('div');
  monthRow.className = 'heatmap-month-labels';

  // Position month labels using flex with spacers
  let lastWeek = 0;
  for (const mp of monthPositions) {
    const spacer = document.createElement('span');
    const weeks  = mp.weekIndex - lastWeek;
    spacer.style.width = `${weeks * (13 + 3)}px`;
    spacer.style.display = 'inline-block';
    monthRow.appendChild(spacer);

    const lbl = document.createElement('span');
    lbl.className = 'heatmap-month-label';
    lbl.textContent = MONTH_NAMES[mp.month];
    monthRow.appendChild(lbl);
    lastWeek = mp.weekIndex;
  }
  gridWrap.appendChild(monthRow);

  // Grid cells
  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  const todayStr = today.toISOString().slice(0, 10);

  for (const week of columns) {
    for (const date of week) {
      const dateStr = date.toISOString().slice(0, 10);
      const secs    = daily[dateStr] || 0;
      const mins    = Math.round(secs / 60);
      const isFuture = date > today;

      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      if (!isFuture) {
        cell.style.backgroundColor = heatColor(secs, maxSecs);
        if (dateStr === todayStr) {
          cell.style.outline = '2px solid var(--accent)';
          cell.style.outlineOffset = '1px';
        }
        const label = mins === 0
          ? `${formatDate(date)}: No activity`
          : `${formatDate(date)}: ${mins} min`;
        cell.dataset.tooltip = label;
      } else {
        cell.style.backgroundColor = 'transparent';
      }

      grid.appendChild(cell);
    }
  }

  gridWrap.appendChild(grid);
  outer.appendChild(gridWrap);
  container.appendChild(outer);
}

// ─── Legend ──────────────────────────────────────────────────

function buildLegend() {
  const wrap = document.createElement('div');
  wrap.className = 'heatmap-legend';
  wrap.innerHTML = `
    <span class="heatmap-legend-label">Less</span>
    <div class="heatmap-legend-cells">
      <div class="heatmap-legend-cell" style="background:var(--heat-0)"></div>
      <div class="heatmap-legend-cell" style="background:var(--heat-1)"></div>
      <div class="heatmap-legend-cell" style="background:var(--heat-2)"></div>
      <div class="heatmap-legend-cell" style="background:var(--heat-3)"></div>
      <div class="heatmap-legend-cell" style="background:var(--heat-4)"></div>
    </div>
    <span class="heatmap-legend-label">More</span>
  `;
  return wrap;
}

// ─── Helpers ─────────────────────────────────────────────────

const HEAT_COLORS = [
  'var(--heat-0)',
  'var(--heat-1)',
  'var(--heat-2)',
  'var(--heat-3)',
  'var(--heat-4)',
];

function heatColor(secs, maxSecs) {
  if (secs === 0) return HEAT_COLORS[0];
  const ratio = secs / maxSecs;
  if (ratio < 0.1) return HEAT_COLORS[1];
  if (ratio < 0.3) return HEAT_COLORS[2];
  if (ratio < 0.6) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
}

function formatDate(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
