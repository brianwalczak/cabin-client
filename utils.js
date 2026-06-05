import fs from 'fs';

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

export { readFile, saveFile };