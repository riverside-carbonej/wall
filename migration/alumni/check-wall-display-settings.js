const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWallDisplaySettings() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🔍 CHECKING WALL DISPLAY/PAGINATION SETTINGS\n');
    
    // Get the full wall document
    const wallDoc = await db.collection('walls').doc(alumniWallId).get();
    const wallData = wallDoc.data();
    
    console.log('📋 COMPLETE WALL DOCUMENT STRUCTURE:\n');
    console.log(JSON.stringify(wallData, null, 2));
    
    console.log('\n🔍 LOOKING FOR PAGINATION/DISPLAY SETTINGS:');
    
    // Check for any settings that might limit display
    const suspiciousFields = [
      'pageSize', 'itemsPerPage', 'limit', 'maxItems', 'displayLimit',
      'pagination', 'displaySettings', 'viewSettings', 'itemLimit',
      'defaultLimit', 'queryLimit'
    ];
    
    const foundSettings = {};
    
    function searchObject(obj, path = '') {
      for (const [key, value] of Object.entries(obj || {})) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (suspiciousFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          foundSettings[fullPath] = value;
        }
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          searchObject(value, fullPath);
        }
      }
    }
    
    searchObject(wallData);
    
    if (Object.keys(foundSettings).length > 0) {
      console.log('\n⚠️  FOUND POTENTIAL LIMITING SETTINGS:');
      Object.entries(foundSettings).forEach(([path, value]) => {
        console.log(`  ${path}: ${JSON.stringify(value)}`);
      });
    } else {
      console.log('\n✅ No obvious pagination/limit settings found in wall document');
    }
    
    // Check the objectType displaySettings specifically
    console.log('\n🔍 OBJECT TYPE DISPLAY SETTINGS:');
    if (wallData.objectTypes && Array.isArray(wallData.objectTypes)) {
      wallData.objectTypes.forEach((ot, index) => {
        console.log(`\n  ObjectType [${index}]: ${ot.name}`);
        console.log(`    ID: ${ot.id}`);
        
        if (ot.displaySettings) {
          console.log(`    Display Settings:`);
          console.log(JSON.stringify(ot.displaySettings, null, 6));
          
          // Look for any limit-related settings
          const displayStr = JSON.stringify(ot.displaySettings).toLowerCase();
          if (displayStr.includes('limit') || displayStr.includes('page') || displayStr.includes('2')) {
            console.log(`    ⚠️  POTENTIAL ISSUE: DisplaySettings contains limit/page/2`);
          }
        } else {
          console.log(`    Display Settings: None`);
        }
      });
    }
    
    // Also check if there are any array fields that might be truncated
    console.log('\n🔍 CHECKING FOR TRUNCATED ARRAYS:');
    
    function checkArrays(obj, path = '') {
      for (const [key, value] of Object.entries(obj || {})) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (Array.isArray(value)) {
          console.log(`  ${fullPath}: Array with ${value.length} items`);
          if (value.length === 2) {
            console.log(`    ⚠️  This array has exactly 2 items - might be related!`);
          }
        } else if (typeof value === 'object' && value !== null) {
          checkArrays(value, fullPath);
        }
      }
    }
    
    checkArrays(wallData);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWallDisplaySettings();