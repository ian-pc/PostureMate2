const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.disableHardwareAcceleration();

if (process.platform === 'win32') {
  app.setAppUserModelId('com.posturemate.app');
}

const ICON_PATH = path.join(__dirname, 'renderer', 'assets', 'icon.png');

let mainWindow = null;
let tray       = null;

// Returns icon.png tinted toward the given RGB color, falls back to a solid square.
function getIcon(state) {
  try {
    const base = nativeImage.createFromPath(ICON_PATH);
    if (base.isEmpty()) throw new Error('icon not found');
    const size = { width: 16, height: 16 };
    if (state === 'neutral') return base.resize(size);
    const bmp = Buffer.from(base.resize(size).getBitmap()); // BGRA on Windows
    const [tr, tg, tb] = state === 'good' ? [34, 197, 94] : [239, 68, 68];
    for (let i = 0; i < bmp.length; i += 4) {
      if (bmp[i + 3] > 10) {
        bmp[i]   = Math.min(255, Math.round(bmp[i]   * 0.25 + tb * 0.75)); // B
        bmp[i+1] = Math.min(255, Math.round(bmp[i+1] * 0.25 + tg * 0.75)); // G
        bmp[i+2] = Math.min(255, Math.round(bmp[i+2] * 0.25 + tr * 0.75)); // R
      }
    }
    return nativeImage.createFromBitmap(bmp, size);
  } catch(e) {
    const [r, g, b] = state === 'good' ? [34,197,94] : state === 'bad' ? [239,68,68] : [148,163,184];
    const buf = Buffer.alloc(16 * 16 * 4);
    for (let i = 0; i < 16 * 16; i++) {
      buf[i*4] = b; buf[i*4+1] = g; buf[i*4+2] = r; buf[i*4+3] = 255;
    }
    return nativeImage.createFromBitmap(buf, { width: 16, height: 16 });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 780,
    minWidth: 900,
    minHeight: 660,
    title: 'PostureMate',
    icon: ICON_PATH,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media');
  });
  mainWindow.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    return permission === 'media';
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', () => {
    app.quit();
  });
}

function createTray() {
  if (tray) return;
  tray = new Tray(getIcon('neutral'));
  const menu = Menu.buildFromTemplate([
    { label: 'Open PostureMate', click: () => mainWindow && mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('PostureMate');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow && mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow && mainWindow.show();
});

ipcMain.on('posture-alert', (_e, message) => {
  if (Notification.isSupported()) {
    new Notification({ title: 'PostureMate', body: message, silent: false }).show();
  }
  if (tray) tray.setToolTip(`PostureMate — ${message}`);
});

ipcMain.on('posture-good', () => {
  if (tray) tray.setToolTip('PostureMate — Good posture');
});

ipcMain.on('pm-tray-icon', (_e, state) => {
  if (tray) tray.setImage(getIcon(state));
});

ipcMain.on('pm-show-tray', () => createTray());

ipcMain.on('pm-hide-tray', () => {
  if (tray) { tray.destroy(); tray = null; }
});

ipcMain.on('pm-open-external', (_e, url) => shell.openExternal(url));
ipcMain.on('pm-minimize',      () => mainWindow && mainWindow.minimize());
ipcMain.on('pm-quit',          () => app.quit());
