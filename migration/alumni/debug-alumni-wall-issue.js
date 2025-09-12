const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugAlumniWall() {
  try {
    const wallId = 'dzwsujrWYLvznCJElpri';
    const expectedObjectTypeId = 'ot_1757607682911_brfg8d3ft';
    
    console.log('🔍 DEBUGGING ALUMNI WALL ISSUE\n');
    
    // 1. Check the wall structure
    console.log('1. Checking wall structure...');
    const wallDoc = await db.collection('walls').doc(wallId).get();
    if (!wallDoc.exists) {
      console.log('❌ Wall not found!');
      return;
    }
    
    const wallData = wallDoc.data();
    console.log(`   Wall Name: "${wallData.name}"`);
    console.log(`   Owner: ${wallData.ownerId}`);
    console.log(`   Published: ${wallData.published}`);
    console.log(`   Object Types Count: ${wallData.objectTypes?.length || 0}`);
    
    // 2. Check object types in detail
    console.log('\n2. Checking object types...');
    if (wallData.objectTypes) {
      wallData.objectTypes.forEach((ot, index) => {
        console.log(`   [${index}] "${ot.name}" - ID: ${ot.id}`);
        if (ot.id === expectedObjectTypeId) {
          console.log('       ✅ This matches our expected ID!');
        }
      });
    }
    
    // 3. Check items by wall ID
    console.log('\n3. Checking items by wall ID...');
    const allWallItems = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .limit(5)
      .get();
    
    console.log(`   Total items with wallId=${wallId}: ${allWallItems.size}`);
    
    // Get full count
    const fullCount = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .get();
    console.log(`   Full count: ${fullCount.size}`);
    
    // 4. Check items by object type ID
    console.log('\n4. Checking items by object type ID...');
    const objectTypeItems = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('objectTypeId', '==', expectedObjectTypeId)
      .limit(5)
      .get();
    
    console.log(`   Items with correct objectTypeId: ${objectTypeItems.size}`);
    
    // Get full count for object type
    const fullObjectTypeCount = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('objectTypeId', '==', expectedObjectTypeId)
      .get();
    console.log(`   Full count with correct objectTypeId: ${fullObjectTypeCount.size}`);
    
    // 5. Show sample items
    console.log('\n5. Sample items:');
    allWallItems.docs.slice(0, 3).forEach((doc, index) => {
      const data = doc.data();
      console.log(`   [${index + 1}] "${data.name}" - ObjectType: ${data.objectTypeId}`);
      console.log(`       Published: ${data.published}, ID: ${doc.id}`);
    });
    
    // 6. Check for old broken items (objectTypeId: "0")
    console.log('\n6. Checking for old broken items...');
    const brokenItems = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('objectTypeId', '==', '0')
      .get();
    console.log(`   Items with objectTypeId="0": ${brokenItems.size}`);
    
    if (brokenItems.size > 0) {
      console.log('   ⚠️  Found old broken items! These might be showing instead.');
    }
    
    // 7. Check all alumni walls
    console.log('\n7. Checking for other alumni walls...');
    const allWallsSnapshot = await db.collection('walls').get();
    const alumniWalls = [];
    
    allWallsSnapshot.forEach(doc => {
      const wall = doc.data();
      if (wall.name && wall.name.toLowerCase().includes('alumni')) {
        alumniWalls.push({
          id: doc.id,
          name: wall.name,
          published: wall.published
        });
      }
    });
    
    console.log(`   Found ${alumniWalls.length} alumni walls:`);
    alumniWalls.forEach(wall => {
      console.log(`     • "${wall.name}" (${wall.id}) - Published: ${wall.published}`);
      if (wall.id === wallId) {
        console.log('       👆 This is our current wall');
      }
    });
    
    console.log('\n📋 SUMMARY:');
    console.log(`Wall exists: ${wallDoc.exists}`);
    console.log(`Total items in wall: ${fullCount.size}`);
    console.log(`Items with correct objectTypeId: ${fullObjectTypeCount.size}`);
    console.log(`Expected URL: /walls/${wallId}/preset/${expectedObjectTypeId}/items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAlumniWall();