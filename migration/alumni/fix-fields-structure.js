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

async function fixFieldsStructure() {
    console.log('🔧 Fixing fields structure from array to object...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    const wallRef = db.collection('walls').doc(ALUMNI_WALL_ID);
    const wallDoc = await wallRef.get();
    const wallData = wallDoc.data();
    
    const objectTypeId = 'ot_1757520776375_iwnajudn0';
    const objectType = wallData.objectTypes[objectTypeId];
    
    console.log('Current fields structure:');
    console.log(`  Is Array: ${Array.isArray(objectType.fields)}`);
    
    if (Array.isArray(objectType.fields)) {
        console.log('Converting array to object...');
        
        // Convert array to object with numeric string keys
        const fieldsObject = {};
        objectType.fields.forEach((field, index) => {
            // Keep the original field structure but use numeric keys
            const fieldObj = {
                id: index.toString(), // Use numeric ID
                name: field.name,
                type: field.type,
                required: field.required,
                placeholder: field.placeholder,
                showInCard: true // Add missing properties
            };
            
            // Only add maxLength for text fields
            if (field.type === 'text') {
                fieldObj.maxLength = 255;
            }
            
            fieldsObject[index.toString()] = fieldObj;
        });
        
        console.log('\nNew fields structure:');
        console.log(JSON.stringify(fieldsObject, null, 2));
        
        // Update the object type with correct structure
        const updatedObjectType = {
            ...objectType,
            id: objectTypeId,
            wallId: ALUMNI_WALL_ID,
            fields: fieldsObject,
            displayNameField: '0', // Full Name
            cardFields: ['0', '1', '2', '3'], // Show first 4 fields
            subtitleFields: ['2', '3'], // Degree and Current Position
            metadataFields: ['1'] // Graduation Year
        };
        
        // Update the wall
        await wallRef.update({
            [`objectTypes.${objectTypeId}`]: updatedObjectType,
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        console.log('✅ Fields structure fixed!');
        
        // Also need to update wall items to use numeric field IDs
        console.log('\n📝 Updating wall items to use numeric field IDs...');
        
        const itemsQuery = db.collection('wall-items').where('wallId', '==', ALUMNI_WALL_ID);
        const itemsSnapshot = await itemsQuery.get();
        
        if (itemsSnapshot.size > 0) {
            const BATCH_SIZE = 500;
            let updated = 0;
            
            const docs = itemsSnapshot.docs;
            for (let i = 0; i < docs.length; i += BATCH_SIZE) {
                const batch = db.batch();
                const batchDocs = docs.slice(i, i + BATCH_SIZE);
                
                batchDocs.forEach(doc => {
                    const item = doc.data();
                    const currentFields = item.fields || {};
                    
                    // Fields should already be using numeric IDs (0, 1, 2, 3, 4)
                    // Just ensure they're set correctly
                    const updatedFields = {
                        '0': currentFields['0'] || item.name || '', // Full Name
                        '1': currentFields['1'] || null, // Graduation Year
                        '2': currentFields['2'] || '', // Degree/Category
                        '3': currentFields['3'] || '', // Current Position
                        '4': currentFields['4'] || null // Email
                    };
                    
                    batch.update(doc.ref, {
                        fields: updatedFields,
                        updatedAt: admin.firestore.Timestamp.now()
                    });
                });
                
                await batch.commit();
                updated += batchDocs.length;
                console.log(`  Updated ${updated}/${itemsSnapshot.size} items...`);
            }
            
            console.log('✅ All items updated!');
        }
        
    } else {
        console.log('✅ Fields already in correct object structure');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const verifyDoc = await wallRef.get();
    const verifyData = verifyDoc.data();
    const verifyObjectType = verifyData.objectTypes[objectTypeId];
    
    console.log(`Fields is object: ${typeof verifyObjectType.fields === 'object'}`);
    console.log(`Fields is NOT array: ${!Array.isArray(verifyObjectType.fields)}`);
    console.log(`Number of fields: ${Object.keys(verifyObjectType.fields).length}`);
    
    console.log('\n📋 ACCESS URLS:');
    console.log('='*60);
    console.log('Wall overview:');
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}`);
    console.log('\nView all alumni:');
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}/preset/${objectTypeId}/items`);
    console.log('\nAdd new alumni:');
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}/preset/${objectTypeId}/items/add`);
    
    return true;
}

if (require.main === module) {
    fixFieldsStructure()
        .then(() => {
            console.log('\n✅ Fields structure fixed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fix failed:', error);
            process.exit(1);
        });
}