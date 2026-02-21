const { exec } = require("child_process");

let focusInterval = null;

function startFocus(workspaceManager, workspaceName) {

    const data = workspaceManager.getWorkspaces();
    const ws = data[workspaceName];

    if (!ws) return { error: "Workspace not found" };

    const blocked = ws.blockedApps || [];
    console.log("FOCUS STARTED");
    console.log("Blocked list:", blocked);

    focusInterval = setInterval(() => {

        exec('tasklist', (err, stdout) => {
            if (err) return;

            blocked.forEach(proc => {

                const exeName = proc.toLowerCase() + ".exe";

                console.log("Checking:", exeName);

                if (stdout.toLowerCase().includes(exeName)) {
                    console.log("KILLING:", exeName);
                    exec(`taskkill /IM ${exeName} /F`);
                }

            });

        });

    }, 4000);

    return { success: true };
}

function stopFocus() {
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }
    console.log("FOCUS STOPPED");
    return { success: true };
}

module.exports = { startFocus, stopFocus };