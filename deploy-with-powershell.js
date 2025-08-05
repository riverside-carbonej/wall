const { spawn } = require('child_process');

console.log('Deploying Firebase Cloud Functions using PowerShell...');

const deploy = spawn('powershell.exe', [
    '-Command', 
    'cd "' + process.cwd() + '"; firebase deploy --only functions'
], {
    stdio: 'inherit'
});

deploy.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ Firebase Cloud Functions deployed successfully!');
    } else {
        console.error(`\n❌ Deployment failed with code ${code}`);
    }
    process.exit(code);
});

deploy.on('error', (err) => {
    console.error('❌ Failed to start deployment:', err);
    process.exit(1);
});