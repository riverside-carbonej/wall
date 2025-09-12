const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixOriginalAlumniWall() {
  try {
    console.log('🔧 FIXING ORIGINAL ALUMNI WALL & CLEANING UP\n');
    
    const originalWallId = 'dzwsujrWYLvznCJElpri'; // Original "New Alumni Wall"
    const testWallId = 'ONCa5lK4iXS5lF27dQEf'; // Test wall to delete
    
    // 1. Delete the test wall
    console.log('1. Deleting test wall...');
    await db.collection('walls').doc(testWallId).delete();
    console.log('   ✅ Test wall deleted');
    
    // 2. Delete items from test wall (both collections to be sure)
    console.log('\n2. Deleting test wall items...');
    const testItemsUnderscore = await db.collection('wall_items').where('wallId', '==', testWallId).get();
    const testItemsHyphen = await db.collection('wall-items').where('wallId', '==', testWallId).get();
    
    console.log(`   Found ${testItemsUnderscore.size} items in wall_items`);
    console.log(`   Found ${testItemsHyphen.size} items in wall-items`);
    
    // Delete in batches
    const batch1 = db.batch();
    testItemsUnderscore.forEach(doc => batch1.delete(doc.ref));
    if (testItemsUnderscore.size > 0) {
      await batch1.commit();
      console.log(`   ✅ Deleted ${testItemsUnderscore.size} items from wall_items`);
    }
    
    const batch2 = db.batch();
    testItemsHyphen.forEach(doc => batch2.delete(doc.ref));
    if (testItemsHyphen.size > 0) {
      await batch2.commit();
      console.log(`   ✅ Deleted ${testItemsHyphen.size} items from wall-items`);
    }
    
    // 3. Move original wall items to correct collection
    console.log('\n3. Fixing original alumni wall items...');
    
    // Check current state
    const originalItemsHyphen = await db.collection('wall-items').where('wallId', '==', originalWallId).get();
    const originalItemsUnderscore = await db.collection('wall_items').where('wallId', '==', originalWallId).get();
    
    console.log(`   wall-items (wrong): ${originalItemsHyphen.size} items`);
    console.log(`   wall_items (correct): ${originalItemsUnderscore.size} items`);
    
    if (originalItemsHyphen.size > 0) {
      console.log(`\n4. Moving ${originalItemsHyphen.size} items to correct collection...`);
      
      let moved = 0;
      const batchSize = 500;
      let batch = db.batch();
      
      for (const doc of originalItemsHyphen.docs) {
        const data = doc.data();
        // Create in correct collection with same ID
        const newDocRef = db.collection('wall_items').doc(doc.id);
        batch.set(newDocRef, data);
        moved++;
        
        if (moved % batchSize === 0) {
          await batch.commit();
          console.log(`   Moved ${moved} items...`);
          batch = db.batch();
        }
      }
      
      if (moved % batchSize !== 0) {
        await batch.commit();
      }
      
      console.log(`   ✅ Moved all ${moved} items to wall_items`);
      
      // 5. Delete from wrong collection
      console.log('\n5. Cleaning up old collection...');
      let deleted = 0;
      batch = db.batch();
      
      for (const doc of originalItemsHyphen.docs) {
        batch.delete(doc.ref);
        deleted++;
        
        if (deleted % batchSize === 0) {
          await batch.commit();
          console.log(`   Deleted ${deleted} items...`);
          batch = db.batch();
        }
      }
      
      if (deleted % batchSize !== 0) {
        await batch.commit();
      }
      
      console.log(`   ✅ Deleted ${deleted} items from wall-items`);
    }
    
    // 6. Final verification
    console.log('\n6. Final verification...');
    const finalCount = await db.collection('wall_items').where('wallId', '==', originalWallId).get();
    console.log(`   ✅ Original alumni wall now has ${finalCount.size} items in wall_items`);
    
    console.log('\n🎉 SUCCESS!');
    console.log('Original alumni wall is fixed and test wall deleted.');
    console.log('\n📍 Alumni Wall URL:');
    console.log('https://rlswall.app/walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixOriginalAlumniWall();
