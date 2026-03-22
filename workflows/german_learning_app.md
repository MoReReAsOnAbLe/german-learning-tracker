# German Learning Tracker — WAT Workflow

## Objective
Run and maintain a Dreaming Spanish–style web app for German language learning via YouTube videos.

## Architecture Overview

| Layer | Location | Purpose |
|-------|----------|---------|
| Frontend | `index.html`, `css/app.css`, `js/*.js` | UI rendered in browser |
| Serverless | `api/*.js` | YouTube Data API proxy (key stays server-side) |
| Storage | Browser localStorage | All watch history, progress, settings |
| Deploy | Vercel | Hosts both static files and serverless functions |

## Getting Started

### 1. Set up YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g. "Deutsch Tracker")
3. Enable **YouTube Data API v3**
4. Create credentials → API Key
5. (Recommended) Restrict the key to "HTTP referrers" with your Vercel domain

### 2. Local Development

```bash
# Install Vercel CLI
npm install

# Add your API key to .env
echo "YOUTUBE_API_KEY=AIzaSy..." >> .env

# Start local dev server (serves both static + /api/* functions)
npm run dev
# → Open http://localhost:3000
```

### 3. Deploy to Vercel

```bash
# Push repo to GitHub, then:
# 1. Go to vercel.com → Import project from GitHub
# 2. Project Settings → Environment Variables → Add YOUTUBE_API_KEY
# 3. Redeploy
```

Or via CLI:
```bash
npx vercel --prod
```

## Importing German Channels

Recommended comprehensible input channels for German learners:

| Channel | Handle | Level |
|---------|--------|-------|
| Comprehensible German | `@ComprehensibleGerman` | A1–C1 |
| Easy German | `@EasyGerman` | A2–B2 |
| Deutsch mit Rieke | `@DeutschmitRieke` | A1–A2 |
| Learn German with Anja | `@LearnGermanwithAnja` | A1–B1 |

To import: Library page → "Import Channel" → paste `@handle`.

## File Reference

| File | What to edit when... |
|------|---------------------|
| `js/store.js` | Changing data schema or localStorage keys |
| `js/player.js` | Tweaking watch-time tracking behavior |
| `js/library.js` | Adding new filter dimensions or card layout |
| `js/stats.js` | Changing dashboard widgets or the 1500h goal |
| `js/calendar.js` | Adjusting heatmap colors or layout |
| `js/import.js` | Fixing import bugs or adding re-sync |
| `api/channel.js` | YouTube channel resolution changes |
| `api/playlist.js` | Playlist fetch changes |
| `api/durations.js` | Duration fetch changes |
| `css/app.css` | Any visual/styling changes |

## Rotating the API Key

1. Go to Google Cloud Console → Credentials → delete old key
2. Create a new API key (apply referrer restrictions)
3. Vercel Dashboard → Project Settings → Environment Variables → update `YOUTUBE_API_KEY`
4. Redeploy (Vercel does not auto-redeploy on env var changes)

## Known Limitations

- Data lives in the browser's localStorage (~5MB limit). With 10 channels and daily use for a year, estimated usage is ~2–3MB — well within limits.
- The app is single-user by design. No accounts or sync between devices.
- YouTube iframe API playback requires an internet connection.
- Watch time is tracked via a 1-second polling interval. If the browser tab is CPU-throttled (background), the interval may fire less frequently — accuracy is within a few seconds per session.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Import fails with "YouTube API key not configured" | Add `YOUTUBE_API_KEY` to Vercel environment variables and redeploy |
| Import fails with "Channel not found" | Try the full URL format: `youtube.com/@handle` |
| Videos not playing | Check browser console for iframe API errors; ensure the Vercel domain is allowed in Google Cloud Console |
| localStorage full | Settings page → Export data → Reset, then re-import channels |
