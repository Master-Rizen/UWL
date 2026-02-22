const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

function launchApps(apps) {

    apps.forEach(app => {

        const exePath = app.exePath;
        const processName = app.processName.toLowerCase();

        // 🔥 Launch Logic

        // Chrome & Edge → always allow new window
        if (processName === "chrome" || processName === "msedge") {
            if (exePath) exec(`"${exePath}"`);
        }

        // Explorer → always open new window
        else if (processName === "explorer") {
            exec("explorer.exe");
        }

        // UWP apps
        else if (exePath && exePath.includes("WindowsApps")) {

            exec(
                `powershell -Command "Get-StartApps | Where-Object { $_.Name -like '*${app.processName}*' } | Select -ExpandProperty AppID"`,
                (err, stdout) => {

                    if (stdout && stdout.trim() !== "") {
                        const appId = stdout.trim();
                        exec(`explorer.exe shell:AppsFolder\\${appId}`);
                    }
                }
            );
        }

        // Normal desktop apps
        else {
            if (exePath) {
                exec(`"${exePath}"`);
            } else {
                exec(`start ${processName}`);
            }
        }

        const fs = require("fs");
        const path = require("path");
        const os = require("os");

        setTimeout(() => {

            const tempPath = path.join(os.tmpdir(), `uwl_move_${processName}.ps1`);

            const moveScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
}
"@

Get-Process ${processName} -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
    [WinAPI]::MoveWindow($_.MainWindowHandle, ${app.x}, ${app.y}, ${app.width}, ${app.height}, $true)
}
`;

            fs.writeFileSync(tempPath, moveScript);

            exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`);

        }, 4000);

    });

    return { success: true };
}

module.exports = { launchApps };