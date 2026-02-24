const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // It's important to keep contextIsolation true and nodeIntegration false
      // for security, which is the default in modern Electron.
    }
  });

  mainWindow.loadFile('index.html');

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
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler to open a folder selection dialog
ipcMain.handle('select-folder', async (event) => {
  const result = await dialog.showOpenDialog({
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
