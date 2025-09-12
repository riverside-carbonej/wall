const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBrokenWall() {
  try {
    console.log('🔍 CHECKING THE BROKEN WALL STRUCTURE\n');
    
    const brokenWallId = 'qBcqG1oBN8VnwanOSrLg';
    
    const brokenWallDoc = await db.collection('walls').doc(brokenWallId).get();
    if (!brokenWallDoc.exists) {
      console.log('Broken wall does not exist');
      return;
    }
    
    const brokenWallData = brokenWallDoc.data();
    
    console.log('BROKEN WALL ANALYSIS:');
    console.log(`Name: "${brokenWallData.name}"`);
    console.log(`Published: ${brokenWallData.published}`);
    console.log(`Owner: ${brokenWallData.ownerId || brokenWallData.ownerEmail}`);
    
    console.log('\nObjectTypes structure:');
    console.log(`Type: ${typeof brokenWallData.objectTypes}`);
    console.log(`Is Array: ${Array.isArray(brokenWallData.objectTypes)}`);
    
    if (typeof brokenWallData.objectTypes === 'object' && !Array.isArray(brokenWallData.objectTypes)) {
      console.log('❌ BROKEN: objectTypes is an object, not an array!');
      console.log('This wall is broken and could be interfering with navigation.');
      
      // Show the broken structure
      console.log('\nBroken objectTypes content:');
      console.log(JSON.stringify(brokenWallData.objectTypes, null, 2));
      
      // Check if this wall is being used in your user's wall list
      console.log('\n🔧 RECOMMENDATION: Delete or fix this broken wall');
      console.log('This broken wall structure could be causing navigation issues.');
      
      // Option 1: Delete the broken wall
      console.log('\nDo you want me to delete this broken wall? (Uncomment the line below)');
      console.log('// await db.collection("walls").doc(brokenWallId).delete();');
      
    } else {
      console.log('✅ ObjectTypes structure is correct');
    }
    
    // Check items count
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', brokenWallId)
      .get();
    
    console.log(`\nItems in broken wall: ${itemsSnapshot.size}`);
    
    if (itemsSnapshot.size > 0) {
      console.log('⚠️  This broken wall has items that might need to be moved!');
    }
    
    // Show URLs for both walls
    console.log('\n📍 WALL URLS:');
    console.log('✅ CORRECT (working) wall:');
    console.log('   /walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
    console.log('❌ BROKEN wall (avoid this):');
    console.log(`   /walls/${brokenWallId}/preset/[anything]/items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBrokenWall();