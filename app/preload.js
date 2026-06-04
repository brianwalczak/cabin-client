import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    updateStatus: (details) => ipcRenderer.send('update', details)
});