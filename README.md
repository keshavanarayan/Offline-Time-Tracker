# KGATracker

**KGATracker** is an offline time tracker built as a standalone desktop application using Electron. 

## Features
- **Offline Time Tracking:** Keep track of your time without needing an internet connection.
- **Auto-Export to CSV:** Automatically exports your tracked time to CSV files for easy integration with spreadsheet software.
- **Run on Startup:** Optionally configured to automatically run as soon as your computer is switched on.
- **Installable Desktop App:** Bundled as a standard Windows executable (`.exe`) for easy installation.

## Installation
You can build the installer from the source code.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the Windows installer:
   ```bash
   npm run make
   ```

3. Once the build finishes, you can find the `Setup.exe` file inside:
   `out/make/squirrel.windows/x64/`

Simply double-click the setup file to install the application on your computer.

## Development

To run the application locally in development mode:
```bash
npm start
```

## Technologies Used
- HTML/CSS/JavaScript
- [Electron](https://www.electronjs.org/)
- [Electron Forge](https://www.electronforge.io/)

## Release

This project is configured to automatically build and release the Windows executable (`.exe`) using GitHub Actions.

To publish a new release:

1. Commit your changes.
2. Tag the commit with the new version (e.g., `v1.0.1`):
   ```bash
   git tag v1.0.1
   ```
3. Push the tag to GitHub:
   ```bash
   git push origin v1.0.1
   ```

A GitHub Action will automatically build the application and create a draft release on the GitHub Releases page with the executable attached.

## License
ISC


## Changelog

### v1.0.0 (2026-02-24)
- Update publish script to auto-generate changelog in README (11163f7)
- Add GitHub release publish script and workflow (252c70b)
- initial commit (0b52a09)
- Initial commit (bff7ad3)
