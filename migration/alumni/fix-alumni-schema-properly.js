const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixAlumniSchemaCorrectly() {
  try {
    console.log('=== FIXING ALUMNI WALL TO MATCH CORRECT SCHEMA ===\n');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // First, ensure the wall's objectTypes is correct
    console.log('Step 1: Verifying wall objectTypes structure...');
    const wallDoc = await db.collection('walls').doc(wallId).get();
    const wallData = wallDoc.data();
    
    if (Array.isArray(wallData.objectTypes) && wallData.objectTypes[0]) {
      console.log('✓ objectTypes is already an array');
      console.log('✓ wallId matches:', wallData.objectTypes[0].wallId === wallId);
    }
    
    // The CRITICAL fix: Items must use fieldData instead of fields
    console.log('\nStep 2: Converting item.fields to item.fieldData...');
    
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`Found ${items.size} items to fix`);
    
    const batch = db.batch();
    let fixCount = 0;
    
    items.docs.forEach(doc => {
      const item = doc.data();
      
      // Convert fields to fieldData structure
      if (item.fields && !item.fieldData) {
        const updates = {
          fieldData: item.fields,  // Move fields to fieldData
          fields: admin.firestore.FieldValue.delete()  // Remove old fields
        };
        
        // Ensure proper timestamps
        if (!item.createdAt) {
          updates.createdAt = admin.firestore.Timestamp.now();
        }
        if (!item.updatedAt) {
          updates.updatedAt = admin.firestore.Timestamp.now();
        }
        
        // Add createdBy/updatedBy if missing
        if (!item.createdBy) {
          updates.createdBy = 'migration';
        }
        if (!item.updatedBy) {
          updates.updatedBy = 'migration';
        }
        
        // Remove 'published' field as it's not in the working schema
        if (item.published !== undefined) {
          updates.published = admin.firestore.FieldValue.delete();
        }
        
        // Remove 'name' field as it should be in fieldData
        if (item.name) {
          updates.name = admin.firestore.FieldValue.delete();
        }
        
        batch.update(doc.ref, updates);
        fixCount++;
      }
    });
    
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✓ Fixed ${fixCount} items: converted fields to fieldData`);
    } else {
      console.log('✓ No items needed field conversion');
    }
    
    // Step 3: Verify the fix
    console.log('\nStep 3: Verifying the fix...');
    const verifyItems = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .limit(2)
      .get();
    
    console.log('\nSample items after fix:');
    verifyItems.docs.forEach((doc, i) => {
      const item = doc.data();
      console.log(`\nItem ${i+1}:`);
      console.log('- Has fieldData:', !!item.fieldData);
      console.log('- Has fields:', !!item.fields);
      console.log('- Has createdAt:', !!item.createdAt);
      console.log('- Has createdBy:', !!item.createdBy);
      if (item.fieldData) {
        console.log('- fieldData.name:', item.fieldData.name);
        console.log('- fieldData.category:', item.fieldData.category);
      }
    });
    
    console.log('\n✅ ALUMNI WALL SCHEMA FIXED!');
    console.log('The wall now matches the correct schema used by working walls.');
    console.log('Items now use fieldData instead of fields.');
    console.log('\nRefresh the app to see if it works correctly now.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAlumniSchemaCorrectly();