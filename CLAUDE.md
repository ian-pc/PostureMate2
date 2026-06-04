# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-file browser app (`posture_detector_v2.html`) that uses the webcam and MediaPipe Pose to detect and warn about poor posture in real time. No build step, no server, no dependencies to install — open the HTML file directly in a browser.

## Architecture

Everything lives in `posture_detector_v2.html`:

- **CSS** (top) — styling using CSS custom properties (`--color-*`, `--border-radius-*`, `--font-sans`) that are expected to be provided by a parent page/shell.
- **HTML** — video element + canvas overlay for skeleton drawing, metric cards, control buttons, sensitivity slider.
- **MediaPipe Pose** — loaded from CDN (`cdn.jsdelivr.net/npm/@mediapipe/pose`). Sends each video frame through `poseInstance.send()` and receives 33 body landmarks via `onResults()`.
- **Calibration** — first `CALIBRATION_FRAMES` (45) frames build a running-average `baseline` object of posture features while the user sits upright.
- **Feature extraction** (`extractFeatures`) — derives five normalized metrics from landmarks, all divided by shoulder width so distance-from-camera doesn't matter: `noseToShoulderDist`, `faceToShoulderRatio`, `shoulderEarGap`, `headTiltX`, `shoulderAngleDeg`.
- **Detection logic** (`onResults`) — compares live features to baseline using per-sensitivity thresholds. Slouch requires 2-of-3 sub-signals to trigger. Smoothed frame counters (`goodFrames`/`badFrames`, max 30) gate badge/alert state changes to prevent flickering.
- **Skeleton overlay** — drawn on a `<canvas>` positioned over the `<video>`, both mirrored with `transform: scaleX(-1)`.
