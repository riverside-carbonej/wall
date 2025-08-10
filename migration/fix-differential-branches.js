#!/usr/bin/env node

const fs = require('fs');

// Load branch mappings
const branchData = JSON.parse(fs.readFileSync('./BRANCH-MAPPINGS.json', 'utf8'));
const branchMappings = branchData.mappings;

// Load the cleaned differential
const differential = JSON.parse(fs.readFileSync('./CLEANED-DIFFERENTIAL.json', 'utf8'));

console.log('🔧 FIXING DIFFERENTIAL TO USE PROPER BRANCH IDS\n');
console.log('='.repeat(60));

// Track issues
const issues = {
    unknownBranchRemoved: 0,
    branchConverted: 0,
    invalidBranch: [],
    otherFieldIssues: []
};

// Function to convert branch name to ID
function getBranchId(branchName) {
    if (!branchName || branchName === 'Unknown' || branchName === 'unknown') {
        issues.unknownBranchRemoved++;
        return null; // Don't add "Unknown" - leave it null
    }
    
    // Try exact match first
    if (branchMappings[branchName]) {
        issues.branchConverted++;
        return branchMappings[branchName];
    }
    
    // Try lowercase
    if (branchMappings[branchName.toLowerCase()]) {
        issues.branchConverted++;
        return branchMappings[branchName.toLowerCase()];
    }
    
    // Try removing parenthetical content
    const cleaned = branchName.replace(/\([^)]*\)/g, '').trim();
    if (branchMappings[cleaned] || branchMappings[cleaned.toLowerCase()]) {
        issues.branchConverted++;
        return branchMappings[cleaned] || branchMappings[cleaned.toLowerCase()];
    }
    
    // Branch not found
    issues.invalidBranch.push(branchName);
    return null;
}

// Create properly formatted differential
const fixedDifferential = {
    ...differential,
    processed: differential.processed.map(veteran => {
        const fixed = { ...veteran };
        
        if (veteran.updates) {
            fixed.updates = veteran.updates.map(update => {
                // Fix branch updates
                if (update.field === 'branch') {
                    // This field should actually be 'branches' and should be an array
                    const branchId = getBranchId(update.proposed);
                    
                    if (!branchId) {
                        // Remove this update if branch is invalid or "Unknown"
                        return null;
                    }
                    
                    return {
                        field: 'branches', // Correct field name
                        current: update.current || [],
                        proposed: [branchId], // Array with branch ID
                        type: update.type,
                        note: `Converted "${update.proposed}" to branch ID`
                    };
                }
                
                // Check other fields for potential issues
                if (update.field === 'graduationYear') {
                    // Graduation year should be a string
                    if (update.proposed && typeof update.proposed !== 'string') {
                        issues.otherFieldIssues.push({
                            field: 'graduationYear',
                            issue: 'Not a string',
                            value: update.proposed
                        });
                    }
                }
                
                if (update.field === 'militaryEntryDate' || update.field === 'militaryExitDate') {
                    // Dates should be ISO strings
                    if (update.proposed && !update.proposed.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        issues.otherFieldIssues.push({
                            field: update.field,
                            issue: 'Invalid date format',
                            value: update.proposed
                        });
                    }
                }
                
                return update;
            }).filter(u => u !== null); // Remove null updates
        }
        
        // Remove veterans with no remaining updates
        if (fixed.updates && fixed.updates.length === 0) {
            return null;
        }
        
        return fixed;
    }).filter(v => v !== null),
    
    newVeterans: differential.newVeterans.map(veteran => {
        const fixed = { ...veteran };
        
        // Fix branch field
        if (fixed.branch) {
            const branchId = getBranchId(fixed.branch);
            if (branchId) {
                fixed.branches = [branchId]; // Use correct field name and array format
                fixed.branchNote = `Converted "${fixed.branch}" to branch ID`;
            }
            delete fixed.branch; // Remove the old field
        }
        
        // Ensure graduation year is string
        if (fixed.graduationYear && typeof fixed.graduationYear !== 'string') {
            fixed.graduationYear = String(fixed.graduationYear);
        }
        
        // Remove null/empty fields
        Object.keys(fixed).forEach(key => {
            if (fixed[key] === null || fixed[key] === '') {
                delete fixed[key];
            }
        });
        
        return fixed;
    })
};

// Update statistics
fixedDifferential.statistics.fixed = {
    unknownBranchesRemoved: issues.unknownBranchRemoved,
    branchesConverted: issues.branchConverted,
    invalidBranches: issues.invalidBranch,
    updatesRemaining: fixedDifferential.processed.length,
    newVeteransRemaining: fixedDifferential.newVeterans.length
};

// Save the fixed differential
fs.writeFileSync('./FINAL-DIFFERENTIAL-WITH-BRANCH-IDS.json', JSON.stringify(fixedDifferential, null, 2));

console.log('✅ Fixed differential created!\n');
console.log('Changes made:');
console.log(`  - "Unknown" branches removed: ${issues.unknownBranchRemoved}`);
console.log(`  - Branch names converted to IDs: ${issues.branchConverted}`);
console.log(`  - Invalid branches found: ${issues.invalidBranch.length}`);

if (issues.invalidBranch.length > 0) {
    console.log('\n⚠️  Invalid branches that were removed:');
    issues.invalidBranch.slice(0, 10).forEach(b => {
        console.log(`    - "${b}"`);
    });
}

if (issues.otherFieldIssues.length > 0) {
    console.log('\n⚠️  Other field issues found:');
    issues.otherFieldIssues.slice(0, 10).forEach(i => {
        console.log(`    - ${i.field}: ${i.issue} (${i.value})`);
    });
}

console.log(`\n📊 Final counts:`);
console.log(`  - Veterans with updates: ${fixedDifferential.processed.length}`);
console.log(`  - New veterans to add: ${fixedDifferential.newVeterans.length}`);
console.log('\n📄 Saved to: FINAL-DIFFERENTIAL-WITH-BRANCH-IDS.json');
console.log('\n✅ This differential is properly formatted for Firebase!');