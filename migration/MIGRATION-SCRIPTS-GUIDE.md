# Migration Scripts Organization Guide

## Directory Structure

All migration scripts are organized by feature and execution order:

```
migration/
├── 01-initial-import/       # Initial data import from SQLite
├── 02-data-extraction/       # Data extraction and backup scripts  
├── 03-data-quality/          # Data cleaning and quality fixes
├── 04-image-management/      # Image upload and management
├── 05-relationships/         # Entity relationships setup
├── 06-utilities/             # Helper utilities and analysis tools
```

## Script Execution Order

### Phase 1: Initial Import (01-initial-import)
1. `migrate-data.js` - Extract data from SQLite to JSON
2. `firebase-import.js` - Import data to Firebase with object types

### Phase 2: Data Extraction & Backup (02-data-extraction)
1. `backup-firebase-wall.js` - Create backups of Firebase data
2. `export-all-live-data.js` - Export current Firebase data to JSON
3. `export-veterans-csv-from-backup.js` - Generate human-readable CSV

### Phase 3: Data Quality (03-data-quality)
1. `analyze-data-quality.js` - Scan for formatting issues
2. `fix-veteran-formatting.js` - Fix name/rank formatting issues
3. `scan-all-veterans.js` - Comprehensive data validation

### Phase 4: Image Management (04-image-management)
1. `upload-images-fixed.js` - Upload veteran and branch images
2. `cleanup-missing-images.js` - Remove broken image references
3. `find-orphan-images.js` - Find images without veterans

### Phase 5: Relationships (05-relationships)
1. `establish-relationships.js` - Link veterans to branches/deployments
2. `add-awards-object-type.js` - Add military awards system
3. `fix-deployment-coordinates.js` - Add location data

### Phase 6: Utilities (06-utilities)
1. `list-walls.js` - List all walls in database
2. `find-wall-with-veterans.js` - Find populated walls
3. `update-ownership.js` - Set wall permissions

## Current Scripts to Move

### Already Organized:
- ✅ `03-data-quality/fix-veteran-formatting.js`

### To Be Moved:
- `migrate-data.js` → `01-initial-import/`
- `firebase-import.js` → `01-initial-import/`
- `backup-firebase-wall.js` → `02-data-extraction/`
- `export-all-live-data.js` → `02-data-extraction/`
- `export-veterans-csv-from-backup.js` → `02-data-extraction/`
- `analyze-data-quality.js` → `03-data-quality/`
- `scan-all-veterans.js` → `03-data-quality/`
- `upload-images-fixed.js` → `04-image-management/`
- `cleanup-missing-images.js` → `04-image-management/`
- `establish-relationships.js` → `05-relationships/`
- `add-awards-object-type.js` → `05-relationships/`
- `list-walls.js` → `06-utilities/`
- `update-ownership.js` → `06-utilities/`

## Data Quality Issues Found

### Veterans with Formatting Issues (7 total):
1. **"israel Turkey"** - Quotes in name, should be proper name
2. **"laurence ""larry""" Harley** - Nested quotes issue  
3. **Georgia Young (formerly Ash)** - "formerly" should be removed
4. **Greg (gregory) Script Blank ON Quesion** - Needs simplification
5. **Jane Hemming Now Carsten** - Should use maiden name format
6. **Richard Potter** - Double space in rank "E-5  02E"
7. **William Shay. 3rd** - Should be "William Shay III"

## Next Steps

1. Run `03-data-quality/fix-veteran-formatting.js` to fix the 7 issues
2. Move existing scripts to organized directories
3. Re-export cleaned data to CSV
4. Create final backup with all fixes applied