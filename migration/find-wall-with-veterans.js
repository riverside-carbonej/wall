const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findWallWithVeterans() {
  console.log('Searching for walls with veterans...\n');
  
  try {
    // Get all walls
    const wallsSnapshot = await db.collection('walls').get();
    
    const results = [];
    
    for (const wallDoc of wallsSnapshot.docs) {
      const wallData = wallDoc.data();
      
      // Count veterans in this wall
      const veteransSnapshot = await db.collection('wall-items')
        .where('wallId', '==', wallDoc.id)
        .limit(1000)
        .get();
      
      if (!veteransSnapshot.empty) {
        results.push({
          wallId: wallDoc.id,
          wallName: wallData.name || 'Unnamed',
          veteranCount: veteransSnapshot.size,
          hasMore: veteransSnapshot.size === 1000
        });
      }
    }
    
    // Sort by veteran count
    results.sort((a, b) => b.veteranCount - a.veteranCount);
    
    console.log('Walls with veterans:');
    console.log('===================\n');
    
    results.forEach(wall => {
      console.log(`Wall: ${wall.wallName}`);
      console.log(`ID: ${wall.wallId}`);
      console.log(`Veterans: ${wall.veteranCount}${wall.hasMore ? '+' : ''}`);
      console.log('-------------------\n');
    });
    
    if (results.length === 0) {
      console.log('No walls found with veterans.');
    } else {
      console.log(`\nTotal walls with veterans: ${results.length}`);
      console.log(`\nWall with most veterans: ${results[0].wallName} (ID: ${results[0].wallId})`);
    }
    
  } catch (error) {
    console.error('Error finding walls:', error);
  } finally {
    await admin.app().delete();
  }
}

// Run the search
findWallWithVeterans();