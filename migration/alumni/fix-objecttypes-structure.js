const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixObjectTypesStructure() {
  try {
    console.log('🚨 CRITICAL: FIXING OBJECTTYPES STRUCTURE\n');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get the wall document
    const wallDoc = await db.collection('walls').doc(wallId).get();
    
    if (!wallDoc.exists) {
      console.log('❌ Wall not found!');
      return;
    }
    
    const wallData = wallDoc.data();
    console.log('1. Checking objectTypes structure...');
    console.log(`   Type: ${typeof wallData.objectTypes}`);
    console.log(`   Is Array: ${Array.isArray(wallData.objectTypes)}`);
    
    if (!Array.isArray(wallData.objectTypes)) {
      console.log('   ❌ objectTypes is NOT an array! This is causing the error.');
      console.log(`   Current structure: ${JSON.stringify(wallData.objectTypes).substring(0, 200)}...`);
      
      // Convert object to array if needed
      let fixedObjectTypes = [];
      
      if (wallData.objectTypes && typeof wallData.objectTypes === 'object') {
        // If it's an object, convert to array
        if (wallData.objectTypes.id) {
          // Single object type
          fixedObjectTypes = [wallData.objectTypes];
        } else {
          // Multiple object types as object
          fixedObjectTypes = Object.values(wallData.objectTypes);
        }
      }
      
      // If we couldn't fix it, create a new one
      if (fixedObjectTypes.length === 0) {
        console.log('\n2. Creating new objectTypes array...');
        fixedObjectTypes = [{
          id: 'ot_1757607682911_brfg8d3ft',
          wallId: wallId,
          name: 'Alumnus',
          description: 'Alumni information',
          icon: 'school',
          color: '#2563eb',
          fields: [
            {
              id: 'name',
              name: 'Full Name',
              type: 'text',
              required: true,
              placeholder: 'Enter full name...'
            },
            {
              id: 'graduationYear',
              name: 'Graduation Year',
              type: 'number',
              required: true,
              placeholder: 'Enter graduation year...'
            },
            {
              id: 'degree',
              name: 'Degree',
              type: 'text',
              required: false,
              placeholder: 'Enter degree...'
            },
            {
              id: 'currentPosition',
              name: 'Current Position',
              type: 'text',
              required: false,
              placeholder: 'Enter current position...'
            },
            {
              id: 'email',
              name: 'Email',
              type: 'email',
              required: false,
              placeholder: 'Enter email address...'
            }
          ],
          relationships: [],
          displaySettings: {
            cardLayout: 'detailed',
            showOnMap: false,
            primaryField: 'name',
            secondaryField: 'degree'
          },
          isActive: true,
          sortOrder: 0,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }];
      }
      
      console.log(`\n3. Updating wall with fixed objectTypes array (${fixedObjectTypes.length} items)...`);
      
      await db.collection('walls').doc(wallId).update({
        objectTypes: fixedObjectTypes
      });
      
      console.log('   ✅ objectTypes fixed and saved as array!');
      
    } else {
      console.log('   ✅ objectTypes is already an array');
      
      // Check if fields are arrays too
      wallData.objectTypes.forEach((ot, index) => {
        console.log(`\n   Checking objectType[${index}] "${ot.name}":`);
        console.log(`     Fields is array: ${Array.isArray(ot.fields)}`);
        
        if (!Array.isArray(ot.fields) && ot.fields) {
          console.log('     ❌ Fields is not an array! Fixing...');
          ot.fields = Object.values(ot.fields);
        }
      });
      
      // Update if we made changes
      await db.collection('walls').doc(wallId).update({
        objectTypes: wallData.objectTypes
      });
    }
    
    // Verify the fix
    console.log('\n4. Verifying fix...');
    const verifyDoc = await db.collection('walls').doc(wallId).get();
    const verifyData = verifyDoc.data();
    
    console.log(`   objectTypes is array: ${Array.isArray(verifyData.objectTypes)}`);
    console.log(`   objectTypes length: ${verifyData.objectTypes?.length || 0}`);
    
    if (verifyData.objectTypes && verifyData.objectTypes[0]) {
      console.log(`   First objectType ID: ${verifyData.objectTypes[0].id}`);
      console.log(`   Fields is array: ${Array.isArray(verifyData.objectTypes[0].fields)}`);
    }
    
    console.log('\n✅ STRUCTURE FIXED!');
    console.log('The ".map is not a function" error should be resolved.');
    console.log('Refresh the page to access the wall.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixObjectTypesStructure();
