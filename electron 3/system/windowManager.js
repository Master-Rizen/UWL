const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

function getOpenWindows() {
    return new Promise((resolve) => {

        const tempPath = path.join(os.tmpdir(), "uwl_capture.ps1");

        const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@

Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {

    $rect = New-Object WinAPI+RECT
    [WinAPI]::GetWindowRect($_.MainWindowHandle, [ref]$rect) | Out-Null

    [PSCustomObject]@{
        ProcessName = $_.ProcessName
        Title = $_.MainWindowTitle
        Path = $_.Path
        X = $rect.Left
        Y = $rect.Top
        Width = $rect.Right - $rect.Left
        Height = $rect.Bottom - $rect.Top
    }
} | ConvertTo-Json -Depth 2
`;

        fs.writeFileSync(tempPath, psScript);

        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`,
            (error, stdout) => {

                if (error || !stdout) {
                    resolve([]);
                    return;
                }

                try {
                    const parsed = JSON.parse(stdout);
                    const windows = Array.isArray(parsed) ? parsed : [parsed];

                    const cleaned = windows.map(win => ({
                        processName: win.ProcessName,
                        title: win.Title || win.ProcessName,
                        exePath: win.Path || null,
                        x: win.X,
                        y: win.Y,
                        width: win.Width,
                        height: win.Height
                    }));

                    resolve(cleaned);

                } catch {
                    resolve([]);
                }
            }
        );
    });
}

module.exports = { getOpenWindows };