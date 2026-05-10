# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # Install dependencies
npm start                # Run the app in development mode
npm run build            # Build portable .exe (requires mirror config)
node deploy.js "msg"     # Quick deploy: git add -A, commit, push to GitHub
```

Building requires the mirror config in package.json (`electronDownload.mirror`). If `app-builder.exe` fails on network issues, the `dist/win-unpacked/` directory contains a working executable.

Say **"部署"** or **"发布"** to trigger deploy automatically.

## Project Architecture

```
pomodoro-timer/
├── main.js              # Electron main process - window, tray, IPC, notifications
├── preload.js           # contextBridge exposing electronAPI to renderer
├── renderer/
│   ├── index.html       # UI layout
│   ├── styles.css       # Dark+pink theme
│   └── app.js           # Timer logic (renderer process)
├── deploy.js            # One-command git commit + push
├── generate-icon.js     # Generates build/icon.ico (64x64 pink circle PNG wrapped in ICO)
├── build/icon.ico       # Pre-generated app icon
└── package.json
```

### Architecture Overview

- **Main Process** (`main.js`): Creates the BrowserWindow (400×520, non-resizable), system tray with context menu, and handles IPC for native notifications and minimize-to-tray. Close button hides to tray instead of quitting.
- **Preload** (`preload.js`): Exposes `window.electronAPI.sendNotification(title, body)` and `window.electronAPI.minimizeToTray()` via contextBridge (contextIsolation: true, nodeIntegration: false).
- **Renderer** (`renderer/app.js`): All timer logic lives here — no framework. Uses `localStorage` for persistence (today's count + total). SVG circle progress via `stroke-dashoffset`. Audio via Web Audio API oscillators.
- **Deploy** (`deploy.js`): Node.js script that runs git commands programmatically.

### Key Patterns

- Timer runs as `setInterval` at 1s granularity (not `requestAnimationFrame`)
- Auto-cycle: pomodoro → shortBreak (or longBreak every 4 sessions) → pomodoro → ...
- Window blur triggers auto-pause (`visibilitychange` event)
- Keyboard shortcuts: Space=toggle, R=reset, Esc=minimize to tray, 1/2/3=mode switch
- Local storage keys: `pomo_date`, `pomo_today`, `pomo_total`

### Timer Configuration

Edit `CONFIG` in `renderer/app.js` to change durations:
```js
pomodoro:   { label: '专注',     time: 25 * 60 },
shortBreak: { label: '短休息',   time: 5 * 60  },
longBreak:  { label: '长休息',   time: 15 * 60 },
```

### Theme

Dark+pink theme defined in `renderer/styles.css`. Primary gradient: `#f093fb → #f5576c`. Background: `#0d0d1a`.
