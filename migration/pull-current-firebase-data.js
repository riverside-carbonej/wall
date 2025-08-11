const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function pullCurrentData() {
  console.log('Pulling current data from Firebase...\n');
  
  try {
    // Get the wall
    const wallDoc = await db.collection('walls').doc('Fkzc5Kh7gMpyTEm5Cl6d').get();
    
    if (!wallDoc.exists) {
      console.log('Wall not found!');
      return;
    }
    
    console.log('Found wall: ' + wallDoc.data().name);
    
    // Get all wall items for this wall
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', 'Fkzc5Kh7gMpyTEm5Cl6d')
      .get();
    
    console.log(`Found ${itemsSnapshot.size} wall items\n`);
    
    // Look for Georgia
    const veterans = [];
    itemsSnapshot.forEach(doc => {
      const data = doc.data();
      veterans.push({
        id: doc.id,
        ...data
      });
      
      // Check for Georgia or any name issues
      const name = data.fieldData?.name || data.fields?.name || '';
      if (name.toLowerCase().includes('georgia') || 
          name.toLowerCase().includes('formerly') ||
          name.toLowerCase().includes('ash')) {
        console.log('Found Georgia:');
        console.log('  ID:', doc.id);
        console.log('  Name:', name);
        console.log('  Full fieldData:', JSON.stringify(data.fieldData || data.fields, null, 2));
        console.log('');
      }
    });
    
    // Save current data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `CURRENT-FIREBASE-DATA-${timestamp}.json`;
    
    const exportData = {
      timestamp: timestamp,
      wallId: 'Fkzc5Kh7gMpyTEm5Cl6d',
      wallName: wallDoc.data().name,
      itemCount: veterans.length,
      veterans: veterans
    };
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\nCurrent data saved to: ${filename}`);
    
    // Check for any names with parentheses
    console.log('\nAll names with parentheses:');
    console.log('============================');
    veterans.forEach(v => {
      const name = v.fieldData?.name || v.fields?.name || '';
      if (name.includes('(')) {
        console.log(`${v.id}: ${name}`);
      }
    });
    
  } catch (error) {
    console.error('Error pulling data:', error);
  } finally {
    await admin.app().delete();
  }
}

// Run it
pullCurrentData();