const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkVeteransItems() {
  try {
    console.log('🔍 Checking for existing veteran items across all walls...\n');
    
    // Get all Veterans walls
    const wallsSnapshot = await db.collection('walls').get();
    const veteransWalls = [];
    
    wallsSnapshot.forEach(doc => {
      const wall = doc.data();
      const wallName = wall.name || '';
      
      if (wallName.toLowerCase().includes('veteran') || 
          wallName.toLowerCase().includes('honor')) {
        veteransWalls.push({
          id: doc.id,
          name: wallName,
          objectTypes: wall.objectTypes || []
        });
      }
    });
    
    console.log(`Found ${veteransWalls.length} Veterans walls to check\n`);
    
    // Check items for each wall
    const wallsWithItems = [];
    
    for (const wall of veteransWalls) {
      // Get all object type IDs for this wall
      const objectTypeIds = wall.objectTypes.map(ot => ot.id);
      
      if (objectTypeIds.length > 0) {
        // Count items for this wall
        const itemsSnapshot = await db.collection('wall-items')
          .where('wallId', '==', wall.id)
          .limit(10)
          .get();
        
        if (itemsSnapshot.size > 0) {
          // Get actual count
          const countSnapshot = await db.collection('wall-items')
            .where('wallId', '==', wall.id)
            .get();
          
          wallsWithItems.push({
            ...wall,
            itemCount: countSnapshot.size,
            sampleItems: itemsSnapshot.docs.slice(0, 3).map(doc => {
              const data = doc.data();
              return {
                name: data.name || data.fields?.name || 'Unknown',
                objectTypeId: data.objectTypeId
              };
            })
          });
        }
      }
    }
    
    if (wallsWithItems.length === 0) {
      console.log('❌ No Veterans walls have any items yet.\n');
    } else {
      console.log('✅ Veterans walls with items:\n');
      console.log('═══════════════════════════════════════════');
      
      wallsWithItems.sort((a, b) => b.itemCount - a.itemCount);
      
      for (const wall of wallsWithItems) {
        console.log(`\n📋 ${wall.name}`);
        console.log(`🆔 Wall ID: ${wall.id}`);
        console.log(`📊 Items: ${wall.itemCount}`);
        
        if (wall.itemCount === 561) {
          console.log('🎯 THIS WALL HAS EXACTLY 561 ITEMS (matches our data count!)');
        }
        
        console.log('\nSample items:');
        wall.sampleItems.forEach(item => {
          console.log(`  • ${item.name} (objectTypeId: ${item.objectTypeId})`);
        });
        
        console.log(`\n🔗 URL: /walls/${wall.id}/preset/${wall.objectTypes[0]?.id}/items`);
        console.log('───────────────────────────────────────────');
      }
    }
    
    // Also check for specific veterans by name
    console.log('\n🔍 Checking for specific veterans by name...\n');
    const testNames = ['Tom Miller', 'Mark Webster', 'Robert L Brooks'];
    
    for (const name of testNames) {
      const itemsSnapshot = await db.collection('wall-items')
        .where('name', '==', name)
        .limit(5)
        .get();
      
      if (itemsSnapshot.size > 0) {
        console.log(`✅ Found "${name}" in ${itemsSnapshot.size} wall(s):`);
        itemsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`   Wall ID: ${data.wallId}, Object Type: ${data.objectTypeId}`);
        });
      } else {
        console.log(`❌ "${name}" not found in any wall`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVeteransItems();