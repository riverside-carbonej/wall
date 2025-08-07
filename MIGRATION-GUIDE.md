# Veterans Data Migration Guide

This guide will help you migrate your SQLite veteran data (561 veterans, 6 branches, 15 deployments) to your Firebase wall application.

## ✅ What We Found
- **561 Veterans** with graduation years, ranks, service dates, and photos
- **6 Military Branches** with descriptions and logos  
- **15 Deployments** with coordinates, dates, and descriptions
- **Relationships**: 515 veteran-branch links, 34 veteran-deployment links
- **Images**: UUID-named PNG files for veterans and branches

## 🚀 Migration Steps

### Step 1: Install Dependencies
```bash
npm install firebase-admin
```

### Step 2: Download Firebase Service Account Key
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key and save as `firebase-service-account-key.json`
3. Update the Firebase config in `firebase-import.js`:
   ```javascript
   databaseURL: "YOUR_PROJECT_ID.firebaseio.com",
   storageBucket: "YOUR_PROJECT_ID.appspot.com"
   ```

### Step 3: Run the Migration
```bash
# Extract data from SQLite (already done)
node migrate-data.js

# Import to Firebase
node firebase-import.js
```

This will create a new Veterans Wall with all your data and return a Wall ID.

### Step 4: Upload Images
```bash
# Upload images to Firebase Storage
node upload-images.js YOUR_WALL_ID
```

## 📊 Data Mapping

### SQLite → Firebase Wall Structure

**Veterans Table** → **veteran** object type:
- `FirstName + LastName` → `name` field
- `GraduationYear` → `graduationYear` field  
- `Rank` → `rank` field
- `MilitaryEntryDate/ExitDate` → `militaryEntryDate/militaryExitDate` fields
- `Description` → `description` field
- Images: `{UUID}.png` → Firebase Storage URLs

**Branches Table** → **branch** object type:
- `Name` → `name` field
- `Description` → `description` field
- Images: Branch logos uploaded to Firebase Storage

**Deployments Table** → **deployment** object type:
- `Title` → `title` field
- `Description` → `description` field
- `Location` → `location.address` field
- `PositionX/Y` → `location.lat/lng` coordinates
- `StartDate/EndDate` → `startDate/endDate` fields

**Relationships** → Entity field references:
- Veteran-Branch relationships → `branches` entity field
- Veteran-Deployment relationships → `deployments` entity field

## 🎯 Expected Results

After migration, you'll have:

1. **Veterans Wall** with patriotic theme
2. **561 Veteran cards** with photos, service info, and relationships
3. **6 Branch cards** with military logos and descriptions  
4. **15 Deployment cards** with map locations
5. **All relationships preserved** between veterans, branches, and deployments
6. **All images uploaded** to Firebase Storage with proper URLs

## 🔗 Wall Features

Your migrated wall will have:
- ✅ **Mixed item home page** showing all veterans, branches, and deployments
- ✅ **Proper icons** for each object type (person, military_tech, public)
- ✅ **Entity relationships** linking veterans to their branches and deployments
- ✅ **Map integration** showing deployment locations
- ✅ **Search and filter** capabilities
- ✅ **Professional patriotic theme**

## 🛠️ Troubleshooting

**Images not showing?**
- Check that image files exist in the expected paths
- Verify Firebase Storage permissions
- Ensure signed URLs are generated correctly

**Data missing relationships?**
- Check that relationship tables were exported correctly
- Verify entity field configurations in object types

**Performance issues?**
- The migration handles large datasets efficiently
- Images are uploaded with caching headers
- Firestore batches are used for bulk operations

## 📱 Access Your Wall

After migration, access your new Veterans Wall at:
```
http://localhost:4301/walls/YOUR_WALL_ID
```

The wall will be publicly accessible and show all your veteran data with proper relationships and images!