const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixFieldData() {
  try {
    console.log('FIXING ITEM FIELDS MAPPING');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get all items
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`Found ${items.size} items to fix\n`);
    
    const batch = db.batch();
    let fixCount = 0;
    
    items.docs.forEach(doc => {
      const data = doc.data();
      const fields = data.fields || {};
      let needsUpdate = false;
      const updates = {};
      
      // Fix the category/degree confusion
      if (fields.degree && ['Alumni', 'Faculty & Staff', 'Athlete', 'Veteran'].includes(fields.degree)) {
        // Move category data from degree to category
        fields.category = fields.degree;
        fields.degree = '';  // Clear degree since we don't have actual degree data
        needsUpdate = true;
      }
      
      // Ensure all required fields exist
      if (!fields.category) {
        fields.category = '';
        needsUpdate = true;
      }
      
      if (!fields.degree) {
        fields.degree = '';
        needsUpdate = true;
      }
      
      // Fix items with undefined name
      if (!data.name && fields.name) {
        updates.name = fields.name;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        updates.fields = fields;
        batch.update(doc.ref, updates);
        fixCount++;
      }
    });
    
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${fixCount} items`);
      console.log('- Moved category data from degree field to category field');
      console.log('- Ensured all items have proper name field');
      console.log('- Added empty degree field where missing');
    } else {
      console.log('No items needed fixing');
    }
    
    // Update display settings to use category instead of degree
    console.log('\nUpdating display settings to use category field...');
    await db.collection('walls').doc(wallId).update({
      'objectTypes.0.displaySettings.secondaryField': 'category'
    });
    
    console.log('✅ Display settings updated to use category as secondary field');
    console.log('\nAll fixes applied! Refresh the page.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixFieldData();