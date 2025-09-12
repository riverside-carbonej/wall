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

async function checkPresetMismatch() {
    console.log('🔍 Investigating preset URL mismatch...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get wall data
    const wallDoc = await db.collection('walls').doc(ALUMNI_WALL_ID).get();
    const wallData = wallDoc.data();
    
    console.log('📋 CURRENT WALL OBJECT TYPES:');
    if (wallData.objectTypes) {
        Object.entries(wallData.objectTypes).forEach(([id, type]) => {
            console.log(`  ID: "${id}" => Name: "${type.name}"`);
        });
    }
    
    console.log('\n🌐 URL ANALYSIS:');
    const urlPreset = 'ot_1757520776303_vsqkh9g9a';
    console.log(`URL preset: ${urlPreset}`);
    console.log('Breaking down the preset ID:');
    console.log('  - Prefix: "ot_" (likely means "object type")');
    console.log('  - Timestamp: 1757520776303');
    console.log('  - Suffix: vsqkh9g9a');
    
    // Convert timestamp to date
    const timestamp = 1757520776303;
    const date = new Date(timestamp);
    console.log(`  - Date from timestamp: ${date.toISOString()}`);
    
    console.log('\n❓ HYPOTHESIS:');
    console.log('The URL is looking for an object type with ID "1757520776303" or similar');
    console.log('But the wall only has object type "0"');
    console.log('This mismatch could explain why items aren\'t showing!');
    
    console.log('\n🔧 POTENTIAL SOLUTIONS:');
    console.log('1. Update the object type ID from "0" to match the preset');
    console.log('2. Create a new object type with the expected ID');
    console.log('3. Update items to use a different object type ID');
    
    // Let's check what object type the "sample" items would have used
    console.log('\n🔍 CHECKING FOR HISTORICAL DATA:');
    
    // Look for any items with different object type IDs
    const allItems = await db.collection('wall-items')
        .where('wallId', '==', ALUMNI_WALL_ID)
        .get();
    
    const uniqueObjectTypes = new Set();
    allItems.docs.forEach(doc => {
        const item = doc.data();
        if (item.objectTypeId) {
            uniqueObjectTypes.add(item.objectTypeId);
        }
    });
    
    console.log(`Unique object type IDs in items: ${Array.from(uniqueObjectTypes).join(', ')}`);
    
    // Check if we should update the object type configuration
    console.log('\n💡 RECOMMENDATION:');
    console.log('The wall\'s object type configuration needs to match what the preset expects.');
    console.log('We should update the wall to have an object type with the ID that matches the preset.');
    
    return {
        currentObjectTypes: Object.keys(wallData.objectTypes || {}),
        expectedFromUrl: '1757520776303',
        itemObjectTypes: Array.from(uniqueObjectTypes)
    };
}

if (require.main === module) {
    checkPresetMismatch()
        .then(result => {
            console.log('\n📊 Summary:');
            console.log(`  Current wall object types: ${result.currentObjectTypes.join(', ')}`);
            console.log(`  Expected from URL: ${result.expectedFromUrl}`);
            console.log(`  Object types in items: ${result.itemObjectTypes.join(', ')}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}