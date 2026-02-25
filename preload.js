const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => {
        // Whitelist channels to prevent arbitrary IPC calls
        const validChannels = ['select-folder'];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
    send: (channel, data) => {
        const validChannels = ['save-csv-auto', 'restore-window', 'quit-app', 'allow-mini-mode', 'allow-minimize'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel, func) => {
        // For listening to messages from main
        // Not currently used but good practice to include
        const validChannels = ['toggle-mini-mode', 'app-closing', 'check-can-mini-mode', 'check-can-minimize'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});
