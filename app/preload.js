import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    updateStatus: (details) => ipcRenderer.send('status', details),
    updateSettings: (config) => ipcRenderer.send('settings', config)
});