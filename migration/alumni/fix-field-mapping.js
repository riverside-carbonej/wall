const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixFieldMapping() {
  try {
    const wallId = 'dzwsujrWYLvznCJElpri';
    const objectTypeId = 'ot_1757607682911_brfg8d3ft';
    
    console.log('🔧 Fixing field mapping for alumni items...');
    
    // Get all items to fix
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('objectTypeId', '==', objectTypeId)
      .get();
    
    console.log(`Found ${itemsSnapshot.size} items to fix`);
    
    // Process in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let totalFixed = 0;
    
    for (const doc of itemsSnapshot.docs) {
      const data = doc.data();
      
      // Fix the fields to match the wall's expected schema
      const fixedFields = {
        name: data.fields.name || data.name || 'Unknown',
        graduationYear: data.fields.graduationYear || data.fields.inductionYear || null, // Convert to number or null
        degree: data.fields.category || '', // Use category as degree
        currentPosition: '', // Empty for now
        email: '' // Empty for now
      };
      
      // Convert graduationYear to number if it's a valid year
      if (fixedFields.graduationYear && fixedFields.graduationYear !== '') {
        const year = parseInt(fixedFields.graduationYear);
        if (!isNaN(year) && year > 1800 && year < 2100) {
          fixedFields.graduationYear = year;
        } else {
          fixedFields.graduationYear = null;
        }
      } else {
        fixedFields.graduationYear = null;
      }
      
      // Update the document
      batch.update(doc.ref, {
        fields: fixedFields,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      count++;
      
      if (count >= batchSize) {
        await batch.commit();
        totalFixed += count;
        console.log(`✅ Fixed ${totalFixed} items...`);
        batch = db.batch();
        count = 0;
      }
    }
    
    // Commit remaining
    if (count > 0) {
      await batch.commit();
      totalFixed += count;
    }
    
    console.log(`✅ Successfully fixed ${totalFixed} items!`);
    console.log('\nField mapping applied:');
    console.log('- name: Full name from original data');
    console.log('- graduationYear: Converted to number or null');
    console.log('- degree: Category from original data');
    console.log('- currentPosition: Empty string');
    console.log('- email: Empty string');
    
    // Show sample of fixed data
    const sampleDoc = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .limit(1)
      .get();
    
    if (!sampleDoc.empty) {
      const sampleData = sampleDoc.docs[0].data();
      console.log('\n📋 Sample fixed item:');
      console.log(JSON.stringify(sampleData.fields, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFieldMapping();