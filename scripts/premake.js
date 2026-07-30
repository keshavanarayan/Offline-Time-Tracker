const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kill lingering app/electron processes on Windows
if (process.platform === 'win32') {
  try {
    execSync('taskkill /F /IM Offline-Time-Tracker.exe /IM electron.exe /T 2>NUL', { stdio: 'ignore' });
  } catch (e) {
    // Ignore if processes were not running
  }
}

// Clean out and resources directories safely
const rootDir = path.join(__dirname, '..');
['out', 'resources'].forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn(`Warning: Could not remove ${dir}: ${e.message}`);
  }
});
