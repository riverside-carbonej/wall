const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./migration/COMPLETE-DIFFERENTIAL-WITH-QA.json', 'utf8'));

console.log('📊 DIFFERENTIAL SUMMARY\n');
console.log('='.repeat(60));

// Show statistics
console.log('\nOVERALL STATISTICS:');
console.log(`- Total CSV rows: ${data.statistics.totalRows}`);
console.log(`- Processed: ${data.statistics.processed}`);
console.log(`- New veterans to add: ${data.statistics.newVeterans}`);
console.log(`- Veterans with updates: ${data.statistics.updates}`);
console.log(`- Conflicts found: ${data.statistics.conflicts}`);

// Quality fixes
console.log('\nQUALITY FIXES APPLIED:');
console.log(`- Branch typos fixed: ${data.statistics.fixes.branchTypos}`);
console.log(`- Name formatting: ${data.statistics.fixes.nameFormatting}`);

// Sample name fixes
console.log('\nSAMPLE NAME FORMATTING FIXES:');
const nameFixExamples = data.processed.filter(p => 
    p.updates.some(u => u.field === 'name' && u.type === 'formatting')
).slice(0, 5);

nameFixExamples.forEach(p => {
    const nameUpdate = p.updates.find(u => u.field === 'name');
    console.log(`  "${nameUpdate.current}" → "${nameUpdate.proposed}"`);
});

// Branch additions
console.log('\nBRANCH ADDITIONS BY TYPE:');
const branchCounts = {};
data.processed.forEach(p => {
    p.updates.forEach(u => {
        if (u.field === 'branch' && u.type === 'addition') {
            branchCounts[u.proposed] = (branchCounts[u.proposed] || 0) + 1;
        }
    });
});

Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).forEach(([branch, count]) => {
    console.log(`  ${branch}: ${count} veterans`);
});

// Conflicts
console.log('\nCONFLICTS (Graduation Year Mismatches):');
const conflictVeterans = data.processed.filter(p => p.issues && p.issues.length > 0);
conflictVeterans.forEach(p => {
    p.issues.forEach(issue => {
        if (issue.field === 'graduationYear') {
            console.log(`  ${p.name}: ${issue.conflict}`);
        }
    });
});

// New veterans
console.log(`\nNEW VETERANS TO ADD: ${data.newVeterans.length}`);
console.log('First 10:');
data.newVeterans.slice(0, 10).forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name} (${v.graduationYear || 'N/A'}) - ${v.branch || 'No branch'}`);
});

// Service dates added
const veteransWithDates = data.processed.filter(p => 
    p.updates.some(u => u.field === 'militaryEntryDate' || u.field === 'militaryExitDate')
);
console.log(`\nSERVICE DATES ADDED: ${veteransWithDates.length} veterans`);