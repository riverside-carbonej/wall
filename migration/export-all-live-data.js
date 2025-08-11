const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportAllData() {
  const wallId = 'Fkzc5Kh7gMpyTEm5Cl6d';
  
  console.log('Exporting all data from Firebase...\n');
  
  // Get all items
  const snapshot = await db.collection('wall_items')
    .where('wallId', '==', wallId)
    .get();
  
  console.log(`Found ${snapshot.size} total items\n`);
  
  const veterans = [];
  const branches = [];
  const deployments = [];
  const awards = [];
  
  snapshot.forEach(doc => {
    const data = {
      id: doc.id,
      ...doc.data()
    };
    
    switch(data.objectTypeId) {
      case 'veteran':
        veterans.push(data);
        break;
      case 'branch':
        branches.push(data);
        break;
      case 'deployment':
        deployments.push(data);
        break;
      case 'award':
        awards.push(data);
        break;
    }
  });
  
  // Sort veterans by name for easier review
  veterans.sort((a, b) => {
    const nameA = (a.fieldData?.name || '').toLowerCase();
    const nameB = (b.fieldData?.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  const exportData = {
    timestamp: new Date().toISOString(),
    wallId: wallId,
    summary: {
      totalItems: snapshot.size,
      veterans: veterans.length,
      branches: branches.length,
      deployments: deployments.length,
      awards: awards.length
    },
    veterans: veterans,
    branches: branches,
    deployments: deployments,
    awards: awards
  };
  
  // Save to file
  const filename = 'LIVE-FIREBASE-DATA.json';
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  
  console.log(`Data exported to ${filename}`);
  console.log('\nSummary:');
  console.log(`  Veterans: ${veterans.length}`);
  console.log(`  Branches: ${branches.length}`);
  console.log(`  Deployments: ${deployments.length}`);
  console.log(`  Awards: ${awards.length}`);
  
  await admin.app().delete();
}

exportAllData();