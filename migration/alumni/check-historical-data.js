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

async function checkHistoricalData() {
    console.log('🔍 Checking historical data and object type references...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get wall creation time
    const wallDoc = await db.collection('walls').doc(ALUMNI_WALL_ID).get();
    const wallData = wallDoc.data();
    const wallCreatedAt = wallData.createdAt?.toDate?.();
    const wallTimestamp = wallCreatedAt?.getTime();
    
    console.log('📋 WALL INFO:');
    console.log(`  Created: ${wallCreatedAt}`);
    console.log(`  Timestamp: ${wallTimestamp}`);
    console.log(`  Expected object type ID pattern: ot_${wallTimestamp}_*`);
    
    // Check if URL preset ID matches wall creation
    const urlPresetId = 'ot_1757520776303_vsqkh9g9a';
    const urlTimestamp = parseInt(urlPresetId.split('_')[1]);
    console.log(`\n🌐 URL PRESET ANALYSIS:`);
    console.log(`  URL preset ID: ${urlPresetId}`);
    console.log(`  URL timestamp: ${urlTimestamp}`);
    console.log(`  Matches wall creation: ${urlTimestamp === wallTimestamp}`);
    
    // Check the actual object type in the wall
    console.log('\n📦 CURRENT OBJECT TYPES:');
    if (wallData.objectTypes) {
        Object.entries(wallData.objectTypes).forEach(([id, type]) => {
            console.log(`  "${id}": ${type.name}`);
        });
    }
    
    // The solution: we need to update the object type ID
    console.log('\n💡 SOLUTION IDENTIFIED:');
    console.log('The wall\'s object type ID needs to be updated from "0" to match the URL preset.');
    console.log(`Current: "0"`);
    console.log(`Should be: "${urlPresetId}"`);
    
    console.log('\n🔧 PROPOSED FIX:');
    console.log('1. Update wall.objectTypes to use the correct ID');
    console.log('2. Update all wall items to use the new objectTypeId');
    console.log('3. This will make items appear at the URL');
    
    return {
        wallTimestamp,
        urlTimestamp,
        urlPresetId,
        currentObjectTypeId: '0',
        match: urlTimestamp === wallTimestamp
    };
}

if (require.main === module) {
    checkHistoricalData()
        .then(result => {
            console.log('\n✅ Analysis complete!');
            if (result.match) {
                console.log('The URL preset matches the wall creation time.');
                console.log(`We need to update object type ID from "${result.currentObjectTypeId}" to "${result.urlPresetId}"`);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}