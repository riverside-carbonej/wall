Write-Host "Deploying Firebase Cloud Functions..."
Set-Location -Path $PSScriptRoot
firebase deploy --only functions
Write-Host "Deployment complete!"