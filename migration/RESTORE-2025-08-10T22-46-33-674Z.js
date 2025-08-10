#!/usr/bin/env node

// RESTORE SCRIPT FOR BACKUP: 2025-08-10T22-46-33-674Z
// Run this script to restore the wall to this backup state

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function restore() {
    console.log('⚠️  WARNING: This will restore the wall to the backup from 2025-08-10T22-46-33-674Z');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const backup = JSON.parse(fs.readFileSync('./BACKUP-2025-08-10T22-46-33-674Z.json', 'utf8'));
    console.log(`Restoring ${backup.veterans.length} veterans...`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const veteran of backup.veterans) {
        const docRef = db.collection('wall_items').doc(veteran.docId);
        batch.set(docRef, {
            wallId: veteran.wallId,
            objectTypeId: veteran.objectTypeId,
            fieldData: veteran.fieldData,
            images: veteran.images,
            created: veteran.created,
            updated: veteran.updated,
            createdBy: veteran.createdBy,
            updatedBy: veteran.updatedBy
        });
        
        count++;
        if (count % 100 === 0) {
            console.log(`  Prepared ${count} veterans for restore...`);
        }
    }
    
    await batch.commit();
    console.log('✅ Restore complete!');
    process.exit(0);
}

restore().catch(console.error);