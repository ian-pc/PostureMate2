const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.disableHardwareAcceleration();

let mainWindow = null;
let tray = null;

function createColorIcon(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4]     = r;
    buf[i * 4 + 1] = g;
    buf[i * 4 + 2] = b;
    buf[i * 4 + 3] = 255;
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

const TRAY_ICONS = {
  good:    createColorIcon('#22C55E'),
  bad:     createColorIcon('#EF4444'),
  neutral: createColorIcon('#94A3B8'),
};

function createWindow() {
  const iconPath = path.join(__dirname, 'renderer', 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'PostureMate',
    icon: iconPath,
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
  const iconPath = path.join(__dirname, 'renderer', 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon.isEmpty() ? TRAY_ICONS.neutral : icon);

  const menu = Menu.buildFromTemplate([
    { label: 'Open PostureMate', click: () => mainWindow && mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit(); } },
  ]);
  tray.setToolTip('PostureMate');
  tray.setContextMenu(menu);
  tray.on('click', () => mainWindow && mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow && mainWindow.show();
});

ipcMain.on('posture-alert', (_event, message) => {
  if (Notification.isSupported()) {
    new Notification({ title: 'PostureMate', body: message, silent: false }).show();
  }
  if (tray) tray.setToolTip(`PostureMate — ${message}`);
});

ipcMain.on('posture-good', () => {
  if (tray) tray.setToolTip('PostureMate — Good posture');
});

ipcMain.on('pm-tray-icon', (_event, state) => {
  if (tray && TRAY_ICONS[state]) tray.setImage(TRAY_ICONS[state]);
});

ipcMain.on('pm-show-tray', () => {
  createTray();
});

ipcMain.on('pm-hide-tray', () => {
  if (tray) { tray.destroy(); tray = null; }
});

ipcMain.on('pm-open-external', (_event, url) => {
  shell.openExternal(url);
});

ipcMain.on('pm-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('pm-quit', () => {
  app.quit();
});
