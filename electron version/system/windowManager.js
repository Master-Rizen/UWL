const { exec } = require("child_process");

function getOpenWindows() {
    return new Promise((resolve) => {
        exec(
            'powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne \\"\\"} | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json -Depth 2"',
            (error, stdout, stderr) => {

                if (error) {
                    console.error("PowerShell error:", error);
                    resolve([]);
                    return;
                }

                if (!stdout || stdout.trim() === "") {
                    resolve([]);
                    return;
                }

                try {
                    const parsed = JSON.parse(stdout);

                    const windows = Array.isArray(parsed) ? parsed : [parsed];

                    const cleaned = windows.map(win => ({
                        processName: win.ProcessName,
                        title: win.MainWindowTitle
                    }));

                    resolve(cleaned);

                } catch (err) {
                    console.error("JSON Parse Error:", err);
                    console.log("Raw Output:", stdout);
                    resolve([]);
                }
            }
        );
    });
}

module.exports = { getOpenWindows };