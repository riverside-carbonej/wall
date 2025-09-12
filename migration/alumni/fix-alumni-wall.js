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

async function fixAlumniWall() {
    console.log('🔧 Fixing Alumni Hall of Fame wall configuration...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Step 1: Get the wall and analyze
    console.log('1️⃣ ANALYZING WALL...');
    const wallRef = db.collection('walls').doc(ALUMNI_WALL_ID);
    const wallDoc = await wallRef.get();
    
    if (!wallDoc.exists) {
        throw new Error(`Wall ${ALUMNI_WALL_ID} not found!`);
    }
    
    const wallData = wallDoc.data();
    console.log(`Wall: "${wallData.name}"`);
    console.log(`Current object types: ${Object.keys(wallData.objectTypes || {}).join(', ')}`);
    
    // Generate the proper object type ID based on wall creation time
    const wallCreatedAt = wallData.createdAt?.toDate?.() || new Date();
    const wallTimestamp = wallCreatedAt.getTime();
    const newObjectTypeId = `ot_${wallTimestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`\n2️⃣ UPDATING OBJECT TYPE ID...`);
    console.log(`Old ID: "0"`);
    console.log(`New ID: "${newObjectTypeId}"`);
    
    // Get the current object type configuration
    const currentObjectType = wallData.objectTypes?.['0'];
    if (!currentObjectType) {
        throw new Error('No object type with ID "0" found!');
    }
    
    // Create updated object types with new ID
    const updatedObjectTypes = {
        [newObjectTypeId]: {
            ...currentObjectType,
            id: newObjectTypeId,
            wallId: ALUMNI_WALL_ID,
            // Ensure display configuration is set
            displayNameField: currentObjectType.displayNameField || '0', // Use Full Name field
            cardFields: currentObjectType.cardFields || ['0', '1', '2', '3'], // Show first 4 fields
            subtitleFields: currentObjectType.subtitleFields || ['2', '3'], // Category and Current Position
            metadataFields: currentObjectType.metadataFields || ['1'] // Graduation Year
        }
    };
    
    // Update the wall document
    await wallRef.update({
        objectTypes: updatedObjectTypes,
        updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('✅ Wall object type updated!');
    
    // Step 3: Update all wall items
    console.log(`\n3️⃣ UPDATING WALL ITEMS...`);
    
    const itemsQuery = db.collection('wall-items').where('wallId', '==', ALUMNI_WALL_ID);
    const itemsSnapshot = await itemsQuery.get();
    
    console.log(`Found ${itemsSnapshot.size} items to update`);
    
    if (itemsSnapshot.size > 0) {
        const BATCH_SIZE = 500;
        let updated = 0;
        
        // Process in batches
        const docs = itemsSnapshot.docs;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const batchDocs = docs.slice(i, i + BATCH_SIZE);
            
            batchDocs.forEach(doc => {
                batch.update(doc.ref, {
                    objectTypeId: newObjectTypeId,
                    updatedAt: admin.firestore.Timestamp.now()
                });
            });
            
            await batch.commit();
            updated += batchDocs.length;
            console.log(`  Updated ${updated}/${itemsSnapshot.size} items...`);
        }
        
        console.log('✅ All items updated!');
    }
    
    // Step 4: Verify the fix
    console.log(`\n4️⃣ VERIFYING FIX...`);
    
    // Check wall configuration
    const verifyWallDoc = await wallRef.get();
    const verifyWallData = verifyWallDoc.data();
    const hasNewObjectType = verifyWallData.objectTypes && verifyWallData.objectTypes[newObjectTypeId];
    console.log(`✅ Wall has new object type: ${hasNewObjectType}`);
    
    // Check items
    const verifyItemsQuery = db.collection('wall-items')
        .where('wallId', '==', ALUMNI_WALL_ID)
        .where('objectTypeId', '==', newObjectTypeId)
        .limit(5);
    const verifyItemsSnapshot = await verifyItemsQuery.get();
    console.log(`✅ Items with new object type: ${verifyItemsSnapshot.size}`);
    
    // Generate the correct URL
    console.log(`\n5️⃣ ACCESS YOUR WALL:`);
    console.log('='*60);
    console.log(`Direct wall URL:`);
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}`);
    console.log(`\nPreset-based URL (should now work):`);
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}/preset/${newObjectTypeId}/items`);
    console.log(`\nAdd new item URL:`);
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}/preset/${newObjectTypeId}/items/add`);
    
    return {
        wallId: ALUMNI_WALL_ID,
        oldObjectTypeId: '0',
        newObjectTypeId,
        itemsUpdated: itemsSnapshot.size
    };
}

if (require.main === module) {
    fixAlumniWall()
        .then(result => {
            console.log('\n\n✅ ALUMNI WALL FIXED SUCCESSFULLY!');
            console.log(`Wall ID: ${result.wallId}`);
            console.log(`Object Type: ${result.oldObjectTypeId} → ${result.newObjectTypeId}`);
            console.log(`Items Updated: ${result.itemsUpdated}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fix failed:', error);
            process.exit(1);
        });
}