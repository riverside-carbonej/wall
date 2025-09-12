const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSampleItems() {
  try {
    const wallId = 'dzwsujrWYLvznCJElpri';
    const objectTypeId = 'ot_1757607682911_brfg8d3ft';
    
    console.log('🔍 CHECKING SAMPLE ITEMS IN DETAIL\n');
    
    // Get first 10 items to inspect their structure
    const itemsSnapshot = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('objectTypeId', '==', objectTypeId)
      .limit(10)
      .get();
    
    console.log(`Found ${itemsSnapshot.size} items to inspect:\n`);
    
    itemsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[${index + 1}] ${data.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Published: ${data.published}`);
      console.log(`   Created: ${data.createdAt?.toDate()}`);
      console.log(`   Fields:`, data.fields);
      console.log('   ─────────────────────');
    });
    
    // Check if there are "sample" items that might be overriding
    console.log('\n🔍 Looking for sample items...');
    const sampleItems = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('name', '>=', 'Sample')
      .where('name', '<=', 'Sample\uf8ff')
      .get();
    
    console.log(`Sample items found: ${sampleItems.size}`);
    sampleItems.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   • "${data.name}" (${doc.id})`);
    });
    
    // Check wall's field requirements vs our data
    const wallDoc = await db.collection('walls').doc(wallId).get();
    const wallData = wallDoc.data();
    const alumniObjectType = wallData.objectTypes.find(ot => ot.id === objectTypeId);
    
    console.log('\n📋 WALL FIELD REQUIREMENTS:');
    alumniObjectType.fields.forEach(field => {
      console.log(`   • ${field.name} (${field.id}): ${field.type}${field.required ? ' [REQUIRED]' : ''}`);
    });
    
    console.log('\n🔧 POTENTIAL ISSUES TO CHECK:');
    console.log('1. Are you logged in as jack.carbone@riversideschools.net?');
    console.log('2. Is the browser cache cleared?');
    console.log('3. Are there any JavaScript errors in browser console?');
    console.log('4. Is the wall URL exactly: /walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSampleItems();