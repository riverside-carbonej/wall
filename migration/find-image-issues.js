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

async function findImageIssues() {
    console.log('🔍 FINDING IMAGE ISSUES\n');
    console.log('='.repeat(60));
    
    // Load old veterans data to map images to names
    const oldVeteransPath = './old-veterans.json';
    let oldVeteransMap = {};
    if (fs.existsSync(oldVeteransPath)) {
        const oldVeterans = JSON.parse(fs.readFileSync(oldVeteransPath, 'utf8'));
        oldVeterans.forEach(v => {
            if (v.ImageId) {
                oldVeteransMap[v.ImageId] = `${v.FirstName} ${v.LastName}`;
            }
        });
    }
    
    // Get all veterans from Firebase
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    // Track image usage
    const imageToVeterans = {}; // Map image filename to array of veterans using it
    const veteransWithoutImages = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const veteranName = data.fieldData?.name || 'Unknown';
        
        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                let filename = img.url || img.path || img;
                if (typeof filename === 'string') {
                    const match = filename.match(/([a-f0-9-]+\.png)/i);
                    if (match) {
                        filename = match[1];
                        if (!imageToVeterans[filename]) {
                            imageToVeterans[filename] = [];
                        }
                        imageToVeterans[filename].push({
                            id: doc.id,
                            name: veteranName
                        });
                    }
                }
            });
        } else {
            veteransWithoutImages.push({
                id: doc.id,
                name: veteranName,
                year: data.fieldData?.graduationYear
            });
        }
    });
    
    // Find duplicate image usage (multiple veterans using same image)
    console.log('🔄 VETERANS SHARING THE SAME IMAGE:\n');
    const duplicateImages = Object.entries(imageToVeterans)
        .filter(([img, vets]) => vets.length > 1);
    
    if (duplicateImages.length > 0) {
        duplicateImages.forEach(([img, vets]) => {
            console.log(`Image: ${img}`);
            vets.forEach(v => {
                console.log(`  - ${v.name} (ID: ${v.id})`);
            });
            console.log();
        });
    } else {
        console.log('  None found - each image is used by only one veteran\n');
    }
    
    // Check orphan/corrupt images
    console.log('🔴 ORPHAN/CORRUPT IMAGES:\n');
    const allFiles = fs.readdirSync(IMAGES_PATH);
    const imageFiles = allFiles.filter(f => f.endsWith('.png') && f !== 'Placeholder.png');
    
    const orphanImages = [];
    const corruptImages = [];
    
    imageFiles.forEach(img => {
        const filePath = path.join(IMAGES_PATH, img);
        const stats = fs.statSync(filePath);
        
        if (!imageToVeterans[img]) {
            if (stats.size === 0) {
                corruptImages.push(img);
                // Try to find original veteran name from old data
                const imageId = img.replace('.png', '');
                const originalVeteran = oldVeteransMap[imageId];
                console.log(`  ${img} (0 bytes - CORRUPT)`);
                if (originalVeteran) {
                    console.log(`    → Originally for: ${originalVeteran}`);
                }
            } else {
                orphanImages.push(img);
                const imageId = img.replace('.png', '');
                const originalVeteran = oldVeteransMap[imageId];
                console.log(`  ${img} (${Math.round(stats.size/1024)} KB - ORPHAN)`);
                if (originalVeteran) {
                    console.log(`    → Originally for: ${originalVeteran}`);
                }
            }
        }
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:\n');
    console.log(`Veterans sharing images: ${duplicateImages.length} images shared by ${duplicateImages.reduce((sum, [, vets]) => sum + vets.length, 0)} veterans`);
    console.log(`Corrupt images (0-byte): ${corruptImages.length}`);
    console.log(`Orphan images (not used): ${orphanImages.length}`);
    console.log(`Veterans without any images: ${veteransWithoutImages.length}`);
    
    // Save results
    const results = {
        timestamp: new Date().toISOString(),
        duplicateImages: duplicateImages.map(([img, vets]) => ({
            image: img,
            veterans: vets
        })),
        corruptImages: corruptImages,
        orphanImages: orphanImages,
        veteransWithoutImages: veteransWithoutImages.slice(0, 20) // Just first 20 for review
    };
    
    fs.writeFileSync('./IMAGE-ISSUES-REPORT.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Full report saved to: IMAGE-ISSUES-REPORT.json');
    
    process.exit(0);
}

findImageIssues().catch(console.error);