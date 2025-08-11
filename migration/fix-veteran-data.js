const fs = require('fs');

// Load the backup
const data = JSON.parse(fs.readFileSync('./BACKUP-2025-08-10T22-46-33-674Z.json', 'utf8'));

console.log('Fixing veteran data issues...\n');

// Track changes
const changes = [];

// Go through all veterans and fix issues
data.veterans.forEach((v, i) => {
  const num = i + 1;
  const original = JSON.parse(JSON.stringify(v.fieldData)); // Deep copy for comparison
  
  // Fix double spaces in rank
  if (v.fieldData.rank && v.fieldData.rank.includes('  ')) {
    const oldRank = v.fieldData.rank;
    v.fieldData.rank = v.fieldData.rank.replace(/\s+/g, ' ').trim();
    changes.push({
      num: num,
      id: v.docId,
      name: v.fieldData.name,
      field: 'rank',
      old: oldRank,
      new: v.fieldData.rank
    });
  }
  
  // Fix double spaces in name
  if (v.fieldData.name && v.fieldData.name.includes('  ')) {
    const oldName = v.fieldData.name;
    v.fieldData.name = v.fieldData.name.replace(/\s+/g, ' ').trim();
    changes.push({
      num: num,
      id: v.docId,
      field: 'name',
      old: oldName,
      new: v.fieldData.name
    });
  }
  
  // Fix leading/trailing spaces in all text fields
  ['name', 'rank', 'description'].forEach(field => {
    if (v.fieldData[field] && typeof v.fieldData[field] === 'string') {
      const trimmed = v.fieldData[field].trim();
      if (trimmed !== v.fieldData[field]) {
        changes.push({
          num: num,
          id: v.docId,
          name: v.fieldData.name,
          field: field,
          old: v.fieldData[field],
          new: trimmed
        });
        v.fieldData[field] = trimmed;
      }
    }
  });
});

// Report changes
if (changes.length === 0) {
  console.log('No changes needed!');
} else {
  console.log(`Found ${changes.length} issues to fix:\n`);
  changes.forEach(change => {
    console.log(`Veteran #${change.num}: ${change.name || change.id}`);
    console.log(`  Field: ${change.field}`);
    console.log(`  OLD: "${change.old}"`);
    console.log(`  NEW: "${change.new}"`);
    console.log('');
  });
}

// Save the fixed data
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `BACKUP-CLEANED-${timestamp}.json`;

fs.writeFileSync(filename, JSON.stringify(data, null, 2));
console.log(`\nCleaned data saved to: ${filename}`);

// Also create a changes log
if (changes.length > 0) {
  const logFilename = `CHANGES-LOG-${timestamp}.json`;
  fs.writeFileSync(logFilename, JSON.stringify(changes, null, 2));
  console.log(`Changes log saved to: ${logFilename}`);
}