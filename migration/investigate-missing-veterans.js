#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function investigateMissing() {
    console.log('🔍 INVESTIGATING WHY YOU SEE 559 INSTEAD OF 579 VETERANS\n');
    console.log('='.repeat(60));
    
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    console.log(`📊 Total veterans in Firebase: ${snapshot.size}\n`);
    
    // Categorize veterans by potential issues
    const categories = {
        complete: [],
        missingName: [],
        emptyName: [],
        missingYear: [],
        missingBranch: [],
        missingImage: [],
        missingAllData: [],
        facultyStaff: [],
        specialCharacters: [],
        veryLongNames: [],
        duplicateLookingNames: []
    };
    
    const allVeterans = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const fieldData = data.fieldData || {};
        const veteran = {
            id: doc.id,
            name: fieldData.name || '',
            year: fieldData.graduationYear || '',
            branch: fieldData.branches || [],
            rank: fieldData.rank || '',
            hasImage: data.images && data.images.length > 0,
            description: fieldData.description || '',
            deployments: fieldData.deployments || [],
            entryDate: fieldData.militaryEntryDate,
            exitDate: fieldData.militaryExitDate,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
            created: data.created,
            updated: data.updated
        };
        
        allVeterans.push(veteran);
        
        // Check for issues
        let hasIssue = false;
        
        // Missing or empty name
        if (!fieldData.name) {
            categories.missingName.push(veteran);
            hasIssue = true;
        } else if (fieldData.name.trim() === '') {
            categories.emptyName.push(veteran);
            hasIssue = true;
        }
        
        // Check if name has special characters that might cause display issues
        if (fieldData.name && /[<>\"'`]/.test(fieldData.name)) {
            categories.specialCharacters.push(veteran);
            hasIssue = true;
        }
        
        // Very long names (might be truncated or cause issues)
        if (fieldData.name && fieldData.name.length > 50) {
            categories.veryLongNames.push(veteran);
            hasIssue = true;
        }
        
        // Faculty/Staff (might be filtered out in UI)
        if (fieldData.name && (
            fieldData.name.toLowerCase().includes('faculty') ||
            fieldData.name.toLowerCase().includes('teacher') ||
            fieldData.name.toLowerCase().includes('staff') ||
            fieldData.name.toLowerCase().includes('principal') ||
            fieldData.name.toLowerCase().includes('super')
        )) {
            categories.facultyStaff.push(veteran);
        }
        
        // Missing all key data
        if (!fieldData.name && !fieldData.graduationYear && (!fieldData.branches || fieldData.branches.length === 0)) {
            categories.missingAllData.push(veteran);
            hasIssue = true;
        }
        
        // Missing common fields
        if (!fieldData.graduationYear) {
            categories.missingYear.push(veteran);
        }
        if (!fieldData.branches || fieldData.branches.length === 0) {
            categories.missingBranch.push(veteran);
        }
        if (!veteran.hasImage) {
            categories.missingImage.push(veteran);
        }
        
        if (!hasIssue) {
            categories.complete.push(veteran);
        }
    });
    
    // Sort all veterans by name for easy reference
    allVeterans.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Display findings
    console.log('🔴 CRITICAL ISSUES (might hide veterans):\n');
    
    if (categories.missingName.length > 0) {
        console.log(`  Missing name field: ${categories.missingName.length} veterans`);
        categories.missingName.forEach(v => {
            console.log(`    - ID: ${v.id.substring(0, 8)}... Year: ${v.year || 'none'}`);
        });
        console.log();
    }
    
    if (categories.emptyName.length > 0) {
        console.log(`  Empty name: ${categories.emptyName.length} veterans`);
        categories.emptyName.forEach(v => {
            console.log(`    - ID: ${v.id.substring(0, 8)}...`);
        });
        console.log();
    }
    
    if (categories.specialCharacters.length > 0) {
        console.log(`  Special characters in name: ${categories.specialCharacters.length} veterans`);
        categories.specialCharacters.forEach(v => {
            console.log(`    - "${v.name}"`);
        });
        console.log();
    }
    
    if (categories.veryLongNames.length > 0) {
        console.log(`  Very long names (>50 chars): ${categories.veryLongNames.length} veterans`);
        categories.veryLongNames.forEach(v => {
            console.log(`    - "${v.name}" (${v.name.length} chars)`);
        });
        console.log();
    }
    
    console.log('🟡 POSSIBLE FILTERS (might be hidden by UI filters):\n');
    
    console.log(`  Faculty/Staff entries: ${categories.facultyStaff.length}`);
    if (categories.facultyStaff.length > 0 && categories.facultyStaff.length <= 20) {
        categories.facultyStaff.forEach(v => {
            console.log(`    - ${v.name}`);
        });
    }
    
    console.log(`\n  Missing graduation year: ${categories.missingYear.length}`);
    console.log(`  Missing branch: ${categories.missingBranch.length}`);
    console.log(`  Missing image: ${categories.missingImage.length}`);
    
    // Calculate the difference
    const difference = 579 - 559;
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ANALYSIS:\n`);
    console.log(`Database has: 579 veterans`);
    console.log(`You see: 559 veterans`);
    console.log(`Missing: ${difference} veterans\n`);
    
    // Try to identify the likely 20 missing
    console.log(`🎯 MOST LIKELY MISSING (top ${difference}):\n`);
    
    // Combine critical issues
    const likelyMissing = [
        ...categories.missingName,
        ...categories.emptyName,
        ...categories.missingAllData,
        ...categories.specialCharacters,
        ...categories.veryLongNames
    ];
    
    // Remove duplicates
    const uniqueMissing = Array.from(new Set(likelyMissing.map(v => v.id)))
        .map(id => likelyMissing.find(v => v.id === id));
    
    console.log(`Found ${uniqueMissing.length} veterans with critical issues:\n`);
    uniqueMissing.slice(0, difference).forEach(v => {
        console.log(`  - Name: "${v.name || '[NO NAME]'}" (ID: ${v.id.substring(0, 8)}...)`);
        console.log(`    Year: ${v.year || 'none'}, Image: ${v.hasImage ? 'Yes' : 'No'}`);
    });
    
    // Save full list for comparison
    const report = {
        timestamp: new Date().toISOString(),
        totalInDatabase: snapshot.size,
        expectedInUI: 559,
        difference: difference,
        criticalIssues: {
            missingName: categories.missingName.length,
            emptyName: categories.emptyName.length,
            specialCharacters: categories.specialCharacters.length,
            veryLongNames: categories.veryLongNames.length,
            missingAllData: categories.missingAllData.length
        },
        likelyMissing: uniqueMissing,
        allVeterans: allVeterans.map(v => ({
            id: v.id,
            name: v.name || '[NO NAME]',
            year: v.year,
            hasImage: v.hasImage
        }))
    };
    
    fs.writeFileSync('./MISSING-VETERANS-REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Full report saved to: MISSING-VETERANS-REPORT.json');
    console.log('This file contains all 579 veteran names for comparison.');
    
    // Also create a simple list of names
    const namesList = allVeterans
        .map(v => v.name || '[NO NAME]')
        .sort()
        .join('\n');
    
    fs.writeFileSync('./ALL-VETERAN-NAMES.txt', namesList);
    console.log('📄 Simple name list saved to: ALL-VETERAN-NAMES.txt');
    
    process.exit(0);
}

investigateMissing().catch(console.error);