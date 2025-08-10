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
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                // Extract filename from URL or path
                let filename = img.url || img.path || img;
                if (typeof filename === 'string') {
                    // Get just the filename part
                    filename = filename.split('/').pop().split('\\').pop();
                    firebaseImages.add(filename);
                }
            });
            veteransWithImages.push({
                id: doc.id,
                name: data.fieldData?.name || 'Unknown',
                images: data.images
            });
        }
    });
    
    console.log(`🔥 Found ${firebaseImages.size} unique images in Firebase`);
    console.log(`   (from ${veteransWithImages.length} veterans with images)\n`);
    
    // Find orphan images (on PC but not in Firebase)
    const orphanImages = imageFiles.filter(img => !firebaseImages.has(img));
    
    console.log('📊 RESULTS:\n');
    console.log(`Orphan images (on PC but not in Firebase): ${orphanImages.length}`);
    
    if (orphanImages.length > 0) {
        console.log('\n🔴 ORPHAN IMAGES:');
        orphanImages.forEach((img, i) => {
            const filePath = path.join(IMAGES_PATH, img);
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`  ${i + 1}. ${img} (${sizeKB} KB)`);
        });
        
        // Check if any of these match the old SQLite migration data
        console.log('\n🔍 Checking migration data for these orphan images...\n');
        
        // Load the old veterans data if available
        const migrationPath = './migration/old-veterans.json';
        if (fs.existsSync(migrationPath)) {
            const oldVeterans = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
            
            orphanImages.forEach(img => {
                // Remove .png extension to get UUID
                const imageId = img.replace('.png', '');
                
                // Find if this image ID was associated with any veteran
                const veteran = oldVeterans.find(v => 
                    v.ImageId === imageId || 
                    v.image === img ||
                    v.image === imageId
                );
                
                if (veteran) {
                    console.log(`  ✓ ${img} was for: ${veteran.FirstName} ${veteran.LastName} (${veteran.GraduationYear || 'no year'})`);
                } else {
                    console.log(`  ? ${img} - no match found in migration data`);
                }
            });
        }
    }
    
    // Also check for Firebase images not on PC (if any)
    const pcImageSet = new Set(imageFiles);
    const firebaseOnlyImages = Array.from(firebaseImages).filter(img => !pcImageSet.has(img));
    
    if (firebaseOnlyImages.length > 0) {
        console.log('\n🟡 IMAGES IN FIREBASE BUT NOT ON PC:');
        firebaseOnlyImages.forEach((img, i) => {
            console.log(`  ${i + 1}. ${img}`);
        });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`  PC images: ${imageFiles.length}`);
    console.log(`  Firebase images: ${firebaseImages.size}`);
    console.log(`  Orphan images (PC only): ${orphanImages.length}`);
    console.log(`  Firebase-only images: ${firebaseOnlyImages.length}`);
    
    // Save results
    const results = {
        timestamp: new Date().toISOString(),
        pcImages: imageFiles,
        firebaseImages: Array.from(firebaseImages),
        orphanImages: orphanImages,
        firebaseOnlyImages: firebaseOnlyImages
    };
    
    fs.writeFileSync('./ORPHAN-IMAGES-REPORT.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Full report saved to: ORPHAN-IMAGES-REPORT.json');
    
    process.exit(0);
}

findOrphanImages().catch(console.error);