const fs = require('fs');

const data = JSON.parse(fs.readFileSync('../LIVE-FIREBASE-DATA.json', 'utf8'));

console.log('Pass 2: Deep analysis of ' + data.veterans.length + ' veterans...\n');
console.log('='.repeat(70) + '\n');

const issues = [];
let veteranNum = 0;

// More comprehensive checks
data.veterans.forEach((v, index) => {
  veteranNum++;
  const problems = [];
  const suggestions = {};
  
  const name = v.fieldData?.name || '';
  const rank = v.fieldData?.rank || '';
  const desc = v.fieldData?.description || '';
  const gradYear = v.fieldData?.graduationYear || '';
  
  // ENHANCED NAME CHECKS
  if (name) {
    // Check for period without space (like "Jr." should be fine, but "J.Smith" is not)
    if (name.match(/\.[A-Za-z]/)) {
      problems.push('Missing space after period');
      suggestions.name = name.replace(/\.([A-Za-z])/g, '. $1');
    }
    
    // Check for multiple spaces (already did double, but check for triple+)
    if (name.match(/\s{2,}/)) {
      problems.push('Multiple spaces in name');
      suggestions.name = name.replace(/\s+/g, ' ').trim();
    }
    
    // Check for lowercase after space (except for particles like "de", "van")
    const words = name.split(' ');
    const particles = ['de', 'van', 'von', 'der', 'la', 'le', 'di', 'da'];
    let needsCap = false;
    words.forEach((word, i) => {
      if (i > 0 && !particles.includes(word.toLowerCase()) && word[0] && word[0] === word[0].toLowerCase() && /[a-z]/.test(word[0])) {
        needsCap = true;
      }
    });
    if (needsCap) {
      problems.push('Improper capitalization');
      suggestions.name = words.map((word, i) => {
        if (i === 0 || !particles.includes(word.toLowerCase())) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      }).join(' ');
    }
    
    // Check for numbers that should be Roman numerals
    if (name.match(/\b(1st|2nd|3rd|[4-9]th)\b/i)) {
      problems.push('Ordinal numbers should be Roman numerals');
      suggestions.name = name
        .replace(/\b1st\b/gi, 'I')
        .replace(/\b2nd\b/gi, 'II')
        .replace(/\b3rd\b/gi, 'III')
        .replace(/\b4th\b/gi, 'IV')
        .replace(/\b5th\b/gi, 'V');
    }
    
    // Check for trailing/leading punctuation
    if (name.match(/^[,\.\-\s]|[,\-\s]$/)) {
      problems.push('Unnecessary punctuation at start/end');
      suggestions.name = name.replace(/^[,\.\-\s]+|[,\-\s]+$/g, '');
    }
    
    // Check for parentheses with extra spaces
    if (name.match(/\(\s+|\s+\)/)) {
      problems.push('Extra spaces inside parentheses');
      suggestions.name = name.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    }
    
    // Check for comma usage (should probably be removed or reformatted)
    if (name.includes(',') && !name.match(/Jr\.|Sr\.|III|II|IV/)) {
      problems.push('Unexpected comma in name');
      // Don't auto-fix as it might be intentional
    }
    
    // Check for all lowercase names
    if (name === name.toLowerCase() && name.length > 2) {
      problems.push('Name is all lowercase');
      suggestions.name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    
    // Check for "and" which might indicate multiple people
    if (name.toLowerCase().includes(' and ')) {
      problems.push('Name contains "and" - might be multiple people');
    }
    
    // Check for email-like patterns
    if (name.includes('@') || name.includes('.com')) {
      problems.push('Name contains email/URL elements');
      suggestions.name = name.replace(/@.*/, '').replace(/\.com.*/, '').trim();
    }
  }
  
  // ENHANCED RANK CHECKS
  if (rank) {
    // Check for inconsistent E/O grade formatting
    if (rank.match(/\b[EO]\d+\b/)) {
      problems.push('Rank grade needs hyphen (E5 should be E-5)');
      suggestions.rank = rank.replace(/\b([EO])(\d+)\b/g, '$1-$2');
    }
    
    // Check for lowercase military abbreviations
    const militaryAbbr = ['sgt', 'cpl', 'pvt', 'ltc', 'col', 'maj', 'cpt', 'lt', 'spc', 'pfc'];
    let hasLowerAbbr = false;
    militaryAbbr.forEach(abbr => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g');
      if (rank.match(regex)) {
        hasLowerAbbr = true;
      }
    });
    if (hasLowerAbbr) {
      problems.push('Lowercase military abbreviations');
      let fixedRank = rank;
      militaryAbbr.forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
        fixedRank = fixedRank.replace(regex, abbr.toUpperCase());
      });
      suggestions.rank = fixedRank;
    }
    
    // Check for inconsistent slash usage
    if (rank.includes('/') && rank.match(/\/\S|\S\//)) {
      problems.push('Missing spaces around slash');
      suggestions.rank = rank.replace(/\//g, ' / ');
    }
    
    // Check for parentheses with inconsistent spacing
    if (rank.match(/\(\S|\S\)/)) {
      problems.push('Missing spaces around parentheses in rank');
      suggestions.rank = rank.replace(/\(/g, ' (').replace(/\)/g, ') ').replace(/\s+/g, ' ').trim();
    }
    
    // Check for "Seargant" misspelling
    if (rank.toLowerCase().includes('seargant')) {
      problems.push('Misspelled "Sergeant"');
      suggestions.rank = rank.replace(/seargant/gi, 'Sergeant');
    }
    
    // Check for multiple spaces
    if (rank.match(/\s{2,}/)) {
      problems.push('Multiple spaces in rank');
      suggestions.rank = rank.replace(/\s+/g, ' ').trim();
    }
  }
  
  // GRADUATION YEAR CHECKS
  if (gradYear) {
    // Check if it's not a 4-digit year
    if (!gradYear.match(/^(19|20)\d{2}$/) && gradYear !== 'Unknown' && gradYear !== '') {
      problems.push(`Unusual graduation year format: "${gradYear}"`);
    }
    
    // Check for future years
    const currentYear = new Date().getFullYear();
    const year = parseInt(gradYear);
    if (year > currentYear + 4) {
      problems.push(`Future graduation year: ${gradYear}`);
    }
  }
  
  // DESCRIPTION CHECKS
  if (desc) {
    // Check for ALL CAPS descriptions
    if (desc === desc.toUpperCase() && desc.length > 20) {
      problems.push('Description is ALL CAPS');
    }
    
    // Check for HTML/XML tags
    if (desc.match(/<[^>]+>/)) {
      problems.push('Description contains HTML/XML tags');
      suggestions.description = desc.replace(/<[^>]+>/g, '').trim();
    }
    
    // Check for excessive punctuation
    if (desc.match(/[!?]{2,}|\.{4,}/)) {
      problems.push('Excessive punctuation in description');
    }
  }
  
  // Check for completely missing name
  if (!name || name.trim() === '') {
    problems.push('Missing name entirely');
  }
  
  // If there are problems, record them
  if (problems.length > 0) {
    issues.push({
      num: veteranNum,
      id: v.id,
      name: name || '(no name)',
      problems: problems,
      current: {
        name: name,
        rank: rank,
        gradYear: gradYear,
        description: desc ? desc.substring(0, 50) + (desc.length > 50 ? '...' : '') : ''
      },
      suggested: suggestions
    });
  }
});

// Print all issues
if (issues.length === 0) {
  console.log('✅ No additional data quality issues found!\n');
} else {
  console.log(`Found ${issues.length} veterans with issues:\n`);
  
  issues.forEach(issue => {
    console.log(`VETERAN #${issue.num} (${issue.id})`);
    console.log(`Current name: "${issue.current.name}"`);
    if (issue.current.rank) console.log(`Current rank: "${issue.current.rank}"`);
    if (issue.current.gradYear && issue.problems.some(p => p.includes('year'))) {
      console.log(`Grad year: "${issue.current.gradYear}"`);
    }
    
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
        console.log(`  Description: [cleaned]`);
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
  
  // Save for review
  fs.writeFileSync('DATA-QUALITY-ISSUES-PASS2.json', JSON.stringify(issues, null, 2));
  console.log('\nIssues saved to DATA-QUALITY-ISSUES-PASS2.json');
}