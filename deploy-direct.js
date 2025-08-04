const { execSync } = require('child_process');

console.log('Deploying Firebase Cloud Functions...');

try {
    // Set environment variables to avoid path issues
    process.env.MSYS_NO_PATHCONV = '1';
    
    // Execute the deployment
    const result = execSync('firebase deploy --only functions', {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: 'cmd.exe' // Use Windows cmd instead of bash
    });
    
    console.log('✅ Deployment completed successfully!');
} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}