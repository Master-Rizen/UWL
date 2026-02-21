const { exec } = require("child_process");

function launchApps(apps) {
    return new Promise((resolve) => {

        apps.forEach(app => {
            const processName = app.processName;

            // Attempt to start app by process name
            exec(`start ${processName}`, (err) => {
                if (err) {
                    console.log("Could not launch:", processName);
                }
            });
        });

        resolve({ success: true });
    });
}

module.exports = { launchApps };