const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

// Electron Forge Maker Squirrel output format: "<name>-<version> Setup.exe"
// Note: If your packager creates a different name, adjust this accordingly
const exeName = `${packageJson.name}-${packageJson.version} Setup.exe`;
const sourcePath = path.join(__dirname, '..', 'out', 'make', 'squirrel.windows', 'x64', exeName);
const destPath = path.join(__dirname, '..', exeName);

if (fs.existsSync(sourcePath)) {
    try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`\n✅ Successfully copied ${exeName} to the project root folder!\n`);
    } catch (err) {
        console.error(`\n❌ Failed to copy ${exeName}:`, err);
    }
} else {
    console.error(`\n❌ Error: Could not find ${exeName} at ${sourcePath}`);
    console.error('Make sure "npm run make" completed successfully.\n');
}
