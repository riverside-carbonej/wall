const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const name = process.argv[2];

async function findVeteran() {
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', 'Fkzc5Kh7gMpyTEm5Cl6d')
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    let found = false;
    snapshot.forEach(doc => {
        const data = doc.data();
        const fbName = data.fieldData?.name || '';
        if (fbName.toLowerCase() === name.toLowerCase()) {
            console.log('Firebase Match:');
            console.log('- ID:', doc.id);
            console.log('- Name:', data.fieldData.name);
            console.log('- Graduation Year:', data.fieldData.graduationYear || '[empty]');
            console.log('- Branch:', data.fieldData.branch || '[empty]');
            console.log('- Rank:', data.fieldData.rank || '[empty]');
            console.log('- Military Entry:', data.fieldData.militaryEntryDate || '[empty]');
            console.log('- Military Exit:', data.fieldData.militaryExitDate || '[empty]');
            found = true;
        }
    });
    
    if (!found) {
        console.log('No match in Firebase - NEW VETERAN');
    }
    process.exit(0);
}

findVeteran();