# Offline-Time-Tracker

**Offline-Time-Tracker** is a standalone desktop application for tracking work hours, client projects, and task logs. The application runs completely offline without external cloud dependencies or internet access.

---

## Architecture and Design Decisions

The application uses an Electron multi-process architecture designed for stability, security, and offline resilience:

```
┌────────────────────────────────────────────────────────┐
│                   Electron Main Process                │
│ (src/main.js, scripts/env-loader.js)                   │
│ - Window Lifecycle & Single Instance Control           │
│ - Power Monitor (Heartbeat, Sleep & Shutdown Events)   │
│ - Atomic File System Operations & Local Disk Backups   │
│ - LAN Network Sync & Auto-Updater Server Configuration │
└──────────────────────────┬─────────────────────────────┘
                           │ IPC Bridge (src/preload.js)
┌──────────────────────────┴─────────────────────────────┐
│                 Chromium Renderer Process              │
│ (src/index.html, src/js/renderer.js, src/css/styles.css)│
│ - Live Timer State Machine & Keyboard Shortcuts        │
│ - Client-Project Coupling & Dynamic Input Suggestions   │
│ - Local Date Calculations & Change Detection Flag      │
│ - Floating Mini-Mode Widget & Onboarding Tutorial      │
└────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Two-Tier File Persistence:**
   - The application saves logs in browser `localStorage`.
   - On every session stop, the main process writes a backup file to `%APPDATA%\offline-time-tracker\AutoExports\`.
   - The application then writes to the designated LAN network folder.
   - If the network disconnects, the local backup protects against data loss.

2. **Atomic Network File Operations:**
   - Over network drives (LAN/SMB), the application writes to a temporary file (`.tmp`) first.
   - The application verifies file size before replacing the destination file.
   - This design prevents file truncation or corruption if network connectivity drops.

3. **Collision-Proof Multi-PC File Naming:**
   - Timesheet filenames combine the user name, machine hostname, and local calendar date:
     ```text
     Daily_Timesheet_<Username>_<ComputerName>_<YYYY-MM-DD>.csv
     ```
   - Multiple computers can export to the same shared folder without file collisions.

4. **Offline Synchronization:**
   - When a computer reconnects to the office network, the main process automatically copies any pending local backup files to the shared folder.

5. **Power Drop and Crash Protection:**
   - A 5-second active heartbeat monitors timer sessions.
   - If a computer shuts down abruptly, the application recovers the session on the next launch and saves the elapsed time.

---

## Key Features

- **Client and Project Coupling:** Project suggestions filter automatically based on the selected client.
- **Mandatory User Identification:** Prompts for a user name or defaults to the Windows login name.
- **Configurable Workday Deadline:** Restricts closing before your daily deadline (default 6:00 PM).
- **Floating Mini-Mode:** Compact widget (`260px × 56px`) stays on top of full-screen software during design work.
- **Collision-Proof Auto-Export:** Automatically exports daily CSV timesheets to a local or LAN folder.
- **Interactive Tutorial Tour:** Guided walkthrough introduces controls on first launch.
- **Keyboard Shortcuts:**
  - `Ctrl + Alt + S`: Start or Pause timer.
  - `Ctrl + Alt + M`: Toggle Mini-Mode.

---

## Setup and Configuration

### Environment Configuration

Configure environment variables in a `.env` file in the root folder. Use `.env.example` as a template:

```bash
cp .env.example .env
```

Set your values in `.env`:

```env
# LAN Server deployment folder for application auto-updates
DEPLOY_SERVER_PATH=\\YOUR_SERVER\path\Offline-Time-Tracker-dist

# Default shared folder for automated daily timesheets
DEFAULT_EXPORT_FOLDER=\\YOUR_SERVER\path\TimeLog
```

> **Note:** The `.env` file is excluded from Git to keep private network addresses secure.

---

## How to Use the Application

1. **Launch the Application:**
   - On startup, the application opens in full-screen mode.
   - Enter your name in the **Your Name** field if not filled automatically.

2. **Track a Task:**
   - Select or enter a **Client Name**.
   - Select or enter a **Project Name**.
   - Select the **Task** type from the dropdown.
   - Click the **Start** (`▶`) button or press `Ctrl + Alt + S`.

3. **Use Mini Mode:**
   - Click the minimize (`-`) button or press `Ctrl + Alt + M`.
   - The application shrinks to a floating widget on your screen.
   - Click the restore (`⤢`) button or stop the timer to return to full window.

4. **Auto-Export Timesheets:**
   - The application reads the default export folder from `.env`.
   - To select a custom folder, click the **Auto-Export** button on the top bar.
   - Timesheets export automatically when you stop sessions, edit entries, or close the app.
   - **Advanced Settings → Export CSV** writes the full timesheet to the configured export folder and keeps a local backup. If the network share is unavailable, the UI reports the failure and the backup location.
   - To reset back to the environment folder, open **Advanced Settings ▾** and click **Reset Export Folder to Server Default**.

5. **Configure Updates:**
   - Click the update status in the header to choose the folder containing the `RELEASES` file and update packages.
   - The selected update folder is saved and used for checks at startup and when **Check Updates** is selected.

6. **End Your Workday:**
   - Click the close button (`X`) after your closing deadline.
   - Confirm the prompt to stop any active session, export today's CSV, and close the application.
   - Alternatively, use the **Shutdown** option in **Advanced Settings ▾** to save and exit immediately.

---

## Development and Building Scripts

### 1. Install Dependencies
```powershell
npm install
```

### 2. Run in Development Mode
```powershell
npm start
```
Starts the application locally with live developer logging.

### 3. Build Windows Distribution Installers
```powershell
npm run make
```
Generates production Squirrel installers and binaries in the `Offline-Time-Tracker-dist/` folder:
- `Offline-Time-Tracker-<version> Setup.exe` (Standalone Installer)
- `Offline_Time_Tracker-<version>-full.nupkg` (Update Package)
- `RELEASES` (Release Manifest)

### 4. Verify LAN Readiness
```powershell
npm run check-env
```
Validates the build artifacts and confirms that the update server path is accessible.

### 5. Deploy to LAN Server
```powershell
npm run deploy
```
Copies release files from `Offline-Time-Tracker-dist/` to the configured `DEPLOY_SERVER_PATH`.

### 6. Publish Release Tag
```powershell
npm run publish
```
Creates a new version tag and triggers the GitHub release build workflow.

---

## License

[CC BY-NC-SA 4.0](LICENSE) (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International)

Copyright (c) 2026 Keshava Narayan / Spacio Techtonics.  
- Free for Personal and Non-Commercial Use.  
- Commercial distribution or sale requires explicit permission.


## Changelog

### v2.1.1 (2026-10-30)
- feat: enhance CSV export functionality and update check process (74fbcb7)
- feat: add renderer, state, main, and preload modules for the offline time tracker application (03bd588)
- feat: initialize offline time tracker electron application structure and UI (d7ca6df)
- feat: update timesheet export logic (8cd5a5c)
- refactor: reorganize project structure by moving core files into a src directory (66ac2f3)
- feat: add mandatory username validation, implement advanced log deletion management, and remove individual delete actions from the table (1646440)
