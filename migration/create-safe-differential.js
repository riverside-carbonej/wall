#!/usr/bin/env node

const fs = require('fs');

// Load files
const finalDiff = JSON.parse(fs.readFileSync('./FINAL-DIFFERENTIAL-WITH-BRANCH-IDS.json', 'utf8'));
const backup = JSON.parse(fs.readFileSync('./BACKUP-2025-08-10T22-46-33-674Z.json', 'utf8'));

// Create backup index
const backupIndex = {};
backup.veterans.forEach(v => {
    backupIndex[v.docId] = v;
});

console.log('🛡️ CREATING SAFE DIFFERENTIAL (NO OVERWRITES)\n');
console.log('='.repeat(60));

// Track what we're doing
const stats = {
    skippedBranchOverwrites: 0,
    keptBranchAdditions: 0,
    keptNameFormatting: 0,
    keptRankAdditions: 0,
    keptDateAdditions: 0,
    skippedGradYearConflicts: 0,
    totalUpdatesKept: 0,
    totalUpdatesSkipped: 0
};

// Create safe differential
const safeDifferential = {
    ...finalDiff,
    processed: finalDiff.processed.map(veteran => {
        const backupVet = backupIndex[veteran.firebaseId];
        if (!backupVet) {
            console.log(`⚠️  Skipping ${veteran.name} - not in backup`);
            return null;
        }
        
        const safeUpdates = [];
        
        for (const update of veteran.updates) {
            let keepUpdate = false;
            let skipReason = '';
            
            // Check branches field
            if (update.field === 'branches') {
                const currentBranches = backupVet.fieldData.branches;
                
                // Only add if currently empty
                if (!currentBranches || currentBranches.length === 0) {
                    keepUpdate = true;
                    stats.keptBranchAdditions++;
                } else {
                    // Check if trying to add same branch (no change)
                    const proposedId = update.proposed[0];
                    if (currentBranches.includes(proposedId)) {
                        skipReason = 'Same branch already exists';
                    } else {
                        skipReason = 'Would overwrite existing branch';
                    }
                    stats.skippedBranchOverwrites++;
                }
            }
            
            // Check name field - only keep formatting changes
            else if (update.field === 'name') {
                const currentNorm = (backupVet.fieldData.name || '').toLowerCase().replace(/[^a-z]/g, '');
                const proposedNorm = (update.proposed || '').toLowerCase().replace(/[^a-z]/g, '');
                
                if (currentNorm === proposedNorm) {
                    keepUpdate = true;
                    stats.keptNameFormatting++;
                } else {
                    skipReason = 'Name change beyond formatting';
                }
            }
            
            // Check rank field - only add if empty
            else if (update.field === 'rank') {
                if (!backupVet.fieldData.rank || backupVet.fieldData.rank === '') {
                    keepUpdate = true;
                    stats.keptRankAdditions++;
                } else {
                    skipReason = 'Would overwrite existing rank';
                }
            }
            
            // Check date fields - only add if empty
            else if (update.field === 'militaryEntryDate' || update.field === 'militaryExitDate') {
                if (!backupVet.fieldData[update.field]) {
                    keepUpdate = true;
                    stats.keptDateAdditions++;
                } else {
                    skipReason = 'Would overwrite existing date';
                }
            }
            
            // Check graduation year - only add if empty
            else if (update.field === 'graduationYear') {
                if (!backupVet.fieldData.graduationYear) {
                    keepUpdate = true;
                } else if (backupVet.fieldData.graduationYear !== update.proposed) {
                    skipReason = 'Graduation year conflict';
                    stats.skippedGradYearConflicts++;
                }
            }
            
            if (keepUpdate) {
                safeUpdates.push(update);
                stats.totalUpdatesKept++;
            } else {
                stats.totalUpdatesSkipped++;
                if (skipReason) {
                    console.log(`  Skipped: ${veteran.name} - ${update.field}: ${skipReason}`);
                }
            }
        }
        
        // Only include veteran if they have updates
        if (safeUpdates.length > 0) {
            return {
                ...veteran,
                updates: safeUpdates
            };
        }
        
        return null;
    }).filter(v => v !== null),
    
    // New veterans are safe to add
    newVeterans: finalDiff.newVeterans
};

// Update statistics
safeDifferential.statistics = {
    ...safeDifferential.statistics,
    safety: {
        originalUpdates: stats.totalUpdatesKept + stats.totalUpdatesSkipped,
        keptUpdates: stats.totalUpdatesKept,
        skippedUpdates: stats.totalUpdatesSkipped,
        skippedBranchOverwrites: stats.skippedBranchOverwrites,
        keptBranchAdditions: stats.keptBranchAdditions,
        keptNameFormatting: stats.keptNameFormatting,
        keptRankAdditions: stats.keptRankAdditions,
        keptDateAdditions: stats.keptDateAdditions,
        skippedGradYearConflicts: stats.skippedGradYearConflicts
    },
    finalCounts: {
        veteransToUpdate: safeDifferential.processed.length,
        newVeteransToAdd: safeDifferential.newVeterans.length,
        totalUpdates: stats.totalUpdatesKept
    }
};

// Save safe differential
fs.writeFileSync('./SAFE-DIFFERENTIAL.json', JSON.stringify(safeDifferential, null, 2));

console.log('\n✅ SAFE DIFFERENTIAL CREATED!\n');
console.log('Updates kept (safe to apply):');
console.log(`  - Branch additions (empty → value): ${stats.keptBranchAdditions}`);
console.log(`  - Name formatting improvements: ${stats.keptNameFormatting}`);
console.log(`  - Rank additions (empty → value): ${stats.keptRankAdditions}`);
console.log(`  - Service date additions: ${stats.keptDateAdditions}`);

console.log('\nUpdates skipped (would overwrite):');
console.log(`  - Branch overwrites prevented: ${stats.skippedBranchOverwrites}`);
console.log(`  - Graduation year conflicts: ${stats.skippedGradYearConflicts}`);

console.log('\n📊 FINAL SAFE COUNTS:');
console.log(`  - Veterans to update: ${safeDifferential.processed.length}`);
console.log(`  - New veterans to add: ${safeDifferential.newVeterans.length}`);
console.log(`  - Total safe updates: ${stats.totalUpdatesKept}`);

console.log('\n📄 Saved to: SAFE-DIFFERENTIAL.json');
console.log('\n✅ This differential contains ONLY safe additions and formatting fixes.');
console.log('   NO existing data will be overwritten!');