import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
	getSettings: () => ipcRenderer.invoke("settings:get"),
	onStatus: (callback) => ipcRenderer.on("status", (_, data) => callback(data)),
	updateSettings: (config) => ipcRenderer.invoke("settings:set", config),
	completeOnboarding: () => ipcRenderer.send("onboarding-complete"),
});
