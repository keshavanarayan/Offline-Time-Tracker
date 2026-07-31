const { app, BrowserWindow, ipcMain, dialog, autoUpdater } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { loadEnv } = require('./scripts/env-loader');

loadEnv();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Setup Auto Updater pointing to the LAN shared folder
if (app.isPackaged) {
  const updateFolder = process.env.DEPLOY_SERVER_PATH;

  if (updateFolder) {
    try {
      autoUpdater.setFeedURL({ url: updateFolder });

      autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        const dialogOpts = {
          type: 'info',
          buttons: ['Restart', 'Later'],
          title: 'Application Update',
          message: process.platform === 'win32' ? releaseNotes : releaseName,
          detail: 'A new version has been downloaded. Restart the application to apply the updates.'
        };

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
          if (returnValue.response === 0) autoUpdater.quitAndInstall();
        });
      });

      autoUpdater.on('error', message => {
        console.error('There was a problem updating the application:', message);
      });
    } catch (err) {
      console.error('AutoUpdater setup failed:', err);
    }
  }
}

let mainWindow;
let isShuttingDown = false;
let isQuitting = false;
let isMiniMode = false;
let isMinimizing = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Make window frameless
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // It's important to keep contextIsolation true and nodeIntegration false
      // for security, which is the default in modern Electron.
    }
  });

  mainWindow.loadFile('index.html');

  // Launch app in true fullscreen state to hide taskbar
  mainWindow.setFullScreen(true);

  // Ensure no other fullscreen app can overlay on top of it
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.on('close', (e) => {
    if (isShuttingDown) {
      // System is shutting down, giving renderer a chance to save
      if (!isQuitting) {
        e.preventDefault();
        mainWindow.webContents.send('app-closing');
      }
      return;
    }

    // Normal close button clicked - intercept and check if mini mode is allowed
    if (!isQuitting && !isMiniMode) {
      e.preventDefault();
      // Ask the renderer to verify there are no missing logs
      mainWindow.webContents.send('check-can-mini-mode');
    } else if (!isQuitting) {
      // Already in mini mode, do not allow closing
      e.preventDefault();
    }
  });

  mainWindow.on('minimize', () => {
    isMinimizing = true;
  });

  mainWindow.on('restore', () => {
    isMinimizing = false;
  });

  // Open the DevTools for debugging (optional)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Set the app to open at login
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Check for updates shortly after startup
  if (app.isPackaged) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates();
      } catch (err) {
        console.error('Update check failed:', err);
      }
    }, 5000);
  }
});

app.on('session-end', () => {
  // Windows specific: indicates system is shutting down or user is logging off
  isShuttingDown = true;
  if (mainWindow) {
    mainWindow.webContents.send('app-closing');
  }
});

app.on('before-quit', () => {
  isShuttingDown = true;
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler for shrinking/restoring window
ipcMain.on('restore-window', () => {
  if (mainWindow && isMiniMode) {
    isMiniMode = false;
    mainWindow.setMinimumSize(800, 600); // Restore normal minimums
    mainWindow.setFullScreen(true); // Restore to fullscreen
    mainWindow.setMenuBarVisibility(true);

    // Ensure no other fullscreen app can overlay on top of it
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.webContents.send('toggle-mini-mode', false);
  }
});

// IPC handler from title bar X button -> triggers window close check (mini-mode)
ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC handler from Shutdown button -> requests full application exit
ipcMain.on('request-shutdown', () => {
  if (mainWindow) {
    mainWindow.webContents.send('app-closing');
  }
});

// IPC handler to transition to mini window after renderer validation
ipcMain.on('allow-mini-mode', () => {
  if (mainWindow && !isMiniMode) {
    isMiniMode = true;
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    mainWindow.setMinimumSize(220, 50); // Allow shrinking smaller
    mainWindow.setSize(260, 56);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.webContents.send('toggle-mini-mode', true);
  }
});

// IPC handler to transition to minimize after renderer validation
ipcMain.on('allow-minimize', () => {
  if (mainWindow && !isMinimizing) {
    isMinimizing = true;
    mainWindow.minimize();
  }
});

// IPC handler for finally quitting the app safely
ipcMain.on('quit-app', () => {
  isQuitting = true;
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

// IPC handler to check if update server is accessible
ipcMain.handle('check-update-server', async (event, customFolder) => {
  const updateFolder = customFolder || process.env.DEPLOY_SERVER_PATH;
  if (!updateFolder) return false;
  try {
    // Check if the directory is reachable and readable
    await fs.promises.access(updateFolder, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
});

// IPC handler to open a folder selection dialog for updates
ipcMain.handle('select-update-folder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder for Auto-Updates'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]; // Return the selected folder path
  }
  return null;
});

// Update the autoUpdater URL dynamically if changed by user
ipcMain.on('set-update-url', (event, customFolder) => {
  if (app.isPackaged) {
    try {
      const updateFolder = customFolder || process.env.DEPLOY_SERVER_PATH;
      if (updateFolder) {
        autoUpdater.setFeedURL({ url: updateFolder });
        console.log(`AutoUpdater Feed URL updated to: ${updateFolder}`);
        autoUpdater.checkForUpdates();
      }
    } catch (err) {
      console.error('Failed to set AutoUpdater URL:', err);
    }
  }
});

// IPC handler to manually trigger update check from UI
ipcMain.on('trigger-update-check', () => {
  if (app.isPackaged) {
    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('Manual update check failed:', err);
    }
  }
});

// IPC handler to open a folder selection dialog
ipcMain.handle('select-folder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder for Auto-Export'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]; // Return the selected folder path
  }
  return null;
});

// IPC handler to save the CSV file automatically
ipcMain.handle('save-csv-auto', async (event, data) => {
  const { folderPath, fileName, csvContent } = data;
  if (!folderPath || !fileName || !csvContent) {
    console.error('Invalid auto-export data');
    return false;
  }

  const fullPath = path.join(folderPath, fileName);
  try {
    fs.writeFileSync(fullPath, csvContent, 'utf8');
    console.log('Successfully auto-exported CSV to', fullPath);
    return true;
  } catch (err) {
    console.error('Failed to auto-export CSV:', err);
    return false;
  }
});

// IPC handler to open external URLs securely in default system browser
ipcMain.on('open-url', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    require('electron').shell.openExternal(url);
  }
});
