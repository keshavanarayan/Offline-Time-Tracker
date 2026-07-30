const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'out', 'make', 'squirrel.windows', 'x64');
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'Offline-Time-Tracker-dist');
const firstTimeDir = path.join(distDir, 'First-Time-Install');
const updateFolderDir = path.join(distDir, 'Update-Folder');

function copyFileWithProgress(src, dest, label) {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(src);
    const totalBytes = stat.size;
    let copiedBytes = 0;

    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('data', (chunk) => {
      copiedBytes += chunk.length;
      const percent = Math.floor((copiedBytes / totalBytes) * 100);
      const mbCopied = (copiedBytes / (1024 * 1024)).toFixed(1);
      const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);

      const barLen = 25;
      const filledLen = Math.floor((percent / 100) * barLen);
      const bar = '█'.repeat(filledLen) + '-'.repeat(barLen - filledLen);

      process.stdout.write(`\r⏳ ${label}: [${bar}] ${percent}% (${mbCopied}MB / ${mbTotal}MB) `);
    });

    readStream.on('end', () => {
      process.stdout.write('\n');
      resolve();
    });

    readStream.on('error', reject);
    writeStream.on('error', reject);

    readStream.pipe(writeStream);
  });
}

async function copyDirectoryWithProgress(srcDir, destDir, targetName) {
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);

  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      await copyDirectoryWithProgress(srcFile, destFile, targetName);
    } else {
      await copyFileWithProgress(srcFile, destFile, `${targetName} -> ${file}`);
    }
  }
}

async function run() {
  if (!fs.existsSync(sourceDir)) {
    console.error(`\n❌ Error: Could not find x64 folder at ${sourceDir}`);
    console.error('Make sure "npm run make" completed successfully.\n');
    return;
  }

  try {
    console.log(`\n📦 Organizing release packages into Offline-Time-Tracker-dist...\n`);

    // Remove old dist folder if exists
    const oldDist = path.join(rootDir, 'dist');
    if (fs.existsSync(oldDist)) {
      fs.rmSync(oldDist, { recursive: true, force: true });
    }

    await copyDirectoryWithProgress(sourceDir, firstTimeDir, 'First-Time-Install');
    await copyDirectoryWithProgress(sourceDir, updateFolderDir, 'Update-Folder');

    console.log(`\n✅ Build Artifacts Prepared Successfully!`);
    console.log(`📁 First-Time Install Folder: ${firstTimeDir}`);
    console.log(`📁 Update Folder (for LAN Share): ${updateFolderDir}\n`);
  } catch (err) {
    console.error(`\n❌ Failed to prepare build folders:`, err);
  }
}

run();
