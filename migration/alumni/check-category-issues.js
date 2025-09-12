const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCategoryIssues() {
  try {
    console.log('DEEP CHECK FOR CATEGORY FIELD ISSUES');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get ALL items
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log('Total items:', items.size);
    
    let problemCount = 0;
    const problemItems = [];
    
    items.docs.forEach(doc => {
      const data = doc.data();
      
      // Check for various issues
      if (!data.fields || 
          data.fields === null || 
          typeof data.fields !== 'object' ||
          data.fields.category === undefined ||
          data.fields.category === null) {
        
        problemCount++;
        problemItems.push({
          id: doc.id,
          name: data.name,
          hasFields: !!data.fields,
          fieldsType: typeof data.fields,
          categoryValue: data.fields ? data.fields.category : 'NO_FIELDS',
          allFields: data.fields ? Object.keys(data.fields) : []
        });
      }
    });
    
    console.log('\nProblem items found:', problemCount);
    
    if (problemCount > 0) {
      console.log('\nFirst 5 problem items:');
      problemItems.slice(0, 5).forEach(item => {
        console.log('\nItem ID:', item.id);
        console.log('- Name:', item.name);
        console.log('- Has fields:', item.hasFields);
        console.log('- Fields type:', item.fieldsType);
        console.log('- Category value:', item.categoryValue);
        console.log('- All fields:', item.allFields);
      });
      
      // Fix them
      console.log('\n\nFIXING ALL PROBLEM ITEMS...');
      const batch = db.batch();
      
      for (const problemItem of problemItems) {
        const docRef = db.collection('wall_items').doc(problemItem.id);
        const doc = await docRef.get();
        const data = doc.data();
        
        if (!data.fields) {
          data.fields = {};
        }
        
        // Ensure all fields exist
        const requiredFields = ['name', 'graduationYear', 'category', 'degree', 'currentPosition', 'email'];
        requiredFields.forEach(field => {
          if (data.fields[field] === undefined || data.fields[field] === null) {
            data.fields[field] = '';
          }
        });
        
        batch.update(docRef, { fields: data.fields });
      }
      
      await batch.commit();
      console.log(`\n✅ Fixed ${problemCount} items with category issues`);
    } else {
      console.log('\n✅ No items with category issues found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCategoryIssues();