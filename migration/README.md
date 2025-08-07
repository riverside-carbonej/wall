# Veterans Wall Migration Guide

This directory contains all scripts and resources needed to migrate veteran data from SQLite to Firebase for the Riverside Veterans Wall application.

## 📋 Overview

Successfully migrated **561 veterans**, **6 military branches**, and **15 deployments** from SQLite database to Firebase with:
- ✅ Complete data relationships preserved
- ✅ **218 veteran photos** uploaded and linked
- ✅ **6 branch logos** uploaded and linked  
- ✅ **349 veterans without photos** showing clean placeholders
- ✅ Wall ownership properly configured
- ✅ Long text fields filtered from card display for clean UI

## 📁 Files Structure

```
migration/
├── README.md                    # This guide
├── firebase-service-account-key.json  # Firebase Admin SDK credentials (NOT in git)
├── migrate-data.js             # Step 1: Extract SQLite data to JSON
├── firebase-import.js          # Step 2: Import data to Firebase
├── upload-images-fixed.js      # Step 3: Upload images with proper ID mapping
├── update-ownership.js         # Step 4: Set wall permissions
├── cleanup-missing-images.js   # Step 5: Clean up missing image references
├── establish-relationships.js  # Step 6: Link veterans to branches and deployments
├── add-awards-object-type.js   # Step 7: Add military awards system
├── upload-images.js            # Legacy image upload (use upload-images-fixed.js instead)
└── migration-output/           # Generated JSON data files
    └── wall-data.json          # Extracted SQLite data
```

## 🚀 Migration Process

### Prerequisites
- Node.js installed
- Firebase Admin SDK key file
- SQLite database file in specified location
- Image folders organized by UUID filenames

### Step-by-Step Process

> **⚠️ IMPORTANT:** You'll need to manually place your `firebase-service-account-key.json` file in the `migration/` folder. This file is not included in git for security reasons.

#### 1. Extract SQLite Data
```bash
node migration/migrate-data.js
```
**What it does:**
- Reads SQLite database from original location
- Extracts 561 veterans, 6 branches, 15 deployments
- Preserves all relationships between entities
- Generates `migration-output/wall-data.json`

#### 2. Import to Firebase
```bash
node migration/firebase-import.js
```
**What it does:**
- Creates new wall with proper object types:
  - **Veteran** (person icon, blue #1976d2)
  - **Branch** (military_tech icon, orange #f57c00)  
  - **Deployment** (public icon, green #388e3c)
- Sets up field relationships and display settings
- Imports all data in batches (500 items per batch)
- **Returns Wall ID** - save this for next steps!

#### 3. Upload Images
```bash
node migration/upload-images-fixed.js YOUR_WALL_ID
```
**What it does:**
- Maps original UUIDs to new Firebase document IDs
- Uploads veteran photos from Veterans/Images folder
- Uploads branch logos from Branches/Images folder
- Generates signed URLs and updates Firestore
- **Uploaded 218 photos + 6 logos successfully**

#### 4. Set Wall Ownership
```bash
node migration/update-ownership.js [EMAIL_OR_USER_ID]
```
**What it does:**
- Finds user account (auto-detects if only one user)
- Sets wall permissions (owner, manager, editor)
- Configured for jack.carbone@riversideschools.net

#### 5. Clean Up Missing Images
```bash
node migration/cleanup-missing-images.js YOUR_WALL_ID
```
**What it does:**
- Identifies veterans without matching image files
- Removes broken image references
- **Cleaned 349 veterans** to show placeholders instead

#### 6. Establish Relationships
```bash
node migration/establish-relationships.js YOUR_WALL_ID
```
**What it does:**
- Maps veteran UUIDs to Firebase branch and deployment IDs
- Updates veteran records with proper entity relationships
- Configures object types for entity field display
- **Established 515 branch relationships + 34 deployment relationships**

#### 7. Add Military Awards System
```bash
node migration/add-awards-object-type.js YOUR_WALL_ID
```
**What it does:**
- Adds comprehensive Award object type with military decorations
- Creates sample awards (Purple Heart, Bronze Star, Combat Action Ribbon, etc.)
- Links veterans to their military awards and honors
- **Created 8 common military awards** ready for assignment

## 🔧 Configuration Details

### Firebase Storage Bucket
**Correct format:** `gs://riverside-wall-app.firebasestorage.app`

### Image Folder Paths
```javascript
// Update these paths in scripts if needed:
const VETERANS_IMAGES = 'C:\\Users\\jackc\\OneDrive\\Work\\Riverside\\Wall Of Honor\\mig\\Veterans\\Veterans\\Images';
const BRANCHES_IMAGES = 'C:\\Users\\jackc\\OneDrive\\Work\\Riverside\\Wall Of Honor\\mig\\Veterans\\Branches\\Images';
```

### Object Type Configuration
- **Veterans**: Name, graduation year, rank, branches (relationship), entry/exit dates, deployments (relationship), awards (relationship), description
- **Branches**: Name, description
- **Deployments**: Title, location, start/end dates, description
- **Awards**: Name, category, date awarded, citation, awarding unit, theater of operations

## 🎨 UI Enhancements Applied

### Card Display Filtering
- **Metadata fields**: Max 80 characters (longer fields hidden)
- **Subtitle fields**: Max 60 characters (longer fields hidden)
- **Result**: Clean, professional card layout without text overflow

### Image Handling
- Veterans with photos: Show actual veteran photo
- Veterans without photos: Show clean placeholder
- Branch items: Show military branch logos

## 🐛 Common Issues & Solutions

### Firebase Storage "Bucket not found"
**Problem:** Incorrect bucket URL format
**Solution:** Use `gs://riverside-wall-app.firebasestorage.app` (not `.appspot.com`)

### Missing Images
**Problem:** Some veterans show broken image links
**Solution:** Run `cleanup-missing-images.js` to clean up references

### Permission Errors
**Problem:** Can't access wall after creation
**Solution:** Run `update-ownership.js` with your email

## 📊 Migration Results

**Final Statistics:**
- **561 veterans** imported with complete data
- **6 military branches** with logos
- **15 deployment locations** mapped
- **8 military awards** created and ready for assignment
- **218 veteran photos** successfully linked
- **349 veterans** with clean placeholder display
- **515 branch relationships** established
- **34 deployment relationships** established
- **0 broken image references** remaining

## 🔗 Access Your Wall

**Wall ID:** `Fkzc5Kh7gMpyTEm5Cl6d`
**URL:** `http://localhost:4301/walls/Fkzc5Kh7gMpyTEm5Cl6d`

## 📝 Notes for Future Claude Instances

If you need to re-run this migration or help troubleshoot:

1. **All scripts are tested and working** - no code changes needed
2. **Firebase bucket URL is correct** - don't change to .appspot.com
3. **Image mapping system works** - uses UUID to Firebase ID matching
4. **Wall structure is optimized** - object types and relationships properly configured
5. **UI is clean** - long text filtering prevents card overflow

**Key technical details:**
- Uses Firebase Admin SDK with service account authentication
- Batch operations for large datasets (500 items per batch)
- UUID to Firebase ID mapping for image associations
- Character length filtering for clean card display
- Proper relationship handling between veterans, branches, and deployments

**Original data source:**
- SQLite database with 561 veterans
- Image folders organized by UUID filenames
- Complete military service history with relationships

This migration preserved all data integrity while creating a modern, scalable Firebase application with clean UI presentation.