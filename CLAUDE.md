# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Electron desktop app that uses the webcam and MediaPipe Pose to detect and warn about poor posture in real time. Runs as a tray app with OS notifications. Packaged with `electron-builder`.

## Running and building

```
npm install        # install dependencies (electron, electron-builder)
npm start          # launch the app in dev mode
npm run build:win  # build Windows installer (NSIS) → dist/
npm run build:mac  # build macOS DMG → dist/
```

## File structure

- **`main.js`** — Electron main process. Creates `BrowserWindow`, system tray with show/quit menu, and listens for `posture-alert` / `posture-good` IPC messages to fire OS notifications and update tray tooltip.
- **`preload.js`** — exposes `window.posturemate.sendAlert(msg)` and `window.posturemate.sendGood()` to the renderer via `contextBridge`.
- **`renderer/index.html`** — all UI and posture logic (see below).
- **`renderer/assets/`** — icon files (`icon.ico`, `icon.icns`, `icon.png`) used by electron-builder.
- **`package.json`** — scripts and electron-builder config (`appId: com.posturemate.app`).

## Renderer architecture (`renderer/index.html`)

- **CSS** — styling using CSS custom properties (`--color-*`, `--border-radius-*`, `--font-sans`).
- **HTML** — video element + canvas overlay for skeleton drawing, metric cards, control buttons, sensitivity slider.
- **MediaPipe Pose** — loaded from CDN (`cdn.jsdelivr.net/npm/@mediapipe/pose`). Sends each video frame through `poseInstance.send()` and receives 33 body landmarks via `onResults()`.
- **Calibration** — first `CALIBRATION_FRAMES` (45) frames build a running-average `baseline` object of posture features while the user sits upright.
- **Feature extraction** (`extractFeatures`) — derives five normalized metrics from landmarks, all divided by shoulder width so distance-from-camera doesn't matter: `noseToShoulderDist`, `faceToShoulderRatio`, `shoulderEarGap`, `headTiltX`, `shoulderAngleDeg`.
- **Detection logic** (`onResults`) — compares live features to baseline using per-sensitivity thresholds. Slouch requires 2-of-3 sub-signals to trigger. Smoothed frame counters (`goodFrames`/`badFrames`, max 30) gate badge/alert state changes to prevent flickering.
- **Skeleton overlay** — drawn on a `<canvas>` positioned over the `<video>`, both mirrored with `transform: scaleX(-1)`.
- **IPC** — calls `window.posturemate.sendAlert()` / `window.posturemate.sendGood()` (exposed by preload) to trigger OS notifications from the main process.
