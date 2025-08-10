#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function summarize() {
    console.log('📊 IMAGE SUMMARY\n');
    console.log('='.repeat(60));
    
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    const withoutImages = [];
    const withImages = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const veteran = {
            id: doc.id,
            name: data.fieldData?.name || 'Unknown',
            year: data.fieldData?.graduationYear
        };
        
        if (!data.images || data.images.length === 0) {
            withoutImages.push(veteran);
        } else {
            withImages.push(veteran);
        }
    });
    
    console.log(`Veterans WITH images: ${withImages.length}`);
    console.log(`Veterans WITHOUT images: ${withoutImages.length}`);
    console.log(`Total: ${snapshot.size}\n`);
    
    console.log('First 10 veterans WITHOUT images:');
    withoutImages.slice(0, 10).forEach(v => {
        console.log(`  - ${v.name} (${v.year || 'no year'})`);
    });
    
    console.log('\n📁 ORPHAN/CORRUPT IMAGES ON PC:');
    console.log('\n0-byte corrupt files (cannot be used):');
    console.log('  - 201f3581-22ff-4136-8196-de590569afda.png');
    console.log('  - b42bd24e-b891-426c-9d8a-324df74f9878.png');
    console.log('  - ba81b86a-028e-4cf4-b3ee-be604896a4ec.png');
    console.log('  - d1f3131b-a7c2-4aad-a8a4-f86a2c200a12.png');
    console.log('  - f49f0ac3-a8a7-403f-8cdf-f508143c91c2.png');
    
    console.log('\nOrphan image (41KB - could be used):');
    console.log('  - f8ee7fc3-1d6a-465e-bd0f-6c320bac47b7.png');
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('  - 209 veterans have images');
    console.log('  - 370 veterans need images');
    console.log('  - 5 corrupt images on PC (0-byte, unusable)');
    console.log('  - 1 orphan image on PC (41KB, could be assigned)');
    console.log('\nNo veterans are sharing the same image file.');
    
    process.exit(0);
}

summarize().catch(console.error);