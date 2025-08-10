#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

// Parse command line args
const args = process.argv.slice(2);
const testMode = args.includes('--test');
const testLimit = testMode ? 3 : null;

async function applySafeUpdates() {
    console.log('🚀 APPLYING SAFE UPDATES TO FIREBASE\n');
    console.log('='.repeat(60));
    
    if (testMode) {
        console.log('📋 TEST MODE - Will only update first 3 veterans\n');
    }
    
    // Load safe differential
    const differential = JSON.parse(fs.readFileSync('./SAFE-DIFFERENTIAL.json', 'utf8'));
    
    // Track progress
    const results = {
        updated: [],
        added: [],
        errors: [],
        statistics: {
            veteransUpdated: 0,
            veteransAdded: 0,
            fieldsUpdated: 0,
            errors: 0
        }
    };
    
    try {
        // Process updates to existing veterans
        console.log('📝 Updating existing veterans...\n');
        
        const veteransToUpdate = testMode 
            ? differential.processed.slice(0, testLimit)
            : differential.processed;
        
        for (const veteran of veteransToUpdate) {
            try {
                const docRef = db.collection('wall_items').doc(veteran.firebaseId);
                
                // Get current data
                const doc = await docRef.get();
                if (!doc.exists) {
                    results.errors.push({
                        name: veteran.name,
                        error: 'Document not found'
                    });
                    results.statistics.errors++;
                    continue;
                }
                
                const currentData = doc.data();
                const updatedFields = { ...currentData.fieldData };
                
                // Apply updates
                for (const update of veteran.updates) {
                    if (update.field === 'branches') {
                        // Branches is an array
                        updatedFields.branches = update.proposed;
                    } else {
                        // Other fields are direct values
                        updatedFields[update.field] = update.proposed;
                    }
                    results.statistics.fieldsUpdated++;
                }
                
                // Update Firebase
                await docRef.update({
                    fieldData: updatedFields,
                    updated: admin.firestore.FieldValue.serverTimestamp()
                });
                
                results.updated.push({
                    name: veteran.name,
                    fields: veteran.updates.map(u => u.field)
                });
                results.statistics.veteransUpdated++;
                
                console.log(`  ✅ Updated: ${veteran.name} (${veteran.updates.length} fields)`);
            } catch (error) {
                console.error(`  ❌ Error updating ${veteran.name}:`, error.message);
                results.errors.push({
                    name: veteran.name,
                    error: error.message
                });
                results.statistics.errors++;
            }
        }
        
        // Add new veterans (only in full mode, not test)
        if (!testMode && differential.newVeterans.length > 0) {
            console.log('\n📝 Adding new veterans...\n');
            
            for (const newVeteran of differential.newVeterans) {
                try {
                    // Prepare field data
                    const fieldData = {
                        name: newVeteran.name,
                        graduationYear: newVeteran.graduationYear || null,
                        rank: newVeteran.rank || '',
                        militaryEntryDate: newVeteran.militaryEntryDate || null,
                        militaryExitDate: newVeteran.militaryExitDate || null,
                        description: '',
                        deployments: [],
                        branches: newVeteran.branches || []
                    };
                    
                    // Create new document
                    const docRef = await db.collection('wall_items').add({
                        wallId: WALL_ID,
                        objectTypeId: 'veteran',
                        fieldData: fieldData,
                        images: [],
                        created: admin.firestore.FieldValue.serverTimestamp(),
                        updated: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    results.added.push({
                        name: newVeteran.name,
                        id: docRef.id
                    });
                    results.statistics.veteransAdded++;
                    
                    console.log(`  ✅ Added: ${newVeteran.name} (ID: ${docRef.id})`);
                } catch (error) {
                    console.error(`  ❌ Error adding ${newVeteran.name}:`, error.message);
                    results.errors.push({
                        name: newVeteran.name,
                        error: error.message
                    });
                    results.statistics.errors++;
                }
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 UPDATE COMPLETE!\n');
        console.log(`Veterans updated: ${results.statistics.veteransUpdated}`);
        console.log(`Fields updated: ${results.statistics.fieldsUpdated}`);
        console.log(`New veterans added: ${results.statistics.veteransAdded}`);
        console.log(`Errors: ${results.statistics.errors}`);
        
        if (results.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            results.errors.forEach(e => {
                console.log(`  - ${e.name}: ${e.error}`);
            });
        }
        
        // Save results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = testMode 
            ? `./TEST-RESULTS-${timestamp}.json`
            : `./UPDATE-RESULTS-${timestamp}.json`;
        
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Results saved to: ${resultsFile}`);
        
        if (testMode) {
            console.log('\n✅ TEST SUCCESSFUL!');
            console.log('Run without --test flag to apply all updates.');
        } else {
            console.log('\n✅ ALL UPDATES APPLIED SUCCESSFULLY!');
            console.log('Use the backup and restore script if you need to rollback.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

applySafeUpdates();