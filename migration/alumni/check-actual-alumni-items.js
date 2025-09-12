const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkActualAlumniItems() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🔍 CHECKING WHAT IS ACTUALLY IN THE ALUMNI WALL\n');
    
    // Get all items for this wall ID - no limits, no filters
    const allAlumniItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    console.log(`📊 Total items found: ${allAlumniItems.size}\n`);
    
    if (allAlumniItems.size === 0) {
      console.log('❌ NO ITEMS FOUND! The alumni were never imported or were deleted.');
      
      // Search the entire database for alumni-like items
      console.log('\n🔍 Searching entire database for alumni items...');
      
      const allItemsSnapshot = await db.collection('wall-items').get();
      const possibleAlumni = [];
      
      allItemsSnapshot.forEach(doc => {
        const data = doc.data();
        const name = data.name || '';
        
        // Look for specific alumni we know should exist
        if (name.includes('Anthony Montonini') || 
            name.includes('Gretchen Reed') || 
            name.includes('Mary Thrasher') ||
            name.startsWith('1970 Peter') ||
            name.startsWith('2001 Jason')) {
          possibleAlumni.push({
            id: doc.id,
            name: name,
            wallId: data.wallId,
            objectTypeId: data.objectTypeId,
            published: data.published
          });
        }
      });
      
      if (possibleAlumni.length > 0) {
        console.log(`\n✅ Found ${possibleAlumni.length} known alumni items:`);
        possibleAlumni.forEach(item => {
          console.log(`  • "${item.name}" in wall ${item.wallId} (${item.objectTypeId})`);
        });
        
        console.log('\n🔧 These need to be moved to the correct wall!');
      } else {
        console.log('\n❌ No alumni items found anywhere in database!');
        console.log('The alumni data needs to be re-imported.');
      }
      
      return;
    }
    
    // If we have items, show their details
    console.log('📋 Alumni items breakdown:');
    
    const itemsByObjectType = {};
    const itemsByPublished = { true: 0, false: 0, undefined: 0 };
    
    allAlumniItems.forEach(doc => {
      const data = doc.data();
      
      // Group by object type
      const ot = data.objectTypeId || 'undefined';
      if (!itemsByObjectType[ot]) {
        itemsByObjectType[ot] = [];
      }
      itemsByObjectType[ot].push(data.name);
      
      // Count by published status
      const published = data.published;
      if (published === true) itemsByPublished.true++;
      else if (published === false) itemsByPublished.false++;
      else itemsByPublished.undefined++;
    });
    
    console.log('\n📊 Items by Object Type ID:');
    Object.entries(itemsByObjectType).forEach(([objectTypeId, items]) => {
      console.log(`  ${objectTypeId}: ${items.length} items`);
      if (items.length <= 5) {
        console.log(`    Sample: ${items.join(', ')}`);
      } else {
        console.log(`    Sample: ${items.slice(0, 3).join(', ')} ... and ${items.length - 3} more`);
      }
    });
    
    console.log('\n📊 Items by Published Status:');
    console.log(`  Published (true): ${itemsByPublished.true}`);
    console.log(`  Unpublished (false): ${itemsByPublished.false}`);  
    console.log(`  Undefined: ${itemsByPublished.undefined}`);
    
    // Show first few items in detail
    console.log('\n📋 First 3 items in detail:');
    allAlumniItems.docs.slice(0, 3).forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n[${index + 1}] "${data.name}" (${doc.id})`);
      console.log(`  wallId: ${data.wallId}`);
      console.log(`  objectTypeId: ${data.objectTypeId}`);
      console.log(`  published: ${data.published}`);
      console.log(`  createdAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
    });
    
    console.log('\n💡 EXPECTED vs ACTUAL:');
    console.log(`Expected wallId: ${alumniWallId}`);
    console.log(`Expected objectTypeId: ot_1757607682911_brfg8d3ft`);
    console.log(`Expected published: true`);
    console.log(`Total expected: 162 items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkActualAlumniItems();