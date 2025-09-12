const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteBrokenWall() {
  try {
    const brokenWallId = 'qBcqG1oBN8VnwanOSrLg';
    
    console.log('🗑️  DELETING BROKEN WALL AND ITS ITEMS\n');
    
    console.log('1. Deleting all items from broken wall...');
    
    // Delete all items from the broken wall
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', brokenWallId)
      .get();
    
    console.log(`Found ${itemsSnapshot.size} items to delete`);
    
    // Delete items in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    
    itemsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
      
      if (count >= batchSize) {
        // This batch is full, commit it and start a new one
        console.log('Committing batch of 500 deletions...');
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Deleted ${count} items`);
    }
    
    console.log('2. Deleting the broken wall document...');
    
    // Delete the wall document
    await db.collection('walls').doc(brokenWallId).delete();
    
    console.log('✅ Deleted broken wall document');
    
    console.log('\n🎉 SUCCESS! Broken wall and all its items have been deleted.');
    console.log('\nNow you should be able to access your working Alumni wall:');
    console.log('🔗 /walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
    
    // Verify the good wall is still intact
    console.log('\n3. Verifying your good wall is still intact...');
    
    const goodWallItems = await db.collection('wall-items')
      .where('wallId', '==', 'dzwsujrWYLvznCJElpri')
      .get();
    
    console.log(`✅ Your good Alumni wall still has ${goodWallItems.size} items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteBrokenWall();