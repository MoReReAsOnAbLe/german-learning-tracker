# Time Logger — Design Spec
**Date:** 2026-04-19

## Overview

A personal time logger web app hosted on Vercel. Users create subjects, then log time against them via a live timer (count-up or countdown) or by manually entering a past duration. All data lives in `localStorage` with JSON export/import for backup. No backend, no authentication.

---

## Theme & Visual Style

- **Color scheme:** Warm Dark + Amber
  - Background: `#0c0a09`
  - Panel/card background: `#1c1917`
  - Surface (inputs, hover): `#292524`
  - Primary accent: `#d97706` (amber)
  - Accent hover: `#f59e0b`
  - Text primary: `#fafaf9`
  - Text muted: `#78716c`
  - Text label: `#57534e`
- **Font:** System sans-serif stack; monospace for the timer display
- **Active subject indicator:** left border `#f59e0b` on sidebar item

---

## Layout

### Desktop (≥ 640px)
- Fixed left sidebar (~220px wide) containing the subject list, "+ New Subject" button, and Export/Import controls at the bottom
- Main content panel fills remaining width with: timer display, action buttons, stats row, history list

### Mobile (< 640px)
- Sidebar hidden; subjects accessible via a bottom tab bar (scrollable horizontal list of subject pills + a "+" button)
- Main content panel fills full screen
- All modals are full-screen sheets on mobile

---

## File Structure

```
index.html          — app shell, all modal markup
css/
  app.css           — all styles; CSS custom properties for theming
js/
  store.js          — localStorage read/write, export to JSON, import from JSON
  timer.js          — count-up and countdown logic (setInterval-based)
  subjects.js       — create, rename, delete subjects; renders sidebar list
  entries.js        — log a time entry, render history list, delete entries
  confetti.js       — canvas confetti burst + AudioContext beep
  app.js            — initialises modules, wires event listeners, handles routing between subjects
vercel.json         — static site config (no changes needed)
```

---

## Data Model

All data stored under a single `localStorage` key: `timelogger_data`.

```json
{
  "subjects": [
    {
      "id": "uuid",
      "name": "German",
      "createdAt": "ISO8601"
    }
  ],
  "entries": [
    {
      "id": "uuid",
      "subjectId": "uuid",
      "durationSeconds": 3600,
      "loggedAt": "ISO8601",
      "note": "optional string"
    }
  ]
}
```

---

## Features

### Subjects
- Create: click "+ New Subject" → inline input in sidebar → Enter to save
- Rename: double-click subject name in sidebar → inline edit
- Delete: hover subject → trash icon appears → click → confirm dialog
- Selecting a subject updates the main panel to show that subject's timer + stats + history

### Count-Up Timer
- Buttons: **Start → Pause / Resume → Stop**
- Display updates every second in `HH:MM:SS` format
- On **Stop**: saves an entry with elapsed seconds, triggers confetti + shows "Time logged!" toast

### Countdown Timer
- User sets a target duration via a modal input (accepts `HH:MM:SS`, `MM:SS`, plain minutes, or `1h 30m` natural language)
- Counts down from target; display turns amber at <1 min remaining
- At zero: stops, plays beep sound, triggers confetti, saves an entry equal to the target duration

### Log Time Manually
- Modal fields:
  - **Duration** (required): accepts `1h 30m`, `90`, `1:30:00` — parsed to seconds
  - **Date** (optional, defaults to today): date picker
  - **Note** (optional): free text
- On save: stores entry, triggers confetti

### Stats Panel
Three tiles displayed below the timer for the active subject:
- **Today** — sum of entries logged today
- **This Week** — sum of entries from Monday to now
- **All Time** — sum of all entries

### History
- Reverse-chronological list of entries for the active subject
- Each row: timestamp (e.g. "Today 2:30 PM"), formatted duration, optional note, delete button
- Deleting an entry removes it from `localStorage` and refreshes stats

### Export / Import
- **Export**: serialises full `timelogger_data` to a `.json` file and triggers a browser download
- **Import**: file input accepts `.json`; merges imported data with existing data by `id` (no duplicates); alerts on parse error

---

## Confetti & Sound

- **Confetti**: canvas overlay, burst of ~150 particles in amber/warm tones, auto-clears after 3s
- **Beep**: short 440Hz tone via `AudioContext` (no external audio files); fires on countdown completion
- Both triggered on: countdown reaching zero, count-up stopped, manual time logged

---

## Mobile Responsiveness

- Bottom tab bar replaces sidebar on small screens
- Timer display font scales down gracefully (`clamp`)
- Modals use `position: fixed; inset: 0` on mobile for full-screen sheet behaviour
- Touch targets ≥ 44px

---

## Out of Scope

- User accounts / cloud sync
- Multiple simultaneous timers
- Charts or visualisations
- Notifications / push alerts
- Dark/light mode toggle (dark only)
