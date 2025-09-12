const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function diagnoseAddButtonIssue() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    const userId = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';
    
    console.log('🔍 DIAGNOSING WHY ADD BUTTON IS DISABLED\n');
    
    // Get wall data
    const wallDoc = await db.collection('walls').doc(alumniWallId).get();
    const wallData = wallDoc.data();
    
    console.log('📋 WALL PERMISSION CHECK:');
    console.log(`Wall Owner: ${wallData.ownerId}`);
    console.log(`User ID: ${userId}`);
    console.log(`Is Owner: ${wallData.ownerId === userId}`);
    console.log(`Published: ${wallData.published}`);
    console.log(`Requires Login: ${wallData.visibility?.requiresLogin}`);
    
    // Check object type configuration
    console.log('\n📋 OBJECT TYPE VALIDATION:');
    const objectType = wallData.objectTypes[0];
    console.log(`Object Type ID: ${objectType.id}`);
    console.log(`Object Type Name: ${objectType.name}`);
    console.log(`Is Active: ${objectType.isActive}`);
    
    // Check required fields
    console.log('\n📋 REQUIRED FIELDS CHECK:');
    const requiredFields = objectType.fields.filter(f => f.required);
    console.log(`Required fields: ${requiredFields.length}`);
    requiredFields.forEach(field => {
      console.log(`  • ${field.name} (${field.id}): ${field.type}`);
    });
    
    // Check if field definitions are complete
    console.log('\n📋 FIELD DEFINITION VALIDATION:');
    let fieldsValid = true;
    objectType.fields.forEach(field => {
      const hasId = !!field.id;
      const hasName = !!field.name;
      const hasType = !!field.type;
      
      console.log(`  Field "${field.name || 'UNNAMED'}": ID=${hasId}, Name=${hasName}, Type=${hasType}`);
      
      if (!hasId || !hasName || !hasType) {
        fieldsValid = false;
        console.log(`    ❌ INVALID FIELD - missing required properties`);
      }
    });
    
    console.log(`\nAll fields valid: ${fieldsValid}`);
    
    // Check for duplicate field IDs
    console.log('\n📋 DUPLICATE FIELD ID CHECK:');
    const fieldIds = objectType.fields.map(f => f.id);
    const uniqueFieldIds = new Set(fieldIds);
    
    if (fieldIds.length !== uniqueFieldIds.size) {
      console.log('❌ DUPLICATE FIELD IDs FOUND!');
      const duplicates = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
      console.log(`Duplicates: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log('✅ No duplicate field IDs');
    }
    
    // Check if there are circular references in relationships
    console.log('\n📋 RELATIONSHIP VALIDATION:');
    const relationships = objectType.relationships || [];
    console.log(`Relationships defined: ${relationships.length}`);
    
    if (relationships.length > 0) {
      relationships.forEach((rel, index) => {
        console.log(`  [${index}] ${rel.name}: ${rel.targetObjectTypeId}`);
      });
    }
    
    // Check for common issues that disable Add button
    console.log('\n🚨 POTENTIAL ISSUES:');
    const issues = [];
    
    if (wallData.ownerId !== userId) {
      issues.push('User is not the wall owner');
    }
    
    if (!wallData.published) {
      issues.push('Wall is not published');
    }
    
    if (!objectType.isActive) {
      issues.push('Object type is not active');
    }
    
    if (!fieldsValid) {
      issues.push('Invalid field definitions');
    }
    
    if (fieldIds.length !== uniqueFieldIds.size) {
      issues.push('Duplicate field IDs');
    }
    
    if (requiredFields.length === 0) {
      issues.push('No required fields defined (unusual)');
    }
    
    // Check if the object type structure is corrupted
    const objectTypeStr = JSON.stringify(objectType);
    if (objectTypeStr.includes('undefined') || objectTypeStr.includes('null')) {
      issues.push('Object type contains null/undefined values');
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious issues found');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    // Final diagnosis
    console.log('\n💡 DIAGNOSIS:');
    if (issues.length > 0) {
      console.log('The Add button is likely disabled due to the issues above.');
      console.log('This same issue might be causing the item display problem.');
    } else {
      console.log('No obvious backend issues found.');
      console.log('The problem might be:');
      console.log('1. Frontend JavaScript error');
      console.log('2. Firestore security rules blocking writes');
      console.log('3. App logic issue with this specific wall');
      console.log('4. Browser console should show the exact error');
    }
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Check browser console for JavaScript errors when clicking Add');
    console.log('2. Try creating a completely fresh alumni wall');
    console.log('3. Compare this wall with a working veterans wall structure');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnoseAddButtonIssue();