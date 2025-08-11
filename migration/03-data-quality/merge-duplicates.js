const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Duplicates to merge
const DUPLICATES_TO_MERGE = [
  {
    keepId: 'u63QHlxH698JTTbHM7bO',  // Keep this one (has simpler rank format)
    deleteId: 'e1V11co1cyztn61n0wmi', // Delete this one
    name: 'Georgia Young (Ash)',
    fixedRank: 'Sergeant SP-4' // Standardize the rank format
  }
];

async function mergeDuplicates() {
  console.log('Merging duplicate veteran entries...\n');
  console.log('='.repeat(70) + '\n');
  
  for (const duplicate of DUPLICATES_TO_MERGE) {
    console.log(`Processing: ${duplicate.name}`);
    console.log(`  Keep ID: ${duplicate.keepId}`);
    console.log(`  Delete ID: ${duplicate.deleteId}\n`);
    
    try {
      // Get both documents
      const keepRef = db.collection('wall_items').doc(duplicate.keepId);
      const deleteRef = db.collection('wall_items').doc(duplicate.deleteId);
      
      const [keepDoc, deleteDoc] = await Promise.all([
        keepRef.get(),
        deleteRef.get()
      ]);
      
      if (!keepDoc.exists) {
        console.log(`⚠️  Keep document ${duplicate.keepId} not found`);
        continue;
      }
      
      if (!deleteDoc.exists) {
        console.log(`⚠️  Delete document ${duplicate.deleteId} not found`);
        continue;
      }
      
      const keepData = keepDoc.data();
      const deleteData = deleteDoc.data();
      
      console.log('Comparing data:');
      console.log('  Keep record:');
      console.log(`    Name: "${keepData.fieldData?.name}"`);
      console.log(`    Rank: "${keepData.fieldData?.rank}"`);
      console.log(`    Grad Year: ${keepData.fieldData?.graduationYear}`);
      console.log(`    Has image: ${!!keepData.images?.length}`);
      
      console.log('  Delete record:');
      console.log(`    Name: "${deleteData.fieldData?.name}"`);
      console.log(`    Rank: "${deleteData.fieldData?.rank}"`);
      console.log(`    Grad Year: ${deleteData.fieldData?.graduationYear}`);
      console.log(`    Has image: ${!!deleteData.images?.length}`);
      
      // Merge data - take any non-empty fields from delete record
      const mergedFieldData = { ...keepData.fieldData };
      
      // Check each field and keep the most complete data
      const deleteFieldData = deleteData.fieldData || {};
      Object.keys(deleteFieldData).forEach(key => {
        if (deleteFieldData[key] && !mergedFieldData[key]) {
          console.log(`  Taking ${key} from delete record: "${deleteFieldData[key]}"`);
          mergedFieldData[key] = deleteFieldData[key];
        }
      });
      
      // Use the fixed rank format
      mergedFieldData.rank = duplicate.fixedRank;
      
      // Merge images array if delete record has images
      let mergedImages = keepData.images || [];
      if (deleteData.images && deleteData.images.length > 0) {
        // Check if images are different
        const keepImageUrls = mergedImages.map(img => img.url);
        deleteData.images.forEach(img => {
          if (!keepImageUrls.includes(img.url)) {
            console.log('  Adding image from delete record');
            mergedImages.push(img);
          }
        });
      }
      
      // Preserve the earlier creation date
      const keepCreated = keepData.createdAt?.toDate?.() || keepData.createdAt;
      const deleteCreated = deleteData.createdAt?.toDate?.() || deleteData.createdAt;
      let createdAt = keepData.createdAt;
      if (deleteCreated && keepCreated && new Date(deleteCreated) < new Date(keepCreated)) {
        createdAt = deleteData.createdAt;
        console.log('  Using earlier creation date from delete record');
      }
      
      // Create batch for atomic operation
      const batch = db.batch();
      
      // Update the keep document with merged data
      batch.update(keepRef, {
        fieldData: mergedFieldData,
        images: mergedImages,
        createdAt: createdAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Delete the duplicate document
      batch.delete(deleteRef);
      
      // Commit the batch
      await batch.commit();
      
      console.log(`\n✅ Successfully merged and deleted duplicate`);
      console.log(`   Final name: "${mergedFieldData.name}"`);
      console.log(`   Final rank: "${mergedFieldData.rank}"`);
      
      // Log the merge
      const mergeLog = {
        timestamp: new Date().toISOString(),
        action: 'merge',
        keepId: duplicate.keepId,
        deleteId: duplicate.deleteId,
        name: duplicate.name,
        mergedData: mergedFieldData
      };
      
      fs.appendFileSync('duplicate-merges.log', JSON.stringify(mergeLog) + '\n');
      
    } catch (error) {
      console.error(`❌ Error merging ${duplicate.name}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Merge complete!');
  
  await admin.app().delete();
}

// Run the merge
mergeDuplicates().catch(console.error);