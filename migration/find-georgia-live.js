const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findGeorgia() {
  const wallId = 'Fkzc5Kh7gMpyTEm5Cl6d';
  
  console.log('Searching for Georgia in live Firebase data...\n');
  
  const snapshot = await db.collection('wall_items')
    .where('wallId', '==', wallId)
    .where('objectTypeId', '==', 'veteran')
    .get();
  
  console.log(`Total veterans in wall_items: ${snapshot.size}\n`);
  
  let georgiaFound = false;
  const namesWithParens = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const name = data.fieldData?.name || '';
    
    // Look for Georgia
    if (name.toLowerCase().includes('georgia') || 
        name.toLowerCase().includes('ash') ||
        name.toLowerCase().includes('formerly')) {
      console.log('Found Georgia or related name:');
      console.log(`  ID: ${doc.id}`);
      console.log(`  Name: "${name}"`);
      console.log(`  Grad Year: ${data.fieldData?.graduationYear || 'N/A'}`);
      console.log(`  Rank: ${data.fieldData?.rank || 'N/A'}`);
      console.log('');
      georgiaFound = true;
    }
    
    // Collect names with parentheses
    if (name.includes('(')) {
      namesWithParens.push(name);
    }
  });
  
  if (!georgiaFound) {
    console.log('Georgia not found in current Firebase data\n');
  }
  
  console.log('\nAll veteran names with parentheses:');
  console.log('=====================================');
  namesWithParens.sort().forEach(name => {
    console.log(`  ${name}`);
  });
  
  await admin.app().delete();
}

findGeorgia();