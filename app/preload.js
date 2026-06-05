import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    updateStatus: (details) => ipcRenderer.send('status', details),
    updateSettings: (config) => ipcRenderer.invoke('settings', config),
    completeOnboarding: () => ipcRenderer.send('onboarding-complete')
});