const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let appIsQuitting = false;

// ── 托盘图标 ──────────────────────────────────────────────
function createTrayIcon() {
  const size = 32;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2);
      const i = (y * size + x) * 4;
      if (dist <= r) {
        buf[i] = 255; buf[i+1] = 107; buf[i+2] = 53; buf[i+3] = 255;
      } else {
        buf[i+3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

// ── 窗口 ──────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 520,
    resizable: false,
    center: true,
    backgroundColor: '#0c0c10',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // 关闭 → 隐藏到托盘
  mainWindow.on('close', (e) => {
    if (!appIsQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── 托盘 ──────────────────────────────────────────────────
function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('🍅 番茄钟');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '退出程序', click: () => { appIsQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => mainWindow.show());
}

// ── IPC ───────────────────────────────────────────────────
ipcMain.on('show-notification', (_e, title, body) => {
  const n = new Notification({ title, body });
  n.show();
  n.on('click', () => { mainWindow.show(); });
});

ipcMain.on('minimize-to-tray', () => {
  mainWindow.hide();
});

// ── 生命周期 ──────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => { /* 不退出 — 驻留托盘 */ });
app.on('activate', () => mainWindow?.show());
