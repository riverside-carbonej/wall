const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findMissingAlumni() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🔍 SEARCHING FOR MISSING 162 ALUMNI ITEMS\n');
    
    // Check current items in alumni wall
    const currentAlumniItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    console.log(`Current items in alumni wall: ${currentAlumniItems.size}`);
    
    // Search for items that might have the wrong wall ID or object type ID
    console.log('\n🔍 Searching for alumni items with wrong wall ID...');
    
    // Look for items with alumni-like names
    const allItems = await db.collection('wall-items').get();
    
    const alumniLikeItems = [];
    const itemsByWall = {};
    
    allItems.forEach(doc => {
      const data = doc.data();
      const name = data.name || '';
      
      // Count items by wall
      if (!itemsByWall[data.wallId]) {
        itemsByWall[data.wallId] = 0;
      }
      itemsByWall[data.wallId]++;
      
      // Look for alumni-like names
      if (name.includes('Anthony Montonini') || 
          name.includes('Gretchen Reed') || 
          name.includes('Mary Thrasher') ||
          name.startsWith('1970 Peter') ||
          name.startsWith('2001 Jason')) {
        alumniLikeItems.push({
          id: doc.id,
          name: name,
          wallId: data.wallId,
          objectTypeId: data.objectTypeId
        });
      }
    });
    
    console.log('\nFound alumni-like items:');
    alumniLikeItems.forEach(item => {
      console.log(`  • "${item.name}" in wall ${item.wallId} (${item.objectTypeId})`);
    });
    
    console.log('\n📊 Items by wall ID:');
    Object.entries(itemsByWall)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([wallId, count]) => {
        console.log(`  ${wallId}: ${count} items`);
        if (count === 162) {
          console.log(`    👆 THIS WALL HAS 162 ITEMS! Might be our missing alumni.`);
        }
      });
    
    // Check if there's a wall with exactly 162 items that might be our alumni
    const wallsWith162Items = Object.entries(itemsByWall)
      .filter(([wallId, count]) => count === 162)
      .map(([wallId]) => wallId);
    
    if (wallsWith162Items.length > 0) {
      console.log('\n🔍 Investigating walls with exactly 162 items:');
      
      for (const wallId of wallsWith162Items.slice(0, 3)) {
        if (wallId === alumniWallId) continue; // Skip the target wall
        
        console.log(`\nWall ${wallId}:`);
        
        // Get wall info
        try {
          const wallDoc = await db.collection('walls').doc(wallId).get();
          if (wallDoc.exists) {
            const wallData = wallDoc.data();
            console.log(`  Name: "${wallData.name || 'Unknown'}"`);
            console.log(`  Owner: ${wallData.ownerId || wallData.ownerEmail || 'Unknown'}`);
            console.log(`  Published: ${wallData.published}`);
          } else {
            console.log(`  Wall document not found (orphaned items?)`);
          }
          
          // Get sample items
          const sampleItems = await db.collection('wall-items')
            .where('wallId', '==', wallId)
            .limit(3)
            .get();
          
          console.log(`  Sample items:`);
          sampleItems.docs.forEach(doc => {
            const data = doc.data();
            console.log(`    - "${data.name}" (${data.objectTypeId})`);
          });
          
        } catch (error) {
          console.log(`  Error checking wall: ${error.message}`);
        }
      }
    }
    
    // Final recommendation
    console.log('\n💡 RECOMMENDATION:');
    console.log('If we find our 162 alumni in another wall, we can:');
    console.log('1. Copy them back to the correct alumni wall');
    console.log('2. Update their wallId and objectTypeId');
    console.log('3. Delete the duplicates from wrong location');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findMissingAlumni();