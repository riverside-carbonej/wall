const admin = require('firebase-admin');
const path = require('path');

const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function checkAllWallItems() {
    console.log('🔍 Checking ALL wall items for alumni wall...');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get ALL wall items for this wall
    const itemsQuery = db.collection('wall-items').where('wallId', '==', ALUMNI_WALL_ID);
    const snapshot = await itemsQuery.get();
    
    console.log(`📊 Found ${snapshot.size} total wall items`);
    
    const itemsByType = {};
    const sampleItems = [];
    
    snapshot.docs.forEach((doc) => {
        const item = doc.data();
        const objectType = item.objectTypeId || 'NO_OBJECT_TYPE';
        
        if (!itemsByType[objectType]) {
            itemsByType[objectType] = 0;
        }
        itemsByType[objectType]++;
        
        if (sampleItems.length < 10) {
            sampleItems.push({
                id: doc.id,
                name: item.name,
                objectTypeId: item.objectTypeId,
                published: item.published,
                fields: item.fields ? Object.keys(item.fields).length : 0,
                field0: item.fields?.[0] || item.fields?.['0'] || 'N/A',
                createdAt: item.createdAt?.toDate?.() || item.createdAt
            });
        }
    });
    
    console.log('\n📈 Items by Object Type:');
    Object.entries(itemsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} items`);
    });
    
    console.log('\n📋 Sample items:');
    sampleItems.forEach((item, index) => {
        console.log(`${index + 1}. "${item.name}" (ID: ${item.id})`);
        console.log(`   Object Type: ${item.objectTypeId || 'MISSING'}`);
        console.log(`   Published: ${item.published}`);
        console.log(`   Fields: ${item.fields}, Field 0: "${item.field0}"`);
        console.log(`   Created: ${item.createdAt}`);
        console.log('');
    });
    
    // Check if we can find our imported alumni
    const ourItems = snapshot.docs.filter(doc => {
        const item = doc.data();
        return item.fields?._original || (item.fields?.['2'] && ['Alumni', 'Athlete', 'Faculty & Staff', 'Athletic Coach'].includes(item.fields['2']));
    });
    
    console.log(`🎯 Our imported alumni items: ${ourItems.length}`);
    if (ourItems.length > 0) {
        console.log('Sample of our items:');
        ourItems.slice(0, 3).forEach((doc, index) => {
            const item = doc.data();
            console.log(`  ${index + 1}. ${item.name} - Category: ${item.fields?.['2'] || 'Unknown'}`);
        });
    }
    
    return {
        total: snapshot.size,
        itemsByType,
        ourItemsCount: ourItems.length
    };
}

if (require.main === module) {
    checkAllWallItems()
        .then(result => {
            console.log(`\n✅ Check completed! Total: ${result.total}, Our items: ${result.ourItemsCount}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Check failed:', error);
            process.exit(1);
        });
}