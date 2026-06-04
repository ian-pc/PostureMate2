# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Electron desktop app that uses the webcam and MediaPipe Pose to detect and warn about poor posture in real time. Frameless window, system tray icon (green/red by posture state), OS notifications, and a built-in Pomodoro timer. Packaged with `electron-builder`.

## Running and building

```
npm install        # install dependencies (electron, electron-builder)
npm start          # launch the app in dev mode
npm run build:win  # build Windows installer (NSIS) → dist/
npm run build:mac  # build macOS DMG → dist/
```

### Resetting first-launch state (onboarding/calibration)

Deleting the Electron userData folder clears localStorage, triggering the onboarding flow on next launch:

```
node -e "require('fs').rmSync(require('path').join(require('os').homedir(), 'AppData/Roaming/posturemate'), {recursive:true, force:true})"
```

## File structure

- **`main.js`** — Electron main process. Frameless `BrowserWindow` (960×720), system tray with dynamic green/red icon, OS notifications, single-instance lock, hardware acceleration disabled. Handles IPC: `posture-alert`, `posture-good`, `pm-tray-icon`, `pm-show-tray`, `pm-hide-tray`, `pm-open-external`, `pm-minimize`, `pm-quit`.
- **`preload.js`** — exposes `window.posturemate` API via `contextBridge`: `sendAlert`, `sendGood`, `setTrayIcon`, `showTray`, `hideTray`, `openExternal`, `minimize`, `quit`.
- **`renderer/index.html`** — all UI and posture logic (see below).
- **`renderer/quotes.js`** — array of 30 motivational quotes (`QUOTES`). Quote of the day is selected deterministically by hashing `new Date().toDateString()` against the array length.
- **`renderer/assets/icon.png`** — app icon used in titlebar and tray.
- **`package.json`** — scripts and electron-builder config (`appId: com.posturemate.app`).

## App screens (`renderer/index.html`)

The app is a single-page app with four screens managed by `showScreen(id)`:

1. **Loading** (`scr-loading`) — animated icon, "Welcome" fade-in, blinking dots. Shows for 2.6s while MediaPipe preloads.
2. **Onboarding** (`scr-onboarding`) — shown only on first launch (`!localStorage.getItem('pm_initialized')`). Three benefit cards, privacy note, clickable LinkedIn creator links (`openLink()` → `shell.openExternal`). "Get Started →" proceeds to calibration.
3. **Calibration** (`scr-calibration`) — shown only on first launch. Live camera preview, progress bar, "Calibrate" button runs 45-frame calibration and saves `baseline` to `localStorage('pm_baseline')`. Sets `pm_initialized` on completion.
4. **Home** (`scr-home`) — main app screen on every launch after first.

## Home screen layout

Two-column flex layout:

- **Left column (camera):** live camera + canvas overlay, 4 metric cards (Slouch, Head tilt, Shoulders, Overall), Recalibrate / Pause buttons, sensitivity slider.
- **Right column (panel):** 3-tab panel cycled by arrow buttons or dot indicators:
  - **Pomodoro** — H:MM:SS work/rest pickers with ▲▼ arrows; when running shows SVG progress circle + countdown + Pause/Reset.
  - **Statistics** — active hours today, bad posture %, day streak (all from `localStorage`).
  - **Quote of the day** — from `quotes.js`, consistent per calendar date.
- **Settings bar (bottom):** Notifications toggle, Show in bar toggle, Dark mode toggle, privacy note.

## Posture detection logic

- **MediaPipe Pose** loaded from CDN (`cdn.jsdelivr.net/npm/@mediapipe/pose`). Preloaded during loading screen. Runs at 30 FPS normally, throttled to 3 FPS when window is hidden (`document.visibilitychange`).
- **Feature extraction** (`extractFeatures`) — five metrics normalized by shoulder width: `noseToShoulderDist`, `faceToShoulderRatio`, `shoulderEarGap`, `headTiltX`, `shoulderAngleDeg`.
- **Calibration** — 45 frames build a running-average `baseline`. On first launch this is the explicit calibration screen; on subsequent launches it's a silent 45-frame auto-calibration when the home camera starts. Baseline saved to `localStorage('pm_baseline')`.
- **Detection** — thresholds scale with sensitivity slider. Slouch requires 2-of-3 sub-signals. Smoothed counters (`goodFrames`/`badFrames`, max 30) prevent flickering.
- **Notifications** — first alert after 10 consecutive seconds of bad posture (`FIRST_ALERT_MS`), then every 2 minutes (`REPEAT_ALERT_MS`). Respects the Notifications toggle.
- **Tray icon** — updated to green/red/neutral via `pm-tray-icon` IPC using `nativeImage.createFromBitmap()` with a solid-color 16×16 buffer.

## localStorage keys

| Key | Purpose |
|-----|---------|
| `pm_initialized` | Set after first calibration; gates onboarding/calibration screens |
| `pm_baseline` | JSON-serialized calibration baseline object |
| `pm_dark` | `'1'` = dark mode on |
| `pm_notif` | `'0'` = notifications off (default on) |
| `pm_tray` | `'0'` = tray icon hidden (default on) |
| `pm_stats_<dateString>` | `{ activeSeconds, badSeconds }` per day |
| `pm_streak_date` | Last date the app was actively used |
| `pm_streak_count` | Current day streak count |
