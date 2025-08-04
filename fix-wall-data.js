// Script to fix wall data inconsistencies
// Run with: node fix-wall-data.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
const serviceAccount = require('./riverside-wall-app-firebase-adminsdk.json'); // You need to download this
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixWallData() {
  console.log('🔧 Starting wall data cleanup...');
  
  try {
    // Get all walls
    const wallsSnapshot = await db.collection('walls').get();
    console.log(`📊 Found ${wallsSnapshot.size} walls to check`);
    
    let fixedCount = 0;
    
    for (const doc of wallsSnapshot.docs) {
      const wallId = doc.id;
      const wallData = doc.data();
      
      console.log(`\n🔍 Checking wall: ${wallId} - "${wallData.name}"`);
      
      let needsUpdate = false;
      const updates = {};
      
      // Remove legacy fields
      if ('isPublic' in wallData) {
        console.log(`  ❌ Removing legacy isPublic: ${wallData.isPublic}`);
        updates['isPublic'] = admin.firestore.FieldValue.delete();
        needsUpdate = true;
      }
      
      if ('ownerId' in wallData) {
        console.log(`  ❌ Removing legacy ownerId: ${wallData.ownerId}`);
        updates['ownerId'] = admin.firestore.FieldValue.delete();
        needsUpdate = true;
      }
      
      if ('sharedWith' in wallData) {
        console.log(`  ❌ Removing legacy sharedWith: ${JSON.stringify(wallData.sharedWith)}`);
        updates['sharedWith'] = admin.firestore.FieldValue.delete();
        needsUpdate = true;
      }
      
      // Fix visibility structure
      if (!wallData.visibility) {
        console.log(`  ✅ Adding missing visibility structure`);
        updates['visibility'] = {
          isPublished: false,
          requiresLogin: true
        };
        needsUpdate = true;
      } else {
        // Check if visibility needs fixing
        const visibility = wallData.visibility;
        if (visibility.isPublished === true && !visibility.publishedAt) {
          console.log(`  🔧 Wall shows as published but has no publishedAt - setting to unpublished`);
          updates['visibility.isPublished'] = false;
          updates['visibility.requiresLogin'] = true;
          needsUpdate = true;
        }
      }
      
      // Ensure permissions structure exists
      if (!wallData.permissions) {
        console.log(`  ⚠️  Missing permissions structure!`);
        // This is more complex - would need to migrate from legacy fields
        console.log(`  🚨 Manual fix needed for wall ${wallId}`);
      }
      
      if (needsUpdate) {
        console.log(`  📝 Updating wall ${wallId}...`);
        updates['updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
        
        await doc.ref.update(updates);
        fixedCount++;
        console.log(`  ✅ Fixed wall ${wallId}`);
      } else {
        console.log(`  👍 Wall ${wallId} looks good`);
      }
    }
    
    console.log(`\n🎉 Cleanup complete! Fixed ${fixedCount} walls.`);
    
  } catch (error) {
    console.error('❌ Error fixing wall data:', error);
  }
  
  process.exit(0);
}

// Run the fix
fixWallData();