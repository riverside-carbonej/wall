const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkItemValidity() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    const objectTypeId = 'ot_1757607682911_brfg8d3ft';
    
    console.log('🔍 CHECKING WHY 162 ITEMS EXIST BUT DONT DISPLAY\n');
    
    // Get wall structure
    const wallDoc = await db.collection('walls').doc(alumniWallId).get();
    const wallData = wallDoc.data();
    const objectType = wallData.objectTypes[0];
    
    console.log('📋 Wall Object Type Structure:');
    console.log(`Name: ${objectType.name}`);
    console.log(`ID: ${objectType.id}`);
    console.log('Required fields:');
    objectType.fields.forEach(field => {
      console.log(`  • ${field.name} (${field.id}): ${field.type}${field.required ? ' [REQUIRED]' : ''}`);
    });
    
    // Get sample alumni items
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .where('objectTypeId', '==', objectTypeId)
      .limit(10)
      .get();
    
    console.log(`\n📊 Found ${itemsSnapshot.size} items to analyze`);
    
    // Check each item for validation issues
    const issues = {
      missingRequiredFields: [],
      invalidFieldTypes: [],
      missingFields: [],
      validItems: []
    };
    
    itemsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const fields = data.fields || {};
      
      console.log(`\n[${index + 1}] "${data.name}" (${doc.id}):`);
      console.log(`   Published: ${data.published}`);
      console.log(`   ObjectTypeId: ${data.objectTypeId}`);
      console.log(`   Fields:`, JSON.stringify(fields, null, 4));
      
      let hasIssues = false;
      
      // Check required fields
      objectType.fields.forEach(fieldDef => {
        if (fieldDef.required) {
          const fieldValue = fields[fieldDef.id];
          if (!fieldValue && fieldValue !== 0) {
            console.log(`   ❌ Missing required field: ${fieldDef.name} (${fieldDef.id})`);
            issues.missingRequiredFields.push({item: data.name, field: fieldDef.name});
            hasIssues = true;
          }
        }
        
        // Check field types
        const fieldValue = fields[fieldDef.id];
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          if (fieldDef.type === 'number' && typeof fieldValue !== 'number') {
            console.log(`   ❌ Invalid type for ${fieldDef.name}: expected number, got ${typeof fieldValue}`);
            issues.invalidFieldTypes.push({item: data.name, field: fieldDef.name, expected: fieldDef.type, actual: typeof fieldValue});
            hasIssues = true;
          }
        }
      });
      
      if (!hasIssues) {
        issues.validItems.push(data.name);
      }
    });
    
    console.log('\n📈 VALIDATION SUMMARY:');
    console.log(`Valid items: ${issues.validItems.length}`);
    console.log(`Items with missing required fields: ${issues.missingRequiredFields.length}`);
    console.log(`Items with invalid field types: ${issues.invalidFieldTypes.length}`);
    
    if (issues.missingRequiredFields.length > 0 || issues.invalidFieldTypes.length > 0) {
      console.log('\n🚨 POTENTIAL CAUSE:');
      console.log('The app might be filtering out items that fail validation!');
      console.log('Items with validation errors may not display in the UI.');
    }
    
    // Check if there are sample items that might be overriding
    console.log('\n🔍 Checking for sample/default items...');
    const sampleItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .limit(20)
      .get();
    
    const sampleFound = [];
    sampleItems.docs.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toLowerCase().includes('sample')) {
        sampleFound.push(data.name);
      }
    });
    
    if (sampleFound.length > 0) {
      console.log('❌ Found sample items that might be interfering:');
      sampleFound.forEach(name => console.log(`  • ${name}`));
    } else {
      console.log('✅ No sample items found');
    }
    
    // Final recommendation
    console.log('\n💡 NEXT STEPS:');
    if (issues.missingRequiredFields.length > 0 || issues.invalidFieldTypes.length > 0) {
      console.log('1. Fix field validation issues in the database');
      console.log('2. Make sure all required fields have values');
      console.log('3. Ensure number fields contain actual numbers, not strings');
    } else {
      console.log('1. Items look valid - issue might be in app frontend');
      console.log('2. Check browser console for JavaScript errors');
      console.log('3. Try clearing browser cache completely');
      console.log('4. Check if app is filtering by user permissions');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkItemValidity();