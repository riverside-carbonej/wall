const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWhatAppActuallyShows() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🔍 WHAT DOES THE APP ACTUALLY SHOW?\n');
    
    // Get the items that would match the app's query exactly
    console.log('1. Simulating app query with limit(2):');
    
    const appQuery = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .where('objectTypeId', '==', 'ot_1757607682911_brfg8d3ft')
      .where('published', '==', true)
      .limit(2)
      .get();
    
    console.log(`   Query returns ${appQuery.size} items:`);
    appQuery.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   [${index + 1}] "${data.name}"`);
      console.log(`       ID: ${doc.id}`);
      console.log(`       Created: ${data.createdAt?.toDate?.()}`);
      console.log(`       Fields:`, JSON.stringify(data.fields, null, 4));
    });
    
    // Check if there are any items with different characteristics
    console.log('\n2. Checking for items that might be "default" or "sample":');
    
    const allWallItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    console.log(`   Total items in wall: ${allWallItems.size}`);
    
    // Look for patterns that might indicate default/sample items
    const itemAnalysis = {
      hasSampleInName: [],
      hasEmptyFields: [],
      createdBeforeImport: [],
      createdDuringImport: [],
      differentObjectType: []
    };
    
    const importTime = new Date('2025-09-11T12:45:00');
    
    allWallItems.docs.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.();
      
      // Check for sample/default indicators
      if (data.name && data.name.toLowerCase().includes('sample')) {
        itemAnalysis.hasSampleInName.push(data.name);
      }
      
      // Check for empty/default field patterns
      const fields = data.fields || {};
      const fieldValues = Object.values(fields).filter(v => v && v !== '');
      if (fieldValues.length <= 2) { // Only name and maybe one other field
        itemAnalysis.hasEmptyFields.push({
          name: data.name,
          filledFields: fieldValues.length,
          fields: fields
        });
      }
      
      // Check creation time
      if (createdAt) {
        if (createdAt < importTime) {
          itemAnalysis.createdBeforeImport.push({
            name: data.name,
            createdAt: createdAt.toISOString()
          });
        } else {
          itemAnalysis.createdDuringImport.push(data.name);
        }
      }
      
      // Check object type
      if (data.objectTypeId !== 'ot_1757607682911_brfg8d3ft') {
        itemAnalysis.differentObjectType.push({
          name: data.name,
          objectTypeId: data.objectTypeId
        });
      }
    });
    
    console.log('\n📊 ITEM ANALYSIS:');
    console.log(`   Items with "sample" in name: ${itemAnalysis.hasSampleInName.length}`);
    if (itemAnalysis.hasSampleInName.length > 0) {
      console.log(`     ${itemAnalysis.hasSampleInName.join(', ')}`);
    }
    
    console.log(`   Items with mostly empty fields: ${itemAnalysis.hasEmptyFields.length}`);
    if (itemAnalysis.hasEmptyFields.length > 0 && itemAnalysis.hasEmptyFields.length <= 5) {
      itemAnalysis.hasEmptyFields.forEach(item => {
        console.log(`     "${item.name}" (${item.filledFields} filled fields)`);
      });
    }
    
    console.log(`   Items created BEFORE import: ${itemAnalysis.createdBeforeImport.length}`);
    if (itemAnalysis.createdBeforeImport.length > 0) {
      console.log(`     👆 THESE MIGHT BE THE DEFAULT ITEMS YOU SEE!`);
      itemAnalysis.createdBeforeImport.forEach(item => {
        console.log(`       "${item.name}" created at ${item.createdAt}`);
      });
    }
    
    console.log(`   Items created DURING import: ${itemAnalysis.createdDuringImport.length}`);
    console.log(`   Items with different object type: ${itemAnalysis.differentObjectType.length}`);
    
    if (itemAnalysis.createdBeforeImport.length === 2) {
      console.log('\n🎯 MYSTERY SOLVED!');
      console.log('The app is probably showing the 2 items created BEFORE our import.');
      console.log('Our 162 alumni exist but are being filtered out somehow!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWhatAppActuallyShows();