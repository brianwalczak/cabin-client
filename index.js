import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { getStatus } from "./status.js";
import { isDeepStrictEqual } from "util";
import { createRedisClient, isRedisClientValid } from "./redis.js";
import { getSettings, updateSettings, isConfigValid } from "./settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settingsPath = path.join(app.isPackaged ? app.getPath("userData") : __dirname, "settings.json");
const INTERVAL_TIME = 30000; // 30 seconds
let interval;
let window;
let redis;

function createWindow() {
	window = new BrowserWindow({
		width: 500,
		height: 700,
		resizable: false,
		icon: path.join(__dirname, "static", "img", "logo.png"),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			sandbox: false,
			preload: path.join(__dirname, "app", "preload.js"),
		},
	});

	window.setMenuBarVisibility(false);
	window.loadFile(path.join(__dirname, "app", "loading", "index.html"));

	window.once("ready-to-show", () => {
		window.show();
	});

	window.on("closed", () => {
		window = null;
	});
}

app.whenReady().then(async () => {
	createWindow();
    init(false);

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow(); // create window if none are open (macos/darwin)
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

ipcMain.handle("settings:get", async () => {
	return await getSettings(settingsPath);
});

ipcMain.handle("settings:set", async (event, config) => {
	const result = await updateSettings(settingsPath, config);

	if (!result.success) {
		dialog.showErrorBox("Settings Error!", `An unknown error occurred while updating your settings:\n${result.reason}`);
	}

	if (config.status && typeof config.status === "object" && !isDeepStrictEqual(config.status, result.data?.status || {})) {
		tick(); // immediately update the status in Redis and UI if the status settings were changed
	}

	return result;
});

ipcMain.on("onboarding-complete", () => init(true));

async function tick() {
	try {
		const status = await getStatus(settingsPath, true);
		const settings = await getSettings(settingsPath);

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
};

async function init(isOnboarding = false) {
	try {
		const settings = await getSettings(settingsPath);

		if (!isConfigValid(settings)) {
			if (!isOnboarding) {
				window.loadFile(path.join(__dirname, "app", "onboarding", "index.html"));
			} else {
				dialog.showErrorBox("Invalid Settings!", "The settings you provided are invalid. Please check your configuration and try again.");
			}

			return;
		}

		redis = createRedisClient(settings.upstash.url, settings.upstash.token);
		const isValid = await isRedisClientValid(redis);

		if (!isValid) {
			dialog.showErrorBox("Connection Failed!", "Failed to connect to Redis with the provided settings. Please check your configuration and try again.");
			if (!isOnboarding) window.loadFile(path.join(__dirname, "app", "onboarding", "index.html"));
			return;
		}

		window.loadFile(path.join(__dirname, "app", "index.html"));

		if (!interval) interval = setInterval(tick, INTERVAL_TIME);
		window.webContents.once("did-finish-load", () => tick());
	} catch (error) {
		dialog.showErrorBox("Settings Failed!", `An unknown error occurred while verifying your settings:\n${error.message}`);
		process.exit();
	}
};