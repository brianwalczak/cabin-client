import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "url";
import { getStatus } from "./status.js";
import { isDeepStrictEqual } from "util";
import { createRedisClient, isRedisClientValid } from "./redis.js";
import { getSettings, updateSettings, isConfigValid } from "./settings.js";
import { setOpenAtLogin, deleteFile } from "./utils.js";
import { globals } from "./shared.js";

import "./printer.js"; // initialize printer module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INTERVAL_TIME = 30000; // 30 seconds
let isQuitting = false;
let interval;
let window;

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

	window.webContents.once("did-finish-load", () => setTimeout(() => verifyAndLaunch(true), 600)); // initialize the app & check for settings
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

ipcMain.handle("settings:get", getSettings);

ipcMain.handle("settings:set", async (event, config) => {
	const oldSettings = await getSettings();

	if (isDeepStrictEqual(config, oldSettings)) return { success: true, data: oldSettings }; // nothing changed, just return early

	const wasInitialized = !!globals.redis; // track if redis was already set before this handler ran
	let newRedis = null;

	// if the Upstash credentials are being changed, validate the connection and update the client
	if (config?.upstash && !isDeepStrictEqual(config.upstash, oldSettings.upstash)) {
		const newUrl = config.upstash.url ?? oldSettings.upstash.url;
		const newToken = config.upstash.token ?? oldSettings.upstash.token;

		newRedis = createRedisClient(newUrl, newToken);
		const isValid = await isRedisClientValid(newRedis);

		if (!isValid) {
			dialog.showErrorBox("Connection Failed!", "Failed to connect to Redis with the provided settings. Please check your configuration and try again.");
			return { success: false, reason: "Redis connection failed." };
		}
	}

	const result = await updateSettings(config);

	if (!result.success) {
		dialog.showErrorBox("Settings Error!", `An unknown error occurred while updating your settings:\n${result.reason}`);
		return result;
	}

	if (newRedis) globals.redis = newRedis; // if we have a new Redis client, use it from now on (after validating the connection)

	// if the device ID is being changed, update the Redis record to the new ID
	if (globals.redis && config.deviceId && config.deviceId !== oldSettings.deviceId) {
		try {
			const existing = (await globals.redis.get("status")) || {};

			if (existing[oldSettings.deviceId]) {
				existing[config.deviceId] = existing[oldSettings.deviceId];
				delete existing[oldSettings.deviceId];

				await globals.redis.set("status", JSON.stringify(existing));
			}
		} catch {}
	}

	if (wasInitialized) syncStatus(); // if not, the status will be synced when the client is initialized
	return result;
});

ipcMain.on("onboarding-complete", () => verifyAndLaunch(false));

ipcMain.handle("unregister", async () => {
	try {
		const settings = await getSettings();

		// remove this device's status from the Redis
		if (globals.redis && settings.deviceId) {
			try {
				const existing = (await globals.redis.get("status")) || {};

				delete existing[settings.deviceId];
				await globals.redis.set("status", JSON.stringify(existing));
			} catch {}
		}

		// wipe local settings file
		await deleteFile(globals.settingsPath);

		// stop the sync interval
		if (interval) {
			clearInterval(interval);
			interval = null;
		}

		// reset Redis client to prevent any further attempts to sync
		globals.redis = null;

		// go back to onboarding
		if (window) window.loadFile(path.join(__dirname, "../renderer", "views", "onboarding", "index.html"));
		return { success: true };
	} catch (error) {
		dialog.showErrorBox("Unregister Failed!", `An error occurred while unregistering the device:\n${error.message}`);
		return { success: false, reason: error.message };
	}
});

async function syncStatus() {
	try {
		const status = await getStatus(true);
		const settings = await getSettings();

		const existing = (await globals.redis.get("status")) || {};
		const payload = {
			...existing,
			[settings.deviceId]: {
				priority: settings.priority,
				status: status,
			},
		};

		if (window) window.webContents.send("status", status);
		if (isDeepStrictEqual(existing, payload)) return; // no changes, don't push to Redis or UI
		await globals.redis.set("status", JSON.stringify(payload));
	} catch {}
}

async function verifyAndLaunch(validate = true) {
	try {
		// on a cold launch, redis isn't set up yet, so validate and create the client
		if (validate) {
			const settings = await getSettings();

			if (!isConfigValid(settings)) {
				window.loadFile(path.join(__dirname, "../renderer", "views", "onboarding", "index.html"));
				return;
			}

			globals.redis = createRedisClient(settings.upstash.url, settings.upstash.token);
			const isValid = await isRedisClientValid(globals.redis);

			if (!isValid) {
				dialog.showErrorBox("Connection Failed!", "Failed to connect to Redis with the provided settings. Please check your configuration and try again.");
				window.loadFile(path.join(__dirname, "../renderer", "views", "onboarding", "index.html"));
				return;
			}
		}

		window.loadFile(path.join(__dirname, "../renderer", "index.html"));

		if (!interval) interval = setInterval(syncStatus, INTERVAL_TIME);
		window.webContents.once("did-finish-load", () => syncStatus());
	} catch (error) {
		dialog.showErrorBox("Settings Failed!", `An unknown error occurred while verifying your settings:\n${error.message}`);
		process.exit();
	}
}
