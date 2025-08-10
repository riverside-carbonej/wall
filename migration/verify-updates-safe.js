#!/usr/bin/env node

const fs = require('fs');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function verifyUpdates() {
    console.log('🔍 VERIFYING ALL UPDATES ARE SAFE\n');
    console.log('='.repeat(60));
    
    // Load the final differential
    const differential = JSON.parse(fs.readFileSync('./FINAL-DIFFERENTIAL-WITH-BRANCH-IDS.json', 'utf8'));
    
    // Load the backup for comparison
    const backup = JSON.parse(fs.readFileSync('./BACKUP-2025-08-10T22-46-33-674Z.json', 'utf8'));
    const backupIndex = {};
    backup.veterans.forEach(v => {
        backupIndex[v.docId] = v;
    });
    
    // Track verification results
    const verification = {
        safe: [],
        warnings: [],
        dangerous: [],
        statistics: {
            totalUpdates: 0,
            safeAdditions: 0,  // Adding data where none existed
            nameFormatting: 0, // Just formatting improvements
            potentialOverwrites: 0, // Replacing existing data
            branchAdditions: 0,
            rankAdditions: 0,
            dateAdditions: 0
        }
    };
    
    // Verify each update
    for (const veteran of differential.processed) {
        const backupVet = backupIndex[veteran.firebaseId];
        if (!backupVet) {
            verification.warnings.push({
                id: veteran.firebaseId,
                name: veteran.name,
                issue: 'Veteran not found in backup'
            });
            continue;
        }
        
        for (const update of veteran.updates) {
            verification.statistics.totalUpdates++;
            
            // Check if this is a safe addition (null -> value)
            if (update.field === 'branches') {
                if (!backupVet.fieldData.branches || backupVet.fieldData.branches.length === 0) {
                    verification.safe.push({
                        name: veteran.name,
                        field: 'branches',
                        type: 'Safe addition - was empty'
                    });
                    verification.statistics.safeAdditions++;
                    verification.statistics.branchAdditions++;
                } else {
                    // We're replacing existing branches!
                    verification.dangerous.push({
                        name: veteran.name,
                        field: 'branches',
                        current: backupVet.fieldData.branches,
                        proposed: update.proposed,
                        issue: 'OVERWRITING existing branches!'
                    });
                    verification.statistics.potentialOverwrites++;
                }
            }
            
            else if (update.field === 'name') {
                // Name changes are usually just formatting
                const currentNorm = (update.current || '').toLowerCase().replace(/[^a-z]/g, '');
                const proposedNorm = (update.proposed || '').toLowerCase().replace(/[^a-z]/g, '');
                
                if (currentNorm === proposedNorm) {
                    verification.safe.push({
                        name: veteran.name,
                        field: 'name',
                        type: 'Safe formatting change'
                    });
                    verification.statistics.nameFormatting++;
                } else {
                    verification.warnings.push({
                        name: veteran.name,
                        field: 'name',
                        current: update.current,
                        proposed: update.proposed,
                        issue: 'Name change beyond formatting'
                    });
                }
            }
            
            else if (update.field === 'rank') {
                if (!backupVet.fieldData.rank) {
                    verification.safe.push({
                        name: veteran.name,
                        field: 'rank',
                        type: 'Safe addition - was empty'
                    });
                    verification.statistics.safeAdditions++;
                    verification.statistics.rankAdditions++;
                } else {
                    verification.warnings.push({
                        name: veteran.name,
                        field: 'rank',
                        current: backupVet.fieldData.rank,
                        proposed: update.proposed,
                        issue: 'Replacing existing rank'
                    });
                    verification.statistics.potentialOverwrites++;
                }
            }
            
            else if (update.field === 'militaryEntryDate' || update.field === 'militaryExitDate') {
                const currentValue = backupVet.fieldData[update.field];
                if (!currentValue) {
                    verification.safe.push({
                        name: veteran.name,
                        field: update.field,
                        type: 'Safe addition - was empty'
                    });
                    verification.statistics.safeAdditions++;
                    verification.statistics.dateAdditions++;
                } else {
                    verification.dangerous.push({
                        name: veteran.name,
                        field: update.field,
                        current: currentValue,
                        proposed: update.proposed,
                        issue: 'OVERWRITING existing date!'
                    });
                    verification.statistics.potentialOverwrites++;
                }
            }
            
            else if (update.field === 'graduationYear') {
                const currentValue = backupVet.fieldData.graduationYear;
                if (!currentValue) {
                    verification.safe.push({
                        name: veteran.name,
                        field: 'graduationYear',
                        type: 'Safe addition - was empty'
                    });
                    verification.statistics.safeAdditions++;
                } else if (currentValue !== update.proposed) {
                    verification.warnings.push({
                        name: veteran.name,
                        field: 'graduationYear',
                        current: currentValue,
                        proposed: update.proposed,
                        issue: 'Graduation year conflict'
                    });
                    verification.statistics.potentialOverwrites++;
                }
            }
        }
    }
    
    // Summary
    console.log('📊 VERIFICATION RESULTS\n');
    console.log(`Total updates to apply: ${verification.statistics.totalUpdates}`);
    console.log(`Safe additions (null → value): ${verification.statistics.safeAdditions}`);
    console.log(`  - Branch additions: ${verification.statistics.branchAdditions}`);
    console.log(`  - Rank additions: ${verification.statistics.rankAdditions}`);
    console.log(`  - Date additions: ${verification.statistics.dateAdditions}`);
    console.log(`Name formatting only: ${verification.statistics.nameFormatting}`);
    console.log(`Potential overwrites: ${verification.statistics.potentialOverwrites}`);
    
    if (verification.dangerous.length > 0) {
        console.log('\n❌ DANGEROUS UPDATES FOUND:');
        verification.dangerous.slice(0, 10).forEach(d => {
            console.log(`  ${d.name} - ${d.field}: ${d.issue}`);
            console.log(`    Current: ${JSON.stringify(d.current)}`);
            console.log(`    Proposed: ${JSON.stringify(d.proposed)}`);
        });
    }
    
    if (verification.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        verification.warnings.slice(0, 10).forEach(w => {
            console.log(`  ${w.name} - ${w.field || 'general'}: ${w.issue}`);
            if (w.current) {
                console.log(`    Current: "${w.current}" → Proposed: "${w.proposed}"`);
            }
        });
    }
    
    // Save verification report
    fs.writeFileSync('./VERIFICATION-REPORT.json', JSON.stringify(verification, null, 2));
    
    console.log('\n📄 Full verification report saved to: VERIFICATION-REPORT.json');
    
    // Final recommendation
    if (verification.dangerous.length === 0 && verification.statistics.potentialOverwrites === 0) {
        console.log('\n✅ ALL UPDATES APPEAR SAFE!');
        console.log('All changes are either:');
        console.log('  - Adding data where none existed');
        console.log('  - Formatting improvements only');
        console.log('\nReady to proceed with updates.');
    } else {
        console.log('\n⚠️  REVIEW REQUIRED!');
        console.log(`Found ${verification.dangerous.length} dangerous updates`);
        console.log(`Found ${verification.statistics.potentialOverwrites} potential overwrites`);
        console.log('Please review VERIFICATION-REPORT.json before proceeding.');
    }
    
    process.exit(0);
}

verifyUpdates().catch(console.error);