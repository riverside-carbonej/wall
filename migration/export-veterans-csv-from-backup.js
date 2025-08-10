const fs = require('fs');
const path = require('path');

function exportVeteransToCSV() {
  console.log('Loading backup data...');
  
  try {
    // Load the backup file
    const backupData = JSON.parse(fs.readFileSync('./BACKUP-2025-08-10T22-46-33-674Z.json', 'utf8'));
    const veterans = backupData.veterans || [];
    
    console.log(`Found ${veterans.length} veterans in backup`);
    
    // Sort veterans by name
    veterans.sort((a, b) => {
      const nameA = (a.fieldData?.name || '').toLowerCase();
      const nameB = (b.fieldData?.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Create CSV header
    const headers = [
      'ID',
      'Name',
      'Graduation Year',
      'Rank',
      'Military Entry Date',
      'Military Exit Date',
      'Service Years',
      'Description',
      'Branch Count',
      'Deployment Count',
      'Has Photo',
      'Photo URL'
    ];
    
    // Build CSV content
    let csvContent = headers.join(',') + '\n';
    
    veterans.forEach(vet => {
      const data = vet.fieldData || {};
      
      // Parse name to get first and last
      const name = data.name || '';
      
      // Format dates
      const entryDate = data.militaryEntryDate ? new Date(data.militaryEntryDate).getFullYear() : '';
      const exitDate = data.militaryExitDate ? new Date(data.militaryExitDate).getFullYear() : '';
      
      // Calculate service years
      let serviceYears = '';
      if (entryDate && exitDate) {
        serviceYears = `${entryDate}-${exitDate}`;
      } else if (entryDate) {
        serviceYears = `${entryDate}-present`;
      }
      
      // Check for photos
      const hasPhoto = vet.images && vet.images.length > 0 ? 'Yes' : 'No';
      const photoUrl = vet.images && vet.images.length > 0 ? vet.images[0].url : '';
      
      // Count branches and deployments
      const branchCount = data.branches ? data.branches.length : 0;
      const deploymentCount = data.deployments ? data.deployments.length : 0;
      
      // Create CSV row
      const row = [
        vet.docId,
        escapeCSV(name),
        data.graduationYear || '',
        escapeCSV(data.rank || ''),
        entryDate,
        exitDate,
        serviceYears,
        escapeCSV(data.description || ''),
        branchCount,
        deploymentCount,
        hasPhoto,
        escapeCSV(photoUrl)
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Write to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `Veterans_Export_${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, csvContent, 'utf8');
    console.log(`\nCSV exported successfully to: ${filename}`);
    console.log(`Total veterans exported: ${veterans.length}`);
    
    // Create summary report
    const summary = analyzeVeterans(veterans);
    const summaryFilename = `Veterans_Summary_${timestamp}.txt`;
    const summaryPath = path.join(__dirname, summaryFilename);
    
    fs.writeFileSync(summaryPath, summary, 'utf8');
    console.log(`Summary report saved to: ${summaryFilename}`);
    
  } catch (error) {
    console.error('Error exporting veterans:', error);
  }
}

function escapeCSV(str) {
  if (!str) return '';
  str = String(str);
  // If contains comma, newline, or quote, wrap in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function analyzeVeterans(veterans) {
  const stats = {
    total: veterans.length,
    byGradYear: {},
    withPhotos: 0,
    withoutPhotos: 0,
    withRank: 0,
    withDeployments: 0,
    withBranches: 0,
    byDecade: {}
  };
  
  veterans.forEach(vet => {
    const data = vet.fieldData || {};
    
    // Count by graduation year
    const year = data.graduationYear || 'Unknown';
    stats.byGradYear[year] = (stats.byGradYear[year] || 0) + 1;
    
    // Count by decade
    if (data.graduationYear && !isNaN(data.graduationYear)) {
      const decade = Math.floor(data.graduationYear / 10) * 10;
      const decadeStr = `${decade}s`;
      stats.byDecade[decadeStr] = (stats.byDecade[decadeStr] || 0) + 1;
    }
    
    // Count photos
    if (vet.images && vet.images.length > 0) {
      stats.withPhotos++;
    } else {
      stats.withoutPhotos++;
    }
    
    // Count other fields
    if (data.rank) stats.withRank++;
    if (data.deployments && data.deployments.length > 0) stats.withDeployments++;
    if (data.branches && data.branches.length > 0) stats.withBranches++;
  });
  
  // Build summary report
  let report = '=================================\n';
  report += 'RIVERSIDE VETERANS EXPORT SUMMARY\n';
  report += '=================================\n\n';
  report += `Total Veterans: ${stats.total}\n\n`;
  
  report += 'BY DECADE:\n';
  report += '----------\n';
  Object.entries(stats.byDecade)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([decade, count]) => {
      report += `  ${decade}: ${count}\n`;
    });
  
  report += '\nDATA COMPLETENESS:\n';
  report += '------------------\n';
  report += `  With Photos: ${stats.withPhotos} (${((stats.withPhotos / stats.total) * 100).toFixed(1)}%)\n`;
  report += `  Without Photos: ${stats.withoutPhotos} (${((stats.withoutPhotos / stats.total) * 100).toFixed(1)}%)\n`;
  report += `  With Rank Info: ${stats.withRank} (${((stats.withRank / stats.total) * 100).toFixed(1)}%)\n`;
  report += `  With Deployments: ${stats.withDeployments} (${((stats.withDeployments / stats.total) * 100).toFixed(1)}%)\n`;
  report += `  With Branch Info: ${stats.withBranches} (${((stats.withBranches / stats.total) * 100).toFixed(1)}%)\n`;
  
  report += '\nTOP GRADUATION YEARS:\n';
  report += '--------------------\n';
  Object.entries(stats.byGradYear)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([year, count]) => {
      report += `  ${year}: ${count}\n`;
    });
  
  return report;
}

// Run the export
exportVeteransToCSV();