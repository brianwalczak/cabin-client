import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRedisClient, isRedisClientValid } from './redis.js';
import { getSettings, isConfigValid } from './settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settingsPath = path.join((app.isPackaged ? app.getPath('userData') : __dirname), 'settings.json');
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
    window.loadFile(path.join(__dirname, 'app', 'loading.html'));

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

ipcMain.on('status', async (event, details) => {
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

ipcMain.on("settings", async (event, config) => {
    try {

    } catch {} ;
});

(async () => {
    try {
        const settings = await getSettings(settingsPath);

        if (!isConfigValid(settings)) {
            window.loadFile(path.join(__dirname, 'app', 'onboarding.html'));
            return;
        }

        redis = createRedisClient(settings.upstash.url, settings.upstash.token);
        const isValid = await isRedisClientValid(redis);

        if (!isValid) {
            dialog.showErrorBox('Connection Failed!', 'Failed to connect to Redis with the provided settings. Please check your configuration and try again.');
            window.loadFile(path.join(__dirname, 'app', 'onboarding.html'));
            return;
        }

        window.loadFile(path.join(__dirname, 'app', 'index.html'));
    } catch (error) {
        dialog.showErrorBox('Settings Failed!', `An unknown error occurred while verifying your settings:\n${error.message}`);
        process.exit();
    }
})();