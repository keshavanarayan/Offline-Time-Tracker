const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = [
      'restore-window',
      'close-window',
      'request-shutdown',
      'allow-mini-mode',
      'allow-minimize',
      'quit-app',
      'open-url',
      'set-update-url',
      'trigger-update-check'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  invoke: (channel, data) => {
    let validChannels = ['select-folder', 'save-csv-auto', 'check-update-server', 'select-update-folder'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
  },
  on: (channel, func) => {
    let validChannels = ['toggle-mini-mode', 'app-closing', 'check-can-mini-mode', 'check-can-minimize'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
