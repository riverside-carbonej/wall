const admin = require('firebase-admin');
const path = require('path');

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function findNewAlumniWall() {
    console.log('🔍 Finding all alumni walls (sorted by creation date)...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get all walls
    const wallsSnapshot = await db.collection('walls').get();
    
    const alumniWalls = [];
    
    wallsSnapshot.docs.forEach(doc => {
        const wall = doc.data();
        
        // Check if it's alumni-related
        const nameCheck = wall.name?.toLowerCase().includes('alumni') || 
                         wall.name?.toLowerCase().includes('hall of fame');
        
        if (nameCheck) {
            alumniWalls.push({
                id: doc.id,
                name: wall.name,
                createdAt: wall.createdAt?.toDate?.() || new Date(0),
                timestamp: wall.createdAt?._seconds || 0,
                deletedAt: wall.deletedAt?.toDate?.() || null,
                isDeleted: wall.isDeleted || false,
                softDeleted: wall.softDeleted || false,
                published: wall.published,
                ownerId: wall.ownerId,
                objectTypes: wall.objectTypes,
                hasObjectTypes: !!wall.objectTypes,
                objectTypeCount: wall.objectTypes ? Object.keys(wall.objectTypes).length : 0
            });
        }
    });
    
    // Sort by creation date (newest first)
    alumniWalls.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('🎓 ALUMNI WALLS (newest first):');
    console.log('='*70);
    
    alumniWalls.forEach((wall, index) => {
        const isActive = !wall.isDeleted && !wall.softDeleted && !wall.deletedAt;
        const status = isActive ? '✅ ACTIVE' : '❌ DELETED';
        
        console.log(`\n${index + 1}. [${status}] "${wall.name}"`);
        console.log(`   ID: ${wall.id}`);
        console.log(`   Created: ${wall.createdAt.toISOString()}`);
        console.log(`   Owner: ${wall.ownerId || 'None'}`);
        console.log(`   Published: ${wall.published}`);
        console.log(`   Object Types: ${wall.objectTypeCount}`);
        
        if (wall.objectTypes && index === 0) { // Show details for newest
            console.log('\n   📋 OBJECT TYPE DETAILS:');
            Object.entries(wall.objectTypes).forEach(([id, type]) => {
                console.log(`   - ID: "${id}"`);
                console.log(`     Name: ${type.name}`);
                console.log(`     Fields type: ${Array.isArray(type.fields) ? 'ARRAY ❌' : 'OBJECT ✅'}`);
                if (type.fields) {
                    const fieldKeys = Array.isArray(type.fields) 
                        ? type.fields.map((f, i) => i) 
                        : Object.keys(type.fields);
                    console.log(`     Field count: ${fieldKeys.length}`);
                    console.log(`     Field IDs: ${fieldKeys.slice(0, 5).join(', ')}`);
                }
            });
        }
        
        if (index === 0 && isActive) {
            console.log('\n   🌟 THIS IS THE NEWEST ACTIVE ALUMNI WALL');
        }
    });
    
    // Find the newest active one
    const newestActive = alumniWalls.find(w => 
        !w.isDeleted && !w.softDeleted && !w.deletedAt
    );
    
    if (newestActive) {
        console.log('\n\n📍 NEWEST ACTIVE ALUMNI WALL:');
        console.log('='*70);
        console.log(`Wall: "${newestActive.name}"`);
        console.log(`ID: ${newestActive.id}`);
        console.log(`Created: ${newestActive.createdAt.toISOString()}`);
        
        // Check for items
        const itemsQuery = db.collection('wall-items').where('wallId', '==', newestActive.id);
        const itemsSnapshot = await itemsQuery.get();
        console.log(`\nWall Items: ${itemsSnapshot.size}`);
        
        if (itemsSnapshot.size > 0) {
            const sampleItem = itemsSnapshot.docs[0].data();
            console.log('\nSample item structure:');
            console.log(`  Name: ${sampleItem.name}`);
            console.log(`  Object Type ID: ${sampleItem.objectTypeId}`);
            console.log(`  Fields type: ${typeof sampleItem.fields}`);
            console.log(`  Field keys: ${Object.keys(sampleItem.fields || {}).join(', ')}`);
        }
    }
    
    return newestActive;
}

if (require.main === module) {
    findNewAlumniWall()
        .then(wall => {
            if (wall) {
                console.log(`\n✅ Found newest alumni wall: ${wall.id}`);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}