# Offline-Time-Tracker

**Offline-Time-Tracker** is a standalone, 100% offline desktop application built with Electron for tracking work hours, client projects, and task logs without requiring any internet connection or cloud service.

---

## Key Features

- **Studio Hours Aesthetic:** Minimalist black & white architectural design, crisp typography, dark slate top bar, and clean visual hierarchy.
- **Client-Project Coupling & Dynamic Suggestions:** Project suggestions automatically filter based on the typed/selected Client. Explicit separate creation confirmations for new Clients and new Client-Project combinations.
- **Advanced Settings Dropdown:** Clean gear icon dropdown (`⚙ Advanced Settings ▾`) grouping **Check Updates**, **Tutorial**, **Export CSV**, **Set Deadline Time**, and **Shutdown**.
- **Silent Shutdown Button:** The **Shutdown** button in Advanced Settings saves any active session and exits immediately without popups or prompts.
- **Configurable Closing Deadline & 2-Button Title Bar:** 
  - **`-` (Minimize Button):** Minimizes to floating Mini Mode. Requires Client, Project, Task, AND an active running timer (`▶`).
  - **`X` (Close Button):** Restricts closing before your configured deadline time (configurable via Advanced Settings in 12-hour format; default 6:00 PM). After the deadline, prompts *"Are you going home and is your work complete for today?"* and closes the app on **Yes**.
- **PC Shutdown & Crash Protection:** 5-second active heartbeat system that automatically finalizes and saves active work sessions if the PC shuts down, sleeps, or loses power.
- **100% Offline Independence:** Zero external CDN, Google Fonts, or internet API dependencies. Runs completely offline.
- **Interactive Onboarding Spotlight Tour:** Element-targeted guided walkthrough highlighting key app controls on first launch or via `Advanced Settings → Tutorial`.
- **Full Screen Startup & Window Rules:** Intentionally launches in full screen on startup to prompt logging.
- **Pause & Resume Tracking:** Start (`▶`), Pause (`⏸`), Resume (`▶`), and Stop (`■`) active timing sessions cleanly.
- **Compact Floating Mini Window:** Resizable mini window widget (`260px × 56px` base) that stays on top during work. Automatically expands back to full window when stopping a session.
- **Auto-Export to CSV:** Weekly auto-export of timesheets to a user-designated **local folder** or **shared LAN network drive** (`\\YOUR_SERVER\\common\\TimeLog`).
- **Update Server Folder Integration:** Easily configure a custom local folder or LAN share (`\\\\YOUR_SERVER\\common\\dist`) for auto-updates. Features a visual status badge and manual **Check Updates** trigger.
- **Run on Startup:** Automatically configures itself to launch when Windows starts up.
- **Support & Donations:** Integrated Razorpay payment link support directly via the `Donate` button.

---

## Development & Building

### 1. Run in Development Mode
`npm start` launches the app for live testing.  
> **Note:** `npm start` does **NOT** build or generate installer packages.

```bash
npm start
```

### 2. Build Windows Executable Installers (`.exe`)
To package and generate distribution files locally, run:

```bash
npm run make
```

`forge.config.js` packages generated binaries locally in seconds:
- 📁 **First Time Install:** `Offline-Time-Tracker-dist/First-Time-Install/` (Contains `Setup.exe`, `.nupkg`, and `RELEASES` for new PC installs)
- 📁 **Update Server Folder:** `Offline-Time-Tracker-dist/Update-Folder/` (Contains deployment packages)

### 3. Deploy to LAN Server
To deploy release packages to the shared LAN network folder (`\\\\YOUR_SERVER\\common\\Offline-Time-Tracker-dist`), run:

```bash
npm run deploy
```

---

## Technologies Used
- HTML / CSS / Vanilla JavaScript
- [Electron](https://www.electronjs.org/)
- [Electron Forge](https://www.electronforge.io/)

---

## Release Process

Publishing a version tag automatically builds and drafts a release via GitHub Actions:

```bash
git tag v2.0.0
git push origin v2.0.0
```

---

## License
[CC BY-NC-SA 4.0](LICENSE) (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International)

Copyright (c) 2026 Keshava Narayan / Spacio Techtonics.  
- **Free for Personal & Non-Commercial Use**  
- **Commercial distribution or sale is strictly prohibited without permission.**
