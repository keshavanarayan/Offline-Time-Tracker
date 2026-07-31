const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./env-loader');

loadEnv();

const deployPath = process.env.DEPLOY_SERVER_PATH;
const rootDir = path.join(__dirname, '..');
const localDistDir = path.join(rootDir, 'Offline-Time-Tracker-dist');

console.log('=========================================');
console.log('🔍 Checking Environment & Deployment Readiness');
console.log('=========================================\n');

if (!deployPath) {
  console.error('❌ DEPLOY_SERVER_PATH is not configured in .env or environment variables.');
  console.error('💡 Please copy .env.example to .env and define DEPLOY_SERVER_PATH.\n');
  process.exit(1);
}

console.log(`📌 Configured DEPLOY_SERVER_PATH: ${deployPath}`);

// 1. Check local build artifacts
let isBuildReady = false;
if (fs.existsSync(localDistDir)) {
  const files = fs.readdirSync(localDistDir);
  const hasExe = files.some(f => f.endsWith('.exe'));
  const hasNupkg = files.some(f => f.endsWith('.nupkg'));
  const hasReleases = files.includes('RELEASES');

  if (hasExe && hasNupkg && hasReleases) {
    isBuildReady = true;
    console.log(`✅ Local build artifacts ready in "${localDistDir}".`);
  } else {
    console.warn(`⚠️ Warning: Local build folder "${localDistDir}" exists, but missing some release files.`);
  }
} else {
  console.warn(`⚠️ Warning: Local build folder "${localDistDir}" not found. Run "npm run make" first.`);
}

// 2. Check LAN server accessibility & write permissions
let isServerReady = false;
try {
  fs.accessSync(deployPath, fs.constants.R_OK | fs.constants.W_OK);
  isServerReady = true;
  console.log(`✅ LAN Server share is reachable and writable!`);
} catch (err) {
  console.error(`❌ Cannot write to LAN Server share at "${deployPath}".`);
  console.error(`💡 Verify network/VPN connection or folder write permissions.\n`);
}

// Overall summary
if (isBuildReady && isServerReady) {
  console.log(`\n🚀 Deployment Ready! You can run "npm run deploy" to release.\n`);
} else {
  console.log(`\n⚠️  Deployment Readiness: Action required before running "npm run deploy".\n`);
}
