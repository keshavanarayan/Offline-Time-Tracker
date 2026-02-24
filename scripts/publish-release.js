const { execSync } = require('child_process');
const packageJson = require('../package.json');

const version = `v${packageJson.version}`;

try {
  console.log('=========================================');
  console.log(`🚀 Preparing GitHub release for version ${version}`);
  console.log('=========================================\n');

  // First, push any unpushed commits on the current branch
  console.log('Pushing current branch to GitHub...');
  execSync('git push origin HEAD', { stdio: 'inherit' });
  
  console.log(`\nCreating git tag: ${version}`);
  try {
    execSync(`git tag ${version}`, { stdio: 'inherit' });
  } catch (err) {
    console.log(`Note: Tag ${version} already exists locally. Proceeding to push it...`);
  }

  console.log(`\nPushing tag ${version} to GitHub...`);
  execSync(`git push origin ${version}`, { stdio: 'inherit' });

  console.log('\n✅ Successfully triggered the GitHub Actions workflow!');
  console.log('Go to https://github.com/keshavanarayan/KGATracker/actions to watch the build progress.');
  console.log('Once completed, your .exe file will be available at:');
  console.log('https://github.com/keshavanarayan/KGATracker/releases\n');
} catch (error) {
  console.error('\n❌ Failed to publish release:', error.message);
  console.error('Make sure you have committed your changes before publishing.');
  process.exit(1);
}
