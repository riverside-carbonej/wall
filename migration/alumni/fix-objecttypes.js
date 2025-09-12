const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixObjectTypesStructure() {
  try {
    console.log('CRITICAL: FIXING OBJECTTYPES STRUCTURE');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get the wall document
    const wallDoc = await db.collection('walls').doc(wallId).get();
    
    if (!wallDoc.exists) {
      console.log('Wall not found!');
      return;
    }
    
    const wallData = wallDoc.data();
    console.log('Checking objectTypes structure...');
    console.log('Is Array:', Array.isArray(wallData.objectTypes));
    
    if (!Array.isArray(wallData.objectTypes)) {
      console.log('objectTypes is NOT an array! Fixing...');
      
      // Create proper array structure
      const fixedObjectTypes = [{
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
      
      console.log('Updating wall with fixed objectTypes array...');
      
      await db.collection('walls').doc(wallId).update({
        objectTypes: fixedObjectTypes
      });
      
      console.log('objectTypes fixed and saved as array!');
      
    } else {
      console.log('objectTypes is already an array');
    }
    
    console.log('STRUCTURE FIXED!');
    console.log('Refresh the page to access the wall.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixObjectTypesStructure();
