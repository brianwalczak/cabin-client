import { readFile, saveFile } from './utils.js';
import { isDeepStrictEqual } from 'util';
import os from 'os';

const defaults = {
    deviceId: os.hostname(),
    priority: 1,
    upstash: { url: "", token: "" }
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

function isConfigValid(data) {
  return !!(data?.upstash?.url && data?.upstash?.token && data?.deviceId && data?.priority);
}

export { getSettings, isConfigValid };