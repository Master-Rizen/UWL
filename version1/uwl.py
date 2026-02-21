import tkinter as tk
from tkinter import ttk, messagebox
import win32gui
import win32con
import win32process
import psutil
import json
import os
import subprocess
import threading
import time

DATA_FILE = "uwl_data.json"

class UWLApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Project UWL - Core Engine v1.1")
        self.root.geometry("800x500")
        self.root.configure(bg="#0f172a")
        
        self.my_pid = os.getpid()
        self.data = self.load_data()
        self.current_workspace = None
        self.focus_active = False
        self.focus_thread = None

        self.setup_ui()
    
    def load_data(self):
        default_data = {"workspaces": {}, "distractions": ["notepad.exe", "calc.exe"]}
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    data = json.load(f)
                    # Ensure all required keys exist, even in old save files
                    if "workspaces" not in data:
                        data["workspaces"] = default_data["workspaces"]
                    if "distractions" not in data:
                        data["distractions"] = default_data["distractions"]
                    return data
            except json.JSONDecodeError:
                # If the file is completely broken/empty, return defaults
                return default_data
        return default_data

    def save_data(self):
        with open(DATA_FILE, "w") as f:
            json.dump(self.data, f, indent=4)

    def setup_ui(self):
        # Sidebar
        sidebar = tk.Frame(self.root, bg="#1e293b", width=200)
        sidebar.pack(side="left", fill="y")
        
        tk.Label(sidebar, text="WORKSPACES", fg="#38bdf8", bg="#1e293b", font=("Arial", 12, "bold")).pack(pady=15)
        
        self.ws_listbox = tk.Listbox(sidebar, bg="#0f172a", fg="white", selectbackground="#38bdf8", borderwidth=0)
        self.ws_listbox.pack(fill="both", expand=True, padx=10, pady=10)
        self.ws_listbox.bind('<<ListboxSelect>>', self.on_workspace_select)
        
        self.new_ws_entry = tk.Entry(sidebar, bg="#334155", fg="white", insertbackground="white")
        self.new_ws_entry.pack(padx=10, pady=5, fill="x")
        tk.Button(sidebar, text="+ Add Workspace", bg="#38bdf8", fg="black", command=self.add_workspace).pack(padx=10, pady=10, fill="x")

        # Main Area
        self.main_area = tk.Frame(self.root, bg="#0f172a")
        self.main_area.pack(side="right", fill="both", expand=True, padx=20, pady=20)
        
        self.ws_title = tk.Label(self.main_area, text="Select a Workspace", fg="white", bg="#0f172a", font=("Arial", 24, "bold"))
        self.ws_title.pack(anchor="w", pady=(0, 20))
        
        # Controls
        controls = tk.Frame(self.main_area, bg="#0f172a")
        controls.pack(fill="x", pady=10)
        
        tk.Button(controls, text="🎯 Selective Capture", bg="#10b981", fg="white", font=("Arial", 12), command=self.open_capture_dialog).pack(side="left", padx=5)
        tk.Button(controls, text="🚀 Launch / Redirect", bg="#3b82f6", fg="white", font=("Arial", 12), command=self.launch_workspace).pack(side="left", padx=5)
        
        self.focus_btn = tk.Button(controls, text="🛡️ Enable Focus Mode", bg="#ef4444", fg="white", font=("Arial", 12), command=self.toggle_focus)
        self.focus_btn.pack(side="right", padx=5)

        # Distractions List
        tk.Label(self.main_area, text="Focus Mode Blacklist (EXEs to kill):", fg="#94a3b8", bg="#0f172a").pack(anchor="w", pady=(20, 5))
        self.blacklist_entry = tk.Entry(self.main_area, bg="#1e293b", fg="white", width=50, insertbackground="white")
        self.blacklist_entry.pack(anchor="w", fill="x")
        self.blacklist_entry.insert(0, ", ".join(self.data.get("distractions", [])))
        tk.Button(self.main_area, text="Save Blacklist", bg="#475569", fg="white", command=self.save_blacklist).pack(anchor="w", pady=5)

        self.refresh_listbox()

    def refresh_listbox(self):
        self.ws_listbox.delete(0, tk.END)
        for ws in self.data["workspaces"]:
            self.ws_listbox.insert(tk.END, ws)

    def add_workspace(self):
        name = self.new_ws_entry.get().strip()
        if name and name not in self.data["workspaces"]:
            self.data["workspaces"][name] = {"apps": []}
            self.save_data()
            self.new_ws_entry.delete(0, tk.END)
            self.refresh_listbox()

    def on_workspace_select(self, event):
        selection = self.ws_listbox.curselection()
        if selection:
            self.current_workspace = self.ws_listbox.get(selection[0])
            self.ws_title.config(text=self.current_workspace)

    def save_blacklist(self):
        raw = self.blacklist_entry.get()
        self.data["distractions"] = [x.strip() for x in raw.split(",") if x.strip()]
        self.save_data()
        messagebox.showinfo("Saved", "Blacklist updated.")

    # --- CORE LOGIC: WINDOW DETECTION ---
    def get_valid_windows(self):
        windows = []
        def enum_cb(hwnd, results):
            if win32gui.IsWindowVisible(hwnd) and win32gui.GetWindowText(hwnd):
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                if pid == self.my_pid: return # Self-exclusion
                
                try:
                    proc = psutil.Process(pid)
                    exe_path = proc.exe()
                    # Filter out basic background/system tasks without strict paths
                    if "WindowsApps" not in exe_path and "System32" not in exe_path:
                        rect = win32gui.GetWindowRect(hwnd)
                        results.append({
                            "hwnd": hwnd,
                            "title": win32gui.GetWindowText(hwnd),
                            "exe": exe_path,
                            "rect": rect
                        })
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass
        
        win32gui.EnumWindows(enum_cb, windows)
        return windows

    # --- CORE LOGIC: SELECTIVE CAPTURE ---
    def open_capture_dialog(self):
        if not self.current_workspace:
            messagebox.showwarning("Error", "Select a workspace first.")
            return

        active_windows = self.get_valid_windows()
        
        dialog = tk.Toplevel(self.root)
        dialog.title("Select Apps to Capture")
        dialog.geometry("500x400")
        dialog.configure(bg="#1e293b")

        tk.Label(dialog, text="Check the apps to save to this workspace:", bg="#1e293b", fg="white").pack(pady=10)

        canvas = tk.Canvas(dialog, bg="#1e293b", highlightthickness=0)
        scrollbar = tk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#1e293b")

        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True, padx=10)
        scrollbar.pack(side="right", fill="y")

        checkboxes = []
        for win in active_windows:
            var = tk.BooleanVar()
            chk = tk.Checkbutton(scrollable_frame, text=f"{win['title'][:40]}... ({os.path.basename(win['exe'])})", 
                                 variable=var, bg="#1e293b", fg="white", selectcolor="#0f172a")
            chk.pack(anchor="w", pady=2)
            checkboxes.append((var, win))

        def save_selection():
            selected_apps = []
            for var, win in checkboxes:
                if var.get():
                    selected_apps.append({"exe": win["exe"], "rect": win["rect"]})
            
            self.data["workspaces"][self.current_workspace]["apps"] = selected_apps
            self.save_data()
            dialog.destroy()
            messagebox.showinfo("Success", f"Captured {len(selected_apps)} apps for {self.current_workspace}.")

        tk.Button(dialog, text="Save Selected", bg="#10b981", fg="white", command=save_selection).pack(pady=10)

# --- CORE LOGIC: SMART REDIRECT, LAUNCH & LAYOUT MANAGER ---
    def launch_workspace(self):
        if not self.current_workspace: return
        apps = self.data["workspaces"][self.current_workspace].get("apps", [])
        
        apps_to_reposition_later = []

        for app in apps:
            exe_path = app["exe"]
            rect = app["rect"]
            exe_name = os.path.basename(exe_path).lower()

            # 1. Check if it's already running
            is_running = False
            target_pid = None
            for proc in psutil.process_iter(['name', 'pid', 'exe']):
                try:
                    # Match by name or exact path
                    if proc.info['name'].lower() == exe_name or (proc.info['exe'] and proc.info['exe'].lower() == exe_path.lower()):
                        is_running = True
                        target_pid = proc.info['pid']
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            if is_running and target_pid:
                # 2A. App is open! Redirect it immediately.
                self._apply_layout(target_pid, rect)
            else:
                # 2B. App is closed! Launch it.
                try:
                    subprocess.Popen(exe_path)
                    # Add to our pending queue so we can position it AFTER it loads
                    apps_to_reposition_later.append((exe_name, exe_path, rect))
                except Exception as e:
                    print(f"Could not launch {exe_path}: {e}")

        # 3. If we launched new apps, start a background thread to position them
        if apps_to_reposition_later:
            threading.Thread(target=self._wait_and_position, args=(apps_to_reposition_later,), daemon=True).start()


    def _apply_layout(self, target_pid, rect):
        """Helper to find the window for a Process ID and teleport it to coordinates."""
        def find_hwnd_for_pid(hwnd, results):
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            if pid == target_pid and win32gui.IsWindowVisible(hwnd) and win32gui.GetWindowText(hwnd):
                results.append(hwnd)
        
        hwnds = []
        win32gui.EnumWindows(find_hwnd_for_pid, hwnds)
        
        if hwnds:
            hwnd = hwnds[0] # Grab the primary visible window
            width = rect[2] - rect[0]
            height = rect[3] - rect[1]
            try:
                # Un-minimize the window, bring to front, and resize/move
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
                win32gui.SetWindowPos(hwnd, win32con.HWND_TOP, rect[0], rect[1], width, height, 0)
            except Exception as e:
                print(f"Error moving window: {e}")


    def _wait_and_position(self, pending_apps):
        """Runs in background: waits for apps to load, then snaps them into place."""
        # Give the OS exactly 3 seconds to fully open the apps and draw the windows
        time.sleep(3) 
        
        for exe_name, exe_path, rect in pending_apps:
            # Re-scan to find the newly generated Process IDs
            for proc in psutil.process_iter(['name', 'pid', 'exe']):
                try:
                    if proc.info['name'].lower() == exe_name or (proc.info['exe'] and proc.info['exe'].lower() == exe_path.lower()):
                        self._apply_layout(proc.info['pid'], rect)
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

    # --- CORE LOGIC: FOCUS MODE ---
    def toggle_focus(self):
        if self.focus_active:
            self.focus_active = False
            self.focus_btn.config(text="🛡️ Enable Focus Mode", bg="#ef4444")
        else:
            self.focus_active = True
            self.focus_btn.config(text="🛑 Disable Focus Mode", bg="#f59e0b")
            self.focus_thread = threading.Thread(target=self.focus_monitor, daemon=True)
            self.focus_thread.start()

    def focus_monitor(self):
        while self.focus_active:
            distractions = [x.lower() for x in self.data.get("distractions", [])]
            for proc in psutil.process_iter(['name', 'pid']):
                try:
                    if proc.info['pid'] == self.my_pid: continue
                    if proc.info['name'].lower() in distractions:
                        proc.terminate()
                        print(f"Focus Mode: Terminated distraction {proc.info['name']}")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            time.sleep(3) # Check every 3 seconds

if __name__ == "__main__":
    root = tk.Tk()
    app = UWLApp(root)
    root.mainloop()