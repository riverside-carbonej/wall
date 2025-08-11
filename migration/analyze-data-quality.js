const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./LIVE-FIREBASE-DATA.json', 'utf8'));

console.log('Analyzing ' + data.veterans.length + ' veterans for data quality issues...\n');
console.log('='.repeat(70) + '\n');

const issues = [];
let veteranNum = 0;

// Go through each veteran
data.veterans.forEach((v, index) => {
  veteranNum++;
  const problems = [];
  const suggestions = {};
  
  const name = v.fieldData?.name || '';
  const rank = v.fieldData?.rank || '';
  const desc = v.fieldData?.description || '';
  const gradYear = v.fieldData?.graduationYear || '';
  
  // NAME ISSUES
  if (name) {
    // Check for double spaces
    if (name.includes('  ')) {
      problems.push('Double spaces in name');
      suggestions.name = name.replace(/\s+/g, ' ').trim();
    }
    
    // Check for weird parentheses usage
    if (name.includes('(formerly')) {
      problems.push('Uses "formerly" in parentheses');
      suggestions.name = name.replace(/\s*\(formerly\s+([^)]+)\)/, ' ($1)');
    }
    
    // Check for all caps
    if (name === name.toUpperCase() && name.length > 2) {
      problems.push('Name is ALL CAPS');
      suggestions.name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Check for missing spaces after periods
    if (name.match(/\.[A-Z]/)) {
      problems.push('Missing space after period in name');
      suggestions.name = name.replace(/\.([A-Z])/g, '. $1');
    }
    
    // Check for unnecessary quotes
    if (name.includes('"')) {
      problems.push('Has quotes in name');
      suggestions.name = name.replace(/"/g, '');
    }
    
    // Check for leading/trailing spaces
    if (name !== name.trim()) {
      problems.push('Has leading/trailing spaces');
      suggestions.name = name.trim();
    }
  }
  
  // RANK ISSUES
  if (rank) {
    // Check for double spaces
    if (rank.includes('  ')) {
      problems.push('Double spaces in rank');
      suggestions.rank = rank.replace(/\s+/g, ' ').trim();
    }
    
    // Check for inconsistent formatting (e.g., "E-5" vs "E5")
    if (rank.match(/E\d[^-]/) || rank.match(/O\d[^-]/)) {
      problems.push('Inconsistent rank format (missing hyphen)');
      suggestions.rank = rank.replace(/([EO])(\d)/, '$1-$2');
    }
    
    // Check for leading/trailing spaces
    if (rank !== rank.trim()) {
      problems.push('Rank has leading/trailing spaces');
      suggestions.rank = rank.trim();
    }
  }
  
  // DESCRIPTION ISSUES
  if (desc) {
    // Check for double spaces
    if (desc.includes('  ')) {
      problems.push('Double spaces in description');
      suggestions.description = desc.replace(/\s+/g, ' ').trim();
    }
    
    // Check for leading/trailing spaces
    if (desc !== desc.trim()) {
      problems.push('Description has leading/trailing spaces');
      suggestions.description = desc.trim();
    }
    
    // Check for all caps description
    if (desc === desc.toUpperCase() && desc.length > 10) {
      problems.push('Description is ALL CAPS');
      // Don't auto-fix this as it might be intentional
    }
  }
  
  // If there are problems, record them
  if (problems.length > 0) {
    issues.push({
      num: veteranNum,
      id: v.id,
      name: name,
      problems: problems,
      current: {
        name: name,
        rank: rank,
        description: desc.substring(0, 50) + (desc.length > 50 ? '...' : '')
      },
      suggested: suggestions
    });
  }
});

// Print all issues
if (issues.length === 0) {
  console.log('✅ No data quality issues found!\n');
} else {
  console.log(`Found ${issues.length} veterans with issues:\n`);
  
  issues.forEach(issue => {
    console.log(`VETERAN #${issue.num} (${issue.id})`);
    console.log(`Current name: "${issue.current.name}"`);
    if (issue.current.rank) console.log(`Current rank: "${issue.current.rank}"`);
    
    console.log(`Issues: ${issue.problems.join(', ')}`);
    
    if (Object.keys(issue.suggested).length > 0) {
      console.log('SUGGESTED FIXES:');
      if (issue.suggested.name) {
        console.log(`  Name: "${issue.current.name}" → "${issue.suggested.name}"`);
      }
      if (issue.suggested.rank) {
        console.log(`  Rank: "${issue.current.rank}" → "${issue.suggested.rank}"`);
      }
      if (issue.suggested.description) {
        console.log(`  Description: [trimmed spaces]`);
      }
    }
    console.log('-'.repeat(70));
  });
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY OF ISSUES:');
  const problemCounts = {};
  issues.forEach(issue => {
    issue.problems.forEach(p => {
      problemCounts[p] = (problemCounts[p] || 0) + 1;
    });
  });
  
  Object.entries(problemCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([problem, count]) => {
      console.log(`  ${count} veterans: ${problem}`);
    });
}

// Save issues to file for fixing
if (issues.length > 0) {
  fs.writeFileSync('DATA-QUALITY-ISSUES.json', JSON.stringify(issues, null, 2));
  console.log('\nIssues saved to DATA-QUALITY-ISSUES.json');
}