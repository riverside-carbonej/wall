const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAllItemFields() {
  try {
    console.log('FINDING AND FIXING ITEMS WITH MISSING FIELDS');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get all items
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log('Total items:', items.size);
    
    let problemItems = 0;
    let missingFields = 0;
    let missingCategory = 0;
    
    const batch = db.batch();
    
    items.docs.forEach(doc => {
      const data = doc.data();
      let needsUpdate = false;
      
      // Ensure fields object exists
      if (!data.fields) {
        data.fields = {};
        needsUpdate = true;
        missingFields++;
      }
      
      // Ensure all required fields exist (even if empty)
      const requiredFields = ['name', 'graduationYear', 'category', 'degree', 'currentPosition', 'email'];
      
      requiredFields.forEach(field => {
        if (data.fields[field] === undefined) {
          data.fields[field] = '';
          needsUpdate = true;
          if (field === 'category') missingCategory++;
        }
      });
      
      // Ensure item has a name at top level
      if (!data.name) {
        data.name = data.fields.name || 'Unknown';
        needsUpdate = true;
      }
      
      // Ensure published is set
      if (data.published === undefined) {
        data.published = true;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        batch.update(doc.ref, data);
        problemItems++;
      }
    });
    
    console.log('\nFound issues:');
    console.log('- Items with problems:', problemItems);
    console.log('- Items missing fields object:', missingFields);
    console.log('- Items missing category field:', missingCategory);
    
    if (problemItems > 0) {
      await batch.commit();
      console.log('\n✅ Fixed all', problemItems, 'problematic items');
      console.log('All items now have:');
      console.log('- Complete fields object with all required fields');
      console.log('- Category field (even if empty)');
      console.log('- Top-level name');
      console.log('- Published status');
    } else {
      console.log('\nAll items already have proper structure');
    }
    
    // Also show a sample item to verify structure
    console.log('\nSample item after fixes:');
    const sampleItem = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .limit(1)
      .get();
    
    if (!sampleItem.empty) {
      const sample = sampleItem.docs[0].data();
      console.log('- Name:', sample.name);
      console.log('- Published:', sample.published);
      console.log('- Fields present:', Object.keys(sample.fields));
      console.log('- Category value:', sample.fields.category || '(empty)');
    }
    
    console.log('\n✅ The error should be gone now. Refresh the page!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAllItemFields();