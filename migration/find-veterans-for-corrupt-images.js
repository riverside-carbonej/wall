#!/usr/bin/env node

const fs = require('fs');

// IDs of corrupt and orphan images
const corruptImageIds = [
    '201f3581-22ff-4136-8196-de590569afda', // 0-byte
    'b42bd24e-b891-426c-9d8a-324df74f9878', // 0-byte
    'ba81b86a-028e-4cf4-b3ee-be604896a4ec', // 0-byte
    'd1f3131b-a7c2-4aad-a8a4-f86a2c200a12', // 0-byte
    'f49f0ac3-a8a7-403f-8cdf-f508143c91c2', // 0-byte
    'f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7'  // 41KB orphan
];

console.log('🔍 FINDING VETERANS FOR CORRUPT/ORPHAN IMAGES\n');
console.log('='.repeat(60));

// Load wall data
const wallData = JSON.parse(fs.readFileSync('./migration-output/wall-data.json', 'utf8'));

// Search through veterans
const veteransWithCorruptImages = [];

if (wallData.items && wallData.items.veterans) {
    wallData.items.veterans.forEach(veteran => {
        if (veteran.images && veteran.images.length > 0) {
            veteran.images.forEach(img => {
                const imgStr = typeof img === 'string' ? img : JSON.stringify(img);
                corruptImageIds.forEach(imageId => {
                    if (imgStr.includes(imageId)) {
                        veteransWithCorruptImages.push({
                            name: veteran.fieldData?.name || 'Unknown',
                            year: veteran.fieldData?.graduationYear,
                            imageId: imageId,
                            itemId: veteran.id,
                            imageInfo: img
                        });
                    }
                });
            });
        }
    });
}

// Display results
console.log('VETERANS WITH CORRUPT/ORPHAN IMAGES:\n');

veteransWithCorruptImages.forEach(vet => {
    const isOrphan = vet.imageId === 'f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7';
    const status = isOrphan ? '41KB orphan' : '0-byte CORRUPT';
    
    console.log(`${vet.name} (${vet.year || 'no year'})`);
    console.log(`  Image: ${vet.imageId}.png (${status})`);
    console.log(`  Item ID: ${vet.itemId}`);
    console.log();
});

// Summary
console.log('='.repeat(60));
console.log('📊 SUMMARY:\n');

const corruptVets = veteransWithCorruptImages.filter(v => v.imageId !== 'f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7');
const orphanVets = veteransWithCorruptImages.filter(v => v.imageId === 'f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7');

console.log(`Veterans with corrupt (0-byte) images: ${corruptVets.length}`);
corruptVets.forEach(v => {
    console.log(`  - ${v.name} (${v.year || 'no year'})`);
});

if (orphanVets.length > 0) {
    console.log(`\nVeterans with orphan (41KB) image: ${orphanVets.length}`);
    orphanVets.forEach(v => {
        console.log(`  - ${v.name} (${v.year || 'no year'})`);
    });
}

console.log('\n⚠️  These veterans have image references but the images are corrupt (0-byte) or orphaned.');
console.log('They likely show as having images in Firebase but the images don\'t display.')

// Save results
fs.writeFileSync('./CORRUPT-IMAGE-VETERANS.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    corruptImageVeterans: corruptVets,
    orphanImageVeterans: orphanVets,
    allAffected: veteransWithCorruptImages
}, null, 2));

console.log('\n📄 Results saved to: CORRUPT-IMAGE-VETERANS.json');

process.exit(0);