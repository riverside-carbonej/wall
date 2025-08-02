@echo off
echo Deploying Firestore security rules...
echo.
echo Make sure you have Firebase CLI installed and are logged in:
echo   npm install -g firebase-tools
echo   firebase login
echo.
echo Then run: firebase deploy --only firestore:rules
echo.
pause