# Offline-Time-Tracker

**Offline-Time-Tracker** is a standalone, 100% offline desktop application built with Electron for tracking work hours, client projects, and task logs without requiring any internet connection or cloud service.

---

## Key Features

- **Studio Hours Aesthetic:** Minimalist black & white architectural design, crisp typography, dark slate top bar, and clean visual hierarchy.
- **100% Offline Independence:** Zero external CDN, Google Fonts, or internet API dependencies. Runs completely offline.
- **Interactive Onboarding Spotlight Tour:** Element-targeted 6-step guided walkthrough highlighting key app controls on first launch or anytime via the `Tutorial` button.
- **Full Screen Startup & Window Rules:** Intentionally launches in full screen on startup to prompt logging. Mini Mode resizing is unlocked once Client, Project, and Task inputs are entered and timing starts.
- **Pause & Resume Tracking:** Start (`▶`), Pause (`⏸`), Resume (`▶`), and Stop (`■`) active timing sessions cleanly.
- **Compact Floating Mini Window:** Resizable mini window widget (`260px × 56px` base, down to `220px × 50px`) that stays on top during work. Automatically expands back to full window mode when stopping a session.
- **Auto-Export to CSV:** Weekly auto-export of timesheets to a user-designated **local folder** or **shared LAN network drive** (`\\SERVER\Shared`).
- **Update Server Folder Integration:** Easily configure a custom local folder or LAN share for auto-updates. Features a visual status badge (Green for Online, Red for Offline).
- **Run on Startup:** Automatically configures itself to launch when Windows starts up.
- **Support & Donations:** Integrated Razorpay payment link support directly via the `Donate` button.

---

## Development & Building

### 1. Run in Development Mode
`npm start` launches the app for live testing.  
> **Note:** `npm start` does **NOT** build or generate the `.exe` file.

```bash
npm start
```

### 2. Build Windows Executable Installer (`.exe`)
To package and generate the standalone Windows installer executable, run:

```bash
npm run make
```

Once the command finishes, your setup installer is output to:
- Root directory: `Offline-Time-Tracker-2.0.0 Setup.exe`
- Forge directory: `out/make/squirrel.windows/x64/`

Double-click the setup file to install the application on any PC.

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
