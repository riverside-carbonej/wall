const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Wall IDs
const VETERAN_WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d'; // From the wall-of-honor README
const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
    
    console.log('🔥 Firebase Admin SDK initialized');
}

async function examineWallStructure(wallId, wallName) {
    console.log(`\n📊 Examining ${wallName} (${wallId}):`);
    
    const db = admin.firestore();
    
    // Get wall document
    const wallDoc = await db.collection('walls').doc(wallId).get();
    if (!wallDoc.exists) {
        console.log(`❌ Wall ${wallId} not found`);
        return null;
    }
    
    const wallData = wallDoc.data();
    console.log(`✅ Wall: "${wallData.name}"`);
    
    // Check object types
    if (wallData.objectTypes) {
        console.log(`📋 Object Types (${Object.keys(wallData.objectTypes).length}):`);
        Object.entries(wallData.objectTypes).forEach(([id, objType]) => {
            console.log(`  - ${id}: "${objType.name}" (${objType.icon || 'no icon'})`);
            if (objType.fields) {
                console.log(`    Fields: ${Object.keys(objType.fields).length}`);
                Object.entries(objType.fields).forEach(([fieldId, field]) => {
                    console.log(`      - ${fieldId}: ${field.name} (${field.type})`);
                });
            }
        });
    } else {
        console.log('❌ No object types found');
    }
    
    // Check wall items
    const itemsQuery = db.collection('wall-items').where('wallId', '==', wallId).limit(5);
    const itemsSnapshot = await itemsQuery.get();
    
    console.log(`📦 Wall Items: ${itemsSnapshot.size} (showing first 5)`);
    itemsSnapshot.docs.forEach((doc, index) => {
        const item = doc.data();
        console.log(`  ${index + 1}. ${item.name || 'Unnamed'}`);
        console.log(`     Object Type: ${item.objectTypeId || 'MISSING'}`);
        console.log(`     Fields: ${item.fields ? Object.keys(item.fields).length : 0}`);
        if (item.fields) {
            Object.entries(item.fields).slice(0, 3).forEach(([key, value]) => {
                console.log(`       - ${key}: ${typeof value === 'string' ? value.substring(0, 50) : value}${typeof value === 'string' && value.length > 50 ? '...' : ''}`);
            });
        }
    });
    
    return wallData;
}

async function debugWallStructures() {
    try {
        initializeFirebase();
        
        // Examine veteran wall structure (READ ONLY)
        console.log('🔍 Reading veteran wall structure for reference...');
        const veteranWall = await examineWallStructure(VETERAN_WALL_ID, 'Veteran Wall');
        
        // Examine alumni wall structure
        console.log('\n🔍 Examining current alumni wall structure...');
        const alumniWall = await examineWallStructure(ALUMNI_WALL_ID, 'Alumni Wall');
        
        // Compare and analyze
        console.log('\n📊 ANALYSIS:');
        if (veteranWall?.objectTypes && alumniWall?.objectTypes) {
            console.log('✅ Both walls have object types');
            
            const veteranTypes = Object.keys(veteranWall.objectTypes);
            const alumniTypes = Object.keys(alumniWall.objectTypes);
            
            console.log(`Veteran wall object types: ${veteranTypes.join(', ')}`);
            console.log(`Alumni wall object types: ${alumniTypes.join(', ')}`);
        } else {
            console.log('❌ Missing object types on one or both walls');
            if (!veteranWall?.objectTypes) console.log('  - Veteran wall missing object types');
            if (!alumniWall?.objectTypes) console.log('  - Alumni wall missing object types');
        }
        
        console.log('\n💡 Next steps:');
        console.log('1. Check if alumni wall items have correct objectTypeId');
        console.log('2. Verify alumni wall has proper object types defined');
        console.log('3. Update import script to use correct object type structure');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        throw error;
    }
}

if (require.main === module) {
    debugWallStructures()
        .then(() => {
            console.log('\n✅ Wall structure debugging completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugWallStructures };