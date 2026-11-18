import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const isWayland = process.platform === "linux" && process.env.XDG_SESSION_TYPE === "wayland";

async function gdbus(dest, objectPath, method, ...args) {
	const { stdout } = await execFileAsync("gdbus", ["call", "--session", "--dest", dest, "--object-path", objectPath, "--method", method, ...args]);
	return stdout;
}

async function isAfk(timeout = 300) {
	if (!isWayland) return false; // only works on Wayland

	try {
		const idle = await gdbus("org.gnome.Mutter.IdleMonitor", "/org/gnome/Mutter/IdleMonitor/Core", "org.gnome.Mutter.IdleMonitor.GetIdletime");
		if (Number(idle.match(/(\d+)/)?.[1] ?? 0) < timeout * 1000) return false;

		const inhibited = await gdbus("org.gnome.SessionManager", "/org/gnome/SessionManager", "org.gnome.SessionManager.IsInhibited", "8");
		return !inhibited.includes("true");
	} catch {
		return false; // assume active if we can't tell
	}
}

export default isAfk;
