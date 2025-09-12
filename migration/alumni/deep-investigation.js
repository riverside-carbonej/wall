const admin = require('firebase-admin');
const path = require('path');

const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';
const VETERAN_WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function deepInvestigation() {
    console.log('🔬 Starting deep investigation...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // 1. Get the full wall document structure
    console.log('1️⃣ WALL DOCUMENT STRUCTURE');
    console.log('='*50);
    
    const wallDoc = await db.collection('walls').doc(ALUMNI_WALL_ID).get();
    const wallData = wallDoc.data();
    
    console.log(`Wall Name: ${wallData.name}`);
    console.log(`Wall ID: ${ALUMNI_WALL_ID}`);
    console.log(`Created: ${wallData.createdAt?.toDate?.()}`);
    console.log(`Published: ${wallData.published}`);
    console.log(`Owner ID: ${wallData.ownerId}`);
    
    // Look at object types in detail
    console.log('\n📦 Object Types Configuration:');
    if (wallData.objectTypes) {
        Object.entries(wallData.objectTypes).forEach(([typeId, type]) => {
            console.log(`\nObject Type "${typeId}":`);
            console.log(`  Name: ${type.name}`);
            console.log(`  Icon: ${type.icon}`);
            console.log(`  Display Name Field: ${type.displayNameField}`);
            console.log(`  Subtitle Fields: ${JSON.stringify(type.subtitleFields)}`);
            console.log(`  Metadata Fields: ${JSON.stringify(type.metadataFields)}`);
            console.log(`  Card Fields: ${JSON.stringify(type.cardFields)}`);
            
            if (type.fields) {
                console.log(`  Fields (${Object.keys(type.fields).length}):`);
                Object.entries(type.fields).forEach(([fieldId, field]) => {
                    console.log(`    ${fieldId}: ${field.name} (${field.type}) - Required: ${field.required}, Show in card: ${field.showInCard}`);
                });
            }
        });
    }
    
    // Check presets
    console.log('\n🎯 Presets:');
    if (wallData.presets) {
        Object.entries(wallData.presets).forEach(([presetId, preset]) => {
            console.log(`  ${presetId}: ${preset.name}`);
            if (preset.filters) {
                console.log(`    Filters: ${JSON.stringify(preset.filters)}`);
            }
        });
    }
    
    // 2. Sample wall items with full detail
    console.log('\n\n2️⃣ SAMPLE WALL ITEMS (First 3)');
    console.log('='*50);
    
    const itemsQuery = db.collection('wall-items')
        .where('wallId', '==', ALUMNI_WALL_ID)
        .limit(3);
    const itemsSnapshot = await itemsQuery.get();
    
    itemsSnapshot.docs.forEach((doc, index) => {
        const item = doc.data();
        console.log(`\nItem ${index + 1} (ID: ${doc.id}):`);
        console.log(`  Name: ${item.name}`);
        console.log(`  Object Type ID: ${item.objectTypeId}`);
        console.log(`  Published: ${item.published}`);
        console.log(`  Created: ${item.createdAt?.toDate?.()}`);
        console.log(`  Fields:`);
        if (item.fields) {
            Object.entries(item.fields).forEach(([key, value]) => {
                if (key !== '_original') {
                    console.log(`    "${key}": ${JSON.stringify(value)}`);
                }
            });
        }
    });
    
    // 3. Check the preset being used in the URL
    console.log('\n\n3️⃣ PRESET ANALYSIS');
    console.log('='*50);
    
    const presetId = 'ot_1757520776303_vsqkh9g9a';
    console.log(`URL uses preset: ${presetId}`);
    
    // The preset ID looks like it includes an object type reference
    // Let's parse it: ot_ suggests "object type"
    if (presetId.startsWith('ot_')) {
        console.log('This appears to be an object-type based preset');
        
        // Check if this matches any object types in the wall
        const possibleObjectTypeTimestamp = '1757520776303';
        console.log(`Possible object type timestamp: ${possibleObjectTypeTimestamp}`);
    }
    
    // 4. Compare with veteran wall
    console.log('\n\n4️⃣ VETERAN WALL COMPARISON (for reference)');
    console.log('='*50);
    
    const veteranWallDoc = await db.collection('walls').doc(VETERAN_WALL_ID).get();
    if (veteranWallDoc.exists) {
        const veteranData = veteranWallDoc.data();
        
        // Get a sample veteran item
        const veteranItemQuery = db.collection('wall-items')
            .where('wallId', '==', VETERAN_WALL_ID)
            .limit(1);
        const veteranSnapshot = await veteranItemQuery.get();
        
        if (!veteranSnapshot.empty) {
            const veteranItem = veteranSnapshot.docs[0].data();
            console.log('Sample Veteran Wall Item:');
            console.log(`  Object Type ID: ${veteranItem.objectTypeId}`);
            console.log(`  Fields structure: ${Object.keys(veteranItem.fields || {}).slice(0, 5).join(', ')}...`);
        }
    }
    
    // 5. Check for any timestamp/ID mismatches
    console.log('\n\n5️⃣ TIMESTAMP/ID ANALYSIS');
    console.log('='*50);
    
    // Check if object type IDs in wall match what items have
    const wallObjectTypeIds = Object.keys(wallData.objectTypes || {});
    console.log(`Wall has object type IDs: ${wallObjectTypeIds.join(', ')}`);
    
    // Count items by object type
    const allItemsQuery = db.collection('wall-items').where('wallId', '==', ALUMNI_WALL_ID);
    const allItemsSnapshot = await allItemsQuery.get();
    
    const itemsByObjectType = {};
    allItemsSnapshot.docs.forEach(doc => {
        const item = doc.data();
        const typeId = item.objectTypeId || 'NONE';
        itemsByObjectType[typeId] = (itemsByObjectType[typeId] || 0) + 1;
    });
    
    console.log('\nItems grouped by objectTypeId:');
    Object.entries(itemsByObjectType).forEach(([typeId, count]) => {
        const inWallConfig = wallObjectTypeIds.includes(typeId);
        console.log(`  "${typeId}": ${count} items ${inWallConfig ? '✅ (exists in wall config)' : '❌ (NOT in wall config)'}`);
    });
    
    console.log('\n\n✅ Deep investigation complete!');
}

if (require.main === module) {
    deepInvestigation()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}