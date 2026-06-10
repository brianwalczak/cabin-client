import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "url";
import { getStatus } from "./status.js";
import { isDeepStrictEqual } from "util";
import { createRedisClient, isRedisClientValid } from "./redis.js";
import { getSettings, updateSettings, isConfigValid } from "./settings.js";
import { setOpenAtLogin } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INTERVAL_TIME = 30000; // 30 seconds
let isQuitting = false;
let interval;
let window;
let redis;

function showWindow() {
	if (!window) return createWindow();
	if (app.dock) app.dock.show();

	window.show();
	window.focus();
	return window;
}

function createWindow() {
	if (app.dock) app.dock.show();

	window = new BrowserWindow({
		width: 500,
		height: 700,
		resizable: false,
		icon: path.join(__dirname, "../build", "icon.png"),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			sandbox: false,
			preload: path.join(__dirname, "../preload", "index.js"),
		},
	});

	window.setMenuBarVisibility(false);
	window.loadFile(path.join(__dirname, "../renderer", "views", "loading", "index.html"));

	window.on("close", (event) => {
		if (!isQuitting) {
			event.preventDefault();
			if (app.dock) app.dock.hide();

			window.destroy();
			window = null;
		}
	});

	window.webContents.once("did-finish-load", () => verifyAndLaunch()); // initialize the app & check for settings
	return window;
}

if (!app.requestSingleInstanceLock()) {
	// Second instance was launched, exit.
	process.exit();
} else {
	// First instance was launched, create the window and listen for second instances.
	app.on("second-instance", showWindow); // Second instance was launched while this one is running, focus the existing window.
	app.whenReady().then(createWindow); // Create window once we're ready!
}

app.on("window-all-closed", () => {
	// Don't quit the process when all windows are closed.
});

app.on("before-quit", () => {
	isQuitting = true; // was triggered by OS, ACTUALLY quit instead of hiding the window
});

app.on("ready", async () => {
	if (app.isPackaged) {
		app.setLoginItemSettings({
			openAtLogin: true,
		});

		if (process.platform !== "darwin" && process.platform !== "win32") {
			await setOpenAtLogin(); // linux!!
		}
	}
});

app.on("activate", showWindow);

ipcMain.handle("settings:get", async () => {
	return await getSettings();
});

ipcMain.handle("settings:set", async (event, config) => {
	const result = await updateSettings(config);

	if (!result.success) {
		dialog.showErrorBox("Settings Error!", `An unknown error occurred while updating your settings:\n${result.reason}`);
	}

	if (config.status && typeof config.status === "object" && !isDeepStrictEqual(config.status, result.data?.status || {})) {
		syncStatus(); // immediately update the status in Redis and UI if the status settings were changed
	}

	return result;
});

ipcMain.on("onboarding-complete", () => verifyAndLaunch(true));

async function syncStatus() {
	try {
		const status = await getStatus(true);
		const settings = await getSettings();

		const existing = (await redis.get("status")) || {};
		const payload = {
			...existing,
			[settings.deviceId]: {
				priority: settings.priority,
				status: status,
			},
		};

		if (window) window.webContents.send("status", status);
		if (isDeepStrictEqual(existing, payload)) return; // no changes, don't push to Redis or UI
		await redis.set("status", JSON.stringify(payload));
	} catch {}
}

async function verifyAndLaunch(isOnboarding = false) {
	try {
		const settings = await getSettings();

		if (!isConfigValid(settings)) {
			if (!isOnboarding) {
				window.loadFile(path.join(__dirname, "../renderer", "views", "onboarding", "index.html"));
			} else {
				dialog.showErrorBox("Invalid Settings!", "The settings you provided are invalid. Please check your configuration and try again.");
			}

			return;
		}

		redis = createRedisClient(settings.upstash.url, settings.upstash.token);
		const isValid = await isRedisClientValid(redis);

		if (!isValid) {
			dialog.showErrorBox("Connection Failed!", "Failed to connect to Redis with the provided settings. Please check your configuration and try again.");
			if (!isOnboarding) window.loadFile(path.join(__dirname, "../renderer", "views", "onboarding", "index.html"));
			return;
		}

		window.loadFile(path.join(__dirname, "../renderer", "index.html"));

		if (!interval) interval = setInterval(syncStatus, INTERVAL_TIME);
		window.webContents.once("did-finish-load", () => syncStatus());
	} catch (error) {
		dialog.showErrorBox("Settings Failed!", `An unknown error occurred while verifying your settings:\n${error.message}`);
		process.exit();
	}
}
