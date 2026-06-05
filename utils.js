import fs from 'fs';

function isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
}

async function readFile(path) {
    try {
        const data = await fs.promises.readFile(path, "utf8");
        const jsonData = JSON.parse(data);

        return jsonData;
    } catch {
        return null;
    }
};

async function saveFile(path, data) {
    if (typeof data === "object") {
        data = JSON.stringify(data, null, 2);
    }

    await fs.promises.writeFile(path, data, { encoding: "utf8" });
    return data;
};

// https://stackoverflow.com/a/34749873
function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

export { isObject, readFile, saveFile, mergeDeep };