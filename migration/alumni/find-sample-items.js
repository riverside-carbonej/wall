const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findSampleItems() {
  try {
    console.log('🔍 SEARCHING FOR SAMPLE ITEMS ACROSS ALL WALLS\n');
    
    // Find all sample items in the entire database using simple queries
    console.log('Searching for sample items...');
    
    // Get all wall-items and filter client-side
    const allItems = await db.collection('wall-items').get();
    
    const sampleItems = [];
    let totalItems = 0;
    
    allItems.forEach(doc => {
      totalItems++;
      const data = doc.data();
      if (data.name && (data.name.includes('Sample Full Name') || data.name.startsWith('Sample'))) {
        sampleItems.push({
          id: doc.id,
          name: data.name,
          wallId: data.wallId,
          objectTypeId: data.objectTypeId
        });
      }
    });
    
    console.log(`Total items in database: ${totalItems}`);
    console.log(`Sample items found: ${sampleItems.length}`);
    
    if (sampleItems.length > 0) {
      console.log('\n📋 Sample items found:');
      for (const item of sampleItems) {
        console.log(`\n• "${item.name}"`);
        console.log(`  Wall ID: ${item.wallId}`);
        console.log(`  Object Type: ${item.objectTypeId}`);
        console.log(`  Document ID: ${item.id}`);
      }
    }
    
    // Check alumni walls
    console.log('\n🔍 CHECKING ALL ALUMNI WALLS:');
    const wallsSnapshot = await db.collection('walls').get();
    const alumniWalls = [];
    
    wallsSnapshot.forEach(doc => {
      const wall = doc.data();
      if (wall.name && wall.name.toLowerCase().includes('alumni')) {
        alumniWalls.push({
          id: doc.id,
          name: wall.name,
          published: wall.published,
          owner: wall.ownerId || wall.ownerEmail
        });
      }
    });
    
    console.log(`\nFound ${alumniWalls.length} alumni walls:`);
    for (const wall of alumniWalls) {
      const itemCount = await db.collection('wall-items')
        .where('wallId', '==', wall.id)
        .get();
      
      console.log(`\n• "${wall.name}" (${wall.id})`);
      console.log(`  Items: ${itemCount.size}`);
      console.log(`  Published: ${wall.published}`);
      
      if (wall.id === 'dzwsujrWYLvznCJElpri') {
        console.log('  👆 THIS IS THE CORRECT WALL WITH YOUR 162 ALUMNI');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findSampleItems();
