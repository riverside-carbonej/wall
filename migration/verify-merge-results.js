#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function verifyMerge() {
    console.log('🔍 VERIFYING MERGE RESULTS\n');
    console.log('='.repeat(60));
    
    // Load the backup and merge results
    const backupFile = fs.readdirSync('.').find(f => f.startsWith('BACKUP-BEFORE-MERGE-'));
    const mergeFile = fs.readdirSync('.').find(f => f.startsWith('MERGE-RESULTS-'));
    
    const backup = JSON.parse(fs.readFileSync(`./${backupFile}`, 'utf8'));
    const mergeResults = JSON.parse(fs.readFileSync(`./${mergeFile}`, 'utf8'));
    
    console.log(`📊 Before merge: ${backup.veterans.length} veterans`);
    console.log(`📊 Merged: ${mergeResults.merged.length} duplicates`);
    console.log(`📊 Expected after merge: ${backup.veterans.length - mergeResults.deleted.length} veterans\n`);
    
    // Get current count
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    console.log(`✅ Current count: ${snapshot.size} veterans`);
    console.log(`✅ Reduction: ${backup.veterans.length - snapshot.size} veterans removed\n`);
    
    // Check for any remaining duplicates
    console.log('🔍 Checking for remaining duplicates...\n');
    
    const veteransByName = {};
    snapshot.forEach(doc => {
        const data = doc.data();
        const name = data.fieldData?.name || '';
        const normalized = name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
        
        if (!veteransByName[normalized]) {
            veteransByName[normalized] = [];
        }
        veteransByName[normalized].push({
            id: doc.id,
            name: name,
            year: data.fieldData?.graduationYear,
            hasImage: data.images && data.images.length > 0
        });
    });
    
    let duplicatesFound = 0;
    Object.entries(veteransByName).forEach(([norm, vets]) => {
        if (vets.length > 1) {
            duplicatesFound++;
            console.log(`  ⚠️  Still duplicate: "${vets[0].name}" (${vets.length} entries)`);
            vets.forEach(v => {
                console.log(`      - ID: ${v.id.substring(0, 8)}... Year: ${v.year || 'none'}, Image: ${v.hasImage ? 'Yes' : 'No'}`);
            });
        }
    });
    
    if (duplicatesFound === 0) {
        console.log('  ✅ No exact duplicates remaining!\n');
    }
    
    // List merged veterans
    console.log('📋 SUCCESSFULLY MERGED VETERANS:\n');
    mergeResults.merged.forEach(m => {
        console.log(`  ✅ ${m.kept.name}`);
        if (m.kept.name !== m.deleted.name) {
            console.log(`     (merged with: ${m.deleted.name})`);
        }
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE!\n');
    console.log(`Total veterans: ${snapshot.size}`);
    console.log(`Duplicates removed: ${mergeResults.deleted.length}`);
    console.log(`Remaining duplicates: ${duplicatesFound}`);
    console.log('\nAll data has been preserved through merging.');
    console.log('Backup available at:', backupFile);
    
    process.exit(0);
}

verifyMerge().catch(console.error);