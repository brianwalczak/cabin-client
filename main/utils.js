import fs from "fs";
import path from "path";
import os from "os";

function isObject(item) {
	return item && typeof item === "object" && !Array.isArray(item);
}

async function readFile(path) {
	try {
		const data = await fs.promises.readFile(path, "utf8");
		const jsonData = JSON.parse(data);

		return jsonData;
	} catch {
		return null;
	}
}

async function saveFile(path, data) {
	if (typeof data === "object") {
		data = JSON.stringify(data, null, 2);
	}

	try {
		await fs.promises.writeFile(path, data, { encoding: "utf8" });
		return true;
	} catch {
		return false;
	}
}

async function deleteFile(path) {
	try {
		await fs.promises.unlink(path);
	} catch {}

	return true;
}

// https://stackoverflow.com/a/34749873
function mergeDeep(target, ...sources) {
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
}

// linux needs a special implementation to enable open at login
async function setOpenAtLogin() {
	const dir = path.join(os.homedir(), ".config/autostart");
	const file = path.join(dir, "cabin-client.desktop");

	try {
		await fs.promises.mkdir(dir, { recursive: true });

		const content = `
[Desktop Entry]
Type=Application
Name=Cabin Client
Exec="${process.execPath}"
Terminal=false
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
`.trim();

		await fs.promises.writeFile(file, content, { encoding: "utf8" });
	} catch {}
}

export { isObject, readFile, saveFile, deleteFile, mergeDeep, setOpenAtLogin };
