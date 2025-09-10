#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const storage = admin.storage().bucket();
const db = admin.firestore();

// Image paths
const VETERANS_IMAGES = 'C:\\Users\\jackc\\OneDrive\\Work\\Riverside\\Wall Of Honor\\mig\\Veterans\\Veterans\\Images';
const BRANCHES_IMAGES = 'C:\\Users\\jackc\\OneDrive\\Work\\Riverside\\Wall Of Honor\\mig\\Veterans\\Branches\\Images';

async function cleanupMissingImages(wallId) {
    try {
        console.log('🧹 Starting cleanup of missing images...');
        
        // Get list of actual image files
        console.log('📂 Reading image directories...');
        const veteranImages = fs.readdirSync(VETERANS_IMAGES)
            .filter(file => file.endsWith('.png') && file !== 'Thumbs.db')
            .map(file => file.replace('.png', ''));
        
        const branchImages = fs.readdirSync(BRANCHES_IMAGES)
            .filter(file => file.endsWith('.png') && file !== 'Thumbs.db')
            .map(file => file.replace('.png', ''));
        
        console.log(`📊 Found ${veteranImages.length} veteran image files`);
        console.log(`📊 Found ${branchImages.length} branch image files`);
        
        // Get all wall items from Firebase
        console.log('🔍 Fetching wall items from Firebase...');
        const itemsSnapshot = await db.collection('wall_items')
            .where('wallId', '==', wallId)
            .get();

        console.log(`📊 Found ${itemsSnapshot.docs.length} items in Firebase`);

        // Load the original migration data to get the old UUID mapping
        const migrationData = JSON.parse(fs.readFileSync('./migration-output/wall-data.json', 'utf8'));
        
        // Create mapping from Firebase ID back to original UUID
        const firebaseToUuidMap = {};
        
        itemsSnapshot.docs.forEach(doc => {
            const item = doc.data();
            
            // Find the original item by matching name and type
            let originalItem = null;
            if (item.objectTypeId === 'veteran') {
                originalItem = migrationData.items.veterans.find(v => 
                    v.fieldData.name === item.fieldData.name && 
                    v.fieldData.rank === item.fieldData.rank
                );
            } else if (item.objectTypeId === 'branch') {
                originalItem = migrationData.items.branches.find(b => 
                    b.fieldData.name === item.fieldData.name
                );
            }
            
            if (originalItem) {
                firebaseToUuidMap[doc.id] = originalItem.id;
            }
        });

        console.log(`🔗 Mapped ${Object.keys(firebaseToUuidMap).length} items to original UUIDs`);

        // Find items that have image references but no actual image files
        const batch = db.batch();
        let cleanedItems = 0;
        
        for (const doc of itemsSnapshot.docs) {
            const item = doc.data();
            const originalUuid = firebaseToUuidMap[doc.id];
            
            if (!originalUuid) continue;
            
            // Check if item has images but the actual file doesn't exist
            if (item.images && item.images.length > 0) {
                let hasRealImage = false;
                
                if (item.objectTypeId === 'veteran') {
                    hasRealImage = veteranImages.includes(originalUuid);
                } else if (item.objectTypeId === 'branch') {
                    hasRealImage = branchImages.includes(originalUuid);
                }
                
                if (!hasRealImage) {
                    // Remove the image reference to show placeholder
                    console.log(`🧹 Removing missing image reference for: ${item.fieldData.name} (${item.objectTypeId})`);
                    
                    batch.update(doc.ref, {
                        images: [],
                        updatedAt: admin.firestore.Timestamp.now()
                    });
                    
                    cleanedItems++;
                }
            }
        }
        
        // Commit all updates
        if (cleanedItems > 0) {
            console.log('💾 Updating Firestore to remove missing image references...');
            await batch.commit();
            console.log(`✅ Cleaned up ${cleanedItems} items with missing images`);
        } else {
            console.log('✅ No missing image references found - all items are properly configured');
        }
        
        console.log('🎉 Image cleanup complete!');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node cleanup-missing-images.js YOUR_WALL_ID');
    process.exit(1);
}

cleanupMissingImages(wallId)
    .then(() => {
        console.log('\n✨ Veterans Wall images are now cleaned up!');
        console.log(`🔗 View your wall: http://localhost:4301/walls/${wallId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Cleanup failed:', error);
        process.exit(1);
    });