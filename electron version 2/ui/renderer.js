const listDiv = document.getElementById("workspaceList");
const addBtn = document.getElementById("addBtn");
console.log("API OBJECT:", window.api);

let currentWorkspace = null;

async function loadWorkspaces() {
    const data = await window.api.getWorkspaces();
    listDiv.innerHTML = "";

    Object.keys(data).forEach(name => {
        const div = document.createElement("div");
        div.textContent = name;
        div.className = "workspace-item";

        div.addEventListener("click", () => {
            selectWorkspace(name);
        });

        listDiv.appendChild(div);
    });
}

async function selectWorkspace(name) {
    await window.api.switchWorkspace(name);

    const data = await window.api.getWorkspaces();
    currentWorkspace = name;

    document.querySelectorAll(".workspace-item").forEach(el => {
        el.classList.remove("active");
        if (el.textContent === name) {
            el.classList.add("active");
        }
    });

    const ws = data[name];

    document.getElementById("details").innerHTML = `
        <h2>${name}</h2>
        <p>Apps Stored: ${ws.apps.length}</p>
        <p>Time Logged: ${Math.floor(ws.timeLogged / 60)} mins</p>
        <p>Created: ${new Date(ws.createdAt).toLocaleString()}</p>
    `;
    updateStats();
}

addBtn.addEventListener("click", async () => {
    const name = await showInputDialog("New Workspace");

    if (!name) return;

    const result = await window.api.createWorkspace(name);

    if (result.error) {
        alert(result.error);
        return;
    }

    loadWorkspaces();
});

function showInputDialog(title = "Input", defaultValue = "") {
    return new Promise((resolve) => {
        const modal = document.createElement("div");

        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.6);
                display:flex;
                justify-content:center;
                align-items:center;
                z-index: 9999;
            ">
                <div style="
                    background:#1e293b;
                    padding:20px;
                    border-radius:8px;
                    width:300px;
                ">
                    <h3 style="margin-top:0">${title}</h3>
                    <input id="wsInput" value="${defaultValue}"
                        style="width:100%; padding:8px; margin-bottom:10px;" />
                    <button id="confirmBtn">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = document.getElementById("wsInput");
        const confirmBtn = document.getElementById("confirmBtn");

        // 🔥 Force focus properly
        setTimeout(() => {
            input.focus();
            input.select();
        }, 50);

        // Enter key support
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                confirmBtn.click();
            }
        });

        confirmBtn.onclick = () => {
            const value = input.value.trim();
            document.body.removeChild(modal);
            resolve(value);
        };
    });
}

const captureBtn = document.getElementById("captureBtn");
const windowList = document.getElementById("windowList");

captureBtn.addEventListener("click", async () => {
    console.log("Capture clicked");

    if (!currentWorkspace) {
        alert("Select workspace first");
        return;
    }

    try {
        const windows = await window.api.captureWindows();
        console.log("RAW WINDOWS:", windows);

        windowList.innerHTML = "";

        if (!windows || windows.length === 0) {
            windowList.innerHTML = "<p>No windows detected</p>";
            return;
        }

        windowList.innerHTML = "";

windows.forEach((win, index) => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginBottom = "5px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = index;
    checkbox.checked = true;

    const label = document.createElement("span");
    label.textContent = " " + win.title + " (" + win.processName + ")";

    container.appendChild(checkbox);
    container.appendChild(label);

    windowList.appendChild(container);
});

const saveBtn = document.createElement("button");
saveBtn.textContent = "Save Selected Apps";
saveBtn.style.marginTop = "10px";

saveBtn.addEventListener("click", async () => {
    const selected = [];

    const checkboxes = windowList.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(cb => {
        if (cb.checked) {
            selected.push(windows[cb.value]);
        }
    });

    await window.api.saveApps(currentWorkspace, selected);
    alert("Apps saved to workspace");
    selectWorkspace(currentWorkspace);
});

windowList.appendChild(saveBtn);

    } catch (err) {
        console.error("Capture error:", err);
    }
});

const renameBtn = document.getElementById("renameBtn");
const deleteBtn = document.getElementById("deleteBtn");
const clearAppsBtn = document.getElementById("clearAppsBtn");

renameBtn.addEventListener("click", async () => {
    if (!currentWorkspace) return;

    const newName = await showInputDialog("Rename Workspace", currentWorkspace);
    if (!newName) return;

    const result = await window.api.renameWorkspace(currentWorkspace, newName);

    if (result.error) {
        alert(result.error);
        return;
    }

    currentWorkspace = newName;
    loadWorkspaces();
    selectWorkspace(newName);
});
deleteBtn.addEventListener("click", async () => {
    if (!currentWorkspace) return;

    if (confirm("Delete this workspace?")) {
        await window.api.deleteWorkspace(currentWorkspace);
        currentWorkspace = null;
        loadWorkspaces();
        document.getElementById("details").innerHTML = "";
    }
});

clearAppsBtn.addEventListener("click", async () => {
    if (!currentWorkspace) return;

    await window.api.clearApps(currentWorkspace);
    selectWorkspace(currentWorkspace);
});

const launchBtn = document.getElementById("launchBtn");

launchBtn.addEventListener("click", async () => {
    if (!currentWorkspace) return;

    const result = await window.api.launchWorkspace(currentWorkspace);

    if (result.error) {
        alert(result.error);
        return;
    }

    alert("Workspace launch triggered");
});

async function updateStats() {
    const data = await window.api.getWorkspaces();

    let totalTime = 0;
    let mostUsed = null;
    let maxTime = 0;

    Object.keys(data).forEach(name => {
        const time = data[name].timeLogged || 0;
        totalTime += time;

        if (time > maxTime) {
            maxTime = time;
            mostUsed = name;
        }
    });

    const statsPanel = document.getElementById("statsPanel");

    statsPanel.innerHTML = `
        <p>Total Usage: ${Math.floor(totalTime / 60)} mins</p>
        <p>Most Used Workspace: ${mostUsed || "N/A"}</p>
    `;
}

const focusBtn = document.getElementById("focusBtn");
let focusActive = false;

focusBtn.addEventListener("click", async () => {

    if (!currentWorkspace) return;

    if (!focusActive) {
        const result = await window.api.startFocus(currentWorkspace);
        if (result.error) {
            alert(result.error);
            return;
        }

        focusBtn.textContent = "Stop Focus Mode";
        focusBtn.style.backgroundColor = "#ef4444";
        focusActive = true;

    } else {
        await window.api.stopFocus();
        focusBtn.textContent = "Start Focus Mode";
        focusBtn.style.backgroundColor = "#10b981";
        focusActive = false;
    }
});

const selectBlockedBtn = document.getElementById("selectBlockedBtn");
const blockedAppsList = document.getElementById("blockedAppsList");

selectBlockedBtn.addEventListener("click", async () => {

    if (!currentWorkspace) return;

    const windows = await window.api.captureWindows();
    const data = await window.api.getWorkspaces();
    const ws = data[currentWorkspace];

    blockedAppsList.innerHTML = "";

    windows.forEach(win => {

        const container = document.createElement("div");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = win.processName.toLowerCase();

        if (ws.blockedApps && ws.blockedApps.includes(checkbox.value)) {
            checkbox.checked = true;
        }

        const label = document.createElement("span");
        label.textContent = " " + win.processName;

        container.appendChild(checkbox);
        container.appendChild(label);

        blockedAppsList.appendChild(container);
    });

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Selection";
    saveBtn.style.marginTop = "10px";

    saveBtn.addEventListener("click", async () => {

        const selected = [];

        const checkboxes = blockedAppsList.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => {
            if (cb.checked) {
                selected.push(cb.value);
            }
        });

        await window.api.saveBlockedApps(currentWorkspace, selected);
        alert("Blocked apps updated");
    });

    blockedAppsList.appendChild(saveBtn);
});


updateStats();
loadWorkspaces();