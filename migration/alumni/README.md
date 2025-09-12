# Riverside Alumni Hall of Fame Migration

This directory contains scripts to migrate Riverside High School Hall of Fame data to the Firebase wall application.

## 🎯 Target Wall
**Wall ID**: `qBcqG1oBN8VnwanOSrLg`
**IMPORTANT**: This script ONLY affects this specific wall and will not touch any other data.

## 📁 Files
- `alumni-data.json` - 162 Hall of Fame members extracted from website
- `wall-context.json` - Organization info and wall context
- `import-to-firebase.js` - Firebase import script (main script)
- `parse-provided-data.js` - Data parsing utility
- `package.json` - Dependencies and scripts

## 🚀 Quick Start

### Prerequisites
1. **Firebase service account key**: Place `firebase-service-account-key.json` in the parent directory (`../firebase-service-account-key.json`)
2. **Node.js** installed
3. **Network access** to Firebase

### Installation
```bash
npm install
```

### Import Data
```bash
npm run import
```

## 📊 Data Overview
- **Total Records**: 162 Hall of Fame members
- **Categories**: 
  - Alumni: 67 members
  - Athletes: 47 members  
  - Faculty & Staff: 47 members
  - Athletic Coaches: 1 member
- **Years**: 1997-2024 induction years

## 🔒 Safety Features
- **Wall-specific**: Only touches wall `qBcqG1oBN8VnwanOSrLg`
- **Verification**: Confirms wall exists before import
- **Batch processing**: Imports in safe 500-item batches
- **Error handling**: Stops on any issues

## 📋 What Gets Imported
Each alumni record becomes a wall item with:
- **Name**: Full name
- **Category**: Alumni, Athlete, Faculty & Staff, or Athletic Coach
- **Induction Year**: Year inducted to Hall of Fame
- **Graduation Year**: (if available)
- **Maiden Name**: (if available)
- **Display formatting**: Proper subtitles and descriptions

## 🔧 Manual Steps After Import
After running the import, you may want to:
1. Check the wall in the app: `http://localhost:4301/walls/qBcqG1oBN8VnwanOSrLg`
2. Verify data looks correct
3. Add any missing photos (manual process)
4. Adjust wall settings if needed

## ⚠️ Important Notes
- This script does NOT modify existing wall items
- It only ADDS new items to the specified wall
- The Firebase service account key file is required but not included in git
- All timestamps use Firebase server time
- Items are marked as `published: true` by default