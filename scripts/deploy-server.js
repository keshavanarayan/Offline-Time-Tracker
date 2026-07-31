const fs = require('fs');
const path = require('path');
const readline = require('readline');

const serverTargetBaseDir = process.env.DEPLOY_SERVER_PATH;
const rootDir = path.join(__dirname, '..');
const localDistDir = path.join(rootDir, 'Offline-Time-Tracker-dist');

if (!serverTargetBaseDir) {
  console.error('\n❌ Error: DEPLOY_SERVER_PATH environment variable is not defined.');
  process.exit(1);
}

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
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);

  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      await copyDirectoryWithProgress(srcFile, destFile, `${targetName}/${file}`);
    } else {
      await copyFileWithProgress(srcFile, destFile, `${targetName} -> ${file}`);
    }
  }
}

async function deployToServer() {
  if (!fs.existsSync(localDistDir)) {
    console.error(`\n❌ Error: Distribution folder not found at ${localDistDir}`);
    console.error('Make sure "npm run make" completed successfully.\n');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n🌐 Do you want to deploy release packages to LAN Server (${serverTargetBaseDir})? (y/N): `, async (answer) => {
    rl.close();
    const confirmed = answer.trim().toLowerCase();

    if (confirmed === 'y' || confirmed === 'yes') {
      console.log(`\n🚀 Deploying release packages to ${serverTargetBaseDir}...`);

      try {
        await copyDirectoryWithProgress(localDistDir, serverTargetBaseDir, 'Server Deploy');
        console.log(`\n✅ Successfully deployed packages to ${serverTargetBaseDir}!\n`);
      } catch (err) {
        console.error(`\n❌ Failed to deploy updates to server:`, err.message);
      }
    } else {
      console.log('\n⏭️  Skipped server deployment.\n');
    }
  });
}

deployToServer();
