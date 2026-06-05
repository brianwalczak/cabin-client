import { readFile, saveFile, mergeDeep } from './utils.js';
import { isDeepStrictEqual } from 'util';
import os from 'os';

const defaults = {
    deviceId: os.hostname(),
    priority: 1,
    upstash: { url: "", token: "" },
    status: {
        enabled: true,
        manual: null,
        mappings: []
    }
};

function isConfigValid(data) {
  return !!(data?.upstash?.url && data?.upstash?.token && data?.deviceId && data?.priority);
};

async function getSettings(path) {
    try {
        const settings = await readFile(path);

        const data = {
            deviceId: settings?.deviceId ?? defaults.deviceId,
            priority: settings?.priority ?? defaults.priority,
            upstash: {
                url: settings?.upstash?.url ?? defaults.upstash.url,
                token: settings?.upstash?.token ?? defaults.upstash.token
            },
            status: {
                enabled: settings?.status?.enabled ?? defaults.status.enabled,
                manual: settings?.status?.manual ?? defaults.status.manual,
                mappings: settings?.status?.mappings ?? defaults.status.mappings
            }
        };

        if (!isDeepStrictEqual(settings, data)) {
            await saveFile(path, data);
        }

        return data;
    } catch (error) {
        return defaults;
    }
};

async function updateSettings(path, data) {
    const settings = await getSettings(path);
    if (!data || typeof data !== "object") return { success: false, reason: "Invalid settings data provided!" };

    try {
        mergeDeep(settings, data);
        await saveFile(path, settings);
        
        return { success: true, data: settings };
    } catch (error) {
        return { success: false, reason: error.toString() };
    }
}

export { isConfigValid, getSettings, updateSettings };