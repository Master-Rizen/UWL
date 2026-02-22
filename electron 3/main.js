const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const workspaceManager = require('./core/workspacemanager');
const windowManager = require('./system/windowManager');
const appLauncher = require('./system/appLauncher');
const focusMode = require('./features/focusMode');
const tracker = require('./features/tracker');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#0f172a",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });

    mainWindow.loadFile('./ui/index.html');
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

/* IPC HANDLERS */

ipcMain.handle("get-workspaces", () => {
    return workspaceManager.getWorkspaces();
});

ipcMain.handle("create-workspace", (event, name) => {
    return workspaceManager.createWorkspace(name);
});

ipcMain.handle("delete-workspace", (event, name) => {
    return workspaceManager.deleteWorkspace(name);
});

ipcMain.handle("capture-windows", async () => {
    return await windowManager.getOpenWindows();
});

ipcMain.handle("save-apps", (event, name, apps) => {
    return workspaceManager.saveApps(name, apps);
});

ipcMain.handle("rename-workspace", (event, oldName, newName) => {
    return workspaceManager.renameWorkspace(oldName, newName);
});

ipcMain.handle("clear-apps", (event, name) => {
    return workspaceManager.clearApps(name);
});

ipcMain.handle("launch-workspace", async (event, name) => {
    const workspaces = workspaceManager.getWorkspaces();
    const ws = workspaces[name];

    if (!ws || !ws.apps || ws.apps.length === 0) {
        return { error: "No apps stored in this workspace" };
    }

    return await appLauncher.launchApps(ws.apps);
});

ipcMain.handle("switch-workspace", (event, newWorkspace) => {
    tracker.stopTracking(workspaceManager);
    tracker.startTracking(newWorkspace);
    return { success: true };
});

ipcMain.handle("start-focus", (event, name) => {
    return focusMode.startFocus(workspaceManager, name);
});

ipcMain.handle("stop-focus", () => {
    return focusMode.stopFocus();
});

ipcMain.handle("save-blocked-apps", (event, name, list) => {
    return workspaceManager.saveBlockedApps(name, list);
});

ipcMain.handle("get-last-workspace", () => {
    return workspaceManager.getLastWorkspace();
});

ipcMain.handle("set-last-workspace", (event, name) => {
    workspaceManager.setLastWorkspace(name);
});