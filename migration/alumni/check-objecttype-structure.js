const admin = require('firebase-admin');
const path = require('path');

const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function checkObjectTypeStructure() {
    console.log('🔍 Checking object type structure issue...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    const wallRef = db.collection('walls').doc(ALUMNI_WALL_ID);
    const wallDoc = await wallRef.get();
    const wallData = wallDoc.data();
    
    console.log('OBJECT TYPE STRUCTURE ANALYSIS:');
    console.log('='*60);
    
    const objectTypeId = 'ot_1757520776375_iwnajudn0';
    const objectType = wallData.objectTypes[objectTypeId];
    
    console.log('Object Type fields structure:');
    console.log(`  Type: ${typeof objectType.fields}`);
    console.log(`  Is Array: ${Array.isArray(objectType.fields)}`);
    console.log(`  Content:`, JSON.stringify(objectType.fields, null, 2));
    
    console.log('\n❌ PROBLEM IDENTIFIED:');
    console.log('The fields property is an ARRAY but should be an OBJECT!');
    console.log('App expects: fields: { "0": {...}, "1": {...}, ... }');
    console.log('Currently have: fields: [ {...}, {...}, ... ]');
    
    // Compare with a working wall (veteran wall)
    console.log('\n📊 COMPARING WITH VETERAN WALL:');
    const veteranWallRef = db.collection('walls').doc('Fkzc5Kh7gMpyTEm5Cl6d');
    const veteranDoc = await veteranWallRef.get();
    
    if (veteranDoc.exists) {
        const veteranData = veteranDoc.data();
        const veteranObjectType = veteranData.objectTypes?.['0'];
        if (veteranObjectType) {
            console.log('Veteran wall fields structure:');
            console.log(`  Type: ${typeof veteranObjectType.fields}`);
            console.log(`  Is Array: ${Array.isArray(veteranObjectType.fields)}`);
            if (typeof veteranObjectType.fields === 'object' && !Array.isArray(veteranObjectType.fields)) {
                console.log('  ✅ Veteran wall has correct object structure for fields');
            }
        }
    }
    
    console.log('\n🔧 SOLUTION:');
    console.log('Need to convert the fields array to an object with numeric keys');
    
    return wallData;
}

if (require.main === module) {
    checkObjectTypeStructure()
        .then(() => {
            console.log('\n✅ Analysis complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Check failed:', error);
            process.exit(1);
        });
}