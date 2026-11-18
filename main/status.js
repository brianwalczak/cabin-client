import { getSettings, isConfigValid } from "./settings.js";
import activeWindow from "./activeWindow.js";
import isAfk from "./idle.js";

let lastUpdate = new Date(0).toISOString();

async function getStatus(updateTs = false) {
	const settings = await getSettings();
	if (!isConfigValid(settings)) return {};
	const status = settings.status || {};

	if (updateTs) lastUpdate = new Date().toISOString();

	if (status?.enabled != true) {
		return {}; // status disabled (invisible mode)
	}

	if (status?.manual && typeof status.manual === "object" && Object.keys(status.manual).length > 0) {
		// use manual override data
		return {
			...status.manual,
			updatedAt: lastUpdate,
		};
	}

	// If there's been no input for a while (and no media playing), assume we're AFK
	if (await isAfk(Number(status.idleTimeout) || 0)) {
		return {}; // afk, don't report anything
	}

	// Otherwise, we gotta check all the apps open and stuff
	const mappings = status.mappings || [];
	const active = await activeWindow();
	if (!active) return {}; // no active app (???), can't do anything

	const mapping = mappings.find((m) => m.app === active);
	if (!mapping) return {}; // no mapping for this app
	delete mapping.app; // we don't need to return the app name

	return {
		...mapping,
		updatedAt: lastUpdate,
	};
}

export { getStatus };
