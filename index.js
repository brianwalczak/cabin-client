import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import createRedisClient from './redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settingsPath = path.join((app.isPackaged ? app.getPath('userData') : __dirname), 'settings.json');
let settings;
let window;
let redis;

function createWindow() {
    window = new BrowserWindow({
        width: 500,
        height: 700,
        resizable: false,
        icon: path.join(__dirname, 'static', 'img', 'logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'app', 'preload.js'),
        },
    });

    window.setMenuBarVisibility(false);
    window.loadFile(path.join(__dirname, 'app', 'index.html'));

    window.once('ready-to-show', () => {
        window.show();
    });

    window.on('closed', () => {
        window = null;
    });
}

app.whenReady().then(async () => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow(); // create window if none are open (macos/darwin)
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('update', async (event, details) => {
    try {
        if (!redis) {
            throw new Error('Redis client is not initialized.');
        }
        
        await redis.set('status', details);
        dialog.showMessageBox(window, {
            type: 'info',
            title: 'Status Updated!',
            message: 'Your status has been successfully updated, and will be shown on the website shortly. :)',
        });
    } catch (error) {
        dialog.showErrorBox('Redis Error!', `An unknown error occurred while updating status in Redis:\n${error.message}`);
    }
});

(async () => {
    try {
        const defaults = {
            upstash: {
                url: "",
                token: ""
            }
        };
        let data;

        if (fs.existsSync(settingsPath)) {
            const file = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            data = { ...defaults, ...file }; // apply defaults if missing
        } else {
            data = defaults;
        }

        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 4));
        settings = data;

        const url = data.upstash?.url;
        const token = data.upstash?.token;

        if (!url || !token) {
            dialog.showErrorBox('Misconfiguration Error!', `Missing 'upstash.url' and/or 'upstash.token' in settings. :[\n\nPlease configure them here:\n${settingsPath}`);
            process.exit();
        }

        redis = createRedisClient(url, token);
    } catch (error) {
        dialog.showErrorBox('Settings Failed!', `An unknown error occurred while loading your settings:\n${error.message}`);
        process.exit();
    }
})();