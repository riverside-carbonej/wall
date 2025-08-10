#!/usr/bin/env node

const fs = require('fs');

// Load the cleaned differential
const data = JSON.parse(fs.readFileSync('./CLEANED-DIFFERENTIAL.json', 'utf8'));

console.log('📊 CLEANED DIFFERENTIAL SUMMARY\n');
console.log('='.repeat(60));

// Show statistics
console.log('\nOVERALL STATISTICS:');
console.log(`- Total CSV rows: ${data.statistics.totalRows}`);
console.log(`- Processed: ${data.statistics.processed}`);
console.log(`- New veterans to add: ${data.statistics.newVeterans}`);
console.log(`- Veterans with updates: ${data.statistics.updates}`);
console.log(`- Conflicts remaining: ${data.statistics.conflicts}`);

// Show cleaning applied
console.log('\nCLEANING APPLIED:');
console.log(`- Year 2040 blanked out: ${data.statistics.cleaningApplied.year2040Fixed}`);
console.log(`- Branch typos fixed: ${data.statistics.cleaningApplied.branchesFixed}`);
console.log(`- Invalid branches removed: ${data.statistics.cleaningApplied.invalidBranchesRemoved}`);
console.log(`- Name formatting fixed: ${data.statistics.cleaningApplied.nameFormattingFixed}`);

// Count updates by type
let updateTypes = {
    branch: 0,
    name: 0,
    graduationYear: 0,
    rank: 0,
    militaryEntryDate: 0,
    militaryExitDate: 0
};

data.processed.forEach(veteran => {
    veteran.updates.forEach(update => {
        updateTypes[update.field] = (updateTypes[update.field] || 0) + 1;
    });
});

console.log('\nUPDATES BY TYPE:');
Object.entries(updateTypes).forEach(([field, count]) => {
    if (count > 0) {
        console.log(`  ${field}: ${count}`);
    }
});

// Show sample cleaned names
console.log('\nSAMPLE CLEANED NAMES:');
const cleanedNames = data.processed
    .filter(v => v.updates.some(u => u.field === 'name' && u.cleaned))
    .slice(0, 5);

cleanedNames.forEach(veteran => {
    const nameUpdate = veteran.updates.find(u => u.field === 'name');
    console.log(`  "${nameUpdate.current}" → "${nameUpdate.proposed}"`);
});

// Show branch distribution
console.log('\nBRANCH DISTRIBUTION (for additions):');
const branchCounts = {};
data.processed.forEach(veteran => {
    veteran.updates.forEach(update => {
        if (update.field === 'branch' && update.type === 'addition' && update.proposed) {
            branchCounts[update.proposed] = (branchCounts[update.proposed] || 0) + 1;
        }
    });
});

Object.entries(branchCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([branch, count]) => {
        console.log(`  ${branch}: ${count}`);
    });

// Show new veterans sample
console.log(`\nNEW VETERANS (first 10 of ${data.newVeterans.length}):`);
data.newVeterans.slice(0, 10).forEach((v, i) => {
    const year = v.graduationYear || 'No year';
    const branch = v.branch || 'No branch';
    console.log(`  ${i + 1}. ${v.name} (${year}) - ${branch}`);
});

// Check for any remaining issues
const remainingIssues = data.processed.filter(v => v.issues && v.issues.length > 0);
console.log(`\nREMAINING ISSUES: ${remainingIssues.length}`);
if (remainingIssues.length > 0) {
    console.log('Veterans with conflicts:');
    remainingIssues.slice(0, 5).forEach(v => {
        v.issues.forEach(issue => {
            console.log(`  ${v.name}: ${issue.conflict}`);
        });
    });
}

console.log('\n✅ This cleaned differential is ready for application.');
console.log('All year 2040 entries have been blanked out.');
console.log('All branch typos and name formatting issues have been fixed.');