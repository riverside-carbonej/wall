const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixDisplaySettings() {
  try {
    console.log('🔧 FIXING DISPLAY SETTINGS ERROR\n');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get the wall
    const wallDoc = await db.collection('walls').doc(wallId).get();
    const wallData = wallDoc.data();
    
    console.log('Current display settings:');
    const currentSettings = wallData.objectTypes[0].displaySettings;
    console.log(JSON.stringify(currentSettings, null, 2));
    
    // The error is because secondaryField is 'currentPosition' but items don't have data there
    console.log('\nProblem: secondaryField is "currentPosition" but most items have empty currentPosition');
    
    // Update display settings to use fields that actually have data
    const updatedSettings = {
      ...currentSettings,
      secondaryField: 'category'  // Change from 'currentPosition' to 'category' which has data
    };
    
    console.log('\nUpdating display settings...');
    await db.collection('walls').doc(wallId).update({
      'objectTypes.0.displaySettings': updatedSettings
    });
    
    console.log('✅ Display settings updated!');
    console.log('Changed secondaryField from "currentPosition" to "category"');
    
    // Also check a sample item to show what fields have data
    console.log('\n📋 Sample item fields:');
    const sampleItem = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .limit(1)
      .get();
    
    if (!sampleItem.empty) {
      const itemData = sampleItem.docs[0].data();
      console.log('Fields with data:');
      Object.entries(itemData.fields).forEach(([key, value]) => {
        if (value && value !== '') {
          console.log(`  • ${key}: "${value}"`);
        }
      });
    }
    
    console.log('\n✅ The error should be fixed now!');
    console.log('Refresh the page to see alumni without errors.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixDisplaySettings();
