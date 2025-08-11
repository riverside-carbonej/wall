const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./BACKUP-2025-08-10T22-46-33-674Z.json', 'utf8'));

console.log('Scanning all ' + data.veterans.length + ' veterans for data issues...\n');

const issues = [];

data.veterans.forEach((v, i) => {
  const num = i + 1;
  const n = v.fieldData.name || '';
  const r = v.fieldData.rank || '';
  const d = v.fieldData.description || '';
  const g = v.fieldData.graduationYear || '';
  
  const problems = [];
  
  // Check name issues
  if (n.includes('  ')) problems.push('double spaces in name');
  if (n.includes('\t')) problems.push('tab in name');
  if (n.includes('\n')) problems.push('newline in name');
  if (n.match(/[0-9]/)) problems.push('numbers in name');
  if (n.startsWith(' ') || n.endsWith(' ')) problems.push('leading/trailing spaces in name');
  if (n.includes(',') && !n.includes('(')) problems.push('comma in name (not maiden name)');
  if (n.length < 2) problems.push('name too short');
  if (n.match(/[^a-zA-Z\s\-\'\(\)\.]/)) problems.push('special characters in name');
  
  // Check rank issues  
  if (r.includes('  ')) problems.push('double spaces in rank');
  if (r.includes('\t')) problems.push('tab in rank');
  if (r.includes('\n')) problems.push('newline in rank');
  if (r.startsWith(' ') || r.endsWith(' ')) problems.push('leading/trailing spaces in rank');
  if (r.length > 100) problems.push('rank too long');
  if (r.includes('@')) problems.push('email in rank');
  if (r.includes('.com')) problems.push('URL in rank');
  
  // Check description issues
  if (d.includes('  ')) problems.push('double spaces in description');
  if (d.includes('\t')) problems.push('tab in description');
  if (d.startsWith(' ') || d.endsWith(' ')) problems.push('leading/trailing spaces in description');
  if (d.length > 500) problems.push('description too long: ' + d.length + ' chars');
  
  // Check grad year issues
  if (g && !g.match(/^(19|20)\d{2}$/)) {
    if (g !== 'Unknown' && g !== '') {
      problems.push('invalid grad year format: ' + g);
    }
  }
  
  // Check date issues
  if (v.fieldData.militaryEntryDate) {
    const entry = v.fieldData.militaryEntryDate;
    if (entry.includes('01-01T00:00:00')) {
      problems.push('entry date looks like just a year');
    }
  }
  if (v.fieldData.militaryExitDate) {
    const exit = v.fieldData.militaryExitDate;
    if (exit.includes('01-01T00:00:00')) {
      problems.push('exit date looks like just a year');
    }
  }
  
  if (problems.length > 0) {
    issues.push({
      num: num,
      id: v.docId,
      name: n,
      rank: r,
      gradYear: g,
      description: d.substring(0, 50),
      problems: problems
    });
  }
});

if (issues.length === 0) {
  console.log('No data quality issues found!');
} else {
  console.log('Found ' + issues.length + ' veterans with issues:\n');
  
  issues.forEach(issue => {
    console.log('Veteran #' + issue.num + ' (ID: ' + issue.id + ')');
    console.log('  Name: "' + issue.name + '"');
    if (issue.rank) console.log('  Rank: "' + issue.rank + '"');
    if (issue.gradYear) console.log('  Grad Year: "' + issue.gradYear + '"');
    console.log('  Issues: ' + issue.problems.join(', '));
    console.log('');
  });
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const problemTypes = {};
  issues.forEach(issue => {
    issue.problems.forEach(p => {
      problemTypes[p] = (problemTypes[p] || 0) + 1;
    });
  });
  
  Object.entries(problemTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([problem, count]) => {
      console.log(count + ' veterans with: ' + problem);
    });
}