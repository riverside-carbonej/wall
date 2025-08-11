const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Duplicates to investigate
const DUPLICATES = [
  {
    name: 'Jane Hemming (Carsten)',
    ids: ['9Vq4T2EDWNg5GDHY1nJT', 'd3dNHm6oCLH5cDTozBPe']
  },
  {
    name: 'John Warner',
    ids: ['7j8sdBrE65kbSgYXTa7R', 'gnHDNb1T7bE7tLVX4qEG']
  },
  {
    name: 'William Shay III',
    ids: ['U0eWH4wnUFCEjaWwR9Ge', 'UdI1pA3DD43eScv9Lyn8']
  }
];

async function investigateDuplicates() {
  console.log('Investigating exact duplicate names...\n');
  console.log('='.repeat(70) + '\n');
  
  const mergeCandidates = [];
  
  for (const dup of DUPLICATES) {
    console.log(`\nInvestigating: ${dup.name}`);
    console.log('-'.repeat(50));
    
    const docs = await Promise.all(
      dup.ids.map(id => db.collection('wall_items').doc(id).get())
    );
    
    const records = docs.map((doc, index) => ({
      id: dup.ids[index],
      data: doc.data()
    }));
    
    // Compare the records
    console.log('\nRecord 1 (ID: ' + records[0].id + '):');
    console.log('  Name: ' + records[0].data.fieldData?.name);
    console.log('  Rank: ' + (records[0].data.fieldData?.rank || '(empty)'));
    console.log('  Grad Year: ' + (records[0].data.fieldData?.graduationYear || '(empty)'));
    console.log('  Branch Count: ' + (records[0].data.fieldData?.branches?.length || 0));
    console.log('  Entry Date: ' + (records[0].data.fieldData?.militaryEntryDate || '(empty)'));
    console.log('  Exit Date: ' + (records[0].data.fieldData?.militaryExitDate || '(empty)'));
    console.log('  Description: ' + (records[0].data.fieldData?.description ? 
      records[0].data.fieldData.description.substring(0, 50) + '...' : '(empty)'));
    console.log('  Has Image: ' + (records[0].data.images?.length > 0));
    
    console.log('\nRecord 2 (ID: ' + records[1].id + '):');
    console.log('  Name: ' + records[1].data.fieldData?.name);
    console.log('  Rank: ' + (records[1].data.fieldData?.rank || '(empty)'));
    console.log('  Grad Year: ' + (records[1].data.fieldData?.graduationYear || '(empty)'));
    console.log('  Branch Count: ' + (records[1].data.fieldData?.branches?.length || 0));
    console.log('  Entry Date: ' + (records[1].data.fieldData?.militaryEntryDate || '(empty)'));
    console.log('  Exit Date: ' + (records[1].data.fieldData?.militaryExitDate || '(empty)'));
    console.log('  Description: ' + (records[1].data.fieldData?.description ? 
      records[1].data.fieldData.description.substring(0, 50) + '...' : '(empty)'));
    console.log('  Has Image: ' + (records[1].data.images?.length > 0));
    
    // Determine if they're the same person
    const field1 = records[0].data.fieldData || {};
    const field2 = records[1].data.fieldData || {};
    
    // Check key fields for similarity
    const sameGradYear = field1.graduationYear === field2.graduationYear;
    const sameBranch = JSON.stringify(field1.branches) === JSON.stringify(field2.branches);
    const sameRank = field1.rank === field2.rank;
    const sameEntryDate = field1.militaryEntryDate === field2.militaryEntryDate;
    
    // Decision logic
    let shouldMerge = false;
    let reason = '';
    
    if (sameGradYear && field1.graduationYear) {
      // Same graduation year is strong indicator
      shouldMerge = true;
      reason = 'Same graduation year';
    } else if (sameRank && field1.rank) {
      // Same rank is good indicator
      shouldMerge = true;
      reason = 'Same rank';
    } else if (sameEntryDate && field1.militaryEntryDate) {
      shouldMerge = true;
      reason = 'Same military entry date';
    } else if (!field1.graduationYear && !field2.graduationYear && 
               !field1.rank && !field2.rank) {
      // Both have minimal data, likely same person
      shouldMerge = true;
      reason = 'Both have minimal data, likely same person';
    }
    
    console.log('\n🔍 Analysis:');
    console.log('  Same grad year: ' + sameGradYear + ' (' + (field1.graduationYear || 'none') + ')');
    console.log('  Same rank: ' + sameRank + ' (' + (field1.rank || 'none') + ')');
    console.log('  Same branch: ' + sameBranch);
    console.log('  Same entry date: ' + sameEntryDate);
    
    console.log('\n💡 Recommendation: ' + (shouldMerge ? '✅ MERGE' : '❌ KEEP SEPARATE'));
    if (shouldMerge) {
      console.log('  Reason: ' + reason);
      
      // Determine which record to keep (prefer the one with more data)
      const score1 = (field1.rank ? 1 : 0) + 
                     (field1.graduationYear ? 1 : 0) + 
                     (field1.description ? 1 : 0) +
                     (records[0].data.images?.length > 0 ? 2 : 0);
      const score2 = (field2.rank ? 1 : 0) + 
                     (field2.graduationYear ? 1 : 0) + 
                     (field2.description ? 1 : 0) +
                     (records[1].data.images?.length > 0 ? 2 : 0);
      
      const keepId = score1 >= score2 ? records[0].id : records[1].id;
      const deleteId = score1 >= score2 ? records[1].id : records[0].id;
      
      console.log('  Keep: ' + keepId + ' (score: ' + Math.max(score1, score2) + ')');
      console.log('  Delete: ' + deleteId + ' (score: ' + Math.min(score1, score2) + ')');
      
      mergeCandidates.push({
        name: dup.name,
        keepId: keepId,
        deleteId: deleteId,
        reason: reason,
        keepData: score1 >= score2 ? field1 : field2,
        deleteData: score1 >= score2 ? field2 : field1
      });
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\nSUMMARY:');
  console.log(`  Investigated: ${DUPLICATES.length} duplicate names`);
  console.log(`  Recommended merges: ${mergeCandidates.length}`);
  
  if (mergeCandidates.length > 0) {
    // Save merge candidates
    const filename = 'merge-candidates.json';
    fs.writeFileSync(filename, JSON.stringify(mergeCandidates, null, 2));
    console.log(`\n📝 Merge candidates saved to: ${filename}`);
    
    console.log('\nTo merge these duplicates, run: node merge-exact-duplicates.js');
  }
  
  await admin.app().delete();
}

// Run investigation
investigateDuplicates().catch(console.error);