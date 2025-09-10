#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();

async function establishRelationships(wallId) {
    try {
        console.log('🔗 Starting relationship establishment...');
        
        // Load original migration data to get UUID relationships
        const migrationData = JSON.parse(fs.readFileSync('./migration/migration-output/wall-data.json', 'utf8'));
        
        // Get all wall items from Firebase
        console.log('📊 Fetching wall items from Firebase...');
        const itemsSnapshot = await db.collection('wall_items')
            .where('wallId', '==', wallId)
            .get();

        const firebaseItems = {};
        itemsSnapshot.docs.forEach(doc => {
            const item = doc.data();
            firebaseItems[doc.id] = {
                ...item,
                docId: doc.id
            };
        });

        console.log(`📊 Found ${itemsSnapshot.docs.length} items in Firebase`);

        // Create UUID to Firebase ID mapping
        const uuidToFirebaseId = {};
        
        // Map veterans
        migrationData.items.veterans.forEach(originalVeteran => {
            const matchingFirebaseItem = Object.values(firebaseItems).find(fbItem => 
                fbItem.objectTypeId === 'veteran' && 
                fbItem.fieldData.name === originalVeteran.fieldData.name &&
                fbItem.fieldData.graduationYear === originalVeteran.fieldData.graduationYear
            );
            
            if (matchingFirebaseItem) {
                uuidToFirebaseId[originalVeteran.id] = matchingFirebaseItem.docId;
            }
        });

        // Map branches
        migrationData.items.branches.forEach(originalBranch => {
            const matchingFirebaseItem = Object.values(firebaseItems).find(fbItem => 
                fbItem.objectTypeId === 'branch' && 
                fbItem.fieldData.name === originalBranch.fieldData.name
            );
            
            if (matchingFirebaseItem) {
                uuidToFirebaseId[originalBranch.id] = matchingFirebaseItem.docId;
            }
        });

        // Map deployments
        migrationData.items.deployments.forEach(originalDeployment => {
            const matchingFirebaseItem = Object.values(firebaseItems).find(fbItem => 
                fbItem.objectTypeId === 'deployment' && 
                fbItem.fieldData.title === originalDeployment.fieldData.title
            );
            
            if (matchingFirebaseItem) {
                uuidToFirebaseId[originalDeployment.id] = matchingFirebaseItem.docId;
            }
        });

        console.log(`🔗 Created UUID to Firebase ID mapping for ${Object.keys(uuidToFirebaseId).length} items`);

        // Now update veterans with proper relationship references
        let batch = db.batch();
        let batchCount = 0;
        let updatedVeterans = 0;
        let totalBranchRelationships = 0;
        let totalDeploymentRelationships = 0;

        // Process each veteran from original data
        for (const originalVeteran of migrationData.items.veterans) {
            const veteranFirebaseId = uuidToFirebaseId[originalVeteran.id];
            
            if (!veteranFirebaseId) {
                console.warn(`   ⚠️  No Firebase item found for veteran: ${originalVeteran.fieldData.name}`);
                continue;
            }

            const veteranRef = db.collection('wall_items').doc(veteranFirebaseId);
            const updates = {};
            let hasUpdates = false;

            // Convert branch UUIDs to Firebase IDs
            if (originalVeteran.fieldData.branches && originalVeteran.fieldData.branches.length > 0) {
                const branchFirebaseIds = originalVeteran.fieldData.branches
                    .map(branchUuid => uuidToFirebaseId[branchUuid])
                    .filter(id => id); // Remove undefined values

                if (branchFirebaseIds.length > 0) {
                    updates['fieldData.branches'] = branchFirebaseIds;
                    hasUpdates = true;
                    totalBranchRelationships += branchFirebaseIds.length;
                    console.log(`   🔗 ${originalVeteran.fieldData.name}: ${branchFirebaseIds.length} branch(es)`);
                } else {
                    // Clear empty relationships
                    updates['fieldData.branches'] = [];
                    hasUpdates = true;
                }
            }

            // Convert deployment UUIDs to Firebase IDs
            if (originalVeteran.fieldData.deployments && originalVeteran.fieldData.deployments.length > 0) {
                const deploymentFirebaseIds = originalVeteran.fieldData.deployments
                    .map(deploymentUuid => uuidToFirebaseId[deploymentUuid])
                    .filter(id => id); // Remove undefined values

                if (deploymentFirebaseIds.length > 0) {
                    updates['fieldData.deployments'] = deploymentFirebaseIds;
                    hasUpdates = true;
                    totalDeploymentRelationships += deploymentFirebaseIds.length;
                    console.log(`   🌍 ${originalVeteran.fieldData.name}: ${deploymentFirebaseIds.length} deployment(s)`);
                } else {
                    // Clear empty relationships
                    updates['fieldData.deployments'] = [];
                    hasUpdates = true;
                }
            }

            // Apply updates if any
            if (hasUpdates) {
                updates.updatedAt = admin.firestore.Timestamp.now();
                batch.update(veteranRef, updates);
                batchCount++;
                updatedVeterans++;

                // Commit in batches of 500 to avoid Firestore limits
                if (batchCount >= 500) {
                    console.log(`   💾 Committing batch of ${batchCount} updates...`);
                    await batch.commit();
                    batch = db.batch(); // Create new batch
                    batchCount = 0;
                }
            }
        }

        // Commit any remaining updates
        if (batchCount > 0) {
            console.log(`💾 Committing final batch of ${batchCount} updates...`);
            await batch.commit();
        }

        // Update the wall configuration to include proper relationships
        console.log('🔧 Updating wall object types with relationship configuration...');
        const wallRef = db.collection('walls').doc(wallId);
        const wallDoc = await wallRef.get();
        
        if (wallDoc.exists) {
            const wallData = wallDoc.data();
            const updatedObjectTypes = wallData.objectTypes.map(objectType => {
                if (objectType.id === 'veteran') {
                    // Add entity fields for branches and deployments
                    const updatedFields = [...objectType.fields];
                    
                    // Update branches field to be an entity relationship
                    const branchesFieldIndex = updatedFields.findIndex(f => f.id === 'branches');
                    if (branchesFieldIndex >= 0) {
                        updatedFields[branchesFieldIndex] = {
                            ...updatedFields[branchesFieldIndex],
                            type: 'entity',
                            entityConfig: {
                                targetObjectTypeId: 'branch',
                                allowMultiple: true,
                                displayMode: 'chips'
                            }
                        };
                    }
                    
                    // Update deployments field to be an entity relationship
                    const deploymentsFieldIndex = updatedFields.findIndex(f => f.id === 'deployments');
                    if (deploymentsFieldIndex >= 0) {
                        updatedFields[deploymentsFieldIndex] = {
                            ...updatedFields[deploymentsFieldIndex],
                            type: 'entity',
                            entityConfig: {
                                targetObjectTypeId: 'deployment',
                                allowMultiple: true,
                                displayMode: 'chips'
                            }
                        };
                    }

                    return {
                        ...objectType,
                        fields: updatedFields
                    };
                }
                return objectType;
            });

            await wallRef.update({
                objectTypes: updatedObjectTypes,
                updatedAt: admin.firestore.Timestamp.now()
            });
        }

        console.log('✅ Relationship establishment complete!');
        console.log(`📊 Statistics:`);
        console.log(`   • ${updatedVeterans} veterans updated`);
        console.log(`   • ${totalBranchRelationships} branch relationships established`);
        console.log(`   • ${totalDeploymentRelationships} deployment relationships established`);
        
    } catch (error) {
        console.error('❌ Error during relationship establishment:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node establish-relationships.js YOUR_WALL_ID');
    process.exit(1);
}

establishRelationships(wallId)
    .then(() => {
        console.log('\n✨ Veterans are now properly connected to their service branches and deployments!');
        console.log(`🔗 View your wall: http://localhost:4301/walls/${wallId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Relationship establishment failed:', error);
        process.exit(1);
    });