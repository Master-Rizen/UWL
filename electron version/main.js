const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const workspaceManager = require('./core/workspaceManager');
const windowManager = require('./system/windowManager');

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