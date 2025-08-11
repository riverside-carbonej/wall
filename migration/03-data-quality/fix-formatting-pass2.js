const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Auto-fix rules
const AUTO_FIXES = {
  // Names with trailing asterisks or slashes
  '4NVsz8ulVNphhL0hSQPC': { name: 'James Marizek' },
  'Hlmx1l44PmKbRk8pwMad': { name: 'Joe Mattern' },
  'Ep1DBRM6r89m0pRCMu6W': { name: 'Jonathan Ivaskovic' },
  'kW60Jqr2UBPJiO7DjBVa': { name: 'Jordan Dawson' },
  'qEf7wPnqW21Au16rPruD': { name: 'Richard H Libby Jr.' }, // Fix Jr/ to Jr.
  'IpULl3QBRxSx5DLei2AI': { name: 'Robert (Bobby) Cichinelli' }, // Capitalize Bobby
  'vGL9iWyH3tz7CJAo4cDj': { name: 'Sally Hurayt (Dolenc)' }, // Capitalize Dolenc
  'eYfMp3aWxvLWI9cA5nl1': { name: 'Shawn McClure' }, // Capitalize C
  'jdUdT53kMpfQzLC1GcFk': { name: 'Steven Ivaskovic' },
  
  // Rank fixes - Missing spaces around slashes
  '3SxRpPbaXG2qNyYWkqdY': { rank: 'E-6 / TSgt' },
  'SUWCJMHuChDrSZyo2daD': { rank: 'SGT / E-5' },
  'zwoFxC2DVq35nAJdvYWW': { rank: 'E-6 / TSgt' },
  '8J1mw8GUl8lhpcd89mfC': { rank: 'FC1 / E-6' },
  'GgLQFKCh4FYL0nbuUPuo': { rank: 'E-6 / TSgt' },
  
  // Rank fixes - Missing hyphens
  'wHcyD8fx54pt7ptlKKbN': { rank: 'SGT E-5' },
  'KrKo4bmhXCROyNqwmPgn': { rank: 'E-5' },
  
  // Misspelled Sergeant
  'e1V11co1cyztn61n0wmi': { rank: 'Sergeant SP-4' },
  
  // Parentheses spacing (these are actually OK, the analyzer was wrong)
  // Skipping these as they don't actually need fixing
};

async function fixFormattingPass2() {
  console.log('Pass 2: Fixing additional formatting issues...\n');
  console.log('='.repeat(70) + '\n');
  
  const changes = [];
  const batch = db.batch();
  let batchCount = 0;
  
  for (const [docId, fixes] of Object.entries(AUTO_FIXES)) {
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
    const logFile = `formatting-fixes-pass2-${timestamp}.json`;
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
    console.log(`    - Removed asterisks: ${changes.filter(c => c.before.name && c.before.name.includes('*')).length}`);
    console.log(`    - Fixed Jr/: ${changes.filter(c => c.before.name && c.before.name.includes('Jr/')).length}`);
    console.log(`    - Fixed capitalization: ${changes.filter(c => c.before.name && c.before.name.toLowerCase().includes('(bobby)') || c.before.name.toLowerCase().includes('(dolenc)')).length}`);
    console.log(`  Rank fixes: ${changes.filter(c => c.before.rank).length}`);
    console.log(`    - Added spaces around slashes: ${changes.filter(c => c.before.rank && c.before.rank.includes('/')).length}`);
    console.log(`    - Added hyphens: ${changes.filter(c => c.before.rank && (c.before.rank.includes('E5') || c.before.rank.includes('E-5'))).length}`);
    console.log(`    - Fixed misspellings: ${changes.filter(c => c.before.rank && c.before.rank.toLowerCase().includes('seargant')).length}`);
  } else {
    console.log('\nNo changes were needed.');
  }
  
  await admin.app().delete();
}

// Run the fixes
fixFormattingPass2().catch(console.error);