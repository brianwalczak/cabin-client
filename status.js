import { getSettings, isConfigValid } from './settings.js';
import { activeWindow } from 'get-windows';
import { globals } from './shared.js';

async function getStatus(tick = false) {
    const settings = await getSettings();
    if (!isConfigValid(settings)) return {};
    const status = settings.status || {};
    
    if (tick) globals.lastUpdate = new Date().toISOString();

    if (status?.enabled != true) {
        return {}; // status disabled (invisible mode)
    }

    if (status?.manual && typeof status.manual === 'object' && Object.keys(status.manual).length > 0) {
        // use manual override data
        return {
            ...status.manual,
            updatedAt: globals.lastUpdate
        };
    }

    // Otherwise, we gotta check all the apps open and stuff
    const mappings = status.mappings || [];
    const active = await activeWindow();
    if (!active?.owner?.name) return {}; // no active app (???), can't do anything

    const mapping = mappings.find(m => m.app === active.owner.name);
    if (!mapping) return {}; // no mapping for this app

    return {
        ...mapping,
        updatedAt: globals.lastUpdate
    }
};

export { getStatus };