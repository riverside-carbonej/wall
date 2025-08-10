#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

// Normalize name for comparison
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/[^a-z ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Merge field data, keeping the best information
function mergeFieldData(primary, secondary) {
    const merged = { ...primary };
    
    // For each field in secondary, only add if primary doesn't have it
    Object.keys(secondary).forEach(key => {
        if (key === 'branches') {
            // Merge branch arrays
            const primaryBranches = primary.branches || [];
            const secondaryBranches = secondary.branches || [];
            const allBranches = [...new Set([...primaryBranches, ...secondaryBranches])];
            if (allBranches.length > 0) {
                merged.branches = allBranches;
            }
        } else if (key === 'deployments') {
            // Merge deployment arrays
            const primaryDeps = primary.deployments || [];
            const secondaryDeps = secondary.deployments || [];
            const allDeps = [...new Set([...primaryDeps, ...secondaryDeps])];
            if (allDeps.length > 0) {
                merged.deployments = allDeps;
            }
        } else if (!primary[key] || primary[key] === '' || primary[key] === null) {
            // If primary doesn't have this field, take from secondary
            if (secondary[key] && secondary[key] !== '' && secondary[key] !== null) {
                merged[key] = secondary[key];
            }
        }
    });
    
    return merged;
}

async function mergeDuplicates() {
    console.log('🔧 MERGING DUPLICATE VETERANS\n');
    console.log('='.repeat(60));
    
    // First, create a backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log(`📸 Creating backup before merge: BACKUP-BEFORE-MERGE-${timestamp}.json\n`);
    
    // Get all veterans for backup
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    const backupData = {
        timestamp: timestamp,
        veterans: []
    };
    
    const veteransByName = {};
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const veteran = {
            id: doc.id,
            ...data
        };
        backupData.veterans.push(veteran);
        
        // Group by normalized name for duplicate detection
        const normalized = normalizeName(data.fieldData?.name || '');
        if (!veteransByName[normalized]) {
            veteransByName[normalized] = [];
        }
        veteransByName[normalized].push(veteran);
    });
    
    // Save backup
    fs.writeFileSync(`./BACKUP-BEFORE-MERGE-${timestamp}.json`, JSON.stringify(backupData, null, 2));
    console.log('✅ Backup saved\n');
    
    // Define duplicates to merge based on our analysis
    const duplicatesToMerge = [
        // Faculty/Staff duplicates - keep the one without (teacher/staff) suffix
        { primary: 'Aaron Draime', secondary: 'Aaron Draime (teacher)' },
        { primary: 'Bill Grose', secondary: 'Bill Grose (teacher)' },
        { primary: 'Bill Skelly', secondary: 'Bill Skelly (staff)' },
        { primary: 'Dan Grill', secondary: 'Dan Grill (staff)' },
        { primary: 'Dave Burris', secondary: 'Dave Burris (teacher)' },
        { primary: 'Dave Denner', secondary: 'Dave Denner (teacher)' },
        { primary: 'Donald McKenna', secondary: 'Donald Mckenna (principal)' },
        { primary: 'Ed Johnson', secondary: 'Ed Johnson (staff)' },
        { primary: 'Frank Gerard', secondary: 'Frank Gerard (ad)' },
        { primary: 'George Strailey', secondary: 'George Strailey (teacher)' },
        { primary: 'Harold Parsons', secondary: 'Harold Parsons Supperint)' },
        { primary: 'Jim Ganas', secondary: 'Jim Ganas (staff)' },
        { primary: 'John DeLong', secondary: 'John Delong (asst Super)' },
        { primary: 'John Sutch', secondary: 'John Sutch (teacher)' },
        { primary: 'Louis Andersen', secondary: 'Louis Andersen  (faculty)' },
        { primary: 'Robert McFarren', secondary: 'Robert Mcfarren (teacher)' },
        { primary: 'William Walrath', secondary: 'William Walrath (teacher)' },
        
        // John Lauer - has 3 entries, merge faculty ones
        { primary: 'John Lauer', secondary: 'John Lauer Sr.' },
        { primary: 'John Lauer', secondary: 'John Lauer Sr.  (faculty)' },
        
        // Actual veteran duplicates
        { primary: 'Amber Lafountaine (Carson)', secondary: 'Amber Lafountaine (carson) Married Name' },
        { primary: 'David Townsend', secondary: 'David Townshend' }, // Keep the one with image
        { primary: 'Donald Neroda', secondary: 'Donald Neroda (1960 OR. 61)' }, // Keep the one with image
        { primary: 'Daniel Sferra', secondary: 'Daniel Sterra' },
        { primary: 'John Walther', secondary: 'John Walther (1969 Left)' },
        { primary: 'Katherine McTaggart Voyce', secondary: 'Katherine Mctaggart Voyce (1999??)' },
        { primary: 'Matt Froehle', secondary: 'Matt Froehle Froehle' },
        { primary: 'Nick Mighton', secondary: 'Nick Mighton 2014 JR Yr.)' },
        { primary: 'Robert Simmons', secondary: 'Robert Simmons (63 JR Yr)' },
        { primary: 'Gerald A. Satava II', secondary: 'Gerald Satava II' },
        { primary: 'Mickus', secondary: 'Savannah Mickus' } // Assuming Savannah Mickus is the full name
    ];
    
    const mergeResults = {
        merged: [],
        deleted: [],
        errors: []
    };
    
    console.log('🔄 Processing duplicates...\n');
    
    for (const duplicate of duplicatesToMerge) {
        try {
            // Find the veterans
            const primaryNorm = normalizeName(duplicate.primary);
            const secondaryNorm = normalizeName(duplicate.secondary);
            
            let primaryVet = null;
            let secondaryVet = null;
            
            // Search through all veterans
            for (const [norm, vets] of Object.entries(veteransByName)) {
                for (const vet of vets) {
                    const vetName = vet.fieldData?.name || '';
                    const vetNorm = normalizeName(vetName);
                    
                    if (vetNorm === primaryNorm || vetName === duplicate.primary) {
                        primaryVet = vet;
                    }
                    if (vetNorm === secondaryNorm || vetName === duplicate.secondary) {
                        secondaryVet = vet;
                    }
                }
            }
            
            if (!primaryVet || !secondaryVet) {
                console.log(`  ⚠️  Could not find: ${duplicate.primary} or ${duplicate.secondary}`);
                mergeResults.errors.push({
                    primary: duplicate.primary,
                    secondary: duplicate.secondary,
                    error: 'Not found'
                });
                continue;
            }
            
            if (primaryVet.id === secondaryVet.id) {
                console.log(`  ℹ️  Same ID, skipping: ${duplicate.primary}`);
                continue;
            }
            
            // Decide which one to keep based on data quality
            let keepVet = primaryVet;
            let deleteVet = secondaryVet;
            
            // If secondary has image and primary doesn't, swap
            if (secondaryVet.images?.length > 0 && (!primaryVet.images || primaryVet.images.length === 0)) {
                keepVet = secondaryVet;
                deleteVet = primaryVet;
            }
            
            // Merge field data
            const mergedFieldData = mergeFieldData(keepVet.fieldData, deleteVet.fieldData);
            
            // Merge images
            const keepImages = keepVet.images || [];
            const deleteImages = deleteVet.images || [];
            const allImages = [...keepImages];
            deleteImages.forEach(img => {
                if (!allImages.some(i => i.url === img.url)) {
                    allImages.push(img);
                }
            });
            
            // Update the keeper
            await db.collection('wall_items').doc(keepVet.id).update({
                fieldData: mergedFieldData,
                images: allImages,
                updated: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Delete the duplicate
            await db.collection('wall_items').doc(deleteVet.id).delete();
            
            console.log(`  ✅ Merged: "${keepVet.fieldData.name}" (kept) ← "${deleteVet.fieldData.name}" (deleted)`);
            
            mergeResults.merged.push({
                kept: {
                    id: keepVet.id,
                    name: keepVet.fieldData.name
                },
                deleted: {
                    id: deleteVet.id,
                    name: deleteVet.fieldData.name
                },
                mergedFields: Object.keys(mergedFieldData)
            });
            mergeResults.deleted.push(deleteVet.id);
            
        } catch (error) {
            console.error(`  ❌ Error merging ${duplicate.primary}:`, error.message);
            mergeResults.errors.push({
                primary: duplicate.primary,
                secondary: duplicate.secondary,
                error: error.message
            });
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MERGE COMPLETE!\n');
    console.log(`Successfully merged: ${mergeResults.merged.length} duplicates`);
    console.log(`Veterans deleted: ${mergeResults.deleted.length}`);
    console.log(`Errors: ${mergeResults.errors.length}`);
    
    // Save results
    fs.writeFileSync(`./MERGE-RESULTS-${timestamp}.json`, JSON.stringify(mergeResults, null, 2));
    console.log(`\n📄 Results saved to: MERGE-RESULTS-${timestamp}.json`);
    console.log(`📄 Backup saved to: BACKUP-BEFORE-MERGE-${timestamp}.json`);
    
    if (mergeResults.errors.length > 0) {
        console.log('\n⚠️  Some duplicates could not be merged:');
        mergeResults.errors.forEach(e => {
            console.log(`  - ${e.primary} / ${e.secondary}: ${e.error}`);
        });
    }
    
    process.exit(0);
}

mergeDuplicates().catch(console.error);