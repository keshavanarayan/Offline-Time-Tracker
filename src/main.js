const { app, BrowserWindow, ipcMain, dialog, autoUpdater, powerMonitor } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { loadEnv } = require('../scripts/env-loader');

loadEnv();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Ensure single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Setup Auto Updater pointing to the LAN shared folder
if (app.isPackaged) {
  const updateFolder = process.env.DEPLOY_SERVER_PATH;

  if (updateFolder) {
    try {
      autoUpdater.setFeedURL({ url: updateFolder });
    } catch (err) {
      console.error('AutoUpdater feed setup failed:', err);
    }
  }

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
      // Keep contextIsolation true and nodeIntegration false for security
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

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
}

app.whenReady().then(() => {
  // Set the app to open at login
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });

  createWindow();

  if (powerMonitor) {
    powerMonitor.on('suspend', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-closing');
      }
    });
    powerMonitor.on('lock-screen', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('screen-locked');
      }
    });
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

});

app.on('session-end', () => {
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
    mainWindow.setMinimumSize(800, 600);
    mainWindow.setFullScreen(true);
    mainWindow.setMenuBarVisibility(true);
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
    mainWindow.setMinimumSize(220, 50);
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
    await fs.promises.access(updateFolder, fs.constants.R_OK);
    await fs.promises.access(path.join(updateFolder, 'RELEASES'), fs.constants.R_OK);
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
    return result.filePaths[0];
  }
  return null;
});

// IPC handler to manually trigger update check from UI
ipcMain.on('trigger-update-check', (event, customFolder) => {
  if (app.isPackaged) {
    try {
      const updateFolder = customFolder || process.env.DEPLOY_SERVER_PATH;
      if (updateFolder) {
        autoUpdater.setFeedURL({ url: updateFolder });
        console.log(`AutoUpdater Feed URL updated to: ${updateFolder}`);
      }
      autoUpdater.checkForUpdates();
    } catch (err) {
      console.error('Manual update check failed:', err);
    }
  }
});

// IPC handler to provide machine hostname, Windows user, and environment default export folder
ipcMain.handle('get-system-info', () => {
  let osUsername = '';
  try {
    const userInfo = os.userInfo();
    osUsername = userInfo ? userInfo.username : '';
  } catch (err) {
    console.warn('Could not read os.userInfo:', err.message);
  }

  return {
    hostname: os.hostname() || '',
    osUsername: osUsername || '',
    defaultExportFolder: process.env.DEFAULT_EXPORT_FOLDER || ''
  };
});

// IPC handlers to persist and restore database snapshots on disk
ipcMain.handle('save-logs-snapshot', async (event, logsData) => {
  try {
    const backupPath = path.join(app.getPath('userData'), 'logs_backup.json');
    const tempPath = path.join(app.getPath('userData'), `logs_backup.${Date.now()}.tmp`);
    const content = typeof logsData === 'string' ? logsData : JSON.stringify(logsData, null, 2);
    await fs.promises.writeFile(tempPath, content, 'utf8');
    try {
      await fs.promises.rename(tempPath, backupPath);
    } catch {
      await fs.promises.copyFile(tempPath, backupPath);
      await fs.promises.unlink(tempPath).catch(() => {});
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to save logs snapshot to disk:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-logs-snapshot', async () => {
  try {
    const backupPath = path.join(app.getPath('userData'), 'logs_backup.json');
    if (fs.existsSync(backupPath)) {
      const content = await fs.promises.readFile(backupPath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return null;
  } catch (err) {
    console.error('Failed to load logs snapshot from disk:', err.message);
    return null;
  }
});

// IPC handler to open a folder selection dialog
ipcMain.handle('select-folder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder for Auto-Export'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

async function syncLocalBackupsToNetwork(folderPath, localBackupDir) {
  try {
    const localFiles = await fs.promises.readdir(localBackupDir);
    for (const file of localFiles) {
      if (file.endsWith('.csv')) {
        const localFilePath = path.join(localBackupDir, file);
        const networkFilePath = path.join(folderPath, file);
        try {
          const networkStats = await fs.promises.stat(networkFilePath).catch(() => null);
          const localStats = await fs.promises.stat(localFilePath);
          if (!networkStats || (localStats.mtimeMs > networkStats.mtimeMs && localStats.size > 0)) {
            const tempNetwork = path.join(folderPath, `${file}.${Date.now()}.tmp`);
            await fs.promises.copyFile(localFilePath, tempNetwork);
            try {
              await fs.promises.rename(tempNetwork, networkFilePath);
            } catch {
              await fs.promises.copyFile(tempNetwork, networkFilePath);
              await fs.promises.unlink(tempNetwork).catch(() => {});
            }
            console.log('Synced local backup to network share:', file);
          }
        } catch (copyErr) {
          console.warn(`Could not sync ${file} to network:`, copyErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('Sync local backups failed:', err.message);
  }
}

// IPC handler to save the CSV file automatically and verify completion
ipcMain.handle('save-csv-auto', async (event, data) => {
  const { folderPath, fileName, csvContent } = data;
  if (!fileName || typeof csvContent !== 'string') {
    console.error('Invalid auto-export data');
    return { success: false, error: 'Invalid filename or content.' };
  }

  // 1. Always save a local mirror backup in user data
  let localBackupPath = null;
  let localBackupError = null;
  const localBackupDir = path.join(app.getPath('userData'), 'AutoExports');
  try {
    await fs.promises.mkdir(localBackupDir, { recursive: true });
    const backupPath = path.join(localBackupDir, fileName);
    const localTemp = path.join(localBackupDir, `${fileName}.${Date.now()}.tmp`);
    await fs.promises.writeFile(localTemp, csvContent, 'utf8');
    try {
      await fs.promises.rename(localTemp, backupPath);
    } catch {
      await fs.promises.copyFile(localTemp, backupPath);
      await fs.promises.unlink(localTemp).catch(() => {});
    }
    localBackupPath = backupPath;
  } catch (localErr) {
    console.error('Failed to write local backup export:', localErr);
    localBackupError = localErr.message;
  }

  // 2. If no target folder configured, report error
  if (!folderPath) {
    return { success: false, error: 'Export folder path not specified.', localBackupPath, localBackupError };
  }

  // 3. Asynchronously write to target folder with atomic rename/replace
  const fullPath = path.join(folderPath, fileName);
  const tempPath = path.join(folderPath, `${fileName}.${Date.now()}.tmp`);

  try {
    await fs.promises.writeFile(tempPath, csvContent, 'utf8');
    const stats = await fs.promises.stat(tempPath);
    if (stats.size === 0 && csvContent.length > 0) {
      await fs.promises.unlink(tempPath).catch(() => {});
      return { success: false, error: 'Export file was created but is empty.', localBackupPath };
    }

    try {
      await fs.promises.rename(tempPath, fullPath);
    } catch (renameErr) {
      // Windows SMB network shares can fail rename if fullPath exists
      await fs.promises.copyFile(tempPath, fullPath);
      await fs.promises.unlink(tempPath).catch(() => {});
    }

    console.log('Successfully auto-exported CSV to', fullPath);

    // Sync any pending offline exports in background
    syncLocalBackupsToNetwork(folderPath, localBackupDir).catch(() => {});

    return { success: true, filePath: fullPath, localBackupPath };
  } catch (err) {
    console.error('Failed to auto-export CSV to target folder:', err);
    await fs.promises.unlink(tempPath).catch(() => {});
    return {
      success: false,
      networkError: true,
      error: err.message || 'Write failed',
      localBackupPath,
      localBackupError
    };
  }
});

// IPC handler to open external URLs securely in default system browser
ipcMain.on('open-url', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    require('electron').shell.openExternal(url);
  }
});
