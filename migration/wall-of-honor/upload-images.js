#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK (reuse from firebase-import.js)
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

async function uploadImages(wallId) {
    try {
        console.log('📷 Starting image upload to Firebase Storage...');

        // Upload veteran images
        console.log('📷 Uploading veteran images...');
        const veteranImages = fs.readdirSync(VETERANS_IMAGES)
            .filter(file => file.endsWith('.png') && file !== 'Thumbs.db');

        let uploadedVeterans = 0;
        for (const imageFile of veteranImages) {
            try {
                const localPath = path.join(VETERANS_IMAGES, imageFile);
                const storagePath = `walls/${wallId}/items/veterans/${imageFile}`;
                
                await storage.upload(localPath, {
                    destination: storagePath,
                    metadata: {
                        contentType: 'image/png',
                        cacheControl: 'public, max-age=86400'
                    }
                });
                
                uploadedVeterans++;
                if (uploadedVeterans % 50 === 0) {
                    console.log(`   Uploaded ${uploadedVeterans}/${veteranImages.length} veteran images`);
                }
            } catch (error) {
                console.warn(`   ⚠️  Failed to upload veteran image ${imageFile}:`, error.message);
            }
        }
        console.log(`✅ Uploaded ${uploadedVeterans} veteran images`);

        // Upload branch images
        console.log('📷 Uploading branch images...');
        const branchImages = fs.readdirSync(BRANCHES_IMAGES)
            .filter(file => file.endsWith('.png') && file !== 'Thumbs.db');

        let uploadedBranches = 0;
        for (const imageFile of branchImages) {
            try {
                const localPath = path.join(BRANCHES_IMAGES, imageFile);
                const storagePath = `walls/${wallId}/items/branches/${imageFile}`;
                
                await storage.upload(localPath, {
                    destination: storagePath,
                    metadata: {
                        contentType: 'image/png',
                        cacheControl: 'public, max-age=86400'
                    }
                });
                
                uploadedBranches++;
            } catch (error) {
                console.warn(`   ⚠️  Failed to upload branch image ${imageFile}:`, error.message);
            }
        }
        console.log(`✅ Uploaded ${uploadedBranches} branch images`);

        // Update wall items with Firebase Storage URLs
        console.log('🔗 Updating wall items with image URLs...');
        
        // Get all wall items
        const itemsSnapshot = await db.collection('wall_items')
            .where('wallId', '==', wallId)
            .get();

        const batch = db.batch();
        let updatedItems = 0;

        for (const doc of itemsSnapshot.docs) {
            const item = doc.data();
            
            if (item.images && item.images.length > 0) {
                const imageFileName = item.images[0]; // Original filename
                let imagePath = '';
                
                if (item.objectTypeId === 'veteran') {
                    imagePath = `walls/${wallId}/items/veterans/${imageFileName}`;
                } else if (item.objectTypeId === 'branch') {
                    imagePath = `walls/${wallId}/items/branches/${imageFileName}`;
                }
                
                if (imagePath) {
                    try {
                        // Generate signed URL for the image
                        const [url] = await storage.file(imagePath).getSignedUrl({
                            action: 'read',
                            expires: '03-01-2500' // Long expiration
                        });

                        // Update the item with Firebase Storage URL
                        batch.update(doc.ref, {
                            images: [{
                                id: `${item.id}-image`,
                                url: url,
                                fileName: imageFileName,
                                altText: `${item.fieldData.name || 'Item'} image`,
                                uploadedAt: admin.firestore.Timestamp.now(),
                                size: 0, // We don't have size info from SQLite
                                mimeType: 'image/png'
                            }],
                            updatedAt: admin.firestore.Timestamp.now()
                        });
                        
                        updatedItems++;
                        
                        if (updatedItems % 50 === 0) {
                            console.log(`   Updated ${updatedItems} items with image URLs`);
                        }
                    } catch (error) {
                        console.warn(`   ⚠️  Failed to generate URL for ${imagePath}:`, error.message);
                    }
                }
            }
        }

        await batch.commit();
        console.log(`✅ Updated ${updatedItems} wall items with image URLs`);

        console.log('🎉 Image upload and URL update complete!');
        
    } catch (error) {
        console.error('❌ Error during image upload:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node upload-images.js YOUR_WALL_ID');
    process.exit(1);
}

uploadImages(wallId)
    .then(() => {
        console.log('\n✨ All done! Your veteran wall is ready with images.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Upload failed:', error);
        process.exit(1);
    });