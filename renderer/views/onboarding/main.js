window.finish = async function () {
	const btn = document.querySelector("form:nth-of-type(2) button[type='submit']");
	btn.textContent = "Connecting...";
	btn.disabled = true;

	try {
		const result = await window.api.validateAndSetSettings({
			deviceId: document.querySelector("#device-id").value.trim(),
			priority: parseInt(document.querySelector("#priority").value),
			upstash: {
				url: document.querySelector("#api-url").value.trim(),
				token: document.querySelector("#api-key").value.trim(),
			},
		});

		if (result.success) {
			await window.api.completeOnboarding();
		}
	} finally {
		btn.textContent = "Continue";
		btn.disabled = false;
	}
};

async function populateSettings() {
	const settings = await window.api.getSettings();

	document.querySelector("#device-id").value = settings?.deviceId || "";
	document.querySelector("#priority").value = settings?.priority || 1;
	document.querySelector("#priority-text").textContent = settings?.priority || 1;
	document.querySelector("#api-url").value = settings?.upstash?.url || "";
	document.querySelector("#api-key").value = settings?.upstash?.token || "";
}

populateSettings(); // run on page load
