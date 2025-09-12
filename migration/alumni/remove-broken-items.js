const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeBrokenItems() {
  try {
    console.log('FIXING OR REMOVING BROKEN ITEMS');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Find items with no data
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    const brokenItems = [];
    
    items.docs.forEach(doc => {
      const data = doc.data();
      
      // Check if item has any real data
      let hasData = false;
      if (data.fields) {
        Object.values(data.fields).forEach(val => {
          if (val && val !== '') hasData = true;
        });
      }
      
      // If name is 'Unknown' or no data at all, it's broken
      if (data.name === 'Unknown' || !hasData) {
        brokenItems.push({
          id: doc.id,
          name: data.name,
          fields: data.fields
        });
      }
    });
    
    console.log('Found', brokenItems.length, 'broken items');
    
    if (brokenItems.length > 0) {
      console.log('\nDeleting broken items:');
      const batch = db.batch();
      
      brokenItems.forEach(item => {
        console.log('- Deleting:', item.name);
        batch.delete(db.collection('wall_items').doc(item.id));
      });
      
      await batch.commit();
      console.log('\n✅ Deleted', brokenItems.length, 'broken items');
      
      // Count remaining
      const remaining = await db.collection('wall_items')
        .where('wallId', '==', wallId)
        .get();
      
      console.log('\nRemaining valid items:', remaining.size);
    }
    
    console.log('\n✅ Cleaned up! The wall should work now.');
    console.log('Refresh the page to see the alumni wall without errors.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

removeBrokenItems();