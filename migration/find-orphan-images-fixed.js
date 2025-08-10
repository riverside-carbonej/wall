#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';
const IMAGES_PATH = 'C:/Users/jackc/OneDrive/Work/Riverside/Wall Of Honor/mig/Veterans/Veterans/Images';

async function findOrphanImages() {
    console.log('🔍 FINDING ORPHAN IMAGES (on PC but not in Firebase)\n');
    console.log('='.repeat(60));
    
    // Get all image files from PC
    const allFiles = fs.readdirSync(IMAGES_PATH);
    const imageFiles = allFiles.filter(f => f.endsWith('.png') && f !== 'Placeholder.png');
    
    console.log(`📁 Found ${imageFiles.length} veteran images on PC\n`);
    
    // Get all veterans with images from Firebase
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    // Build set of image filenames in Firebase
    const firebaseImages = new Set();
    const veteransWithImages = [];
    const imageToVeteran = {}; // Map image filename to veteran name
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.images && data.images.length > 0) {
            const veteranName = data.fieldData?.name || 'Unknown';
            
            data.images.forEach(img => {
                // Extract filename from URL or path
                let filename = img.url || img.path || img;
                if (typeof filename === 'string') {
                    // Extract just the UUID.png part from the URL
                    // URLs look like: UUID.png?GoogleAccessId=...
                    const match = filename.match(/([a-f0-9-]+\.png)/i);
                    if (match) {
                        filename = match[1];
                        firebaseImages.add(filename);
                        imageToVeteran[filename] = veteranName;
                    }
                }
            });
            
            veteransWithImages.push({
                id: doc.id,
                name: veteranName,
                images: data.images
            });
        }
    });
    
    console.log(`🔥 Found ${firebaseImages.size} unique images in Firebase`);
    console.log(`   (from ${veteransWithImages.length} veterans with images)\n`);
    
    // Find orphan images (on PC but not in Firebase)
    const orphanImages = imageFiles.filter(img => !firebaseImages.has(img));
    
    console.log('📊 RESULTS:\n');
    console.log(`Images on PC: ${imageFiles.length}`);
    console.log(`Images in Firebase: ${firebaseImages.size}`);
    console.log(`Orphan images (on PC but not in Firebase): ${orphanImages.length}`);
    
    if (orphanImages.length > 0) {
        console.log('\n🔴 ORPHAN IMAGES (not in Firebase):');
        
        // Check for 0-byte files
        const zeroByteImages = [];
        const validOrphans = [];
        
        orphanImages.forEach((img, i) => {
            const filePath = path.join(IMAGES_PATH, img);
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            
            if (stats.size === 0) {
                zeroByteImages.push(img);
                console.log(`  ${i + 1}. ${img} (0 bytes - EMPTY FILE)`);
            } else {
                validOrphans.push(img);
                console.log(`  ${i + 1}. ${img} (${sizeKB} KB)`);
            }
        });
        
        if (zeroByteImages.length > 0) {
            console.log(`\n⚠️  Found ${zeroByteImages.length} empty (0-byte) image files`);
        }
        
        console.log(`\n✅ Valid orphan images: ${validOrphans.length}`);
    }
    
    // Show some Firebase images for verification
    console.log('\n🔍 Sample images that ARE in Firebase:');
    const sampleImages = Array.from(firebaseImages).slice(0, 5);
    sampleImages.forEach(img => {
        console.log(`  - ${img} → ${imageToVeteran[img]}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`  PC images: ${imageFiles.length}`);
    console.log(`  Firebase images: ${firebaseImages.size}`);
    console.log(`  Difference: ${imageFiles.length - firebaseImages.size} images`);
    
    if (orphanImages.length === 0) {
        console.log('\n✅ Great! All PC images are in Firebase!');
    } else if (orphanImages.length <= 10) {
        console.log(`\n⚠️  Only ${orphanImages.length} orphan images found - likely duplicates or test images`);
    }
    
    // Save results
    const results = {
        timestamp: new Date().toISOString(),
        pcImages: imageFiles.length,
        firebaseImages: firebaseImages.size,
        orphanImages: orphanImages,
        imageToVeteranMap: imageToVeteran
    };
    
    fs.writeFileSync('./ORPHAN-IMAGES-FIXED.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Full report saved to: ORPHAN-IMAGES-FIXED.json');
    
    process.exit(0);
}

findOrphanImages().catch(console.error);