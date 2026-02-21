const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("api", {
    getWorkspaces: () => ipcRenderer.invoke("get-workspaces"),
    createWorkspace: (name) => ipcRenderer.invoke("create-workspace", name),
    deleteWorkspace: (name) => ipcRenderer.invoke("delete-workspace", name),
    saveApps: (name, apps) => ipcRenderer.invoke("save-apps", name, apps),
    renameWorkspace: (oldName, newName) => ipcRenderer.invoke("rename-workspace", oldName, newName),
    clearApps: (name) => ipcRenderer.invoke("clear-apps", name),
    captureWindows: () => ipcRenderer.invoke("capture-windows")
});

