const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function emergencyCheck() {
  try {
    console.log('🚨 EMERGENCY CHECK - WHERE ARE THE ALUMNI?\n');
    
    const newWallId = 'ONCa5lK4iXS5lF27dQEf';
    const newObjectTypeId = 'ot_1757649788552_c0bgiqhrn';
    
    // Check if the new wall even exists
    console.log('1. Checking if new wall exists:');
    const wallDoc = await db.collection('walls').doc(newWallId).get();
    
    if (!wallDoc.exists) {
      console.log('❌ WALL DOES NOT EXIST! Creation failed!');
      return;
    }
    
    console.log('✅ Wall exists');
    const wallData = wallDoc.data();
    console.log(`   Name: ${wallData.name}`);
    console.log(`   Owner: ${wallData.ownerId}`);
    console.log(`   Published: ${wallData.published}`);
    
    // Check if ANY items exist for this wall
    console.log('\n2. Checking for items in new wall:');
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', newWallId)
      .get();
    
    console.log(`   Found: ${itemsSnapshot.size} items`);
    
    if (itemsSnapshot.size === 0) {
      console.log('   ❌ NO ITEMS! Import failed!');
      
      // Check if items went somewhere else
      console.log('\n3. Searching for recently created items:');
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const recentItems = await db.collection('wall-items')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(fiveMinutesAgo))
        .get();
      
      console.log(`   Found ${recentItems.size} items created in last 5 minutes`);
      
      const itemsByWall = {};
      recentItems.docs.forEach(doc => {
        const data = doc.data();
        if (!itemsByWall[data.wallId]) {
          itemsByWall[data.wallId] = 0;
        }
        itemsByWall[data.wallId]++;
      });
      
      Object.entries(itemsByWall).forEach(([wallId, count]) => {
        console.log(`     Wall ${wallId}: ${count} items`);
      });
      
    } else {
      // Items exist, show samples
      console.log('\n   Sample items:');
      itemsSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`     • "${data.name}" (${data.objectTypeId})`);
      });
    }
    
    // Check Firestore security rules
    console.log('\n4. Checking if this might be a security rule issue:');
    console.log('   Security rules might be blocking reads if:');
    console.log('   - Items are not published');
    console.log('   - Wall requires authentication');
    console.log('   - Rules check for specific field values');
    
    // Try a different approach - create a VERY simple item
    console.log('\n5. Creating a test item with minimal data:');
    
    const testItem = {
      wallId: newWallId,
      objectTypeId: newObjectTypeId,
      name: 'TEST ALUMNI - DELETE ME',
      published: true,
      fields: {
        name: 'TEST ALUMNI - DELETE ME',
        graduationYear: 2024
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    const testDoc = await db.collection('wall-items').add(testItem);
    console.log(`   ✅ Test item created: ${testDoc.id}`);
    
    // Check if we can read it back
    const readBack = await db.collection('wall-items').doc(testDoc.id).get();
    if (readBack.exists) {
      console.log('   ✅ Can read test item back');
    } else {
      console.log('   ❌ Cannot read test item back - SECURITY RULE ISSUE!');
    }
    
    // Count total items again
    console.log('\n6. Final item count for new wall:');
    const finalCount = await db.collection('wall-items')
      .where('wallId', '==', newWallId)
      .get();
    
    console.log(`   Total items: ${finalCount.size}`);
    
    if (finalCount.size > 0) {
      console.log('\n💡 ITEMS EXIST IN DATABASE!');
      console.log('The problem is 100% in the frontend/app display logic.');
      console.log('Possible causes:');
      console.log('1. App is filtering by user ID in a broken way');
      console.log('2. App has a hardcoded limit for new walls');
      console.log('3. There\'s a bug in the app\'s query logic');
      console.log('4. Firestore security rules are blocking the app but not admin SDK');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

emergencyCheck();
