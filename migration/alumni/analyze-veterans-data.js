const fs = require('fs');
const path = require('path');

// Load the veterans data
const wallData = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-output/wall-data.json'), 'utf8'));
const veterans = wallData.items.veterans;
const branches = wallData.items.branches || [];
const deployments = wallData.items.deployments || [];

console.log('📊 VETERANS DATA ANALYSIS');
console.log('═════════════════════════════════════════\n');

console.log(`📋 Total Veterans: ${veterans.length}`);
console.log(`🏢 Total Branches: ${branches.length}`);
console.log(`🌍 Total Deployments: ${deployments.length}\n`);

// Analyze field usage
const fieldUsage = {
  name: 0,
  graduationYear: 0,
  rank: 0,
  militaryEntryDate: 0,
  militaryExitDate: 0,
  description: 0,
  branches: 0,
  deployments: 0,
  images: 0
};

const graduationYears = new Set();
const ranks = new Set();
const hasMultipleBranches = [];
const hasMultipleDeployments = [];

veterans.forEach(veteran => {
  const data = veteran.fieldData;
  
  if (data.name) fieldUsage.name++;
  if (data.graduationYear) {
    fieldUsage.graduationYear++;
    graduationYears.add(data.graduationYear);
  }
  if (data.rank) {
    fieldUsage.rank++;
    ranks.add(data.rank);
  }
  if (data.militaryEntryDate) fieldUsage.militaryEntryDate++;
  if (data.militaryExitDate) fieldUsage.militaryExitDate++;
  if (data.description) fieldUsage.description++;
  if (data.branches && data.branches.length > 0) {
    fieldUsage.branches++;
    if (data.branches.length > 1) hasMultipleBranches.push(data.name);
  }
  if (data.deployments && data.deployments.length > 0) {
    fieldUsage.deployments++;
    if (data.deployments.length > 1) hasMultipleDeployments.push(data.name);
  }
  if (veteran.images && veteran.images.length > 0) fieldUsage.images++;
});

console.log('📈 FIELD USAGE STATISTICS:');
console.log('─────────────────────────────────────────');
Object.entries(fieldUsage).forEach(([field, count]) => {
  const percentage = ((count / veterans.length) * 100).toFixed(1);
  console.log(`${field.padEnd(20)} ${count.toString().padStart(4)} / ${veterans.length} (${percentage}%)`);
});

console.log('\n📅 GRADUATION YEAR RANGE:');
console.log('─────────────────────────────────────────');
const yearsArray = Array.from(graduationYears).sort();
console.log(`Earliest: ${yearsArray[0] || 'N/A'}`);
console.log(`Latest: ${yearsArray[yearsArray.length - 1] || 'N/A'}`);
console.log(`Total unique years: ${yearsArray.length}`);

console.log('\n🎖️  UNIQUE RANKS: ' + ranks.size);
if (ranks.size > 0 && ranks.size <= 20) {
  console.log('─────────────────────────────────────────');
  Array.from(ranks).sort().forEach(rank => console.log(`  • ${rank}`));
}

console.log('\n🌐 BRANCHES DATA:');
console.log('─────────────────────────────────────────');
console.log(`Veterans with branches: ${fieldUsage.branches}`);
console.log(`Veterans with multiple branches: ${hasMultipleBranches.length}`);
if (branches.length > 0) {
  console.log('\nAvailable branches:');
  branches.slice(0, 10).forEach(branch => {
    console.log(`  • ${branch.fieldData?.name || 'Unnamed'} (ID: ${branch.id})`);
  });
  if (branches.length > 10) console.log(`  ... and ${branches.length - 10} more`);
}

console.log('\n🗺️  DEPLOYMENTS DATA:');
console.log('─────────────────────────────────────────');
console.log(`Veterans with deployments: ${fieldUsage.deployments}`);
console.log(`Veterans with multiple deployments: ${hasMultipleDeployments.length}`);
if (deployments.length > 0) {
  console.log('\nAvailable deployments:');
  deployments.slice(0, 10).forEach(deployment => {
    console.log(`  • ${deployment.fieldData?.name || 'Unnamed'} (ID: ${deployment.id})`);
  });
  if (deployments.length > 10) console.log(`  ... and ${deployments.length - 10} more`);
}

console.log('\n📷 IMAGES:');
console.log('─────────────────────────────────────────');
console.log(`Veterans with images: ${fieldUsage.images}`);

console.log('\n💡 RECOMMENDATIONS FOR WALL CREATION:');
console.log('═════════════════════════════════════════');
console.log('Based on the data analysis, create these fields:');
console.log('');
console.log('REQUIRED FIELDS:');
console.log('  ✅ Name (Text) - Required');
console.log('');
console.log('OPTIONAL FIELDS:');
console.log('  📅 Graduation Year (Text)');
console.log('  🎖️  Rank (Text)');
console.log('  📆 Military Entry Date (Date)');
console.log('  📆 Military Exit Date (Date)');
console.log('  📝 Description (Textarea)');
console.log('  🏢 Branches (Text or Relationship)');
console.log('  🌍 Deployments (Text or Relationship)');
console.log('  📷 Images (File/Image)');

console.log('\n📊 SAMPLE DATA (First 3 Veterans):');
console.log('═════════════════════════════════════════');
veterans.slice(0, 3).forEach((veteran, index) => {
  console.log(`\nVeteran ${index + 1}:`);
  console.log(JSON.stringify(veteran, null, 2));
});