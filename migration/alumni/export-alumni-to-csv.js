const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportAlumniToCSV() {
  try {
    console.log('Extracting all alumni data from Firestore...');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get all alumni items
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`Found ${items.size} alumni records`);
    
    // Extract and format data
    const alumniData = [];
    
    items.docs.forEach(doc => {
      const item = doc.data();
      const fields = item.fieldData || {};
      
      alumniData.push({
        id: doc.id,
        name: fields.name || '',
        graduationYear: fields.graduationYear || '',
        category: fields.category || '',
        degree: fields.degree || '',
        currentPosition: fields.currentPosition || '',
        email: fields.email || ''
      });
    });
    
    // Sort by name
    alumniData.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    // Create CSV content
    const headers = ['ID', 'Name', 'Graduation Year', 'Category', 'Degree', 'Current Position', 'Email'];
    const csvLines = [headers.join(',')];
    
    alumniData.forEach(alumni => {
      const row = [
        alumni.id,
        `"${alumni.name.replace(/"/g, '""')}"`,
        alumni.graduationYear,
        `"${alumni.category.replace(/"/g, '""')}"`,
        `"${alumni.degree.replace(/"/g, '""')}"`,
        `"${alumni.currentPosition.replace(/"/g, '""')}"`,
        alumni.email
      ];
      csvLines.push(row.join(','));
    });
    
    const csvContent = csvLines.join('\n');
    
    // Save to file
    const filename = 'alumni-export.csv';
    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`\n✅ Exported ${alumniData.length} alumni records to ${filename}`);
    
    // Show sample of data
    console.log('\nFirst 5 records:');
    alumniData.slice(0, 5).forEach(alumni => {
      console.log(`- ${alumni.name} (${alumni.graduationYear}) - ${alumni.category}`);
    });
    
    // Show data quality statistics
    console.log('\n📊 Data Quality Statistics:');
    const hasName = alumniData.filter(a => a.name).length;
    const hasYear = alumniData.filter(a => a.graduationYear).length;
    const hasCategory = alumniData.filter(a => a.category).length;
    const hasDegree = alumniData.filter(a => a.degree).length;
    const hasPosition = alumniData.filter(a => a.currentPosition).length;
    const hasEmail = alumniData.filter(a => a.email).length;
    
    console.log(`- Records with name: ${hasName}/${alumniData.length}`);
    console.log(`- Records with graduation year: ${hasYear}/${alumniData.length}`);
    console.log(`- Records with category: ${hasCategory}/${alumniData.length}`);
    console.log(`- Records with degree: ${hasDegree}/${alumniData.length}`);
    console.log(`- Records with current position: ${hasPosition}/${alumniData.length}`);
    console.log(`- Records with email: ${hasEmail}/${alumniData.length}`);
    
    // Category breakdown
    console.log('\n📂 Category Breakdown:');
    const categories = {};
    alumniData.forEach(a => {
      const cat = a.category || 'No Category';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`- ${cat}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

exportAlumniToCSV();