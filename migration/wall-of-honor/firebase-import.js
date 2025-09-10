#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// You'll need to download your service account key and update this path
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://riverside-wall-app-default-rtdb.firebaseio.com",
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();
const storage = admin.storage().bucket();

// Load migration data
const migrationData = JSON.parse(fs.readFileSync('./migration-output/wall-data.json', 'utf8'));

async function importToFirebase() {
    try {
        console.log('🚀 Starting Firebase import...');

        // Step 1: Create the Veterans Wall
        console.log('📝 Creating Veterans Wall...');
        const wallRef = db.collection('walls').doc();
        const wallId = wallRef.id;
        
        // Create wall with object types matching your templates
        const wallData = {
            ...migrationData.wall,
            id: wallId,
            objectTypes: [
                {
                    id: 'veteran',
                    wallId: wallId,
                    name: 'Veteran',
                    description: 'Individual veteran service member',
                    icon: 'person',
                    color: '#1976d2',
                    fields: [
                        { id: 'name', name: 'Name', type: 'text', required: true },
                        { id: 'graduationYear', name: 'Graduation Year', type: 'text', required: false },
                        { id: 'rank', name: 'Military Rank', type: 'text', required: false },
                        { id: 'branches', name: 'Service Branches', type: 'entity', required: false, entityConfig: { targetObjectTypeId: 'branch', allowMultiple: true }},
                        { id: 'militaryEntryDate', name: 'Military Entry Date', type: 'date', required: false },
                        { id: 'militaryExitDate', name: 'Military Exit Date', type: 'date', required: false },
                        { id: 'deployments', name: 'Deployments', type: 'entity', required: false, entityConfig: { targetObjectTypeId: 'deployment', allowMultiple: true }},
                        { id: 'description', name: 'Service Description', type: 'longtext', required: false }
                    ],
                    displaySettings: {
                        primaryField: 'name',
                        secondaryField: 'rank',
                        tertiaryField: 'graduationYear',
                        showOnMap: false,
                        cardLayout: 'detailed'
                    },
                    isActive: true,
                    sortOrder: 0,
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now()
                },
                {
                    id: 'branch',
                    wallId: wallId,
                    name: 'Branch',
                    description: 'Military service branch',
                    icon: 'military_tech',
                    color: '#f57c00',
                    fields: [
                        { id: 'name', name: 'Branch Name', type: 'text', required: true },
                        { id: 'description', name: 'Description', type: 'text', required: false }
                    ],
                    displaySettings: {
                        primaryField: 'name',
                        secondaryField: 'description',
                        showOnMap: false,
                        cardLayout: 'compact'
                    },
                    isActive: true,
                    sortOrder: 1,
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now()
                },
                {
                    id: 'deployment',
                    wallId: wallId,
                    name: 'Deployment',
                    description: 'Military deployment or operation',
                    icon: 'public',
                    color: '#388e3c',
                    fields: [
                        { id: 'title', name: 'Deployment Title', type: 'text', required: true },
                        { id: 'location', name: 'Location', type: 'location', required: true },
                        { id: 'startDate', name: 'Start Date', type: 'date', required: false },
                        { id: 'endDate', name: 'End Date', type: 'date', required: false },
                        { id: 'description', name: 'Description', type: 'text', required: false }
                    ],
                    displaySettings: {
                        primaryField: 'title',
                        secondaryField: 'location',
                        showOnMap: true,
                        cardLayout: 'compact'
                    },
                    isActive: true,
                    sortOrder: 2,
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now()
                }
            ],
            theme: {
                id: 'patriotic',
                name: 'Patriotic',
                isCustom: false,
                mode: 'dark',
                primaryColor: '#dc3545',
                secondaryColor: '#ffffff',
                accentColor: '#dc3545',
                backgroundColor: '#0d1421',
                surfaceColor: '#1a2332',
                cardColor: '#243142',
                textColor: '#ffffff'
            },
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };

        await wallRef.set(wallData);
        console.log(`✅ Created wall: ${wallId}`);

        // Step 2: Import Branches first (referenced by veterans)
        console.log('📝 Importing branches...');
        const branchBatch = db.batch();
        for (const branch of migrationData.items.branches) {
            const branchRef = db.collection('wall_items').doc();
            branchBatch.set(branchRef, {
                ...branch,
                wallId: wallId,
                id: branchRef.id,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            });
        }
        await branchBatch.commit();
        console.log(`✅ Imported ${migrationData.items.branches.length} branches`);

        // Step 3: Import Deployments
        console.log('📝 Importing deployments...');
        const deploymentBatch = db.batch();
        for (const deployment of migrationData.items.deployments) {
            const deploymentRef = db.collection('wall_items').doc();
            deploymentBatch.set(deploymentRef, {
                ...deployment,
                wallId: wallId,
                id: deploymentRef.id,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            });
        }
        await deploymentBatch.commit();
        console.log(`✅ Imported ${migrationData.items.deployments.length} deployments`);

        // Step 4: Import Veterans (in batches of 500 due to Firestore limits)
        console.log('📝 Importing veterans...');
        const batchSize = 500;
        const veterans = migrationData.items.veterans;
        
        for (let i = 0; i < veterans.length; i += batchSize) {
            const batch = db.batch();
            const batchVeterans = veterans.slice(i, i + batchSize);
            
            for (const veteran of batchVeterans) {
                const veteranRef = db.collection('wall_items').doc();
                batch.set(veteranRef, {
                    ...veteran,
                    wallId: wallId,
                    id: veteranRef.id,
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now()
                });
            }
            
            await batch.commit();
            console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${batchVeterans.length} veterans`);
        }

        console.log('🎉 Firebase import complete!');
        console.log(`📊 Summary:`);
        console.log(`   • Wall ID: ${wallId}`);
        console.log(`   • ${migrationData.items.veterans.length} Veterans imported`);
        console.log(`   • ${migrationData.items.branches.length} Branches imported`);
        console.log(`   • ${migrationData.items.deployments.length} Deployments imported`);
        console.log(`\n📋 Next steps:`);
        console.log(`   1. Run copy-images.bat to organize images`);
        console.log(`   2. Upload images to Firebase Storage`);
        console.log(`   3. Update wall items with Firebase Storage URLs`);

        return wallId;

    } catch (error) {
        console.error('❌ Error during import:', error);
        throw error;
    }
}

// Run the import
importToFirebase()
    .then((wallId) => {
        console.log(`\n🔗 Your wall URL: http://localhost:4301/walls/${wallId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Import failed:', error);
        process.exit(1);
    });