const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const version = `v${packageJson.version}`;
const readmePath = path.join(__dirname, '..', 'README.md');

try {
    console.log('=========================================');
    console.log(`🚀 Preparing GitHub release for version ${version}`);
    console.log('=========================================\n');

    // Find the previous tag to generate a changelog
    let previousTag = '';
    try {
        previousTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch (err) {
        console.log('No previous tags found. Changelog will contain all commits.');
    }

    // Generate the changelog using git log
    let changelog = '';
    console.log('📝 Generating changelog...');
    try {
        const logCommand = previousTag
            ? `git log ${previousTag}..HEAD --pretty=format:"- %s (%h)"`
            : `git log --pretty=format:"- %s (%h)"`;

        changelog = execSync(logCommand, { encoding: 'utf8' }).trim();
    } catch (err) {
        console.error('Failed to generate changelog:', err);
    }

    if (changelog) {
        console.log(`\nChangelog generated:\n${changelog}\n`);

        // Append the changelog to README.md
        console.log('📄 Updating README.md with changelog...');
        let readmeContent = fs.readFileSync(readmePath, 'utf8');

        const changelogHeader = `\n## Changelog\n\n### ${version} (${new Date().toISOString().split('T')[0]})\n`;

        // Check if a Changelog section already exists
        if (readmeContent.includes('## Changelog')) {
            // Insert the new version right under the Changelog header
            readmeContent = readmeContent.replace('## Changelog\n', `## Changelog\n\n### ${version} (${new Date().toISOString().split('T')[0]})\n${changelog}\n`);
        } else {
            // Append a new Changelog section to the end of the file
            readmeContent += `\n${changelogHeader}${changelog}\n`;
        }

        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ README.md updated successfully.');

        // Commit the README.md update
        console.log('\nCommitting README.md changes...');
        execSync('git add README.md', { stdio: 'inherit' });
        try {
            execSync(`git commit -m "docs: Update changelog for ${version}"`, { stdio: 'inherit' });
        } catch (err) {
            console.log('No changes to commit for README.md.');
        }
    } else {
        console.log('\nNo new commits found for the changelog.');
    }

    // First, push any unpushed commits on the current branch
    console.log('\nPushing current branch to GitHub...');
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
