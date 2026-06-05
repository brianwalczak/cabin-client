import { getSettings, isConfigValid } from './settings.js';
let lastUpdate = new Date(0).toISOString();

async function getStatus(path, tick = false) {
    const settings = await getSettings(path);
    if (!isConfigValid(settings)) return {};
    const status = settings.status || {};
    
    if (tick) lastUpdate = new Date().toISOString();

    if (status?.enabled != true) {
        return {}; // status disabled (invisible mode)
    }

    if (status?.manual && typeof status.manual === 'object' && Object.keys(status.manual).length > 0) {
        // use manual override data
        return {
            ...status.manual,
            updatedAt: lastUpdate
        };
    }

    // Otherwise, we gotta check all the apps open and stuff
    const mappings = status.mappings || [];
    const currentApp = "Visual Studio Code"; // temporary for now, REPLACE WITH ACTUAL CURRENT APP LATER

    const mapping = mappings.find(m => m.app === currentApp);
    if (!mapping) return {}; // no mapping for this app

    return {
        ...mapping,
        updatedAt: lastUpdate
    }
};

export { getStatus };