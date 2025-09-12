const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deepWallCheck() {
  try {
    console.log('DEEP WALL STRUCTURE CHECK');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get the wall document
    const wallDoc = await db.collection('walls').doc(wallId).get();
    
    if (!wallDoc.exists) {
      console.log('Wall not found!');
      return;
    }
    
    const wallData = wallDoc.data();
    
    // Check all critical fields
    console.log('\nCritical Structure Checks:');
    console.log('- objectTypes exists:', !!wallData.objectTypes);
    console.log('- objectTypes is array:', Array.isArray(wallData.objectTypes));
    console.log('- objectTypes length:', wallData.objectTypes ? wallData.objectTypes.length : 0);
    
    if (wallData.objectTypes && wallData.objectTypes[0]) {
      const ot = wallData.objectTypes[0];
      console.log('\nFirst ObjectType:');
      console.log('- ID:', ot.id);
      console.log('- Name:', ot.name);
      console.log('- fields exists:', !!ot.fields);
      console.log('- fields is array:', Array.isArray(ot.fields));
      console.log('- fields length:', ot.fields ? ot.fields.length : 0);
    }
    
    // Check for any undefined or null values that might break map
    console.log('\nChecking for problematic values:');
    
    const checkForProblems = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj || {})) {
        if (value === undefined) {
          console.log(`PROBLEM: undefined at ${path}.${key}`);
        }
        if (value === null && key === 'objectTypes') {
          console.log(`PROBLEM: null objectTypes at ${path}.${key}`);
        }
      }
    };
    
    checkForProblems(wallData);
    
    // Ensure all required arrays are arrays
    const fixes = {};
    let needsFix = false;
    
    if (!wallData.objectTypes) {
      console.log('CRITICAL: objectTypes is missing! Creating...');
      fixes.objectTypes = [];
      needsFix = true;
    } else if (!Array.isArray(wallData.objectTypes)) {
      console.log('CRITICAL: objectTypes is not array! Converting...');
      fixes.objectTypes = [];
      needsFix = true;
    }
    
    if (!wallData.relationshipDefinitions) {
      console.log('Missing relationshipDefinitions, adding empty array');
      fixes.relationshipDefinitions = [];
      needsFix = true;
    }
    
    if (needsFix) {
      console.log('\nApplying fixes...');
      await db.collection('walls').doc(wallId).update(fixes);
      console.log('Fixes applied!');
    } else {
      console.log('\nNo structural issues found.');
    }
    
    // Final item count
    const items = await db.collection('wall_items').where('wallId', '==', wallId).get();
    console.log('\nWall Status:');
    console.log('- Wall ID:', wallId);
    console.log('- Items in wall_items:', items.size);
    console.log('- Structure: OK');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deepWallCheck();
