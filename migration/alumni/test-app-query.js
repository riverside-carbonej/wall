const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testAppQuery() {
  try {
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    const objectTypeId = 'ot_1757607682911_brfg8d3ft';
    
    console.log('🔍 TESTING THE EXACT QUERY THE APP IS USING\n');
    
    // Test 1: Basic query (what app should be doing)
    console.log('Test 1: Basic query for wall items');
    const basicQuery = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    console.log(`  Results: ${basicQuery.size} items`);
    
    // Test 2: Query with object type filter
    console.log('\nTest 2: Query with objectTypeId filter');
    const filteredQuery = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .where('objectTypeId', '==', objectTypeId)
      .get();
    
    console.log(`  Results: ${filteredQuery.size} items`);
    
    // Test 3: Query with published filter
    console.log('\nTest 3: Query with published=true filter');
    const publishedQuery = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .where('objectTypeId', '==', objectTypeId)
      .where('published', '==', true)
      .get();
    
    console.log(`  Results: ${publishedQuery.size} items`);
    
    // Test 4: Query with limit (maybe app has a default limit?)
    console.log('\nTest 4: Query with limit(2)');
    const limitedQuery = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .where('objectTypeId', '==', objectTypeId)
      .limit(2)
      .get();
    
    console.log(`  Results: ${limitedQuery.size} items`);
    console.log('  👆 This matches what the app is seeing!');
    
    // Test 5: Check if there are Firestore security rules affecting this
    console.log('\nTest 5: Checking for potential query issues...');
    
    // Try to get items one by one to see if some are "hidden"
    const allItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .limit(10)
      .get();
    
    console.log('\nFirst 10 items details:');
    allItems.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  [${index + 1}] "${data.name}" - ${doc.id}`);
      console.log(`      Published: ${data.published}, ObjectType: ${data.objectTypeId}`);
    });
    
    // Test 6: Check if app might be using a different query structure
    console.log('\n🔍 POSSIBLE APP QUERY PATTERNS:');
    console.log('The app might be:');
    console.log('1. Using a limit() that we dont see in the logs');
    console.log('2. Using orderBy() which could affect results');
    console.log('3. Using startAfter() for pagination');
    console.log('4. Filtering by user permissions in the query');
    console.log('5. Using a compound query that limits results');
    
    // Test 7: Check if there are items with different object type IDs
    console.log('\nTest 7: Items with different object type IDs in this wall');
    const allWallItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    const objectTypes = new Set();
    allWallItems.forEach(doc => {
      objectTypes.add(doc.data().objectTypeId);
    });
    
    console.log(`  Found ${objectTypes.size} different object type IDs:`);
    Array.from(objectTypes).forEach(id => {
      console.log(`    - ${id}`);
    });
    
    if (objectTypes.size > 1) {
      console.log('  ⚠️  Multiple object types found! App might be filtering by the wrong one.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAppQuery();