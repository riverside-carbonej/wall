const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function studyWallSchema() {
  try {
    console.log('=== STUDYING WORKING VETERANS WALL STRUCTURE ===\n');
    
    // Find the Veterans wall
    const veteransWalls = await db.collection('walls')
      .where('name', '==', 'Veterans Wall')
      .limit(1)
      .get();
    
    if (veteransWalls.empty) {
      console.log('No Veterans Wall found');
      process.exit(1);
    }
    
    const veteransWall = veteransWalls.docs[0];
    const veteransData = veteransWall.data();
    
    console.log('VETERANS WALL STRUCTURE:');
    console.log('Wall ID:', veteransWall.id);
    console.log('Wall Name:', veteransData.name);
    
    console.log('\nobjectTypes structure:');
    console.log('- Is Array:', Array.isArray(veteransData.objectTypes));
    console.log('- Length:', veteransData.objectTypes ? veteransData.objectTypes.length : 0);
    
    if (veteransData.objectTypes && veteransData.objectTypes[0]) {
      const ot = veteransData.objectTypes[0];
      console.log('\nFirst ObjectType:');
      console.log('- id:', ot.id);
      console.log('- name:', ot.name);
      console.log('- wallId:', ot.wallId);
      console.log('- fields is array:', Array.isArray(ot.fields));
      console.log('- fields count:', ot.fields ? ot.fields.length : 0);
      console.log('- displaySettings:', JSON.stringify(ot.displaySettings, null, 2));
      
      if (ot.fields && ot.fields.length > 0) {
        console.log('\nField structure (first field):');
        console.log(JSON.stringify(ot.fields[0], null, 2));
      }
    }
    
    // Get a sample item
    const veteransItems = await db.collection('wall_items')
      .where('wallId', '==', veteransWall.id)
      .limit(1)
      .get();
    
    if (!veteransItems.empty) {
      const item = veteransItems.docs[0].data();
      console.log('\nSAMPLE VETERANS ITEM:');
      console.log('- name:', item.name);
      console.log('- wallId:', item.wallId);
      console.log('- objectTypeId:', item.objectTypeId);
      console.log('- published:', item.published);
      console.log('- presetId:', item.presetId);
      console.log('- fields keys:', Object.keys(item.fields || {}));
      console.log('- createdAt exists:', !!item.createdAt);
      console.log('- updatedAt exists:', !!item.updatedAt);
      
      // Show actual field values
      console.log('\nField values:');
      Object.entries(item.fields || {}).forEach(([key, value]) => {
        console.log(`  - ${key}: "${value}"`);
      });
    }
    
    // Check for presets
    const veteransPresets = await db.collection('wall_item_presets')
      .where('wallId', '==', veteransWall.id)
      .limit(1)
      .get();
    
    console.log('\nPRESETS:');
    console.log('- Has presets:', !veteransPresets.empty);
    if (!veteransPresets.empty) {
      const preset = veteransPresets.docs[0].data();
      console.log('- Preset structure keys:', Object.keys(preset));
      console.log('- Preset objectTypeId:', preset.objectTypeId);
    }
    
    console.log('\n\n=== NOW CHECKING BROKEN ALUMNI WALL ===\n');
    
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    const alumniWall = await db.collection('walls').doc(alumniWallId).get();
    const alumniData = alumniWall.data();
    
    console.log('ALUMNI WALL STRUCTURE:');
    console.log('Wall ID:', alumniWallId);
    console.log('Wall Name:', alumniData.name);
    
    console.log('\nobjectTypes structure:');
    console.log('- Is Array:', Array.isArray(alumniData.objectTypes));
    console.log('- Type:', typeof alumniData.objectTypes);
    console.log('- Value:', JSON.stringify(alumniData.objectTypes, null, 2));
    
    // Get alumni items
    const alumniItems = await db.collection('wall_items')
      .where('wallId', '==', alumniWallId)
      .limit(1)
      .get();
    
    if (!alumniItems.empty) {
      const item = alumniItems.docs[0].data();
      console.log('\nSAMPLE ALUMNI ITEM:');
      console.log('- name:', item.name);
      console.log('- objectTypeId:', item.objectTypeId);
      console.log('- presetId:', item.presetId);
      console.log('- fields keys:', Object.keys(item.fields || {}));
    }
    
    console.log('\n\n=== KEY DIFFERENCES FOUND ===');
    console.log('1. Veterans objectTypes is array:', Array.isArray(veteransData.objectTypes));
    console.log('   Alumni objectTypes is array:', Array.isArray(alumniData.objectTypes));
    
    if (veteransData.objectTypes && veteransData.objectTypes[0]) {
      console.log('\n2. Veterans objectType has wallId:', veteransData.objectTypes[0].wallId);
      console.log('   Veterans wall ID:', veteransWall.id);
      console.log('   Match:', veteransData.objectTypes[0].wallId === veteransWall.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

studyWallSchema();