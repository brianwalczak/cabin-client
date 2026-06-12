/* global toggleTrack, setTrack */

// Toggle printer device enabled/disabled
// eslint-disable-next-line no-unused-vars
function togglePrinter() {
	const container = document.querySelector("#printer-device");
	toggleTrack(container);

	const enabled = container.getAttribute("data-enabled") === "true";
	document.querySelector("#printer-name").parentElement.classList.toggle("hidden", !enabled);
	document.querySelector("#printer-name").toggleAttribute("required", enabled);
}

// eslint-disable-next-line no-unused-vars
async function savePrinterSettings() {
	const enabled = document.querySelector("#printer-device").getAttribute("data-enabled") === "true";
	const name = document.querySelector("#printer-name").value.trim();

	await window.api.updatePrinterSettings({ enabled, name });
}

async function populatePrinterSettings() {
	const printer = await window.api.getPrinterSettings();

	setTrack(document.querySelector("#printer-device"), printer.enabled);
	document.querySelector("#printer-name").parentElement.classList.toggle("hidden", !printer.enabled);
	document.querySelector("#printer-name").toggleAttribute("required", printer.enabled);
	document.querySelector("#printer-name").value = printer.name || "";
}

populatePrinterSettings(); // run on page load
