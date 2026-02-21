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

loadWorkspaces();