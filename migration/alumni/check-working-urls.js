const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWorkingUrls() {
  try {
    console.log('🔍 CHECKING WORKING VETERAN vs BROKEN ALUMNI URLs\n');
    
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    const alumniObjectTypeId = 'ot_1757607682911_brfg8d3ft';
    
    // Find veterans wall
    const allWallsSnapshot = await db.collection('walls').get();
    let veteransWall = null;
    
    allWallsSnapshot.forEach(doc => {
      const wall = doc.data();
      if (wall.name && wall.name.toLowerCase().includes('veteran') && wall.published) {
        veteransWall = {
          id: doc.id,
          data: wall
        };
      }
    });
    
    if (veteransWall) {
      const vetObjectTypeId = veteransWall.data.objectTypes[0].id;
      console.log('✅ WORKING Veterans Wall:');
      console.log(`   Name: "${veteransWall.data.name}"`);
      console.log(`   Wall ID: ${veteransWall.id}`);
      console.log(`   Object Type ID: ${vetObjectTypeId}`);
      console.log(`   URL: https://rlswall.app/walls/${veteransWall.id}/preset/${vetObjectTypeId}/items`);
      
      // Check if this wall has items
      const vetItemsSnapshot = await db.collection('wall-items')
        .where('wallId', '==', veteransWall.id)
        .limit(3)
        .get();
      
      console.log(`   Items: ${vetItemsSnapshot.size}+ items`);
    }
    
    console.log('\n❌ BROKEN Alumni Wall:');
    console.log(`   Name: "New Alumni Wall"`);
    console.log(`   Wall ID: ${alumniWallId}`);
    console.log(`   Object Type ID: ${alumniObjectTypeId}`);
    console.log(`   URL: https://rlswall.app/walls/${alumniWallId}/preset/${alumniObjectTypeId}/items`);
    
    // Check alumni items
    const alumniItemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .limit(3)
      .get();
    
    console.log(`   Items: ${alumniItemsSnapshot.size}+ items`);
    
    // Let's verify the alumni wall's object type ID actually matches
    const alumniWallDoc = await db.collection('walls').doc(alumniWallId).get();
    const alumniWallData = alumniWallDoc.data();
    const actualObjectTypeId = alumniWallData.objectTypes[0].id;
    
    console.log('\n🔍 VERIFICATION:');
    console.log(`Expected Alumni Object Type ID: ${alumniObjectTypeId}`);
    console.log(`Actual Alumni Object Type ID:   ${actualObjectTypeId}`);
    
    if (alumniObjectTypeId !== actualObjectTypeId) {
      console.log('❌ MISMATCH! This is the problem!');
      console.log('\n✅ CORRECT Alumni URL should be:');
      console.log(`https://rlswall.app/walls/${alumniWallId}/preset/${actualObjectTypeId}/items`);
    } else {
      console.log('✅ Object Type IDs match');
      
      // If IDs match, check if items have the right object type ID
      console.log('\n🔍 Checking if items have correct object type ID...');
      
      const itemsWithCorrectId = await db.collection('wall-items')
        .where('wallId', '==', alumniWallId)
        .where('objectTypeId', '==', actualObjectTypeId)
        .limit(5)
        .get();
      
      const itemsWithWrongId = await db.collection('wall-items')
        .where('wallId', '==', alumniWallId)
        .limit(5)
        .get();
      
      console.log(`Items with correct objectTypeId (${actualObjectTypeId}): ${itemsWithCorrectId.size}`);
      console.log(`Total items in wall: ${itemsWithWrongId.size}`);
      
      if (itemsWithCorrectId.size < itemsWithWrongId.size) {
        console.log('❌ Some items have wrong object type IDs!');
        
        // Show what object type IDs the items actually have
        const objectTypeIds = new Set();
        itemsWithWrongId.docs.forEach(doc => {
          const data = doc.data();
          objectTypeIds.add(data.objectTypeId);
        });
        
        console.log('Item object type IDs found:', Array.from(objectTypeIds));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWorkingUrls();