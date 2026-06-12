import printer from "@alexssmusica/node-printer";
import { readFile, saveFile } from "./utils.js";
import { ipcMain, app } from "electron";
import { globals } from "./shared.js";
import path from "node:path";

const printerPath = path.join(app.getPath("userData"), "printer.json");
const POLL_INTERVAL = 30000;

const defaults = { enabled: false, name: "" };

const FONT_HEIGHT = 24;
const LINE_SPACING = 2;
const LINE_TOTAL = FONT_HEIGHT + LINE_SPACING;

function makeLine(text) {
	return [`SIZE 100 mm,${LINE_TOTAL} dot`, "GAP 0,0", "OFFSET 0", "DIRECTION 1", "REFERENCE 0,0", "CLS", `TEXT 0,0,"3",0,1,1,"${text}"`, "PRINT 1,0"].join("\r\n") + "\r\n";
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

		for (const item of items) {
			printer.printDirect({
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
