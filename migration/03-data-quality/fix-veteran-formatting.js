const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Manual fixes for specific problematic entries
const MANUAL_FIXES = {
  'T5mdUat8QPqOTv4bHEhn': {
    name: 'Israel Turkey', // Remove quotes, fix capitalization
    rank: 'FPO NY' // Remove quotes
  },
  '2LUPZvqjpPvqRfoARXGG': {
    name: 'Laurence "Larry" Harley' // Fix quotes formatting
  },
  'e1V11co1cyztn61n0wmi': {
    name: 'Georgia Young (Ash)' // Change "formerly" to standard maiden name format
  },
  'sjIcA5YJHYVNaK0wAUTw': {
    name: 'Gregory Script Blank', // Simplify from "Greg (gregory) Script Blank ON Quesion"
    rank: 'O-3 Captain On active Duty (O-2) 1LT' // Remove double space
  },
  '9Vq4T2EDWNg5GDHY1nJT': {
    name: 'Jane Hemming (Carsten)', // Change "Now Carsten" to maiden name format
    rank: 'E-6 Staff Sergeant' // Add hyphen for consistency
  },
  '27dhUcztTvHx48vegaOX': {
    rank: 'E-5 02E' // Remove double space
  },
  'U0eWH4wnUFCEjaWwR9Ge': {
    name: 'William Shay III', // Change "William Shay. 3rd" to proper format
    rank: 'E-4 Corporal' // Add hyphen for consistency
  }
};

async function fixVeteranFormatting() {
  console.log('Starting veteran data formatting fixes...\n');
  console.log('='.repeat(70) + '\n');
  
  const changes = [];
  const batch = db.batch();
  let batchCount = 0;
  
  for (const [docId, fixes] of Object.entries(MANUAL_FIXES)) {
    try {
      // Get the current document
      const docRef = db.collection('wall_items').doc(docId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log(`⚠️  Document ${docId} not found`);
        continue;
      }
      
      const currentData = doc.data();
      const currentFieldData = currentData.fieldData || {};
      
      // Track what we're changing
      const change = {
        id: docId,
        before: {},
        after: {}
      };
      
      // Apply fixes
      const updatedFieldData = { ...currentFieldData };
      
      if (fixes.name && fixes.name !== currentFieldData.name) {
        change.before.name = currentFieldData.name;
        change.after.name = fixes.name;
        updatedFieldData.name = fixes.name;
      }
      
      if (fixes.rank && fixes.rank !== currentFieldData.rank) {
        change.before.rank = currentFieldData.rank;
        change.after.rank = fixes.rank;
        updatedFieldData.rank = fixes.rank;
      }
      
      // Only update if there are actual changes
      if (Object.keys(change.before).length > 0) {
        batch.update(docRef, { fieldData: updatedFieldData });
        batchCount++;
        changes.push(change);
        
        console.log(`✅ Fixing veteran ${docId}:`);
        if (change.before.name) {
          console.log(`   Name: "${change.before.name}" → "${change.after.name}"`);
        }
        if (change.before.rank) {
          console.log(`   Rank: "${change.before.rank}" → "${change.after.rank}"`);
        }
      } else {
        console.log(`⏭️  No changes needed for ${docId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${docId}:`, error.message);
    }
  }
  
  // Commit the batch
  if (batchCount > 0) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Applying ${batchCount} updates to Firebase...`);
    
    await batch.commit();
    
    console.log('✅ All updates applied successfully!\n');
    
    // Save change log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = `formatting-fixes-${timestamp}.json`;
    fs.writeFileSync(logFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalChanges: changes.length,
      changes: changes
    }, null, 2));
    
    console.log(`📝 Change log saved to: ${logFile}`);
    
    // Print summary
    console.log('\nSUMMARY:');
    console.log(`  Total veterans fixed: ${changes.length}`);
    console.log(`  Name fixes: ${changes.filter(c => c.before.name).length}`);
    console.log(`  Rank fixes: ${changes.filter(c => c.before.rank).length}`);
  } else {
    console.log('\nNo changes were needed.');
  }
  
  await admin.app().delete();
}

// Run the fixes
fixVeteranFormatting().catch(console.error);