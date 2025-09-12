const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findWorkingAlumniWall() {
  try {
    console.log('🔍 LOOKING FOR ANY WORKING ALUMNI WALL\n');
    
    // Get all walls
    const wallsSnapshot = await db.collection('walls').get();
    const alumniWalls = [];
    
    wallsSnapshot.forEach(doc => {
      const wall = doc.data();
      if (wall.name && wall.name.toLowerCase().includes('alumni') && wall.published) {
        alumniWalls.push({
          id: doc.id,
          name: wall.name,
          data: wall
        });
      }
    });
    
    console.log(`Found ${alumniWalls.length} published alumni walls:\n`);
    
    for (const wall of alumniWalls) {
      // Count items
      const itemsSnapshot = await db.collection('wall-items')
        .where('wallId', '==', wall.id)
        .get();
      
      console.log(`📋 "${wall.name}" (${wall.id})`);
      console.log(`   Items: ${itemsSnapshot.size}`);
      console.log(`   Owner: ${wall.data.ownerId || wall.data.ownerEmail || 'Unknown'}`);
      console.log(`   Published: ${wall.data.published}`);
      
      if (wall.data.objectTypes && Array.isArray(wall.data.objectTypes) && wall.data.objectTypes.length > 0) {
        const objectType = wall.data.objectTypes[0];
        console.log(`   Object Type ID: ${objectType.id}`);
        console.log(`   URL: https://rlswall.app/walls/${wall.id}/preset/${objectType.id}/items`);
        
        // Check if structure is valid
        const fieldsValid = objectType.fields && Array.isArray(objectType.fields);
        console.log(`   Structure: ${fieldsValid ? '✅ Valid' : '❌ Broken'}`);
        
        if (fieldsValid && itemsSnapshot.size > 0) {
          console.log('   👆 THIS MIGHT WORK! Try this URL.');
        }
      }
      
      console.log('');
    }
    
    // Also suggest creating a fresh wall
    console.log('💡 ALTERNATIVES:');
    console.log('1. Try the URLs above for other alumni walls');
    console.log('2. Create a completely fresh "Alumni Wall 2" through the UI');
    console.log('3. Re-import the 162 alumni to a new wall');
    console.log('4. Check browser console at current URL for JavaScript errors');
    
    console.log('\n🔧 If you want to create a fresh wall:');
    console.log('1. Go to https://rlswall.app');
    console.log('2. Click "Create New Wall"');
    console.log('3. Name it "Alumni Wall 2024" or similar');
    console.log('4. Add the same fields (name, graduation year, degree, etc.)');
    console.log('5. We can re-import the 162 alumni to the fresh wall');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findWorkingAlumniWall();