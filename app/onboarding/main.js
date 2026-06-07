window.finish = async function () {
	const result = await window.api.updateSettings({
		deviceId: document.getElementById("device-id").value.trim(),
		priority: parseInt(document.getElementById("priority").value),
		upstash: {
			url: document.getElementById("api-url").value.trim(),
			token: document.getElementById("api-key").value.trim(),
		},
	});

	if (result.success) {
		await window.api.completeOnboarding();
	}
};

async function populateSettings() {
	const settings = await window.api.getSettings();

	document.getElementById("device-id").value = settings?.deviceId || "";
	document.getElementById("priority").value = settings?.priority || 1;
	document.getElementById("api-url").value = settings?.upstash?.url || "";
	document.getElementById("api-key").value = settings?.upstash?.token || "";
}

populateSettings(); // run on page load
