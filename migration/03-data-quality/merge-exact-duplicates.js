const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Load merge candidates
const mergeCandidates = JSON.parse(fs.readFileSync('./merge-candidates.json', 'utf8'));

async function mergeExactDuplicates() {
  console.log('Merging exact duplicate veterans...\n');
  console.log('='.repeat(70) + '\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const candidate of mergeCandidates) {
    console.log(`Processing: ${candidate.name}`);
    console.log(`  Keep ID: ${candidate.keepId}`);
    console.log(`  Delete ID: ${candidate.deleteId}`);
    console.log(`  Reason: ${candidate.reason}\n`);
    
    try {
      // Get both documents
      const keepRef = db.collection('wall_items').doc(candidate.keepId);
      const deleteRef = db.collection('wall_items').doc(candidate.deleteId);
      
      const [keepDoc, deleteDoc] = await Promise.all([
        keepRef.get(),
        deleteRef.get()
      ]);
      
      if (!keepDoc.exists) {
        console.log(`⚠️  Keep document ${candidate.keepId} not found`);
        errorCount++;
        continue;
      }
      
      if (!deleteDoc.exists) {
        console.log(`⚠️  Delete document ${candidate.deleteId} not found`);
        errorCount++;
        continue;
      }
      
      const keepData = keepDoc.data();
      const deleteData = deleteDoc.data();
      
      // Merge data - take any non-empty fields from delete record
      const mergedFieldData = { ...keepData.fieldData };
      const deleteFieldData = deleteData.fieldData || {};
      
      // Merge each field, keeping the most complete data
      Object.keys(deleteFieldData).forEach(key => {
        if (deleteFieldData[key] && !mergedFieldData[key]) {
          console.log(`  Taking ${key} from delete record: "${deleteFieldData[key]}"`);
          mergedFieldData[key] = deleteFieldData[key];
        }
      });
      
      // Merge images array if delete record has images
      let mergedImages = keepData.images || [];
      if (deleteData.images && deleteData.images.length > 0) {
        // Check if images are different
        const keepImageUrls = mergedImages.map(img => img.url || '');
        deleteData.images.forEach(img => {
          if (img.url && !keepImageUrls.includes(img.url)) {
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
      
      console.log(`✅ Successfully merged "${candidate.name}"`);
      console.log(`   Kept: ${candidate.keepId}`);
      console.log(`   Deleted: ${candidate.deleteId}\n`);
      
      successCount++;
      
      // Log the merge
      const mergeLog = {
        timestamp: new Date().toISOString(),
        action: 'merge_exact_duplicate',
        keepId: candidate.keepId,
        deleteId: candidate.deleteId,
        name: candidate.name,
        reason: candidate.reason
      };
      
      fs.appendFileSync('exact-duplicate-merges.log', JSON.stringify(mergeLog) + '\n');
      
    } catch (error) {
      console.error(`❌ Error merging ${candidate.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('='.repeat(70));
  console.log('\nMERGE COMPLETE!');
  console.log(`  Successful merges: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total veterans removed: ${successCount}`);
  
  // Calculate new total
  console.log(`\n📊 Database now has approximately ${578 - successCount} veterans`);
  
  await admin.app().delete();
}

// Run the merge
mergeExactDuplicates().catch(console.error);