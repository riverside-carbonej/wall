const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function pullWallVeterans() {
  console.log('Pulling veterans from wall document...\n');
  
  try {
    // Get the wall
    const wallDoc = await db.collection('walls').doc('Fkzc5Kh7gMpyTEm5Cl6d').get();
    
    if (!wallDoc.exists) {
      console.log('Wall not found!');
      return;
    }
    
    const wallData = wallDoc.data();
    console.log('Wall: ' + wallData.name);
    
    // Check if veterans are stored in the wall document
    if (wallData.veterans) {
      console.log(`Found ${wallData.veterans.length} veterans in wall document\n`);
      
      // Look for Georgia
      wallData.veterans.forEach((v, i) => {
        const name = v.name || v.fieldData?.name || '';
        if (name.toLowerCase().includes('georgia') || 
            name.toLowerCase().includes('formerly') ||
            name.toLowerCase().includes('ash')) {
          console.log(`Veteran #${i + 1}:`);
          console.log('  Name:', name);
          console.log('  Full data:', JSON.stringify(v, null, 2));
          console.log('');
        }
      });
      
      // Save the data
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `WALL-VETERANS-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(wallData.veterans, null, 2));
      console.log(`Veterans saved to: ${filename}`);
      
    } else {
      console.log('No veterans field in wall document');
      console.log('\nAvailable fields in wall:');
      Object.keys(wallData).forEach(key => {
        if (Array.isArray(wallData[key])) {
          console.log(`  ${key}: Array(${wallData[key].length})`);
        } else if (typeof wallData[key] === 'object') {
          console.log(`  ${key}: Object`);
        } else {
          console.log(`  ${key}: ${typeof wallData[key]}`);
        }
      });
    }
    
    // Also check all walls to see where veterans might be
    console.log('\n\nChecking all walls for veterans...');
    const wallsSnapshot = await db.collection('walls').get();
    
    wallsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.veterans && data.veterans.length > 0) {
        console.log(`Wall "${data.name}" (${doc.id}): ${data.veterans.length} veterans`);
        
        // Check for Georgia in this wall
        data.veterans.forEach(v => {
          const name = v.name || v.fieldData?.name || '';
          if (name.toLowerCase().includes('georgia')) {
            console.log(`  -> Found Georgia: "${name}"`);
          }
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await admin.app().delete();
  }
}

// Run it
pullWallVeterans();