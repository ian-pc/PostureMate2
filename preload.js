const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posturemate', {
  sendAlert: (message) => ipcRenderer.send('posture-alert', message),
  sendGood:  ()        => ipcRenderer.send('posture-good'),
});
