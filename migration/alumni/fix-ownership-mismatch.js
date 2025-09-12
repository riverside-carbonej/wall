const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixOwnershipMismatch() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    const correctUserId = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2'; // From console log
    
    console.log('🔧 FIXING OWNERSHIP MISMATCH\n');
    
    console.log('Problem: Wall ownerId is email, but Firebase uses userId');
    console.log(`Wall ownerId: jack.carbone@riversideschools.net`);
    console.log(`Firebase userId: ${correctUserId}`);
    console.log('Result: isOwner = false, so limited access\n');
    
    console.log('Solution: Update wall ownerId to use Firebase userId\n');
    
    // Update the wall ownership
    await db.collection('walls').doc(alumniWallId).update({
      ownerId: correctUserId,
      ownerEmail: 'jack.carbone@riversideschools.net', // Keep email for reference
      'permissions.owner': correctUserId // Update permissions too
    });
    
    console.log('✅ Updated wall ownership to use Firebase userId');
    
    // Also update any items that might have the wrong owner reference
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .where('ownerId', '==', 'jack.carbone@riversideschools.net')
      .get();
    
    if (itemsSnapshot.size > 0) {
      console.log(`\n🔧 Also fixing ${itemsSnapshot.size} items with wrong ownerId...`);
      
      const batch = db.batch();
      itemsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { ownerId: correctUserId });
      });
      
      await batch.commit();
      console.log('✅ Fixed item ownership too');
    }
    
    console.log('\n🎉 OWNERSHIP FIXED!');
    console.log('Now you should have full owner access to the alumni wall.');
    console.log('Try refreshing the page:');
    console.log('https://rlswall.app/walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
    console.log('\nYou should now see all 162 alumni and be able to edit!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixOwnershipMismatch();