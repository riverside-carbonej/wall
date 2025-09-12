const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deepCompareWalls() {
  try {
    console.log('🔍 DEEP COMPARISON: Veterans (WORKS) vs Alumni (BROKEN)\n');
    
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    // Find a working veterans wall
    const allWallsSnapshot = await db.collection('walls').get();
    let veteransWallId = null;
    
    allWallsSnapshot.forEach(doc => {
      const wall = doc.data();
      if (wall.name && wall.name.toLowerCase().includes('veteran') && wall.published) {
        veteransWallId = doc.id;
      }
    });
    
    if (!veteransWallId) {
      console.log('❌ No published veterans wall found');
      return;
    }
    
    console.log(`Comparing:`);
    console.log(`✅ Veterans Wall ID: ${veteransWallId}`);
    console.log(`❌ Alumni Wall ID: ${alumniWallId}\n`);
    
    // Get items from both walls
    console.log('📊 ITEM COUNTS:');
    
    const veteransItems = await db.collection('wall-items')
      .where('wallId', '==', veteransWallId)
      .get();
    
    const alumniItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    console.log(`Veterans items: ${veteransItems.size}`);
    console.log(`Alumni items: ${alumniItems.size}`);
    
    if (alumniItems.size === 0) {
      console.log('\n❌ NO ALUMNI ITEMS FOUND! They were deleted or never imported properly.');
      
      // Check if there are items with different wallId
      console.log('\n🔍 Searching for alumni items in wrong walls...');
      
      const allItemsSnapshot = await db.collection('wall-items').get();
      const alumniLikeItems = [];
      
      allItemsSnapshot.forEach(doc => {
        const data = doc.data();
        const name = data.name || '';
        
        if (name.includes('Anthony Montonini') || 
            name.includes('Gretchen Reed') || 
            name.includes('Mary Thrasher') ||
            name.startsWith('1970 Peter') ||
            name.includes('Alumni') ||
            name.includes('Faculty & Staff')) {
          alumniLikeItems.push({
            id: doc.id,
            name: name,
            wallId: data.wallId,
            objectTypeId: data.objectTypeId
          });
        }
      });
      
      if (alumniLikeItems.length > 0) {
        console.log(`\n✅ Found ${alumniLikeItems.length} alumni-like items in other locations:`);
        
        const itemsByWall = {};
        alumniLikeItems.forEach(item => {
          if (!itemsByWall[item.wallId]) {
            itemsByWall[item.wallId] = [];
          }
          itemsByWall[item.wallId].push(item);
        });
        
        for (const [wallId, items] of Object.entries(itemsByWall)) {
          console.log(`\n  Wall ${wallId}: ${items.length} alumni items`);
          
          if (wallId !== alumniWallId) {
            console.log(`    👆 THESE ARE IN THE WRONG WALL!`);
            console.log(`    Sample items: ${items.slice(0, 3).map(i => i.name).join(', ')}`);
            
            // Should we move these to the correct wall?
            console.log(`    🔧 Need to move these to correct wall: ${alumniWallId}`);
          }
        }
        
        return; // Exit early to show the move option
      }
    }
    
    if (veteransItems.size === 0) {
      console.log('❌ No veterans items found either!');
      return;
    }
    
    // Compare sample items structure
    console.log('\n📋 COMPARING ITEM STRUCTURES:');
    
    const vetSample = veteransItems.docs[0].data();
    const alumSample = alumniItems.docs[0].data();
    
    console.log('\n✅ VETERANS SAMPLE ITEM:');
    console.log(JSON.stringify({
      name: vetSample.name,
      wallId: vetSample.wallId,
      objectTypeId: vetSample.objectTypeId,
      published: vetSample.published,
      createdAt: vetSample.createdAt?.toDate?.() || vetSample.createdAt,
      fields: vetSample.fields
    }, null, 2));
    
    console.log('\n❌ ALUMNI SAMPLE ITEM:');
    console.log(JSON.stringify({
      name: alumSample.name,
      wallId: alumSample.wallId,
      objectTypeId: alumSample.objectTypeId,
      published: alumSample.published,
      createdAt: alumSample.createdAt?.toDate?.() || alumSample.createdAt,
      fields: alumSample.fields
    }, null, 2));
    
    // Check if timestamps are different (indicating different import times)
    const vetTime = vetSample.createdAt?.toDate?.() || vetSample.createdAt;
    const alumTime = alumSample.createdAt?.toDate?.() || alumSample.createdAt;
    
    console.log('\n📅 CREATION TIMES:');
    console.log(`Veterans: ${vetTime}`);
    console.log(`Alumni: ${alumTime}`);
    
    if (vetTime && alumTime) {
      const timeDiff = Math.abs(vetTime - alumTime) / (1000 * 60); // minutes
      console.log(`Time difference: ${timeDiff.toFixed(1)} minutes`);
      
      if (timeDiff > 60) {
        console.log('⚠️  Large time difference - these were imported at different times');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deepCompareWalls();