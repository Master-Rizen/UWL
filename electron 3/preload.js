const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("api", {
    getWorkspaces: () => ipcRenderer.invoke("get-workspaces"),
    createWorkspace: (name) => ipcRenderer.invoke("create-workspace", name),
    deleteWorkspace: (name) => ipcRenderer.invoke("delete-workspace", name),
    saveApps: (name, apps) => ipcRenderer.invoke("save-apps", name, apps),
    renameWorkspace: (oldName, newName) => ipcRenderer.invoke("rename-workspace", oldName, newName),
    clearApps: (name) => ipcRenderer.invoke("clear-apps", name),
    launchWorkspace: (name) => ipcRenderer.invoke("launch-workspace", name),
    switchWorkspace: (name) => ipcRenderer.invoke("switch-workspace", name),
    startFocus: (name) => ipcRenderer.invoke("start-focus", name),
    stopFocus: () => ipcRenderer.invoke("stop-focus"),
    saveBlockedApps: (name, list) => ipcRenderer.invoke("save-blocked-apps", name, list),
    getLastWorkspace: () => ipcRenderer.invoke("get-last-workspace"),
    setLastWorkspace: (name) => ipcRenderer.invoke("set-last-workspace", name),
    captureWindows: () => ipcRenderer.invoke("capture-windows")
});

