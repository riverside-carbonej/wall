const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAlumniWall() {
  try {
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🔧 Fixing Alumni wall access issues...');
    
    // Update the wall document with proper ownership and published status
    await db.collection('walls').doc(wallId).update({
      ownerId: 'jack.carbone@riversideschools.net', // Set proper owner
      ownerEmail: 'jack.carbone@riversideschools.net',
      published: true, // Make it published
      'permissions.owner': 'jack.carbone@riversideschools.net',
      'permissions.editors': [],
      'permissions.managers': [],
      'visibility.isPublished': true,
      'visibility.requiresLogin': false
    });
    
    console.log('✅ Updated wall permissions and visibility');
    
    // Verify the fix
    const wallDoc = await db.collection('walls').doc(wallId).get();
    const wallData = wallDoc.data();
    
    console.log('\n📋 Wall Status:');
    console.log(`Owner: ${wallData.ownerId || wallData.ownerEmail}`);
    console.log(`Published: ${wallData.published}`);
    console.log(`Permissions:`, wallData.permissions);
    console.log(`Visibility:`, wallData.visibility);
    
    // Count items to verify they're there
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`\n📊 Items in wall: ${itemsSnapshot.size}`);
    
    console.log('\n✅ Wall should now be accessible!');
    console.log(`🔗 URL: /walls/${wallId}/preset/ot_1757607682911_brfg8d3ft/items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAlumniWall();