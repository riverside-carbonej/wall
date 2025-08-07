#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();

async function listWalls() {
    try {
        console.log('📋 Fetching all walls...\n');
        
        const wallsRef = db.collection('walls');
        const snapshot = await wallsRef.get();
        
        if (snapshot.empty) {
            console.log('No walls found.');
            return;
        }
        
        console.log(`Found ${snapshot.size} walls:\n`);
        console.log('═══════════════════════════════════════════════════════════════════');
        
        snapshot.forEach(doc => {
            const wall = doc.data();
            const deploymentCount = wall.objectTypes?.find(ot => ot.id === 'deployment') ? '✅' : '❌';
            
            console.log(`Wall ID: ${doc.id}`);
            console.log(`Name: ${wall.name}`);
            console.log(`Organization: ${wall.organizationName || 'N/A'}`);
            console.log(`Has Deployment Object Type: ${deploymentCount}`);
            console.log(`Object Types: ${wall.objectTypes?.map(ot => ot.name).join(', ') || 'None'}`);
            console.log('───────────────────────────────────────────────────────────────────');
        });
        
        console.log('\nTo update deployment locations for a wall, run:');
        console.log('node update-deployment-locations.js [WALL_ID]');
        
    } catch (error) {
        console.error('❌ Error listing walls:', error);
        throw error;
    }
}

listWalls()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to list walls:', error);
        process.exit(1);
    });