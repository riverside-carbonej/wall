@echo off
echo Deploying Firebase Cloud Functions...
cd /d "%~dp0"
firebase deploy --only functions
echo.
echo Deployment complete!
pause