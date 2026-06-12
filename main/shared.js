import { app } from "electron";
import path from "node:path";

export const globals = {
	settingsPath: path.join(app.getPath("userData"), "settings.json"),
	redis: null,
};
