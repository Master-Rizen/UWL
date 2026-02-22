let currentWorkspace = null;
let startTime = null;

function startTracking(workspaceName) {
    currentWorkspace = workspaceName;
    startTime = Date.now();
}

function stopTracking(workspaceManager) {
    if (!currentWorkspace || !startTime) return;

    const duration = Math.floor((Date.now() - startTime) / 1000);

    const data = workspaceManager.getWorkspaces();

    if (data[currentWorkspace]) {
        data[currentWorkspace].timeLogged += duration;
        workspaceManager._writeDirect(data);
    }

    currentWorkspace = null;
    startTime = null;
}

module.exports = { startTracking, stopTracking };