# Offline-Time-Tracker

**Offline-Time-Tracker** is a standalone, 100% offline desktop application built with Electron for tracking work hours, client projects, and task logs without requiring any internet connection or cloud service.

---

## Key Features

- **Studio Hours Aesthetic:** Minimalist black & white architectural design, crisp typography, dark slate top bar, and clean visual hierarchy.
- **Client-Project Coupling & Dynamic Suggestions:** Project suggestions automatically filter based on the typed/selected Client. Explicit separate creation confirmations for new Clients and new Client-Project combinations.
- **Advanced Settings Dropdown:** Clean gear icon dropdown (`⚙ Advanced Settings ▾`) grouping **Check Updates**, **Tutorial**, **Export CSV**, **Set Deadline Time**, **Delete Entry**, and **Shutdown**.
- **Silent Shutdown Button:** The **Shutdown** button in Advanced Settings saves any active session and exits immediately without popups or prompts.
- **Mandatory Username Enforcement:** Timer tracking and window minimization require entering a user name; the app automatically directs focus to the name input field if left empty.
- **Configurable Closing Deadline & 2-Button Title Bar:** 
  - **`-` (Minimize Button):** Minimizes to floating Mini Mode. Requires Username, Client, Project, Task, AND an active running timer (`▶`).
  - **`X` (Close Button):** Restricts closing before your configured deadline time (configurable via Advanced Settings in 12-hour format; default 6:00 PM). After the deadline, prompts *"Are you going home and is your work complete for today?"* and closes the app on **Yes**.
- **PC Shutdown & Crash Protection:** 5-second active heartbeat system that automatically finalizes and saves active work sessions if the PC shuts down, sleeps, or loses power.
- **100% Offline Independence:** Zero external CDN, Google Fonts, or internet API dependencies. Runs completely offline.
- **Interactive Onboarding Spotlight Tour:** Element-targeted guided walkthrough highlighting key app controls on first launch or via `Advanced Settings → Tutorial`.
- **Full Screen Startup & Window Rules:** Intentionally launches in full screen on startup to prompt logging.
- **Pause & Resume Tracking:** Start (`▶`), Pause (`⏸`), Resume (`▶`), and Stop (`■`) active timing sessions cleanly.
- **Compact Floating Mini Window:** Resizable mini window widget (`260px × 56px` base) that stays on top during work. Automatically expands back to full window when stopping a session.
- **Auto-Export to CSV:** Daily automatic export of timesheets at 6:00 PM to a user-designated **local folder** or **shared LAN network drive**.
- **Update Server Folder Integration:** Easily configure a custom local folder or LAN share for auto-updates. Features a visual status badge and manual **Check Updates** trigger.
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

`forge.config.js` packages all generated binaries directly into:
- 📁 **Distribution Folder:** `Offline-Time-Tracker-dist/` (Contains `Setup.exe`, `.nupkg`, and `RELEASES`)

### 3. Verify Deployment & Environment Readiness
Run the environment pre-check script to verify build artifacts and LAN share accessibility:

```bash
npm run check-env
```

### 4. Deploy to LAN Server
To deploy release packages to a configured shared network folder, run:

```bash
npm run deploy
```

---

## Release Process

Automated tag creation, changelog generation, and GitHub release binary compilation via GitHub Actions:

```bash
npm run publish
```

This interactive command updates `package.json`, generates a changelog in `README.md`, creates and pushes a version tag (e.g. `v2.0.1`), and triggers GitHub Actions to build and attach the `.exe`, `.nupkg`, and `RELEASES` assets to GitHub Releases.

---

## License
[CC BY-NC-SA 4.0](LICENSE) (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International)

Copyright (c) 2026 Keshava Narayan / Spacio Techtonics.  
- **Free for Personal & Non-Commercial Use**  
- **Commercial distribution or sale is strictly prohibited without permission.**


## Changelog

### v2.0.1 (2026-07-31)
- refactor: change auto-export frequency to one minute and transition to daily CSV exports at 6 PM (4337f85)
- docs: update README.md with npm run publish and check-env workflow documentation (1ef38d9)
- feat: add zero-dependency env loader, check-env deployment readiness tool, and update release workflow (cc62588)
- refactor: consolidate server path configuration to single DEPLOY_SERVER_PATH variable (3a98e4e)
- refactor: flatten distribution artifacts into single Offline-Time-Tracker-dist folder (e055215)
- chore: add .env.example template and remove sensitive build log (2bac950)
- feat: add deployment script and parameterize update server path via environment variables (eae40bf)
- feat: implement configurable closing deadlines, silent shutdown, and automated deployment script for LAN servers (9a38af1)
- feat: add configurable daily deadline setting and minimize to mini mode functionality (d95956a)
- feat: add script to organize and copy build artifacts into distribution folders (681a903)
- feat: add script to automate organization of release artifacts into deployment folders (133d881)
- chore: add build and distribution files to electron-forge ignore list (fcd62d6)
- feat: add mandatory shutdown constraints, improved client-project validation, and updated UI controls (8145f5c)
- feat: add advanced settings dropdown with manual update check and build artifact distribution script (897457e)
- feat: add shutdown button and implement heartbeat-based auto-stop for crashed or aborted sessions (ed0f917)
- style: redesign UI with modern Slate color palette and improved typography (eda4136)
- feat: rebrand application title and header to Time Tracker by Spacio Techtonics (4e2daeb)
- feat: Implement auto-update functionality with configurable LAN shared folder source and status display. (82b8535)
