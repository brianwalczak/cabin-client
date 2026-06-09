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
// eslint-disable-next-line no-unused-vars
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

populateSettings(); // run on page load
