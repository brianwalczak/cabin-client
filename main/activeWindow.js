import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execFileAsync = promisify(execFile);

const isLinux = process.platform === "linux";
const isWayland = isLinux && process.env.XDG_SESSION_TYPE === "wayland";

function parseGdbusData(stdout) {
	try {
		const match = stdout.trim().match(/^\((['"])([\s\S]*)\1,\)$/);

		if (!match) {
			return [];
		}

		const jsonText = match[2].replace(/\\(.)/g, "$1");
		const data = JSON.parse(jsonText);

		if (!Array.isArray(data)) {
			return [];
		}

		return data;
	} catch {
		return [];
	}
}

// Used by Windows, macOS, & X11-Linux (beyond Wayland)
async function getRegularActiveWindow() {
	try {
		const { getActiveWindow } = await import("get-windows");
		const win = await getActiveWindow();

		return win?.owner?.name;
	} catch {
		return null;
	}
}

// Used by Wayland (needs a special extension installed)
// https://extensions.gnome.org/extension/4724/window-calls/
async function getWaylandActiveWindow() {
	try {
		const { stdout } = await execFileAsync("gdbus", ["call", "--session", "--dest", "org.gnome.Shell", "--object-path", "/org/gnome/Shell/Extensions/Windows", "--method", "org.gnome.Shell.Extensions.Windows.List"]);
		const data = parseGdbusData(stdout);

		const focused = data.find((w) => w.focus === true);
		if (!focused) return null;

		return focused.wm_class || focused.wm_class_instance || focused.title;
	} catch {
		return null;
	}
}

async function activeWindow() {
	if (isWayland) {
		return getWaylandActiveWindow();
	}

	return getRegularActiveWindow();
}

export default activeWindow;
