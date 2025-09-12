const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// IMPORTANT: Update these after creating the Veterans wall in the app UI
const VETERANS_WALL_ID = 'YOUR_WALL_ID_HERE'; // Update after creating wall
const VETERANS_OBJECT_TYPE_ID = 'YOUR_OBJECT_TYPE_ID_HERE'; // Will be like ot_[timestamp]_[random]

async function importVeterans() {
  try {
    // Load the veterans data
    const wallData = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-output/wall-data.json'), 'utf8'));
    const veterans = wallData.items.veterans;
    const branches = wallData.items.branches || [];
    const deployments = wallData.items.deployments || [];
    
    console.log(`Found ${veterans.length} veterans to import`);
    console.log(`Found ${branches.length} branches`);
    console.log(`Found ${deployments.length} deployments`);
    
    // First, verify the wall exists and get its structure
    const wallDoc = await db.collection('walls').doc(VETERANS_WALL_ID).get();
    if (!wallDoc.exists) {
      console.error('❌ Wall not found! Please create the Veterans wall first and update VETERANS_WALL_ID');
      process.exit(1);
    }
    
    const wallData = wallDoc.data();
    console.log('✅ Found Veterans wall');
    
    // Find the veteran object type and its fields
    const veteranObjectType = wallData.objectTypes.find(ot => ot.id === VETERANS_OBJECT_TYPE_ID);
    if (!veteranObjectType) {
      console.error('❌ Object type not found! Please update VETERANS_OBJECT_TYPE_ID');
      console.log('Available object types:', wallData.objectTypes.map(ot => ({ id: ot.id, name: ot.name })));
      process.exit(1);
    }
    
    console.log('✅ Found Veteran object type');
    console.log('Fields:', veteranObjectType.fields.map(f => ({ id: f.id, name: f.name, type: f.type })));
    
    // Import veterans in batches
    const batchSize = 500; // Firestore batch limit
    let batch = db.batch();
    let count = 0;
    let totalImported = 0;
    
    for (const veteran of veterans) {
      // Map the old data to the new field structure
      const wallItem = {
        wallId: VETERANS_WALL_ID,
        objectTypeId: VETERANS_OBJECT_TYPE_ID,
        name: veteran.fieldData.name || 'Unknown Veteran',
        published: true,
        fields: {
          // Map to the actual field IDs from the wall's object type
          // These field IDs need to match what's defined in the wall
          name: veteran.fieldData.name || '',
          graduationYear: veteran.fieldData.graduationYear || '',
          rank: veteran.fieldData.rank || '',
          militaryEntryDate: veteran.fieldData.militaryEntryDate || null,
          militaryExitDate: veteran.fieldData.militaryExitDate || null,
          description: veteran.fieldData.description || '',
          // Handle branches and deployments if they exist as fields
          branches: veteran.fieldData.branches || [],
          deployments: veteran.fieldData.deployments || []
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        // Store old ID for reference if needed
        originalId: veteran.id,
        // Store image references if they exist
        images: veteran.images || []
      };
      
      // Add to batch
      const docRef = db.collection('wall-items').doc();
      batch.set(docRef, wallItem);
      count++;
      
      // Commit batch when it reaches the limit
      if (count >= batchSize) {
        await batch.commit();
        totalImported += count;
        console.log(`✅ Imported ${totalImported} veterans...`);
        batch = db.batch();
        count = 0;
      }
    }
    
    // Commit any remaining items
    if (count > 0) {
      await batch.commit();
      totalImported += count;
    }
    
    console.log(`✅ Successfully imported ${totalImported} veterans!`);
    console.log(`\nNext steps:`);
    console.log(`1. Visit the wall at: /walls/${VETERANS_WALL_ID}/preset/${VETERANS_OBJECT_TYPE_ID}/items`);
    console.log(`2. Verify the data displays correctly`);
    console.log(`3. Handle image uploads separately if needed`);
    
  } catch (error) {
    console.error('❌ Error importing veterans:', error);
    process.exit(1);
  }
}

// Instructions for use
console.log('📋 INSTRUCTIONS:');
console.log('1. First, create a Veterans wall in the app UI');
console.log('2. Note the wall ID from the URL');
console.log('3. Note the object type ID (check browser console or network tab)');
console.log('4. Update VETERANS_WALL_ID and VETERANS_OBJECT_TYPE_ID in this script');
console.log('5. Run: node import-veterans.js');
console.log('\n⚠️  IMPORTANT: Do not run this script until you have created the wall and updated the IDs!\n');

// Uncomment to run the import
// importVeterans();