const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'out', 'make', 'squirrel.windows', 'x64');
const rootDir = path.join(__dirname, '..');
const firstTimeDir = path.join(rootDir, 'Offline-Time-Tracker-dist', 'First-Time-Install');
const updateFolderDir = path.join(rootDir, 'Offline-Time-Tracker-dist', 'Update-Folder');

if (fs.existsSync(sourceDir)) {
    try {
        // Remove old dist folder if exists
        const oldDist = path.join(rootDir, 'dist');
        if (fs.existsSync(oldDist)) {
            fs.rmSync(oldDist, { recursive: true, force: true });
        }

        // Create dist structure
        fs.mkdirSync(firstTimeDir, { recursive: true });
        fs.mkdirSync(updateFolderDir, { recursive: true });

        // Copy files to both locations
        fs.cpSync(sourceDir, firstTimeDir, { recursive: true });
        fs.cpSync(sourceDir, updateFolderDir, { recursive: true });

        console.log(`\n✅ Build Artifacts Prepared Successfully!`);
        console.log(`📁 First-Time Install Folder: ${firstTimeDir}`);
        console.log(`📁 Update Folder (for LAN Share): ${updateFolderDir}\n`);
    } catch (err) {
        console.error(`\n❌ Failed to prepare build folders:`, err);
    }
} else {
    console.error(`\n❌ Error: Could not find x64 folder at ${sourceDir}`);
    console.error('Make sure "npm run make" completed successfully.\n');
}
