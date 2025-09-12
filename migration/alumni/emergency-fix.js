const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function emergencyFix() {
  try {
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🚨 EMERGENCY DIAGNOSIS AND FIX\n');
    
    // 1. Fix wall ownership first
    console.log('1. Fixing wall ownership...');
    const wallDoc = await db.collection('walls').doc(wallId).get();
    const wallData = wallDoc.data();
    
    console.log(`Current owner: ${wallData.ownerId}`);
    console.log(`Current ownerEmail: ${wallData.ownerEmail}`);
    
    await db.collection('walls').doc(wallId).update({
      ownerId: 'jack.carbone@riversideschools.net',
      ownerEmail: 'jack.carbone@riversideschools.net',
      'permissions.owner': 'jack.carbone@riversideschools.net'
    });
    
    console.log('✅ Fixed ownership');
    
    // 2. Find and delete sample items
    console.log('\n2. Finding and deleting sample items...');
    const sampleQuery1 = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('name', '==', 'Sample Full Name 1')
      .get();
    
    const sampleQuery2 = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('name', '==', 'Sample Full Name 2')
      .get();
    
    let sampleCount = 0;
    const batch = db.batch();
    
    sampleQuery1.forEach(doc => {
      console.log(`   Deleting: ${doc.data().name}`);
      batch.delete(doc.ref);
      sampleCount++;
    });
    
    sampleQuery2.forEach(doc => {
      console.log(`   Deleting: ${doc.data().name}`);
      batch.delete(doc.ref);
      sampleCount++;
    });
    
    if (sampleCount > 0) {
      await batch.commit();
      console.log(`✅ Deleted ${sampleCount} sample items`);
    } else {
      console.log('No sample items found');
    }
    
    // 3. Check our imported items
    console.log('\n3. Checking imported alumni items...');
    const allItems = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .get();
    
    console.log(`Total items in wall: ${allItems.size}`);
    
    // Show breakdown by name pattern
    const names = new Set();
    const sampleItems = [];
    const realItems = [];
    
    allItems.forEach(doc => {
      const data = doc.data();
      names.add(data.name);
      
      if (data.name.startsWith('Sample')) {
        sampleItems.push(data.name);
      } else {
        realItems.push(data.name);
      }
    });
    
    console.log(`Sample items: ${sampleItems.length}`);
    console.log(`Real items: ${realItems.length}`);
    
    if (sampleItems.length > 0) {
      console.log('\nRemaining sample items:', sampleItems.slice(0, 5));
    }
    
    if (realItems.length > 0) {
      console.log('\nReal alumni items (first 5):', realItems.slice(0, 5));
    }
    
    // 4. Check if items have the correct published status
    console.log('\n4. Checking published status...');
    const unpublishedItems = await db.collection('wall-items')
      .where('wallId', '==', wallId)
      .where('published', '==', false)
      .get();
    
    if (unpublishedItems.size > 0) {
      console.log(`Found ${unpublishedItems.size} unpublished items - fixing...`);
      const publishBatch = db.batch();
      
      unpublishedItems.forEach(doc => {
        publishBatch.update(doc.ref, { published: true });
      });
      
      await publishBatch.commit();
      console.log('✅ Published all items');
    } else {
      console.log('All items are already published');
    }
    
    console.log('\n✅ Emergency fix complete!');
    console.log(`🔗 URL: /walls/${wallId}/preset/ot_1757607682911_brfg8d3ft/items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

emergencyFix();