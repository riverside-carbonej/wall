const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportVeteransToCSV() {
  console.log('Fetching veterans from Firebase...');
  
  try {
    // Get all wall items (veterans) - using the first wall ID from the list
    const wallItemsRef = db.collection('wall-items');
    const snapshot = await wallItemsRef
      .where('wallId', '==', '1unclvToilMrXDwmtCha')
      .get();
    
    if (snapshot.empty) {
      console.log('No veterans found');
      return;
    }
    
    console.log(`Found ${snapshot.size} veterans`);
    
    // Convert to array and sort by last name, then first name
    const veterans = [];
    snapshot.forEach(doc => {
      veterans.push({ id: doc.id, data: doc.data() });
    });
    
    veterans.sort((a, b) => {
      const lastA = (a.data.fields?.lastName || '').toLowerCase();
      const lastB = (b.data.fields?.lastName || '').toLowerCase();
      const firstA = (a.data.fields?.firstName || '').toLowerCase();
      const firstB = (b.data.fields?.firstName || '').toLowerCase();
      
      if (lastA !== lastB) return lastA.localeCompare(lastB);
      return firstA.localeCompare(firstB);
    });
    
    // Create CSV header
    const headers = [
      'ID',
      'Last Name',
      'First Name',
      'Middle Name',
      'Class Year',
      'Branch',
      'Rank',
      'Service Years',
      'Status',
      'Wars/Conflicts',
      'Photo Available',
      'Notes',
      'Submitted By',
      'Submitted Date',
      'Last Updated'
    ];
    
    // Build CSV content
    let csvContent = headers.join(',') + '\n';
    
    veterans.forEach(({ id, data }) => {
      const fields = data.fields || {};
      
      // Format dates
      const submittedDate = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : '';
      const updatedDate = data.updatedAt ? new Date(data.updatedAt.toDate()).toLocaleDateString() : '';
      
      // Determine photo availability
      const hasPhoto = fields.photoUrl ? 'Yes' : 'No';
      
      // Clean and format service years
      let serviceYears = fields.serviceYears || '';
      if (fields.startYear && fields.endYear) {
        serviceYears = `${fields.startYear}-${fields.endYear}`;
      } else if (fields.startYear) {
        serviceYears = `${fields.startYear}-present`;
      }
      
      // Build notes from various fields
      const notes = [];
      if (fields.additionalInfo) notes.push(fields.additionalInfo);
      if (fields.comments) notes.push(fields.comments);
      if (fields.contact) notes.push(`Contact: ${fields.contact}`);
      const notesStr = notes.join('; ').replace(/"/g, '""'); // Escape quotes for CSV
      
      // Create CSV row
      const row = [
        id,
        escapeCSV(fields.lastName || ''),
        escapeCSV(fields.firstName || ''),
        escapeCSV(fields.middleName || ''),
        fields.classYear || '',
        escapeCSV(fields.branch || ''),
        escapeCSV(fields.rank || ''),
        escapeCSV(serviceYears),
        escapeCSV(fields.status || ''),
        escapeCSV(fields.wars || ''),
        hasPhoto,
        escapeCSV(notesStr),
        escapeCSV(fields.submittedBy || ''),
        submittedDate,
        updatedDate
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Write to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `Veterans_Export_${timestamp}.csv`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, csvContent, 'utf8');
    console.log(`\nCSV exported successfully to: ${filename}`);
    console.log(`Total veterans exported: ${snapshot.size}`);
    
    // Also create a summary report
    const summary = analyzeveterans(snapshot);
    const summaryFilename = `Veterans_Summary_${timestamp}.txt`;
    const summaryPath = path.join(__dirname, summaryFilename);
    
    fs.writeFileSync(summaryPath, summary, 'utf8');
    console.log(`Summary report saved to: ${summaryFilename}`);
    
  } catch (error) {
    console.error('Error exporting veterans:', error);
  } finally {
    await admin.app().delete();
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

function analyzeveterans(snapshot) {
  const stats = {
    total: snapshot.size,
    byBranch: {},
    byClassYear: {},
    byStatus: {},
    withPhotos: 0,
    withoutPhotos: 0,
    byDecade: {}
  };
  
  snapshot.forEach(doc => {
    const fields = doc.data().fields || {};
    
    // Count by branch
    const branch = fields.branch || 'Unknown';
    stats.byBranch[branch] = (stats.byBranch[branch] || 0) + 1;
    
    // Count by class year
    const year = fields.classYear || 'Unknown';
    stats.byClassYear[year] = (stats.byClassYear[year] || 0) + 1;
    
    // Count by decade
    if (fields.classYear && !isNaN(fields.classYear)) {
      const decade = Math.floor(fields.classYear / 10) * 10;
      const decadeStr = `${decade}s`;
      stats.byDecade[decadeStr] = (stats.byDecade[decadeStr] || 0) + 1;
    }
    
    // Count by status
    const status = fields.status || 'Unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    
    // Count photos
    if (fields.photoUrl) {
      stats.withPhotos++;
    } else {
      stats.withoutPhotos++;
    }
  });
  
  // Build summary report
  let report = '=================================\n';
  report += 'RIVERSIDE VETERANS EXPORT SUMMARY\n';
  report += '=================================\n\n';
  report += `Total Veterans: ${stats.total}\n\n`;
  
  report += 'BY SERVICE BRANCH:\n';
  report += '-----------------\n';
  Object.entries(stats.byBranch)
    .sort((a, b) => b[1] - a[1])
    .forEach(([branch, count]) => {
      report += `  ${branch}: ${count}\n`;
    });
  
  report += '\nBY DECADE:\n';
  report += '----------\n';
  Object.entries(stats.byDecade)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([decade, count]) => {
      report += `  ${decade}: ${count}\n`;
    });
  
  report += '\nBY STATUS:\n';
  report += '----------\n';
  Object.entries(stats.byStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      report += `  ${status}: ${count}\n`;
    });
  
  report += '\nPHOTO AVAILABILITY:\n';
  report += '-------------------\n';
  report += `  With Photos: ${stats.withPhotos}\n`;
  report += `  Without Photos: ${stats.withoutPhotos}\n`;
  report += `  Percentage with photos: ${((stats.withPhotos / stats.total) * 100).toFixed(1)}%\n`;
  
  return report;
}

// Run the export
exportVeteransToCSV();