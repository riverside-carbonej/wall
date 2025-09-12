const admin = require('firebase-admin');
const path = require('path');

const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';
const SAMPLE_ITEM_IDS = ['m8DHn3JChuYaFWpaD2E3', 'jaPTtTFB4ztlKXdCZUgp'];

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function investigateItems() {
    console.log('🔍 Investigating specific items and wall structure...');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Check the specific sample items
    console.log('\n📋 Checking specific sample items:');
    for (const itemId of SAMPLE_ITEM_IDS) {
        const doc = await db.collection('wall-items').doc(itemId).get();
        if (doc.exists) {
            const item = doc.data();
            console.log(`\n✅ Found item ${itemId}:`);
            console.log(`  Name: ${item.name}`);
            console.log(`  Wall ID: ${item.wallId}`);
            console.log(`  Object Type ID: ${item.objectTypeId}`);
            console.log(`  Published: ${item.published}`);
            console.log(`  Created: ${item.createdAt?.toDate?.() || item.createdAt}`);
            console.log(`  Fields:`, JSON.stringify(item.fields, null, 2));
        } else {
            console.log(`❌ Item ${itemId} not found`);
        }
    }
    
    // Get all items for the alumni wall and analyze
    console.log('\n📊 Analyzing all alumni wall items:');
    const allItemsQuery = db.collection('wall-items').where('wallId', '==', ALUMNI_WALL_ID);
    const snapshot = await allItemsQuery.get();
    
    console.log(`Total items: ${snapshot.size}`);
    
    // Group by creation time to see if there are different batches
    const itemsByDate = {};
    const itemsByObjectType = {};
    
    snapshot.docs.forEach(doc => {
        const item = doc.data();
        const createdDate = item.createdAt?.toDate?.();
        const dateKey = createdDate ? createdDate.toISOString().split('T')[0] : 'unknown';
        
        if (!itemsByDate[dateKey]) {
            itemsByDate[dateKey] = [];
        }
        itemsByDate[dateKey].push({
            id: doc.id,
            name: item.name,
            objectTypeId: item.objectTypeId
        });
        
        const objTypeKey = item.objectTypeId || 'none';
        if (!itemsByObjectType[objTypeKey]) {
            itemsByObjectType[objTypeKey] = 0;
        }
        itemsByObjectType[objTypeKey]++;
    });
    
    console.log('\nItems by creation date:');
    Object.entries(itemsByDate).forEach(([date, items]) => {
        console.log(`  ${date}: ${items.length} items`);
        if (items.length <= 5) {
            items.forEach(item => {
                console.log(`    - ${item.name} (${item.id}) [Type: ${item.objectTypeId}]`);
            });
        }
    });
    
    console.log('\nItems by object type:');
    Object.entries(itemsByObjectType).forEach(([type, count]) => {
        console.log(`  Type "${type}": ${count} items`);
    });
    
    // Delete the sample items if they exist
    console.log('\n🗑️  Deleting sample items...');
    for (const itemId of SAMPLE_ITEM_IDS) {
        try {
            await db.collection('wall-items').doc(itemId).delete();
            console.log(`  ✅ Deleted ${itemId}`);
        } catch (error) {
            console.log(`  ❌ Could not delete ${itemId}: ${error.message}`);
        }
    }
    
    console.log('\n✅ Investigation complete!');
}

if (require.main === module) {
    investigateItems()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}