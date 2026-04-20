# Time Logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal time logger with subjects, live count-up/countdown timers, manual time logging, stats, history, confetti celebrations, and localStorage persistence — deployed as a static site on Vercel.

**Architecture:** Multi-file vanilla HTML/CSS/JS with no build step. Plain `<script>` tags load six JS modules (store, timer, confetti, subjects, entries, app) in dependency order. All data lives in `localStorage` under one key. CSS uses custom properties for the warm-dark amber theme.

**Tech Stack:** Vanilla HTML5, CSS3 (custom properties, grid, flexbox), vanilla JS (IIFE modules, AudioContext, Canvas, localStorage). No frameworks, no npm packages, no build step. `vercel dev` for local dev.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `index.html` | Overwrite | App shell, all modal markup, script loading order |
| `css/app.css` | Overwrite | All styles — theme variables, layout, components, mobile |
| `js/store.js` | Overwrite | localStorage CRUD, export/import JSON |
| `js/timer.js` | Overwrite | Count-up + countdown logic, duration parser, display formatter |
| `js/confetti.js` | Overwrite | Canvas confetti burst, AudioContext beep |
| `js/subjects.js` | Overwrite | Render sidebar + mobile tabs, create/rename/delete |
| `js/entries.js` | Overwrite | Render history list, render stats tiles |
| `js/app.js` | Overwrite | Wires all modules, event listeners, routing |
| `js/auth.js` | Overwrite | Legacy stub (file kept, emptied) |
| `js/calendar.js` | Overwrite | Legacy stub |
| `js/import.js` | Overwrite | Legacy stub |
| `js/library.js` | Overwrite | Legacy stub |
| `js/player.js` | Overwrite | Legacy stub |
| `js/settings.js` | Overwrite | Legacy stub |
| `js/stats.js` | Overwrite | Legacy stub |
| `js/youtube.js` | Overwrite | Legacy stub |
| `vercel.json` | Overwrite | Remove API rewrite (no backend) |

---

## Task 1: Clear legacy files and update vercel.json

**Files:**
- Overwrite: `js/auth.js`, `js/calendar.js`, `js/import.js`, `js/library.js`, `js/player.js`, `js/settings.js`, `js/stats.js`, `js/youtube.js`
- Overwrite: `vercel.json`

- [ ] **Step 1: Stub out all legacy JS files**

Write the following identical content to each of: `js/auth.js`, `js/calendar.js`, `js/import.js`, `js/library.js`, `js/player.js`, `js/settings.js`, `js/stats.js`, `js/youtube.js`:

```js
// Legacy file — no longer used
```

- [ ] **Step 2: Update vercel.json**

```json
{}
```

- [ ] **Step 3: Commit**

```bash
git add js/auth.js js/calendar.js js/import.js js/library.js js/player.js js/settings.js js/stats.js js/youtube.js vercel.json
git commit -m "chore: stub legacy files, simplify vercel config"
```

---

## Task 2: Data layer — js/store.js

**Files:**
- Overwrite: `js/store.js`

- [ ] **Step 1: Write js/store.js**

```js
const Store = (() => {
  const KEY = 'timelogger_data';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { subjects: [], entries: [] };
    } catch {
      return { subjects: [], entries: [] };
    }
  }

  function saveAll(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function addSubject(name) {
    const data = getAll();
    const subject = { id: generateId(), name: name.trim(), createdAt: new Date().toISOString() };
    data.subjects.push(subject);
    saveAll(data);
    return subject;
  }

  function updateSubject(id, name) {
    const data = getAll();
    const s = data.subjects.find(s => s.id === id);
    if (s) { s.name = name.trim(); saveAll(data); }
  }

  function deleteSubject(id) {
    const data = getAll();
    data.subjects = data.subjects.filter(s => s.id !== id);
    data.entries = data.entries.filter(e => e.subjectId !== id);
    saveAll(data);
  }

  function addEntry(subjectId, durationSeconds, loggedAt, note) {
    const data = getAll();
    const entry = {
      id: generateId(),
      subjectId,
      durationSeconds,
      loggedAt: loggedAt || new Date().toISOString(),
      note: note || ''
    };
    data.entries.push(entry);
    saveAll(data);
    return entry;
  }

  function deleteEntry(id) {
    const data = getAll();
    data.entries = data.entries.filter(e => e.id !== id);
    saveAll(data);
  }

  function getEntriesForSubject(subjectId) {
    return getAll().entries.filter(e => e.subjectId === subjectId);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(getAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timelogger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(jsonString) {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported.subjects) || !Array.isArray(imported.entries)) {
      throw new Error('Invalid format');
    }
    const data = getAll();
    const existingSubjectIds = new Set(data.subjects.map(s => s.id));
    const existingEntryIds = new Set(data.entries.map(e => e.id));
    imported.subjects.forEach(s => { if (!existingSubjectIds.has(s.id)) data.subjects.push(s); });
    imported.entries.forEach(e => { if (!existingEntryIds.has(e.id)) data.entries.push(e); });
    saveAll(data);
  }

  return { getAll, addSubject, updateSubject, deleteSubject, addEntry, deleteEntry, getEntriesForSubject, exportData, importData };
})();
```

- [ ] **Step 2: Verify in browser console**

Open `vercel dev` and run in the browser console:
```js
Store.addSubject('Test');
Store.getAll(); // should show { subjects: [{id, name:'Test', createdAt}], entries: [] }
Store.addEntry(Store.getAll().subjects[0].id, 3600, null, 'note');
Store.getAll(); // should show one entry with durationSeconds: 3600
```
Expected: both calls return the correct objects.

- [ ] **Step 3: Commit**

```bash
git add js/store.js
git commit -m "feat: add data layer (store.js)"
```

---

## Task 3: Timer logic — js/timer.js

**Files:**
- Overwrite: `js/timer.js`

- [ ] **Step 1: Write js/timer.js**

```js
const Timer = (() => {
  let interval = null;
  let elapsed = 0;
  let remaining = 0;
  let target = 0;
  let mode = null; // 'up' | 'down'
  let running = false;
  let onCompleteCb = null;

  function parseDuration(input) {
    if (!input) return null;
    input = input.trim();
    const hm = input.match(/^(\d+)h\s*(\d+)m?$/i);
    if (hm) return parseInt(hm[1]) * 3600 + parseInt(hm[2]) * 60;
    const h = input.match(/^(\d+)h$/i);
    if (h) return parseInt(h[1]) * 3600;
    const m = input.match(/^(\d+)m$/i);
    if (m) return parseInt(m[1]) * 60;
    const hms = input.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3]);
    const ms = input.match(/^(\d+):(\d{2})$/);
    if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2]);
    const plain = input.match(/^(\d+)$/);
    if (plain) return parseInt(plain[1]) * 60;
    return null;
  }

  function formatDisplay(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds < 1) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }

  function startCountUp(onTick) {
    if (running) return;
    mode = 'up';
    running = true;
    interval = setInterval(() => {
      elapsed++;
      onTick(formatDisplay(elapsed), elapsed);
    }, 1000);
  }

  function startCountDown(targetSeconds, onTick, onComplete) {
    if (running) return;
    mode = 'down';
    target = targetSeconds;
    remaining = targetSeconds;
    running = true;
    onCompleteCb = onComplete;
    interval = setInterval(() => {
      remaining--;
      const warning = remaining < 60;
      if (remaining <= 0) {
        _clearInterval();
        onTick(formatDisplay(0), 0, warning);
        if (onCompleteCb) onCompleteCb(target);
      } else {
        onTick(formatDisplay(remaining), remaining, warning);
      }
    }, 1000);
  }

  function pause() {
    if (!running) return;
    _clearInterval();
  }

  function resume(onTick, onComplete) {
    if (running) return;
    running = true;
    if (mode === 'up') {
      interval = setInterval(() => {
        elapsed++;
        onTick(formatDisplay(elapsed), elapsed);
      }, 1000);
    } else {
      onCompleteCb = onComplete;
      interval = setInterval(() => {
        remaining--;
        const warning = remaining < 60;
        if (remaining <= 0) {
          _clearInterval();
          onTick(formatDisplay(0), 0, warning);
          if (onCompleteCb) onCompleteCb(target);
        } else {
          onTick(formatDisplay(remaining), remaining, warning);
        }
      }, 1000);
    }
  }

  function _clearInterval() {
    clearInterval(interval);
    interval = null;
    running = false;
  }

  function stop() {
    const result = mode === 'up' ? elapsed : target;
    _clearInterval();
    elapsed = 0;
    remaining = 0;
    target = 0;
    mode = null;
    return result;
  }

  function reset() {
    _clearInterval();
    elapsed = 0;
    remaining = 0;
    target = 0;
    mode = null;
  }

  function isRunning() { return running; }
  function getMode() { return mode; }

  return { parseDuration, formatDisplay, formatDuration, startCountUp, startCountDown, pause, resume, stop, reset, isRunning, getMode };
})();
```

- [ ] **Step 2: Verify in browser console**

```js
Timer.parseDuration('1h 30m');   // expected: 5400
Timer.parseDuration('90');        // expected: 5400
Timer.parseDuration('1:30:00');   // expected: 5400
Timer.parseDuration('25m');       // expected: 1500
Timer.formatDuration(5400);       // expected: "1h 30m"
Timer.formatDuration(65);         // expected: "1m 5s"
Timer.formatDisplay(3661);        // expected: "01:01:01"
```

- [ ] **Step 3: Commit**

```bash
git add js/timer.js
git commit -m "feat: add timer logic with count-up, countdown, duration parser"
```

---

## Task 4: Effects — js/confetti.js

**Files:**
- Overwrite: `js/confetti.js`

- [ ] **Step 1: Write js/confetti.js**

```js
const Effects = (() => {
  function burst() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = ['#f59e0b', '#d97706', '#fbbf24', '#fafaf9', '#78716c', '#b45309'];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 4 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      alpha: 1
    }));

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rotation += p.rotSpeed;
        if (frame > 120) p.alpha = Math.max(0, p.alpha - 0.02);
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < 180) {
        requestAnimationFrame(animate);
      } else {
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    animate();
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 528;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio unavailable:', e);
    }
  }

  function celebrate() {
    burst();
    beep();
  }

  return { burst, beep, celebrate };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/confetti.js
git commit -m "feat: add confetti burst and beep effects"
```

---

## Task 5: Styles — css/app.css

**Files:**
- Overwrite: `css/app.css`

- [ ] **Step 1: Write css/app.css**

```css
:root {
  --bg: #0c0a09;
  --panel: #1c1917;
  --surface: #292524;
  --surface-hover: #3b3330;
  --accent: #d97706;
  --accent-hover: #f59e0b;
  --text: #fafaf9;
  --text-muted: #78716c;
  --text-label: #57534e;
  --danger: #dc2626;
  --sidebar-width: 220px;
  --radius: 8px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

/* ── Layout ── */
.app-layout { display: flex; min-height: 100vh; }

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  border-right: 1px solid var(--surface);
  padding: 20px 0 0;
}

.sidebar-header {
  padding: 0 16px 16px;
  border-bottom: 1px solid var(--surface);
  margin-bottom: 8px;
}

.app-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text);
}

.subject-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.subject-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
  gap: 8px;
  border-left: 3px solid transparent;
}

.subject-item:hover { background: var(--surface); color: var(--text); }

.subject-item.active {
  background: var(--surface);
  color: var(--text);
  border-left-color: var(--accent-hover);
}

.subject-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.delete-subject-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 11px;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.subject-item:hover .delete-subject-btn { opacity: 1; }

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}

.export-import { display: flex; gap: 6px; }

/* ── Main panel ── */
.main {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 32px;
  max-width: 900px;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 16px;
  color: var(--text-muted);
  text-align: center;
}

/* ── Subject header ── */
.subject-header { margin-bottom: 20px; }
.subject-name { font-size: 22px; font-weight: 700; }

/* ── Timer card ── */
.timer-card {
  background: var(--panel);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 14px;
}

.timer-display {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
  font-size: clamp(36px, 7vw, 64px);
  font-weight: 700;
  color: var(--text);
  letter-spacing: 3px;
  margin-bottom: 20px;
  transition: color 0.3s;
}

.timer-display.warning { color: var(--accent-hover); }

.timer-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

/* ── Stats ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.stat-card {
  background: var(--panel);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
}

.stat-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-label);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.stat-value { font-size: 20px; font-weight: 600; }

/* ── History ── */
.history-section {
  background: var(--panel);
  border-radius: var(--radius);
  padding: 20px;
}

.section-title {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-label);
  text-transform: uppercase;
  margin-bottom: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--surface);
  gap: 12px;
}
.history-item:last-child { border-bottom: none; }

.history-item-left { flex: 1; min-width: 0; }
.history-item-time { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
.history-item-note { font-size: 12px; color: var(--text-label); font-style: italic; }
.history-item-duration { font-size: 14px; font-weight: 600; flex-shrink: 0; }

.delete-entry-btn {
  background: none;
  border: none;
  color: var(--text-label);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.history-item:hover .delete-entry-btn { opacity: 1; }

.history-empty {
  color: var(--text-label);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

/* ── Buttons ── */
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 44px;
}
.btn-primary:hover { background: var(--accent-hover); }

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 44px;
}
.btn-secondary:hover { background: var(--surface-hover); }

.btn-danger {
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  min-height: 44px;
}

.btn-ghost {
  background: none;
  color: var(--text-muted);
  border: 1px solid var(--surface);
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  text-align: left;
  min-height: 44px;
}
.btn-ghost:hover { background: var(--surface); color: var(--text); }

.btn-ghost-sm {
  background: var(--surface);
  color: var(--text-muted);
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  flex: 1;
  text-align: center;
  min-height: 36px;
}
.btn-ghost-sm:hover { background: var(--surface-hover); color: var(--text); }

/* ── Inputs ── */
.input {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--surface-hover);
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  min-height: 44px;
}
.input:focus { border-color: var(--accent); }

.form-label {
  display: block;
  font-size: 11px;
  color: var(--text-label);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  margin-top: 14px;
}
.form-label:first-child { margin-top: 0; }

.input-hint { font-size: 11px; color: var(--text-label); margin-top: 4px; }

/* ── Modals ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal {
  background: var(--panel);
  border-radius: var(--radius);
  padding: 24px;
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--surface);
}

.modal h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
.modal-actions .btn-ghost,
.modal-actions .btn-danger,
.modal-actions .btn-primary { width: auto; }

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(12px);
  background: var(--surface);
  color: var(--text);
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.25s, transform 0.25s;
  z-index: 200;
  border: 1px solid var(--accent);
  pointer-events: none;
  white-space: nowrap;
}
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ── Confetti canvas ── */
#confetti-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 300;
  display: none;
}

/* ── Mobile bottom tabs ── */
.mobile-tabs {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--panel);
  border-top: 1px solid var(--surface);
  padding: 8px 12px;
  align-items: center;
  gap: 8px;
  z-index: 50;
}

.mobile-subject-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.mobile-subject-tabs::-webkit-scrollbar { display: none; }

.mobile-tab {
  background: var(--surface);
  color: var(--text-muted);
  border: none;
  border-radius: 20px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  min-height: 36px;
}
.mobile-tab.active { background: var(--accent); color: #fff; }

.mobile-add-btn {
  background: var(--surface);
  color: var(--accent);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

/* ── Utility ── */
.hidden { display: none !important; }

/* ── Responsive ── */
@media (max-width: 639px) {
  .sidebar { display: none; }
  .main { margin-left: 0; padding: 16px 16px 80px; }
  .mobile-tabs { display: flex; }
  .timer-display { font-size: clamp(32px, 12vw, 56px); }
  .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-card { padding: 12px 8px; }
  .stat-value { font-size: 16px; }
  .modal-overlay { align-items: flex-end; padding: 0; }
  .modal { border-radius: var(--radius) var(--radius) 0 0; max-width: 100%; padding: 20px 20px 32px; }
  .toast { bottom: 80px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/app.css
git commit -m "feat: add full dark amber theme styles with mobile layout"
```

---

## Task 6: App shell — index.html

**Files:**
- Overwrite: `index.html`

- [ ] **Step 1: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Time Logger</title>
  <link rel="stylesheet" href="css/app.css" />
</head>
<body>

  <canvas id="confetti-canvas"></canvas>
  <div id="toast" class="toast"></div>

  <div class="app-layout">

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h1 class="app-title">Time Logger</h1>
      </div>
      <nav class="subject-list" id="subject-list"></nav>
      <div class="sidebar-footer">
        <button class="btn-ghost" id="add-subject-btn">+ New Subject</button>
        <div class="export-import">
          <button class="btn-ghost-sm" id="export-btn">↓ Export</button>
          <label class="btn-ghost-sm" for="import-input" style="cursor:pointer">↑ Import</label>
          <input type="file" id="import-input" accept=".json" style="display:none" />
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="main" id="main">

      <!-- Empty state -->
      <div class="empty-state" id="empty-state">
        <p>No subjects yet. Add one to start logging time.</p>
        <button class="btn-primary" id="empty-add-btn">+ New Subject</button>
      </div>

      <!-- Subject view -->
      <div class="subject-view hidden" id="subject-view">

        <div class="subject-header">
          <h2 class="subject-name" id="subject-name"></h2>
        </div>

        <!-- Timer -->
        <div class="timer-card">
          <div class="timer-display" id="timer-display">00:00:00</div>
          <div class="timer-controls">
            <button class="btn-primary" id="start-btn">▶ Start</button>
            <button class="btn-secondary hidden" id="pause-btn">⏸ Pause</button>
            <button class="btn-secondary hidden" id="resume-btn">▶ Resume</button>
            <button class="btn-danger hidden" id="stop-btn">⏹ Stop</button>
            <button class="btn-secondary" id="log-time-btn">+ Log Time</button>
            <button class="btn-secondary" id="countdown-btn">⏱ Countdown</button>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-label">Today</div>
            <div class="stat-value" id="stat-today">0m</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">This Week</div>
            <div class="stat-value" id="stat-week">0m</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">All Time</div>
            <div class="stat-value" id="stat-all">0m</div>
          </div>
        </div>

        <!-- History -->
        <div class="history-section">
          <h3 class="section-title">History</h3>
          <div class="history-list" id="history-list"></div>
        </div>

      </div>
    </main>
  </div>

  <!-- Mobile bottom tabs -->
  <div class="mobile-tabs" id="mobile-tabs">
    <div class="mobile-subject-tabs" id="mobile-subject-tabs"></div>
    <button class="mobile-add-btn" id="mobile-add-btn">+</button>
  </div>

  <!-- Modal: Add Subject -->
  <div class="modal-overlay hidden" id="add-subject-modal">
    <div class="modal">
      <h3>New Subject</h3>
      <label class="form-label">Name</label>
      <input type="text" class="input" id="add-subject-input" placeholder="e.g. German, Coding, Reading" />
      <div class="modal-actions">
        <button class="btn-ghost" id="add-subject-cancel">Cancel</button>
        <button class="btn-primary" id="add-subject-confirm">Add</button>
      </div>
    </div>
  </div>

  <!-- Modal: Log Time -->
  <div class="modal-overlay hidden" id="log-time-modal">
    <div class="modal">
      <h3>Log Time</h3>
      <label class="form-label">Duration</label>
      <input type="text" class="input" id="log-duration-input" placeholder="e.g. 1h 30m, 90, 1:30:00" />
      <div class="input-hint">Minutes by default — or use: 1h 30m · 90 · 1:30:00</div>
      <label class="form-label">Date</label>
      <input type="date" class="input" id="log-date-input" />
      <label class="form-label">Note (optional)</label>
      <input type="text" class="input" id="log-note-input" placeholder="What did you work on?" />
      <div class="modal-actions">
        <button class="btn-ghost" id="log-time-cancel">Cancel</button>
        <button class="btn-primary" id="log-time-confirm">Log</button>
      </div>
    </div>
  </div>

  <!-- Modal: Countdown -->
  <div class="modal-overlay hidden" id="countdown-modal">
    <div class="modal">
      <h3>Set Countdown</h3>
      <label class="form-label">Duration</label>
      <input type="text" class="input" id="countdown-input" placeholder="e.g. 25m, 1h, 1:30:00" />
      <div class="input-hint">Minutes by default — or use: 25m · 1h · 1:30:00</div>
      <div class="modal-actions">
        <button class="btn-ghost" id="countdown-cancel">Cancel</button>
        <button class="btn-primary" id="countdown-confirm">Start Countdown</button>
      </div>
    </div>
  </div>

  <!-- Modal: Confirm -->
  <div class="modal-overlay hidden" id="confirm-modal">
    <div class="modal">
      <h3 id="confirm-title">Are you sure?</h3>
      <p id="confirm-message" style="color:var(--text-muted);font-size:14px;margin-top:8px"></p>
      <div class="modal-actions">
        <button class="btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn-danger" id="confirm-ok">Delete</button>
      </div>
    </div>
  </div>

  <script src="js/store.js"></script>
  <script src="js/timer.js"></script>
  <script src="js/confetti.js"></script>
  <script src="js/subjects.js"></script>
  <script src="js/entries.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify page loads without errors**

Run `vercel dev` and open `http://localhost:3000`. Open the browser console — expected: no JS errors. The page should show a dark background (the JS modules aren't wired yet so no UI will render).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add app shell with all modal markup"
```

---

## Task 7: Subjects module — js/subjects.js

**Files:**
- Overwrite: `js/subjects.js`

- [ ] **Step 1: Write js/subjects.js**

```js
const Subjects = (() => {
  let onSelectCb = null;
  let activeId = null;

  function init(onSelect) {
    onSelectCb = onSelect;
  }

  function setActive(id) {
    activeId = id;
  }

  function render() {
    const { subjects } = Store.getAll();
    const list = document.getElementById('subject-list');
    const mobileTabs = document.getElementById('mobile-subject-tabs');

    list.innerHTML = '';
    mobileTabs.innerHTML = '';

    subjects.forEach(s => {
      // Sidebar item
      const item = document.createElement('div');
      item.className = 'subject-item' + (s.id === activeId ? ' active' : '');
      item.dataset.id = s.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'subject-item-name';
      nameSpan.textContent = s.name;
      nameSpan.addEventListener('dblclick', e => {
        e.stopPropagation();
        startRename(item, nameSpan, s.id, s.name);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-subject-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'Delete subject';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        Confirm.show(
          `Delete "${s.name}"?`,
          'All logged time for this subject will also be deleted.',
          () => {
            Store.deleteSubject(s.id);
            const remaining = Store.getAll().subjects;
            onSelectCb(remaining.length > 0 ? remaining[0].id : null);
          }
        );
      });

      item.appendChild(nameSpan);
      item.appendChild(deleteBtn);
      item.addEventListener('click', () => onSelectCb(s.id));
      list.appendChild(item);

      // Mobile tab
      const tab = document.createElement('button');
      tab.className = 'mobile-tab' + (s.id === activeId ? ' active' : '');
      tab.textContent = s.name;
      tab.addEventListener('click', () => onSelectCb(s.id));
      mobileTabs.appendChild(tab);
    });
  }

  function startRename(item, nameSpan, id, currentName) {
    const input = document.createElement('input');
    input.className = 'input';
    input.value = currentName;
    input.style.cssText = 'padding:3px 6px;height:28px;font-size:13px;';
    item.replaceChild(input, nameSpan);
    input.focus();
    input.select();

    const finish = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) Store.updateSubject(id, newName);
      render();
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') render();
    });
  }

  return { init, render, setActive };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/subjects.js
git commit -m "feat: add subjects module (sidebar + mobile tabs)"
```

---

## Task 8: Entries module — js/entries.js

**Files:**
- Overwrite: `js/entries.js`

- [ ] **Step 1: Write js/entries.js**

```js
const Entries = (() => {
  function renderHistory(subjectId) {
    const entries = Store.getEntriesForSubject(subjectId)
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

    const list = document.getElementById('history-list');

    if (entries.length === 0) {
      list.innerHTML = '<div class="history-empty">No time logged yet</div>';
      return;
    }

    list.innerHTML = entries.map(e => `
      <div class="history-item">
        <div class="history-item-left">
          <div class="history-item-time">${formatTimestamp(e.loggedAt)}</div>
          ${e.note ? `<div class="history-item-note">${escapeHtml(e.note)}</div>` : ''}
        </div>
        <div class="history-item-duration">${Timer.formatDuration(e.durationSeconds)}</div>
        <button class="delete-entry-btn" data-id="${e.id}" title="Delete entry">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.delete-entry-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Confirm.show('Delete this entry?', '', () => {
          Store.deleteEntry(btn.dataset.id);
          App.refreshView();
        });
      });
    });
  }

  function renderStats(subjectId) {
    const entries = Store.getEntriesForSubject(subjectId);
    const now = new Date();
    const todayStr = now.toDateString();

    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sum = arr => arr.reduce((s, e) => s + e.durationSeconds, 0);

    document.getElementById('stat-today').textContent =
      Timer.formatDuration(sum(entries.filter(e => new Date(e.loggedAt).toDateString() === todayStr)));
    document.getElementById('stat-week').textContent =
      Timer.formatDuration(sum(entries.filter(e => new Date(e.loggedAt) >= monday)));
    document.getElementById('stat-all').textContent =
      Timer.formatDuration(sum(entries));
  }

  function formatTimestamp(iso) {
    const date = new Date(iso);
    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === now.toDateString()) return `Today ${timeStr}`;
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${timeStr}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { renderHistory, renderStats };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/entries.js
git commit -m "feat: add entries module (history list + stats)"
```

---

## Task 9: Wire everything — js/app.js

**Files:**
- Overwrite: `js/app.js`

- [ ] **Step 1: Write js/app.js**

```js
// Confirm dialog
const Confirm = (() => {
  let okCb = null;

  function show(title, message, onOk) {
    okCb = onOk;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirm-ok').addEventListener('click', () => {
      document.getElementById('confirm-modal').classList.add('hidden');
      if (okCb) okCb();
    });
    document.getElementById('confirm-cancel').addEventListener('click', () => {
      document.getElementById('confirm-modal').classList.add('hidden');
    });
  });

  return { show };
})();

// Toast
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Main App
const App = (() => {
  let activeSubjectId = null;

  function selectSubject(id) {
    activeSubjectId = id;
    Timer.reset();
    Subjects.setActive(id);
    Subjects.render();
    renderView();
  }

  function renderView() {
    const { subjects } = Store.getAll();
    const emptyState = document.getElementById('empty-state');
    const subjectView = document.getElementById('subject-view');
    const subject = subjects.find(s => s.id === activeSubjectId);

    if (!subject) {
      emptyState.classList.remove('hidden');
      subjectView.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    subjectView.classList.remove('hidden');
    document.getElementById('subject-name').textContent = subject.name;
    resetTimerUI();
    Entries.renderStats(activeSubjectId);
    Entries.renderHistory(activeSubjectId);
  }

  function refreshView() {
    if (!activeSubjectId) return;
    Entries.renderStats(activeSubjectId);
    Entries.renderHistory(activeSubjectId);
  }

  function resetTimerUI() {
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('timer-display').classList.remove('warning');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    document.getElementById('resume-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
  }

  function logAndCelebrate(subjectId, seconds) {
    if (!seconds || seconds < 1) return;
    Store.addEntry(subjectId, seconds, new Date().toISOString(), '');
    Effects.celebrate();
    showToast('Time logged! 🎉');
    refreshView();
  }

  function openAddSubjectModal() {
    document.getElementById('add-subject-input').value = '';
    document.getElementById('add-subject-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('add-subject-input').focus(), 50);
  }

  function initEvents() {
    // ── Add subject ──
    document.getElementById('add-subject-btn').addEventListener('click', openAddSubjectModal);
    document.getElementById('empty-add-btn').addEventListener('click', openAddSubjectModal);
    document.getElementById('mobile-add-btn').addEventListener('click', openAddSubjectModal);

    document.getElementById('add-subject-cancel').addEventListener('click', () =>
      document.getElementById('add-subject-modal').classList.add('hidden'));

    document.getElementById('add-subject-confirm').addEventListener('click', () => {
      const name = document.getElementById('add-subject-input').value.trim();
      if (!name) return;
      const subject = Store.addSubject(name);
      document.getElementById('add-subject-modal').classList.add('hidden');
      selectSubject(subject.id);
    });

    document.getElementById('add-subject-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('add-subject-confirm').click();
      if (e.key === 'Escape') document.getElementById('add-subject-cancel').click();
    });

    // ── Count-up timer ──
    document.getElementById('start-btn').addEventListener('click', () => {
      Timer.startCountUp((display) => {
        document.getElementById('timer-display').textContent = display;
      });
      document.getElementById('start-btn').classList.add('hidden');
      document.getElementById('pause-btn').classList.remove('hidden');
      document.getElementById('stop-btn').classList.remove('hidden');
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      Timer.pause();
      document.getElementById('pause-btn').classList.add('hidden');
      document.getElementById('resume-btn').classList.remove('hidden');
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      Timer.resume((display) => {
        document.getElementById('timer-display').textContent = display;
      });
      document.getElementById('resume-btn').classList.add('hidden');
      document.getElementById('pause-btn').classList.remove('hidden');
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      const seconds = Timer.stop();
      resetTimerUI();
      logAndCelebrate(activeSubjectId, seconds);
    });

    // ── Log time manually ──
    document.getElementById('log-time-btn').addEventListener('click', () => {
      document.getElementById('log-duration-input').value = '';
      document.getElementById('log-date-input').value = new Date().toISOString().slice(0, 10);
      document.getElementById('log-note-input').value = '';
      document.getElementById('log-duration-input').style.borderColor = '';
      document.getElementById('log-time-modal').classList.remove('hidden');
      setTimeout(() => document.getElementById('log-duration-input').focus(), 50);
    });

    document.getElementById('log-time-cancel').addEventListener('click', () =>
      document.getElementById('log-time-modal').classList.add('hidden'));

    document.getElementById('log-time-confirm').addEventListener('click', () => {
      const raw = document.getElementById('log-duration-input').value;
      const seconds = Timer.parseDuration(raw);
      if (!seconds || seconds < 1) {
        document.getElementById('log-duration-input').style.borderColor = '#dc2626';
        return;
      }
      document.getElementById('log-duration-input').style.borderColor = '';
      const dateVal = document.getElementById('log-date-input').value;
      const note = document.getElementById('log-note-input').value.trim();
      const loggedAt = dateVal
        ? new Date(dateVal + 'T12:00:00').toISOString()
        : new Date().toISOString();
      Store.addEntry(activeSubjectId, seconds, loggedAt, note);
      document.getElementById('log-time-modal').classList.add('hidden');
      Effects.celebrate();
      showToast('Time logged! 🎉');
      refreshView();
    });

    document.getElementById('log-duration-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('log-time-confirm').click();
      if (e.key === 'Escape') document.getElementById('log-time-cancel').click();
    });

    // ── Countdown ──
    document.getElementById('countdown-btn').addEventListener('click', () => {
      document.getElementById('countdown-input').value = '';
      document.getElementById('countdown-input').style.borderColor = '';
      document.getElementById('countdown-modal').classList.remove('hidden');
      setTimeout(() => document.getElementById('countdown-input').focus(), 50);
    });

    document.getElementById('countdown-cancel').addEventListener('click', () =>
      document.getElementById('countdown-modal').classList.add('hidden'));

    document.getElementById('countdown-confirm').addEventListener('click', () => {
      const raw = document.getElementById('countdown-input').value;
      const seconds = Timer.parseDuration(raw);
      if (!seconds || seconds < 1) {
        document.getElementById('countdown-input').style.borderColor = '#dc2626';
        return;
      }
      document.getElementById('countdown-input').style.borderColor = '';
      document.getElementById('countdown-modal').classList.add('hidden');

      const display = document.getElementById('timer-display');
      display.textContent = Timer.formatDisplay(seconds);
      display.classList.remove('warning');

      Timer.startCountDown(
        seconds,
        (disp, _remaining, warning) => {
          display.textContent = disp;
          display.classList.toggle('warning', warning);
        },
        (targetSeconds) => {
          resetTimerUI();
          logAndCelebrate(activeSubjectId, targetSeconds);
        }
      );

      document.getElementById('start-btn').classList.add('hidden');
      document.getElementById('pause-btn').classList.remove('hidden');
      document.getElementById('stop-btn').classList.remove('hidden');
    });

    document.getElementById('countdown-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('countdown-confirm').click();
      if (e.key === 'Escape') document.getElementById('countdown-cancel').click();
    });

    // ── Export / Import ──
    document.getElementById('export-btn').addEventListener('click', () => Store.exportData());

    document.getElementById('import-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          Store.importData(ev.target.result);
          e.target.value = '';
          const { subjects } = Store.getAll();
          selectSubject(subjects.length > 0 ? subjects[0].id : null);
          showToast('Data imported!');
        } catch {
          alert('Import failed: invalid file format.');
        }
      };
      reader.readAsText(file);
    });

    // ── Click outside modal to close ──
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  function init() {
    Subjects.init(selectSubject);
    initEvents();
    const { subjects } = Store.getAll();
    if (subjects.length > 0) {
      selectSubject(subjects[0].id);
    } else {
      Subjects.render();
      renderView();
    }
  }

  return { init, refreshView, selectSubject };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
```

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "feat: wire all modules in app.js"
```

---

## Task 10: Verify and deploy

- [ ] **Step 1: Run the app locally**

```bash
vercel dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Smoke test the golden path**

Walk through each of these in the browser:

1. Click **+ New Subject** → type "German" → Enter → subject appears in sidebar, main panel shows it
2. Click **▶ Start** → timer counts up → click **⏸ Pause** → timer stops → click **▶ Resume** → timer resumes → click **⏹ Stop** → confetti fires, toast appears, history shows new entry, stats update
3. Click **+ Log Time** → enter `1h 30m` → click Log → confetti + toast, entry appears in history
4. Click **⏱ Countdown** → enter `25m` → click Start Countdown → timer counts down → at :59 display turns amber → wait for zero (or test by entering `5s` ... actually that's not a valid format. Enter `1` for 1 minute) → at zero: beep + confetti + entry logged
5. Add a second subject → click it → verify separate history/stats
6. Double-click a subject name in sidebar → rename it → Enter
7. Hover a history entry → click ✕ → confirm delete → entry removed, stats update
8. Click **↓ Export** → JSON file downloads
9. Click **↑ Import** → select the downloaded file → subjects merge (no duplicates)
10. Resize browser to < 640px → sidebar hides, bottom tabs appear → tap subjects to switch

- [ ] **Step 3: Fix any issues found during smoke test**

- [ ] **Step 4: Deploy to Vercel**

```bash
vercel --prod
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete time logger app"
```
