const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAlumniFields() {
  try {
    console.log('🔧 FIXING ALUMNI FIELDS AND DISPLAY SETTINGS\n');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // First, fix the display settings
    console.log('1. Fixing wall display settings...');
    await db.collection('walls').doc(wallId).update({
      'objectTypes.0.displaySettings.secondaryField': 'degree'  // Use degree instead of currentPosition
    });
    console.log('   ✅ Changed secondaryField to "degree"');
    
    // Now check and fix items with missing or empty currentPosition
    console.log('\n2. Checking alumni items...');
    const itemsSnapshot = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .limit(10)
      .get();
    
    console.log(`   Checking first ${itemsSnapshot.size} items:`);
    
    itemsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const fields = data.fields || {};
      
      console.log(`\n   "${data.name}":`);
      console.log(`     degree: "${fields.degree || 'empty'}"`);
      console.log(`     currentPosition: "${fields.currentPosition || 'empty'}"`);
      console.log(`     category: "${fields.category || 'empty'}"`);
    });
    
    // Fix items that have undefined currentPosition
    console.log('\n3. Fixing items with missing currentPosition field...');
    const allItems = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    let fixedCount = 0;
    const batch = db.batch();
    
    allItems.docs.forEach(doc => {
      const data = doc.data();
      const fields = data.fields || {};
      
      // Ensure currentPosition exists (even if empty)
      if (fields.currentPosition === undefined) {
        fields.currentPosition = '';
        batch.update(doc.ref, { fields });
        fixedCount++;
      }
    });
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`   ✅ Fixed ${fixedCount} items with undefined currentPosition`);
    } else {
      console.log('   ✅ All items already have currentPosition field defined');
    }
    
    console.log('\n✅ FIXES APPLIED:');
    console.log('1. Wall now uses "degree" as secondary field (instead of currentPosition)');
    console.log('2. All items now have currentPosition field defined (no undefined)');
    console.log('\nThe error should be gone now! Refresh the page.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAlumniFields();
