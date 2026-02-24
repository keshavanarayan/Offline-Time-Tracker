const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const readmePath = path.join(__dirname, '..', 'README.md');

let currentTag = '';
try {
    currentTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
} catch (err) {
    currentTag = 'None';
}

console.log('=========================================');
console.log('🚀 Preparing GitHub release');
console.log('=========================================\n');

rl.question(`Current version tag is ${currentTag}. What should the new tag be? (e.g. v1.0.1): `, (answer) => {
    let version = answer.trim();
    if (!version) {
        console.error('\n❌ No version tag provided. Exiting.');
        rl.close();
        process.exit(1);
    }

    if (!version.startsWith('v')) {
        version = `v${version}`;
    }

    console.log(`\n🚀 Proceeding with version ${version}...\n`);

    try {
        let packageJson = require(packageJsonPath);
        packageJson.version = version.replace(/^v/, '');
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log('📄 Updated package.json version.');

        let changelog = '';
        console.log('📝 Generating changelog...');

        let previousTag = currentTag !== 'None' ? currentTag : '';
        const logCommand = previousTag
            ? `git log ${previousTag}..HEAD --pretty=format:"- %s (%h)"`
            : `git log --pretty=format:"- %s (%h)"`;

        try {
            changelog = execSync(logCommand, { encoding: 'utf8' }).trim();
        } catch (err) {
            console.error('Failed to generate changelog:', err);
        }

        if (changelog) {
            console.log(`\nChangelog generated:\n${changelog}\n`);

            console.log('📄 Updating README.md with changelog...');
            let readmeContent = fs.readFileSync(readmePath, 'utf8');

            const changelogHeader = `\n## Changelog\n\n### ${version} (${new Date().toISOString().split('T')[0]})\n`;

            if (readmeContent.includes('## Changelog')) {
                readmeContent = readmeContent.replace('## Changelog\n', `## Changelog\n\n### ${version} (${new Date().toISOString().split('T')[0]})\n${changelog}\n`);
            } else {
                readmeContent += `\n${changelogHeader}${changelog}\n`;
            }

            fs.writeFileSync(readmePath, readmeContent);
            console.log('✅ README.md updated successfully.');

            console.log('\nCommitting version bumps and changelog...');
            execSync('git add README.md package.json', { stdio: 'inherit' });
            try {
                execSync(`git commit -m "docs: Update changelog and bump version to ${version}"`, { stdio: 'inherit' });
            } catch (err) {
                console.log('No changes to commit.');
            }
        } else {
            console.log('\nNo new commits found for the changelog.');
            console.log('Committing package.json update...');
            execSync('git add package.json', { stdio: 'inherit' });
            try {
                execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
            } catch (err) {
                console.log('No changes to commit.');
            }
        }

        console.log('\nPushing current branch to GitHub...');
        try {
            execSync('git push origin HEAD', { stdio: 'inherit' });
        } catch (e) {
            console.log('Failed to push current branch. You may need to pull first or set upstream.');
        }

        console.log(`\nCreating git tag: ${version}`);
        try {
            execSync(`git tag ${version}`, { stdio: 'inherit' });
        } catch (err) {
            console.log(`Note: Tag ${version} already exists locally. Proceeding to push it...`);
        }

        console.log(`\nPushing tag ${version} to GitHub...`);
        execSync(`git push origin ${version}`, { stdio: 'inherit' });

        console.log('\n✅ Successfully triggered the GitHub Actions workflow!');
        console.log('Go to https://github.com/keshavanarayan/Offline-Time-Tracker/actions to watch the build progress.');
        console.log('Once completed, your .exe file will be available at:');
        console.log('https://github.com/keshavanarayan/Offline-Time-Tracker/releases\n');

    } catch (error) {
        console.error('\n❌ Failed to publish release:', error.message);
        console.error('Make sure you have committed your changes before publishing.');
        process.exitCode = 1;
    } finally {
        rl.close();
    }
});
