const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posturemate', {
  sendAlert:    (msg)   => ipcRenderer.send('posture-alert', msg),
  sendGood:     ()      => ipcRenderer.send('posture-good'),
  setTrayIcon:  (state) => ipcRenderer.send('pm-tray-icon', state),
  showTray:     ()      => ipcRenderer.send('pm-show-tray'),
  hideTray:     ()      => ipcRenderer.send('pm-hide-tray'),
  openExternal: (url)   => ipcRenderer.send('pm-open-external', url),
  minimize:     ()      => ipcRenderer.send('pm-minimize'),
  quit:         ()      => ipcRenderer.send('pm-quit'),
});
