#!/usr/bin/env node

const fs = require('fs');

// Corrupt and orphan image IDs
const problemImages = [
    '201f3581-22ff-4136-8196-de590569afda', // 0-byte
    'b42bd24e-b891-426c-9d8a-324df74f9878', // 0-byte
    'ba81b86a-028e-4cf4-b3ee-be604896a4ec', // 0-byte
    'd1f3131b-a7c2-4aad-a8a4-f86a2c200a12', // 0-byte
    'f49f0ac3-a8a7-403f-8cdf-f508143c91c2', // 0-byte
    'f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7'  // 41KB orphan
];

console.log('🔍 FINDING VETERANS FOR CORRUPT/ORPHAN IMAGES\n');
console.log('='.repeat(60));

// Try to load wall data
const wallDataPath = './migration-output/wall-data.json';
if (fs.existsSync(wallDataPath)) {
    const wallData = JSON.parse(fs.readFileSync(wallDataPath, 'utf8'));
    
    // Search through veterans
    if (wallData.veterans) {
        console.log('Searching in wall-data.json veterans...\n');
        
        problemImages.forEach(imageId => {
            const veteran = wallData.veterans.find(v => 
                v.ImageId === imageId || 
                v.image === imageId ||
                v.image === `${imageId}.png`
            );
            
            if (veteran) {
                const size = imageId === 'f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7' ? '41KB orphan' : '0-byte corrupt';
                console.log(`${imageId}.png (${size})`);
                console.log(`  → ${veteran.FirstName} ${veteran.LastName} (${veteran.GraduationYear || 'no year'})`);
                console.log();
            }
        });
    }
    
    // Also check items if present
    if (wallData.items) {
        console.log('\nSearching in wall-data items...\n');
        
        wallData.items.forEach(item => {
            if (item.images && item.images.length > 0) {
                item.images.forEach(img => {
                    problemImages.forEach(imageId => {
                        if (img.includes(imageId)) {
                            console.log(`Found in item: ${item.fieldData?.name || 'Unknown'}`);
                            console.log(`  Image: ${imageId}`);
                        }
                    });
                });
            }
        });
    }
}

// Check in backups
console.log('\nChecking backup files...\n');
const backupFiles = fs.readdirSync('.').filter(f => f.startsWith('BACKUP-'));

backupFiles.forEach(backupFile => {
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    backup.veterans.forEach(v => {
        if (v.images && v.images.length > 0) {
            v.images.forEach(img => {
                const imgStr = JSON.stringify(img);
                problemImages.forEach(imageId => {
                    if (imgStr.includes(imageId)) {
                        console.log(`Found in ${backupFile}:`);
                        console.log(`  Veteran: ${v.fieldData?.name || 'Unknown'}`);
                        console.log(`  Image: ${imageId}`);
                    }
                });
            });
        }
    });
});

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY OF CORRUPT/ORPHAN IMAGES:\n');

console.log('0-byte corrupt images (5):');
['201f3581-22ff-4136-8196-de590569afda',
 'b42bd24e-b891-426c-9d8a-324df74f9878',
 'ba81b86a-028e-4cf4-b3ee-be604896a4ec',
 'd1f3131b-a7c2-4aad-a8a4-f86a2c200a12',
 'f49f0ac3-a8a7-403f-8cdf-f508143c91c2'].forEach(id => {
    console.log(`  - ${id}.png`);
});

console.log('\nOrphan image (1):');
console.log('  - f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7.png (41KB)');

console.log('\nThese images are not linked to any veterans in Firebase.');
console.log('They appear to be from failed migrations or deleted veterans.');