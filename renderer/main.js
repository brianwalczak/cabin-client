const COLORS = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "slate", "gray", "zinc", "neutral", "stone", "mauve", "olive", "mist", "taupe"];
let lastStatus = null;
let deviceId = null;

// Listen for status updates from the main process and update the UI!
window.api.onStatus((status) => {
	document.querySelector("#live-header").textContent = status.header || "No status set.";
	document.querySelector("#live-label").textContent = status.label || "You currently have no status! Set one up by creating mappings or use an override :)";
	document.querySelector("#live-dot").className = `size-2 rounded-full mt-1.5 ${status.pulse ? "animate-pulse" : ""} bg-${status.color || "red"}-400`;
	document.querySelector("#push-details").classList.toggle("hidden", !status.updatedAt);
	lastStatus = status;
});

// Update the "Pushed Xs ago" text every second
setInterval(() => {
	document.querySelector("#push-details").classList.toggle("hidden", !lastStatus?.updatedAt);
	if (!lastStatus?.updatedAt) {
		return;
	}

	const secs = Math.floor((Date.now() - new Date(lastStatus.updatedAt).getTime()) / 1000);
	document.querySelector("#push-details").textContent = `Pushed ${secs}s ago${deviceId ? " · " + deviceId : ""}`;
}, 1000);

// Apply the override settings (header, label, pulse, color) by saving
// eslint-disable-next-line no-unused-vars
function applyOverride() {
	const header = document.querySelector("#override-header").value.trim();
	const label = document.querySelector("#override-label").value.trim();
	const pulse = document.querySelector("#override-pulse").getAttribute("data-enabled") === "true";
	const color = document.querySelector("#override-color").getAttribute("data-color").trim();
	document.querySelector("#override-clear").classList.remove("hidden");

	// save new status settings with manual override
	return window.api.updateSettings({
		status: {
			manual: {
				header,
				label,
				pulse,
				color,
			},
		},
	});
}

// Clear the override by setting it to null (use mappings)
// eslint-disable-next-line no-unused-vars
function clearOverride() {
	// reset all the fields
	document.querySelector("#override-header").value = "";
	document.querySelector("#override-label").value = "";
	selectColor(document.querySelector("#override-color"), COLORS[0]);
	setTrack(document.querySelector("#override-pulse"), false);
	document.querySelector("#override-clear").classList.add("hidden");

	// save new status settings with manual override cleared
	return window.api.updateSettings({
		status: {
			manual: null,
		},
	});
}

// Toggle invisible mode (status disabled)
// eslint-disable-next-line no-unused-vars
function toggleInvisible() {
	const container = document.querySelector("#invisible");
	toggleTrack(container);

	// save new invisible mode setting
	return window.api.updateSettings({
		status: {
			enabled: container.getAttribute("data-enabled") !== "true",
		},
	});
}

// Populate the fields with the current settings (if they exist)
async function populateSettings() {
	const settings = await window.api.getSettings();
	const status = settings.status || {};
	deviceId = settings.deviceId;

	// check if there's any manual override data to pre-populate
	if (status?.manual && typeof status.manual === "object") {
		document.querySelector("#override-header").value = status.manual.header || "";
		document.querySelector("#override-label").value = status.manual.label || "";
		selectColor(document.querySelector("#override-color"), status.manual.color);

		if (status.manual.pulse === true) {
			setTrack(document.querySelector("#override-pulse"), true);
		}

		document.querySelector("#override-clear").classList.remove("hidden");
	}

	// if invisble mode is enabled, toggle it on
	if (status.enabled === false) {
		setTrack(document.querySelector("#invisible"), true);
	}

	// pre-populate the mappings list
	renderMappings(status.mappings || []);

	// pre-populate the settings page fields
	document.querySelector("#device-id").value = settings?.deviceId || "";
	document.querySelector("#priority").value = settings?.priority || 1;
	document.querySelector("#priority-text").textContent = settings?.priority || 1;
	document.querySelector("#api-url").value = settings?.upstash?.url || "";
	document.querySelector("#api-key").value = settings?.upstash?.token || "";
}

// Save settings from the settings page
// eslint-disable-next-line no-unused-vars
async function saveSettings() {
	const deviceIdV = document.querySelector("#device-id").value.trim() || undefined;
	const priority = parseInt(document.querySelector("#priority").value) || undefined;
	const apiUrl = document.querySelector("#api-url").value.trim() || undefined;
	const apiToken = document.querySelector("#api-key").value.trim() || undefined;
	const payload = {};

	// add piece-by-piece to be safe (in-case the pre-population didn't work?)
	if (deviceIdV) payload.deviceId = deviceIdV;
	if (priority) payload.priority = priority;
	if (apiUrl) payload.upstash = { url: apiUrl };
	if (apiToken) payload.upstash = { ...(payload.upstash || {}), token: apiToken };

	const result = await window.api.updateSettings(payload);
	document.querySelector("#settings-save").textContent = result.success ? "Settings saved!" : "Failed to save.";
	if (result.success) deviceId = deviceIdV;

	setTimeout(() => {
		document.querySelector("#settings-save").textContent = "Save";
	}, 2500);
}

// Unregister the device by wiping the Redis entry and settings
// eslint-disable-next-line no-unused-vars
async function unregisterDevice() {
	const confirmed = confirm("Are you sure you want to unregister this device?\n\nThis will remove the device from the database and wipe all local settings. You'll need to go through the setup again. :(");
	if (!confirmed) return;

	const result = await window.api.unregister();

	if (!result.success) {
		document.querySelector("#settings-unregister").textContent = "Failed to unregister.";

		setTimeout(() => {
			document.querySelector("#settings-unregister").textContent = "Unregister Device";
		}, 2500);
	}
}

// Set the track to the specific enabled state
function setTrack(container, enabled) {
	const track = container.querySelector("div");
	const thumb = track.querySelector("div");

	thumb.classList.toggle("translate-x-4", enabled);
	thumb.classList.toggle("translate-x-0", !enabled);
	track.classList.toggle("bg-green-500/50", enabled);
	track.classList.toggle("bg-white/5", !enabled);
	container.setAttribute("data-enabled", enabled.toString());
}

// Toggle track on/off (for invisible and pulse)
function toggleTrack(container) {
	const track = container.querySelector("div");
	const thumb = track.querySelector("div");
	const isOn = thumb.classList.contains("translate-x-4");

	return setTrack(container, !isOn);
}

// Toggle the color dropdown visibility
function toggleColors(container) {
	container.querySelector(".color-dropdown-options").classList.toggle("hidden");
}

// Select a color from the dropdown and update the UI
function selectColor(container, name) {
	container.setAttribute("data-color", name);
	container.querySelector(".color-dropdown-dot").className = `color-dropdown-dot w-2.5 h-2.5 rounded-full shrink-0 bg-${name}-400`;
	container.querySelector(".color-dropdown-label").textContent = name;
	container.querySelector(".color-dropdown-options").classList.add("hidden");
}

// Populate the color options in the dropdown
for (const container of document.querySelectorAll(".color-dropdown")) {
	container.querySelector(".color-dropdown-button").onclick = () => toggleColors(container);

	for (const name of COLORS) {
		const btn = document.createElement("button");

		btn.type = "button";
		btn.className = "w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors text-left cursor-pointer";
		btn.innerHTML = `<div class="w-2.5 h-2.5 rounded-full shrink-0 bg-${name}-400"></div><span>${name}</span>`;
		btn.onclick = () => selectColor(container, name);
		container.querySelector(".color-dropdown-options").appendChild(btn);
	}

	// default to first color if not set
	if (!container.getAttribute("data-color")) {
		selectColor(container, COLORS[0]);
	}
}

function renderMappings(mappings = []) {
	const list = document.querySelector("#mappings-list");
	const hasNone = document.querySelector("#mappings-none");
	list.innerHTML = "";

	if (mappings.length === 0) {
		hasNone.classList.remove("hidden");
		return;
	}

	hasNone.classList.add("hidden");

	for (const mapping of mappings) {
		const row = document.createElement("div");
		row.className = "group flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-white/4 border border-white/8 hover:border-white/20 transition-colors";
		row.innerHTML = `
			<div class="flex items-center gap-2.5 min-w-0 flex-1">
				<div class="size-2 rounded-full shrink-0 bg-${mapping.color || "red"}-400 ${mapping.pulse ? "animate-pulse" : ""}"></div>
				<span class="mono text-xs font-medium text-white/50 bg-white/4 border border-white/8 px-1.5 py-0.5 rounded-md truncate max-w-[40%] shrink-0">${mapping.app}</span>
				<span class="text-white/20 text-xs shrink-0">→</span>
				
				<div class="flex flex-col flex-1 min-w-0">
					<span class="text-xs text-white/80 truncate font-medium group-hover:whitespace-normal group-hover:break-all max-h-5 group-hover:max-h-32 transition-[max-height] duration-300 ease-in-out">${mapping.header}</span>
					${mapping.label ? `<span class="text-xs text-white/40 truncate mt-0.5 group-hover:whitespace-normal group-hover:break-all max-h-5 group-hover:max-h-32 transition-[max-height] duration-300 ease-in-out">${mapping.label}</span>` : ""}
				</div>
			</div>

			<button type="button" onclick="deleteMapping('${mapping.app.replace(/'/g, "\\'")}')" class="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/80 transition-colors text-xs p-1 cursor-pointer shrink-0">✖</button>
		`;

		list.appendChild(row);
	}
}

// eslint-disable-next-line no-unused-vars
async function addMapping() {
	const app = document.querySelector("#mapping-app").value.trim();
	const header = document.querySelector("#mapping-header").value.trim();
	const label = document.querySelector("#mapping-label").value.trim();
	const color = document.querySelector("#mapping-color").getAttribute("data-color");
	const pulse = document.querySelector("#mapping-pulse").getAttribute("data-enabled") === "true";

	const settings = await window.api.getSettings();
	let mappings = settings.status?.mappings || [];

	if (mappings.find((m) => m.app === app)) {
		// app already exists, overwrite the old customization with the new one
		mappings = mappings.map((m) => (m.app === app ? { app, header, label, color, pulse } : m));
	} else {
		// it's new, just add it
		mappings.push({ app, header, label, color, pulse });
	}

	await window.api.updateSettings({ status: { mappings } });
	renderMappings(mappings);

	// reset all the form fields
	document.querySelector("#mapping-app").value = "";
	document.querySelector("#mapping-header").value = "";
	document.querySelector("#mapping-label").value = "";
	selectColor(document.querySelector("#mapping-color"), COLORS[0]);
	setTrack(document.querySelector("#mapping-pulse"), false);
}

// eslint-disable-next-line no-unused-vars
async function deleteMapping(app) {
	const settings = await window.api.getSettings();
	let mappings = settings.status?.mappings || [];

	mappings = mappings.filter((m) => m.app !== app); // remove the mapping for the specified app
	await window.api.updateSettings({ status: { mappings } });
	renderMappings(mappings);
}

populateSettings(); // run on page load
