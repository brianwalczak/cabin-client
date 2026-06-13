import printer from "@alexssmusica/node-printer";
import { readFile, saveFile } from "./utils.js";
import { ipcMain, app } from "electron";
import { globals } from "./shared.js";
import path from "node:path";

const printerPath = path.join(app.getPath("userData"), "printer.json");
const POLL_INTERVAL = 30000;

const defaults = { enabled: false, name: "" };

const LABEL_WIDTH_MM = 100; // 100mm wide labels (4x6!)
const PRINTER_DPI = 203; // 203 dots per inch

const MAX_CHARS_PER_LINE = 65; // Max characters that can fit on a line (had to calculate myself because the printer is weird)
const FONT_HEIGHT = 24; // Height of the font in dots (Font 3)

const DOT_SIZE_MM = 25.4 / PRINTER_DPI; // Size of one dot in mm

function makeLine(text) {
	if (text.length > MAX_CHARS_PER_LINE) {
		text = text.slice(0, MAX_CHARS_PER_LINE - 3) + "...";
	}

	return [`SIZE ${LABEL_WIDTH_MM} mm,${DOT_SIZE_MM * (FONT_HEIGHT + 3)} mm`, "CLS", "GAP 0,0", "OFFSET 0", "DIRECTION 1", "REFERENCE 0,0", `TEXT 0,0,"3",0,1,1,"${text}"`, "PRINT 1"].join("\r\n") + "\r\n";
}

function printDirectAsync(options) {
	return new Promise((resolve, reject) => {
		printer.printDirect({
			...options,
			success: resolve,
			error: reject,
		});
	});
}

async function getPrinterSettings() {
	try {
		const data = await readFile(printerPath);

		return {
			enabled: data?.enabled ?? defaults.enabled,
			name: data?.name ?? defaults.name,
		};
	} catch {
		return defaults;
	}
}

async function updatePrinterSettings(data) {
	if (!data || typeof data !== "object") return { success: false, reason: "Invalid printer settings data!" };

	try {
		const current = await getPrinterSettings();
		const updated = { ...current, ...data };

		await saveFile(printerPath, updated);
		return { success: true, data: updated };
	} catch (error) {
		return { success: false, reason: error.toString() };
	}
}

async function poll() {
	const settings = await getPrinterSettings();
	if (!settings.enabled || !settings.name || !globals.redis) return;

	try {
		const items = await globals.redis.eval(
			`
			local items = redis.call('LRANGE', ARGV[1], 0, -1)
			redis.call('DEL', ARGV[1])
			return items
		`,
			[],
			["print_queue"],
		);

		for (const item of [...items].reverse()) {
			await printDirectAsync({
				data: makeLine(String(item)),
				printer: settings.name,
				type: "RAW",
			});
		}
	} catch {}
}

setInterval(poll, POLL_INTERVAL);
ipcMain.handle("printer:get", getPrinterSettings);
ipcMain.handle("printer:set", async (event, config) => updatePrinterSettings(config));
