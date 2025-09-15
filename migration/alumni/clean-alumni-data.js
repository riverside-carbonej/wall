const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanAlumniData() {
  try {
    console.log('Starting Alumni Data Cleanup...\n');
    
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    // Get all alumni items
    const items = await db.collection('wall_items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`Processing ${items.size} alumni records\n`);
    
    const cleanedData = [];
    const needsManualReview = [];
    let updateCount = 0;
    
    const batch = db.batch();
    
    items.docs.forEach(doc => {
      const item = doc.data();
      const fields = item.fieldData || {};
      const originalName = fields.name || '';
      
      let cleaned = {
        id: doc.id,
        originalName: originalName,
        cleanedName: '',
        firstName: '',
        lastName: '',
        classYear: '',
        title: '',
        nickname: '',
        deceased: false,
        needsReview: false,
        notes: []
      };
      
      // Pattern 1: Year + First Name (e.g., "1952 Doug")
      if (/^\d{4}\s+\w+$/.test(originalName)) {
        const match = originalName.match(/^(\d{4})\s+(.+)$/);
        if (match) {
          cleaned.classYear = match[1];
          cleaned.firstName = match[2];
          cleaned.cleanedName = match[2]; // Just first name for now
          cleaned.needsReview = true;
          cleaned.notes.push('Missing last name');
        }
      }
      // Pattern 2: Year + Name with nickname (e.g., '1967 Paul "Toby"')
      else if (/^\d{4}\s+.+"".*""/.test(originalName)) {
        const match = originalName.match(/^(\d{4})\s+(.+?)\s*""(.+?)""$/);
        if (match) {
          cleaned.classYear = match[1];
          cleaned.firstName = match[2];
          cleaned.nickname = match[3];
          cleaned.cleanedName = `${match[2]} "${match[3]}"`;
          cleaned.needsReview = true;
          cleaned.notes.push('Missing last name');
        }
      }
      // Pattern 3: Year + Title + Name (e.g., "1979 Dr. John")
      else if (/^\d{4}\s+Dr\.\s+/.test(originalName)) {
        const match = originalName.match(/^(\d{4})\s+Dr\.\s+(.+)$/);
        if (match) {
          cleaned.classYear = match[1];
          cleaned.title = 'Dr.';
          cleaned.firstName = match[2];
          cleaned.cleanedName = `Dr. ${match[2]}`;
          cleaned.needsReview = true;
          cleaned.notes.push('Missing last name');
        }
      }
      // Pattern 4: Year + Name with middle initial (e.g., "1995 Joshua D.")
      else if (/^\d{4}\s+.+\s+\w\.$/.test(originalName)) {
        const match = originalName.match(/^(\d{4})\s+(.+)$/);
        if (match) {
          cleaned.classYear = match[1];
          cleaned.firstName = match[2];
          cleaned.cleanedName = match[2];
          cleaned.needsReview = true;
          cleaned.notes.push('Missing last name');
        }
      }
      // Pattern 5: Coach Title (e.g., "Coach Frank")
      else if (/^Coach\s+/.test(originalName)) {
        const match = originalName.match(/^Coach\s+(.+?)(\s*""(.+?)"")?$/);
        if (match) {
          cleaned.title = 'Coach';
          cleaned.firstName = match[1];
          cleaned.nickname = match[3] || '';
          cleaned.cleanedName = match[3] ? `${match[1]} "${match[3]}"` : match[1];
          cleaned.needsReview = true;
          cleaned.notes.push('Missing last name');
        }
      }
      // Pattern 6: Coach/Year format (e.g., "Coach/1967 Don")
      else if (/^Coach\/\d{4}\s+/.test(originalName)) {
        const match = originalName.match(/^Coach\/(\d{4})\s+(.+)$/);
        if (match) {
          cleaned.classYear = match[1];
          cleaned.title = 'Coach';
          cleaned.firstName = match[2];
          cleaned.cleanedName = match[2];
          cleaned.needsReview = true;
          cleaned.notes.push('Missing last name');
        }
      }
      // Pattern 7: Name with asterisk (deceased) (e.g., "Al Porter*")
      else if (/\*$/.test(originalName)) {
        const cleanName = originalName.replace('*', '').trim();
        const parts = cleanName.split(' ');
        if (parts.length >= 2) {
          cleaned.firstName = parts[0];
          cleaned.lastName = parts.slice(1).join(' ');
          cleaned.cleanedName = cleanName;
          cleaned.deceased = true;
          cleaned.notes.push('Marked as deceased (*)');
        } else {
          cleaned.cleanedName = cleanName;
          cleaned.deceased = true;
          cleaned.needsReview = true;
          cleaned.notes.push('Marked as deceased (*), needs parsing');
        }
      }
      // Pattern 8: Full name (e.g., "Gretchen Reed")
      else if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(originalName)) {
        const parts = originalName.split(' ');
        cleaned.firstName = parts[0];
        cleaned.lastName = parts.slice(1).join(' ');
        cleaned.cleanedName = originalName;
      }
      // Pattern 9: Name with Jr., Sr., etc.
      else if (/,\s*(Jr\.|Sr\.|III|II|IV)/.test(originalName)) {
        const match = originalName.match(/^(.+?),\s*(.+)$/);
        if (match) {
          const namePart = match[1].replace('*', '').trim();
          const suffix = match[2];
          const parts = namePart.split(' ');
          cleaned.firstName = parts[0];
          cleaned.lastName = parts.slice(1).join(' ') + ', ' + suffix;
          cleaned.cleanedName = originalName.replace('*', '').trim();
          cleaned.deceased = originalName.includes('*');
        }
      }
      // Default: couldn't parse
      else {
        cleaned.cleanedName = originalName;
        cleaned.needsReview = true;
        cleaned.notes.push('Could not parse format');
      }
      
      // Update the record if we made changes
      if (cleaned.cleanedName !== originalName || cleaned.classYear) {
        const updates = {
          fieldData: {
            ...fields,
            name: cleaned.cleanedName,
            firstName: cleaned.firstName,
            lastName: cleaned.lastName,
            graduationYear: cleaned.classYear || fields.graduationYear || '',
            originalName: originalName
          }
        };
        
        if (cleaned.title) {
          updates.fieldData.title = cleaned.title;
        }
        if (cleaned.nickname) {
          updates.fieldData.nickname = cleaned.nickname;
        }
        if (cleaned.deceased) {
          updates.fieldData.deceased = 'true';
        }
        
        batch.update(doc.ref, updates);
        updateCount++;
      }
      
      cleanedData.push(cleaned);
      
      if (cleaned.needsReview) {
        needsManualReview.push(cleaned);
      }
    });
    
    // Commit updates
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Updated ${updateCount} records in Firestore\n`);
    }
    
    // Generate reports
    console.log('📊 Cleanup Statistics:');
    console.log(`- Total records: ${cleanedData.length}`);
    console.log(`- Successfully parsed: ${cleanedData.filter(d => !d.needsReview).length}`);
    console.log(`- Needs manual review: ${needsManualReview.length}`);
    console.log(`- Deceased markers found: ${cleanedData.filter(d => d.deceased).length}`);
    console.log(`- Has class year: ${cleanedData.filter(d => d.classYear).length}`);
    
    // Save cleaned data to CSV
    const csvLines = ['ID,Original Name,Cleaned Name,First Name,Last Name,Class Year,Title,Nickname,Deceased,Needs Review,Notes'];
    cleanedData.forEach(record => {
      csvLines.push([
        record.id,
        `"${record.originalName}"`,
        `"${record.cleanedName}"`,
        `"${record.firstName}"`,
        `"${record.lastName}"`,
        record.classYear,
        record.title,
        record.nickname,
        record.deceased,
        record.needsReview,
        `"${record.notes.join('; ')}"`
      ].join(','));
    });
    
    fs.writeFileSync('alumni-cleaned.csv', csvLines.join('\n'), 'utf8');
    console.log('\n✅ Saved cleaned data to alumni-cleaned.csv');
    
    // Save records needing review
    if (needsManualReview.length > 0) {
      const reviewLines = ['ID,Original Name,Issue'];
      needsManualReview.forEach(record => {
        reviewLines.push([
          record.id,
          `"${record.originalName}"`,
          `"${record.notes.join('; ')}"`
        ].join(','));
      });
      
      fs.writeFileSync('alumni-needs-review.csv', reviewLines.join('\n'), 'utf8');
      console.log(`✅ Saved ${needsManualReview.length} records needing review to alumni-needs-review.csv`);
    }
    
    console.log('\n📝 Sample records needing review:');
    needsManualReview.slice(0, 5).forEach(record => {
      console.log(`- ${record.originalName}: ${record.notes.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

cleanAlumniData();