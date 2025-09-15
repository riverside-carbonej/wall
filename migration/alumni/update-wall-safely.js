const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateWallSafely() {
  try {
    console.log('=== SAFELY UPDATING ALUMNI WALL ===\n');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get current wall structure
    const wallDoc = await db.collection('walls').doc(wallId).get();
    const wallData = wallDoc.data();
    
    console.log('Current wall state:');
    console.log('- Name:', wallData.name);
    console.log('- ObjectTypes is array:', Array.isArray(wallData.objectTypes));
    
    // Update the field definitions to include our new fields
    const updatedFields = [
      {
        id: 'name',
        name: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter full name...'
      },
      {
        id: 'firstName',
        name: 'First Name',
        type: 'text',
        required: false,
        placeholder: 'Enter first name...'
      },
      {
        id: 'lastName',
        name: 'Last Name',
        type: 'text',
        required: false,
        placeholder: 'Enter last name...'
      },
      {
        id: 'graduationYear',
        name: 'Class Year',
        type: 'number',
        required: false,
        placeholder: 'Enter graduation year...'
      },
      {
        id: 'category',
        name: 'Category',
        type: 'select',
        required: false,
        options: ['Alumni', 'Faculty & Staff', 'Athlete'],
        placeholder: 'Select category...'
      },
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        required: false,
        placeholder: 'e.g., Dr., Coach, Prof...'
      },
      {
        id: 'nickname',
        name: 'Nickname',
        type: 'text',
        required: false,
        placeholder: 'Enter nickname...'
      },
      {
        id: 'deceased',
        name: 'Deceased',
        type: 'select',
        required: false,
        options: ['', 'true'],
        placeholder: 'Mark if deceased'
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
      },
      {
        id: 'originalName',
        name: 'Original Import Name',
        type: 'text',
        required: false,
        readonly: true,
        placeholder: 'Original name from import'
      }
    ];
    
    // Create complete objectType preserving existing structure
    const updatedObjectType = {
      ...wallData.objectTypes[0], // Keep all existing properties
      fields: updatedFields,      // Update fields with our enhanced version
      displaySettings: {
        ...wallData.objectTypes[0].displaySettings,
        primaryField: 'name',
        secondaryField: 'graduationYear', // Show year as secondary
        tertiaryField: 'category'         // Show category as third field
      },
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    // Update the wall
    console.log('\nUpdating wall structure...');
    await db.collection('walls').doc(wallId).update({
      objectTypes: [updatedObjectType], // Must remain an array!
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('✅ Wall structure updated successfully');
    
    // Verify the update
    const verifyDoc = await db.collection('walls').doc(wallId).get();
    const verifyData = verifyDoc.data();
    
    console.log('\nVerification:');
    console.log('- ObjectTypes is still array:', Array.isArray(verifyData.objectTypes));
    console.log('- Number of fields:', verifyData.objectTypes[0].fields.length);
    console.log('- Primary display field:', verifyData.objectTypes[0].displaySettings.primaryField);
    console.log('- Secondary display field:', verifyData.objectTypes[0].displaySettings.secondaryField);
    
    // Check a sample item
    const sampleItems = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .limit(3)
      .get();
    
    console.log('\nSample items after update:');
    sampleItems.docs.forEach(doc => {
      const data = doc.data();
      const fields = data.fieldData || {};
      console.log(`- ${fields.name} (${fields.graduationYear || 'No year'}) - ${fields.category || 'No category'}`);
    });
    
    console.log('\n✅ UPDATE COMPLETE!');
    console.log('The wall has been safely updated with:');
    console.log('- Enhanced field definitions');
    console.log('- Preserved array structure');
    console.log('- Better display settings');
    console.log('\nRefresh the app to see the improved alumni wall!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateWallSafely();