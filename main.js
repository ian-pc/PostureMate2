const { app, BrowserWindow, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 720,
    minWidth: 640,
    minHeight: 540,
    title: 'Posturemate',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // Required for webcam access
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of quitting
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  // Placeholder icon — replace renderer/assets/icon.png with a real 16x16 icon
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    { label: 'Open Posturemate', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
  ]);

  tray.setToolTip('Posturemate');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow.show();
});

// IPC: renderer can send posture alerts to trigger OS notifications
const { ipcMain } = require('electron');
ipcMain.on('posture-alert', (_event, message) => {
  if (Notification.isSupported()) {
    new Notification({ title: 'Posturemate', body: message, silent: true }).show();
  }
  if (tray) tray.setToolTip(`Posturemate — ${message}`);
});

ipcMain.on('posture-good', () => {
  if (tray) tray.setToolTip('Posturemate — Good posture');
});
