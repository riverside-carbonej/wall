const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backupWallData() {
  const wallId = 'Fkzc5Kh7gMpyTEm5Cl6d';
  console.log(`Creating new backup for wall: ${wallId}\n`);
  
  try {
    // Get the wall document
    const wallDoc = await db.collection('walls').doc(wallId).get();
    
    if (!wallDoc.exists) {
      console.log('Wall not found!');
      return;
    }
    
    const wallData = wallDoc.data();
    console.log(`Wall Name: ${wallData.name}`);
    console.log(`Organization: ${wallData.organizationName}`);
    
    // Get all wall-items for this wall
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`\nFound ${itemsSnapshot.size} items in wall-items collection`);
    
    const items = [];
    const veteranItems = [];
    const deploymentItems = [];
    const branchItems = [];
    const awardItems = [];
    
    // Process all items
    itemsSnapshot.forEach(doc => {
      const data = doc.data();
      const item = {
        docId: doc.id,
        ...data
      };
      
      items.push(item);
      
      // Categorize by objectTypeId
      if (data.objectTypeId === 'veteran') {
        veteranItems.push(item);
        
        // Check for Georgia or names with issues
        const name = data.fieldData?.name || data.fields?.name || '';
        if (name.toLowerCase().includes('georgia') || 
            name.toLowerCase().includes('formerly') ||
            name.toLowerCase().includes('ash')) {
          console.log('\nFound Georgia or related name:');
          console.log(`  ID: ${doc.id}`);
          console.log(`  Name: "${name}"`);
        }
      } else if (data.objectTypeId === 'deployment') {
        deploymentItems.push(item);
      } else if (data.objectTypeId === 'branch') {
        branchItems.push(item);
      } else if (data.objectTypeId === 'award') {
        awardItems.push(item);
      }
    });
    
    console.log(`\nBreakdown by type:`);
    console.log(`  Veterans: ${veteranItems.length}`);
    console.log(`  Deployments: ${deploymentItems.length}`);
    console.log(`  Branches: ${branchItems.length}`);
    console.log(`  Awards: ${awardItems.length}`);
    
    // Create backup object
    const timestamp = new Date().toISOString();
    const backup = {
      timestamp: timestamp,
      wallId: wallId,
      wallData: wallData,
      totalItems: items.length,
      veterans: veteranItems,
      deployments: deploymentItems,
      branches: branchItems,
      awards: awardItems,
      allItems: items
    };
    
    // Save backup
    const filename = `BACKUP-${timestamp.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    console.log(`\nBackup saved to: ${filename}`);
    
    // Show sample of names with parentheses
    console.log('\nSample of veteran names with parentheses:');
    veteranItems.forEach(v => {
      const name = v.fieldData?.name || v.fields?.name || '';
      if (name.includes('(')) {
        console.log(`  ${name}`);
      }
    });
    
  } catch (error) {
    console.error('Error creating backup:', error);
  } finally {
    await admin.app().delete();
  }
}

// Run backup
backupWallData();