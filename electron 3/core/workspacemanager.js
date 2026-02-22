const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, "../data/workspaces.json");

function readData() {
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(dataPath));
}

function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = {
    getWorkspaces() {
        return readData();
    },

    createWorkspace(name) {
        const data = readData();

        if (data[name]) {
            return { error: "Workspace already exists" };
        }

        data[name] = {
            apps: [],
            blockedApps: [],
            notes: "",
            timeLogged: 0,
            createdAt: Date.now()
        };

        writeData(data);
        return { success: true };
    },

    deleteWorkspace(name) {
        const data = readData();
        delete data[name];
        writeData(data);
        return data;
    },

    saveApps(name, apps) {
        const data = readData();
        if (data[name]) {
            data[name].apps = apps;
            writeData(data);
        }
        return data;
    },

    renameWorkspace(oldName, newName) {
        const data = readData();

        if (!data[oldName]) {
            return { error: "Original workspace not found" };
        }

        if (data[newName]) {
            return { error: "A workspace with this name already exists" };
        }

        data[newName] = data[oldName];
        delete data[oldName];

        writeData(data);

        return { success: true };
    },
    clearApps(name) {
        const data = readData();
        if (data[name]) {
            data[name].apps = [];
            writeData(data);
        }
        return data;
    },

    _writeDirect(data) {
        writeData(data);
    },

    saveBlockedApps(name, list) {
    const data = readData();

    if (data[name]) {
        data[name].blockedApps = list;
        writeData(data);
    }

    return { success: true };
},

getLastWorkspace() {
    const data = readData();
    return data._lastWorkspace || null;
},

setLastWorkspace(name) {
    const data = readData();
    data._lastWorkspace = name;
    writeData(data);
}
};