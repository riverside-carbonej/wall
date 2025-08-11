const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Function to calculate similarity between two strings
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };
  
  return (longer.length - editDistance(longer.toLowerCase(), shorter.toLowerCase())) / longer.length;
}

// Function to normalize names for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove non-letters
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
}

async function exportNamesAndCheckDuplicates() {
  console.log('Fetching all veterans from Firebase...\n');
  
  // Get all veterans
  const snapshot = await db.collection('wall_items')
    .where('wallId', '==', 'Fkzc5Kh7gMpyTEm5Cl6d')
    .where('objectTypeId', '==', 'veteran')
    .get();
  
  console.log(`Found ${snapshot.size} veterans\n`);
  
  const veterans = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    veterans.push({
      id: doc.id,
      name: data.fieldData?.name || '',
      rank: data.fieldData?.rank || '',
      gradYear: data.fieldData?.graduationYear || ''
    });
  });
  
  // Sort by name
  veterans.sort((a, b) => a.name.localeCompare(b.name));
  
  // Export to CSV
  let csvContent = 'ID,Name,Rank,Graduation Year\n';
  veterans.forEach(v => {
    csvContent += `"${v.id}","${v.name}","${v.rank}","${v.gradYear}"\n`;
  });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const csvFilename = `Veterans-Names-${timestamp}.csv`;
  fs.writeFileSync(csvFilename, csvContent);
  console.log(`✅ Names exported to: ${csvFilename}\n`);
  
  // Check for potential duplicates
  console.log('Checking for potential duplicate names...\n');
  console.log('='.repeat(70) + '\n');
  
  const potentialDuplicates = [];
  
  for (let i = 0; i < veterans.length; i++) {
    for (let j = i + 1; j < veterans.length; j++) {
      const v1 = veterans[i];
      const v2 = veterans[j];
      
      // Skip if names are empty
      if (!v1.name || !v2.name) continue;
      
      // Check exact match
      if (v1.name === v2.name) {
        potentialDuplicates.push({
          type: 'EXACT MATCH',
          veteran1: v1,
          veteran2: v2,
          similarity: 1.0
        });
        continue;
      }
      
      // Check similarity
      const sim = similarity(v1.name, v2.name);
      
      // Check normalized names
      const norm1 = normalizeName(v1.name);
      const norm2 = normalizeName(v2.name);
      
      // Check for high similarity (> 85%)
      if (sim > 0.85) {
        potentialDuplicates.push({
          type: 'HIGH SIMILARITY',
          veteran1: v1,
          veteran2: v2,
          similarity: sim
        });
      }
      // Check if last names are identical and first names are similar
      else {
        const parts1 = v1.name.split(' ');
        const parts2 = v2.name.split(' ');
        
        const last1 = parts1[parts1.length - 1];
        const last2 = parts2[parts2.length - 1];
        
        if (last1 && last2 && last1.toLowerCase() === last2.toLowerCase()) {
          // Same last name, check if first names are similar
          const first1 = parts1[0] || '';
          const first2 = parts2[0] || '';
          
          // Check for nicknames or variations
          if (first1 && first2) {
            const firstSim = similarity(first1, first2);
            if (firstSim > 0.7 || 
                (first1.toLowerCase().startsWith(first2.toLowerCase().substring(0, 3)) && first2.length > 2) ||
                (first2.toLowerCase().startsWith(first1.toLowerCase().substring(0, 3)) && first1.length > 2)) {
              potentialDuplicates.push({
                type: 'SAME LAST NAME',
                veteran1: v1,
                veteran2: v2,
                similarity: sim,
                note: `First names: "${first1}" vs "${first2}"`
              });
            }
          }
        }
      }
    }
  }
  
  // Print results
  if (potentialDuplicates.length === 0) {
    console.log('✅ No potential duplicates found!\n');
  } else {
    console.log(`⚠️  Found ${potentialDuplicates.length} potential duplicates:\n`);
    
    // Group by type
    const exactMatches = potentialDuplicates.filter(d => d.type === 'EXACT MATCH');
    const highSimilarity = potentialDuplicates.filter(d => d.type === 'HIGH SIMILARITY');
    const sameLastName = potentialDuplicates.filter(d => d.type === 'SAME LAST NAME');
    
    if (exactMatches.length > 0) {
      console.log('EXACT MATCHES:');
      console.log('-'.repeat(50));
      exactMatches.forEach(dup => {
        console.log(`  "${dup.veteran1.name}" (${dup.veteran1.gradYear || 'no year'})`);
        console.log(`  "${dup.veteran2.name}" (${dup.veteran2.gradYear || 'no year'})`);
        console.log(`  IDs: ${dup.veteran1.id} vs ${dup.veteran2.id}`);
        console.log('');
      });
    }
    
    if (highSimilarity.length > 0) {
      console.log('\nHIGH SIMILARITY (>85%):');
      console.log('-'.repeat(50));
      highSimilarity.forEach(dup => {
        console.log(`  "${dup.veteran1.name}" (${dup.veteran1.gradYear || 'no year'})`);
        console.log(`  "${dup.veteran2.name}" (${dup.veteran2.gradYear || 'no year'})`);
        console.log(`  Similarity: ${(dup.similarity * 100).toFixed(1)}%`);
        console.log(`  IDs: ${dup.veteran1.id} vs ${dup.veteran2.id}`);
        console.log('');
      });
    }
    
    if (sameLastName.length > 0) {
      console.log('\nSAME LAST NAME (possible relatives or variations):');
      console.log('-'.repeat(50));
      sameLastName.forEach(dup => {
        console.log(`  "${dup.veteran1.name}" (${dup.veteran1.gradYear || 'no year'})`);
        console.log(`  "${dup.veteran2.name}" (${dup.veteran2.gradYear || 'no year'})`);
        if (dup.note) console.log(`  Note: ${dup.note}`);
        console.log('');
      });
    }
    
    // Save to file
    const dupFilename = `Potential-Duplicates-${timestamp}.json`;
    fs.writeFileSync(dupFilename, JSON.stringify(potentialDuplicates, null, 2));
    console.log(`\n📝 Potential duplicates saved to: ${dupFilename}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\nSUMMARY:');
  console.log(`  Total veterans: ${veterans.length}`);
  console.log(`  Unique names: ${new Set(veterans.map(v => v.name)).size}`);
  console.log(`  Potential duplicates: ${potentialDuplicates.length}`);
  
  await admin.app().delete();
}

// Run the export and check
exportNamesAndCheckDuplicates().catch(console.error);