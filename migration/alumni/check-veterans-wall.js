const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkVeteransWall() {
  try {
    console.log('🔍 Looking for Veterans walls...\n');
    
    // Get all walls
    const wallsSnapshot = await db.collection('walls').get();
    
    const veteransWalls = [];
    
    wallsSnapshot.forEach(doc => {
      const wall = doc.data();
      const wallName = wall.name || '';
      
      // Check if this might be a veterans wall
      if (wallName.toLowerCase().includes('veteran') || 
          wallName.toLowerCase().includes('military') ||
          wallName.toLowerCase().includes('honor')) {
        
        veteransWalls.push({
          id: doc.id,
          name: wallName,
          ownerId: wall.ownerId,
          ownerEmail: wall.ownerEmail,
          published: wall.published,
          objectTypes: wall.objectTypes ? wall.objectTypes.map(ot => ({
            id: ot.id,
            name: ot.name,
            fieldCount: ot.fields ? ot.fields.length : 0
          })) : []
        });
      }
    });
    
    if (veteransWalls.length === 0) {
      console.log('❌ No Veterans walls found.');
      console.log('\n📝 To create a Veterans wall:');
      console.log('1. Go to the Wall app');
      console.log('2. Click "Create New Wall"');
      console.log('3. Name it "Veterans Wall" or similar');
      console.log('4. Add fields like:');
      console.log('   - Name (text, required)');
      console.log('   - Graduation Year (text)');
      console.log('   - Rank (text)');
      console.log('   - Military Entry Date (date)');
      console.log('   - Military Exit Date (date)');
      console.log('   - Description (textarea)');
      console.log('   - Branches (text or relationship)');
      console.log('   - Deployments (text or relationship)');
      console.log('5. Save the wall');
      console.log('6. Run this script again to get the IDs');
    } else {
      console.log('✅ Found potential Veterans walls:\n');
      
      veteransWalls.forEach(wall => {
        console.log('═══════════════════════════════════════════');
        console.log(`📋 Wall Name: ${wall.name}`);
        console.log(`🆔 Wall ID: ${wall.id}`);
        console.log(`👤 Owner: ${wall.ownerEmail || wall.ownerId}`);
        console.log(`📢 Published: ${wall.published}`);
        console.log(`\n🏷️  Object Types:`);
        
        wall.objectTypes.forEach(ot => {
          console.log(`   • ${ot.name}`);
          console.log(`     ID: ${ot.id}`);
          console.log(`     Fields: ${ot.fieldCount}`);
        });
        
        console.log(`\n🔗 URL: /walls/${wall.id}/preset/${wall.objectTypes[0]?.id || 'OBJECT_TYPE_ID'}/items`);
      });
      
      console.log('\n═══════════════════════════════════════════');
      console.log('\n✅ Use these IDs in import-veterans.js:');
      const selectedWall = veteransWalls[0];
      console.log(`const VETERANS_WALL_ID = '${selectedWall.id}';`);
      console.log(`const VETERANS_OBJECT_TYPE_ID = '${selectedWall.objectTypes[0]?.id || 'UPDATE_THIS'}';`);
    }
    
    // Also check for existing veteran items
    console.log('\n📊 Checking for existing veteran items...');
    const itemsSnapshot = await db.collection('wall-items')
      .where('objectTypeId', 'in', ['veteran', 'veterans', 'military'])
      .limit(5)
      .get();
    
    console.log(`Found ${itemsSnapshot.size} existing veteran items with old object type IDs`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVeteransWall();