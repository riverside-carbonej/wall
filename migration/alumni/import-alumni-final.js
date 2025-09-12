const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// From findings.md - the working Alumni wall
const ALUMNI_WALL_ID = 'dzwsujrWYLvznCJElpri';
const ALUMNI_OBJECT_TYPE_ID = 'ot_1757607682911_brfg8d3ft';

async function importAlumni() {
  try {
    // Load the alumni data
    const alumniData = JSON.parse(fs.readFileSync(path.join(__dirname, 'alumni-data.json'), 'utf8'));
    
    console.log(`Found ${alumniData.length} alumni records to import`);
    
    // Verify the wall exists
    const wallDoc = await db.collection('walls').doc(ALUMNI_WALL_ID).get();
    if (!wallDoc.exists) {
      console.error('❌ Alumni wall not found!');
      process.exit(1);
    }
    
    const wallData = wallDoc.data();
    const alumniObjectType = wallData.objectTypes.find(ot => ot.id === ALUMNI_OBJECT_TYPE_ID);
    if (!alumniObjectType) {
      console.error('❌ Alumni object type not found!');
      process.exit(1);
    }
    
    console.log('✅ Found Alumni wall and object type');
    console.log('Fields:', alumniObjectType.fields.map(f => ({ id: f.id, name: f.name, type: f.type })));
    
    // Check for existing alumni items
    const existingSnapshot = await db.collection('wall-items')
      .where('wallId', '==', ALUMNI_WALL_ID)
      .where('objectTypeId', '==', ALUMNI_OBJECT_TYPE_ID)
      .limit(5)
      .get();
    
    if (existingSnapshot.size > 0) {
      const totalExisting = await db.collection('wall-items')
        .where('wallId', '==', ALUMNI_WALL_ID)
        .where('objectTypeId', '==', ALUMNI_OBJECT_TYPE_ID)
        .get();
      
      console.log(`⚠️  Found ${totalExisting.size} existing alumni items in this wall`);
      console.log('Proceeding with import (duplicates may be created)...');
    }
    
    // Import alumni in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let totalImported = 0;
    
    for (const alumni of alumniData) {
      const wallItem = {
        wallId: ALUMNI_WALL_ID,
        objectTypeId: ALUMNI_OBJECT_TYPE_ID,
        name: alumni.fullName || `${alumni.firstName} ${alumni.lastName}` || 'Unknown Alumni',
        published: true,
        fields: {
          // Map to the actual field IDs defined in the wall
          name: alumni.fullName || `${alumni.firstName} ${alumni.lastName}` || '',
          graduationYear: alumni.graduationYear || '',
          category: alumni.category || '',
          inductionYear: alumni.inductionYear || '',
          firstName: alumni.firstName || '',
          lastName: alumni.lastName || '',
          maidenName: alumni.maidenName || ''
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      // Add to batch
      const docRef = db.collection('wall-items').doc();
      batch.set(docRef, wallItem);
      count++;
      
      // Commit batch when it reaches the limit
      if (count >= batchSize) {
        await batch.commit();
        totalImported += count;
        console.log(`✅ Imported ${totalImported} alumni...`);
        batch = db.batch();
        count = 0;
      }
    }
    
    // Commit any remaining items
    if (count > 0) {
      await batch.commit();
      totalImported += count;
    }
    
    console.log(`✅ Successfully imported ${totalImported} alumni!`);
    console.log(`\n🔗 View at: /walls/${ALUMNI_WALL_ID}/preset/${ALUMNI_OBJECT_TYPE_ID}/items`);
    
  } catch (error) {
    console.error('❌ Error importing alumni:', error);
    process.exit(1);
  }
}

importAlumni();