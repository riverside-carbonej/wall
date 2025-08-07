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

// Load the original migration data to get the old UUID -> data mapping
const migrationData = JSON.parse(fs.readFileSync('./migration-output/wall-data.json', 'utf8'));

async function uploadImagesWithNewIds(wallId) {
    try {
        console.log('📷 Starting image upload with Firebase IDs...');
        
        // Get all wall items from Firebase
        console.log('🔍 Fetching wall items from Firebase...');
        const itemsSnapshot = await db.collection('wall_items')
            .where('wallId', '==', wallId)
            .get();

        const firebaseItems = {};
        itemsSnapshot.docs.forEach(doc => {
            const item = doc.data();
            firebaseItems[doc.id] = item;
        });

        console.log(`📊 Found ${itemsSnapshot.docs.length} items in Firebase`);

        // Create mapping from original UUID to Firebase ID
        const uuidToFirebaseId = {};
        
        // Map veterans
        migrationData.items.veterans.forEach(originalVeteran => {
            const originalId = originalVeteran.id; // Original UUID
            
            // Find matching Firebase item by name and rank
            const matchingFirebaseItem = Object.entries(firebaseItems).find(([fbId, fbItem]) => {
                return fbItem.objectTypeId === 'veteran' && 
                       fbItem.fieldData.name === originalVeteran.fieldData.name &&
                       fbItem.fieldData.rank === originalVeteran.fieldData.rank;
            });
            
            if (matchingFirebaseItem) {
                uuidToFirebaseId[originalId] = matchingFirebaseItem[0];
            }
        });

        // Map branches  
        migrationData.items.branches.forEach(originalBranch => {
            const originalId = originalBranch.id;
            
            const matchingFirebaseItem = Object.entries(firebaseItems).find(([fbId, fbItem]) => {
                return fbItem.objectTypeId === 'branch' && 
                       fbItem.fieldData.name === originalBranch.fieldData.name;
            });
            
            if (matchingFirebaseItem) {
                uuidToFirebaseId[originalId] = matchingFirebaseItem[0];
            }
        });

        console.log(`🔗 Mapped ${Object.keys(uuidToFirebaseId).length} items to Firebase IDs`);

        // Upload veteran images
        console.log('📷 Uploading veteran images...');
        const veteranImages = fs.readdirSync(VETERANS_IMAGES)
            .filter(file => file.endsWith('.png') && file !== 'Thumbs.db');

        let uploadedVeterans = 0;
        const batch = db.batch();

        for (const imageFile of veteranImages) {
            try {
                const originalUuid = imageFile.replace('.png', '');
                const firebaseId = uuidToFirebaseId[originalUuid];
                
                if (!firebaseId) {
                    console.warn(`   ⚠️  No Firebase item found for veteran image ${imageFile}`);
                    continue;
                }

                const localPath = path.join(VETERANS_IMAGES, imageFile);
                const storagePath = `walls/${wallId}/items/${firebaseId}/${imageFile}`;
                
                // Upload to Firebase Storage
                await storage.upload(localPath, {
                    destination: storagePath,
                    metadata: {
                        contentType: 'image/png',
                        cacheControl: 'public, max-age=86400'
                    }
                });

                // Generate signed URL
                const [url] = await storage.file(storagePath).getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500'
                });

                // Update Firestore item with image data
                const itemRef = db.collection('wall_items').doc(firebaseId);
                batch.update(itemRef, {
                    images: [{
                        id: `${firebaseId}-image`,
                        url: url,
                        fileName: imageFile,
                        altText: `${firebaseItems[firebaseId].fieldData.name} photo`,
                        uploadedAt: admin.firestore.Timestamp.now(),
                        size: fs.statSync(localPath).size,
                        mimeType: 'image/png'
                    }],
                    updatedAt: admin.firestore.Timestamp.now()
                });
                
                uploadedVeterans++;
                if (uploadedVeterans % 25 === 0) {
                    console.log(`   Uploaded ${uploadedVeterans}/${veteranImages.length} veteran images`);
                }
                
            } catch (error) {
                console.warn(`   ⚠️  Failed to upload veteran image ${imageFile}:`, error.message);
            }
        }

        // Upload branch images
        console.log('📷 Uploading branch images...');
        const branchImages = fs.readdirSync(BRANCHES_IMAGES)
            .filter(file => file.endsWith('.png') && file !== 'Thumbs.db');

        let uploadedBranches = 0;

        for (const imageFile of branchImages) {
            try {
                const originalUuid = imageFile.replace('.png', '');
                const firebaseId = uuidToFirebaseId[originalUuid];
                
                if (!firebaseId) {
                    console.warn(`   ⚠️  No Firebase item found for branch image ${imageFile}`);
                    continue;
                }

                const localPath = path.join(BRANCHES_IMAGES, imageFile);
                const storagePath = `walls/${wallId}/items/${firebaseId}/${imageFile}`;
                
                // Upload to Firebase Storage
                await storage.upload(localPath, {
                    destination: storagePath,
                    metadata: {
                        contentType: 'image/png',
                        cacheControl: 'public, max-age=86400'
                    }
                });

                // Generate signed URL
                const [url] = await storage.file(storagePath).getSignedUrl({
                    action: 'read',
                    expires: '03-01-2500'
                });

                // Update Firestore item with image data
                const itemRef = db.collection('wall_items').doc(firebaseId);
                batch.update(itemRef, {
                    images: [{
                        id: `${firebaseId}-image`,
                        url: url,
                        fileName: imageFile,
                        altText: `${firebaseItems[firebaseId].fieldData.name} logo`,
                        uploadedAt: admin.firestore.Timestamp.now(),
                        size: fs.statSync(localPath).size,
                        mimeType: 'image/png'
                    }],
                    updatedAt: admin.firestore.Timestamp.now()
                });
                
                uploadedBranches++;
                
            } catch (error) {
                console.warn(`   ⚠️  Failed to upload branch image ${imageFile}:`, error.message);
            }
        }

        // Commit all updates
        console.log('💾 Updating Firestore with image URLs...');
        await batch.commit();

        console.log(`✅ Uploaded ${uploadedVeterans} veteran images`);
        console.log(`✅ Uploaded ${uploadedBranches} branch images`);
        console.log('🎉 Image upload complete!');
        
    } catch (error) {
        console.error('❌ Error during image upload:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node upload-images-fixed.js YOUR_WALL_ID');
    process.exit(1);
}

uploadImagesWithNewIds(wallId)
    .then(() => {
        console.log('\n✨ Veterans Wall is now complete with all images!');
        console.log(`🔗 View your wall: http://localhost:4301/walls/${wallId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Upload failed:', error);
        process.exit(1);
    });