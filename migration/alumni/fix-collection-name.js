const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixCollectionName() {
  try {
    console.log('🔧 FIXING COLLECTION NAME MISMATCH\n');
    console.log('Security rules expect: wall_items (underscore)');
    console.log('We created items in: wall-items (hyphen)\n');
    
    // Check both collections
    console.log('1. Checking wall-items (hyphen) collection:');
    const hyphenCollection = await db.collection('wall-items').limit(5).get();
    console.log(`   Found: ${hyphenCollection.size}+ items`);
    
    console.log('\n2. Checking wall_items (underscore) collection:');
    const underscoreCollection = await db.collection('wall_items').limit(5).get();
    console.log(`   Found: ${underscoreCollection.size}+ items`);
    
    // Count items for our specific walls
    const alumniWallIds = [
      'dzwsujrWYLvznCJElpri', // Original alumni wall
      'ONCa5lK4iXS5lF27dQEf'  // New alumni wall
    ];
    
    console.log('\n3. Checking our alumni walls:');
    for (const wallId of alumniWallIds) {
      const hyphenItems = await db.collection('wall-items').where('wallId', '==', wallId).get();
      const underscoreItems = await db.collection('wall_items').where('wallId', '==', wallId).get();
      
      console.log(`\n   Wall ${wallId}:`);
      console.log(`     wall-items: ${hyphenItems.size} items`);
      console.log(`     wall_items: ${underscoreItems.size} items`);
      
      if (hyphenItems.size > 0 && underscoreItems.size === 0) {
        console.log('     ❌ Items in wrong collection! Need to move them.');
        
        // Move items to correct collection
        console.log(`\n4. Moving ${hyphenItems.size} items to wall_items collection...`);
        
        const batch = db.batch();
        let count = 0;
        
        for (const doc of hyphenItems.docs) {
          const data = doc.data();
          // Create in correct collection
          const newDocRef = db.collection('wall_items').doc(doc.id);
          batch.set(newDocRef, data);
          count++;
          
          if (count >= 500) {
            await batch.commit();
            console.log(`   Moved ${count} items...`);
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
        }
        
        console.log(`   ✅ Moved all items to wall_items collection`);
        
        // Verify
        const verifyItems = await db.collection('wall_items').where('wallId', '==', wallId).get();
        console.log(`   ✅ Verified: ${verifyItems.size} items now in wall_items`);
      }
    }
    
    console.log('\n🎉 COLLECTION NAME FIXED!');
    console.log('The app should now be able to read the items.');
    console.log('\nTry the URLs again:');
    console.log('Original: https://rlswall.app/walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
    console.log('New: https://rlswall.app/walls/ONCa5lK4iXS5lF27dQEf/preset/ot_1757649788552_c0bgiqhrn/items');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCollectionName();
