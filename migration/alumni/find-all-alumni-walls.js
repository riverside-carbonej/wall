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

async function findAllAlumniWalls() {
    console.log('🔍 Finding all alumni-related walls...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get all walls
    const wallsSnapshot = await db.collection('walls').get();
    
    console.log(`📊 Total walls in database: ${wallsSnapshot.size}\n`);
    
    const alumniWalls = [];
    const allWalls = [];
    
    wallsSnapshot.docs.forEach(doc => {
        const wall = doc.data();
        const wallInfo = {
            id: doc.id,
            name: wall.name || 'Unnamed',
            createdAt: wall.createdAt?.toDate?.() || 'Unknown',
            deletedAt: wall.deletedAt?.toDate?.() || null,
            isDeleted: wall.isDeleted || false,
            softDeleted: wall.softDeleted || false,
            published: wall.published,
            ownerId: wall.ownerId,
            objectTypes: wall.objectTypes ? Object.keys(wall.objectTypes).length : 0,
            objectTypeIds: wall.objectTypes ? Object.keys(wall.objectTypes) : [],
            objectTypeDetails: wall.objectTypes || {},
            hasFields: wall.fields && wall.fields.length > 0
        };
        
        allWalls.push(wallInfo);
        
        // Check if it's alumni-related
        const nameCheck = wall.name?.toLowerCase().includes('alumni') || 
                         wall.name?.toLowerCase().includes('hall of fame');
        
        if (nameCheck) {
            alumniWalls.push(wallInfo);
        }
    });
    
    console.log('🎓 ALUMNI-RELATED WALLS:');
    console.log('='*60);
    
    alumniWalls.forEach((wall, index) => {
        console.log(`\n${index + 1}. "${wall.name}" (ID: ${wall.id})`);
        console.log(`   Created: ${wall.createdAt}`);
        console.log(`   Deleted: ${wall.deletedAt || 'Not deleted'}`);
        console.log(`   Soft Deleted: ${wall.softDeleted}`);
        console.log(`   Is Deleted: ${wall.isDeleted}`);
        console.log(`   Published: ${wall.published}`);
        console.log(`   Owner ID: ${wall.ownerId || 'None'}`);
        console.log(`   Object Types: ${wall.objectTypes}`);
        console.log(`   Object Type IDs: ${wall.objectTypeIds.join(', ') || 'None'}`);
        
        // Show object type details
        if (wall.objectTypeDetails && Object.keys(wall.objectTypeDetails).length > 0) {
            console.log('   Object Type Details:');
            Object.entries(wall.objectTypeDetails).forEach(([id, type]) => {
                console.log(`     - "${id}": ${type.name} (${type.fields ? type.fields.length : 0} fields)`);
                if (type.fields && type.fields.length > 0) {
                    console.log(`       Fields: ${Object.keys(type.fields).join(', ')}`);
                }
            });
        }
    });
    
    // Find the active Alumni Hall of Fame wall
    const activeAlumniWall = alumniWalls.find(w => 
        w.name === 'Alumni Hall of Fame' && 
        !w.isDeleted && 
        !w.softDeleted &&
        !w.deletedAt
    );
    
    console.log('\n\n🎯 ACTIVE ALUMNI WALL:');
    console.log('='*60);
    
    if (activeAlumniWall) {
        console.log(`Wall: "${activeAlumniWall.name}"`);
        console.log(`ID: ${activeAlumniWall.id}`);
        console.log(`Created: ${activeAlumniWall.createdAt}`);
        console.log(`Object Types: ${activeAlumniWall.objectTypeIds.join(', ')}`);
        
        // Check for wall items
        const itemsQuery = db.collection('wall-items').where('wallId', '==', activeAlumniWall.id);
        const itemsSnapshot = await itemsQuery.get();
        console.log(`\nWall Items: ${itemsSnapshot.size}`);
        
        // Check why Add might be disabled
        console.log('\n🔍 CHECKING WALL CONFIGURATION:');
        
        if (!activeAlumniWall.objectTypes || activeAlumniWall.objectTypes === 0) {
            console.log('❌ No object types defined - this would disable Add button!');
        } else {
            console.log(`✅ Has ${activeAlumniWall.objectTypes} object type(s)`);
            
            // Check if object types have required fields
            Object.entries(activeAlumniWall.objectTypeDetails).forEach(([id, type]) => {
                console.log(`\nObject Type "${id}" (${type.name}):`);
                if (!type.fields || Object.keys(type.fields).length === 0) {
                    console.log('  ❌ No fields defined!');
                } else {
                    const requiredFields = [];
                    Object.entries(type.fields).forEach(([fieldId, field]) => {
                        if (field.required) {
                            requiredFields.push(`${fieldId}: ${field.name}`);
                        }
                    });
                    
                    if (requiredFields.length > 0) {
                        console.log(`  ⚠️  Has ${requiredFields.length} required field(s):`);
                        requiredFields.forEach(f => console.log(`    - ${f}`));
                    } else {
                        console.log('  ✅ No required fields');
                    }
                }
                
                // Check display configuration
                console.log(`  Display Name Field: ${type.displayNameField || 'Not set'}`);
                console.log(`  Card Fields: ${type.cardFields ? type.cardFields.join(', ') : 'Not set'}`);
            });
        }
        
        // Check the URL preset issue
        const wallTimestamp = new Date(activeAlumniWall.createdAt).getTime();
        console.log('\n🌐 URL PRESET ANALYSIS:');
        console.log(`Wall created timestamp: ${wallTimestamp}`);
        console.log(`Expected object type pattern: ot_${wallTimestamp}_*`);
        console.log(`Actual object type IDs: ${activeAlumniWall.objectTypeIds.join(', ')}`);
        
        if (!activeAlumniWall.objectTypeIds.some(id => id.startsWith('ot_'))) {
            console.log('❌ Object type IDs don\'t follow expected pattern (ot_timestamp_random)');
            console.log('   This causes the preset URL mismatch!');
        }
        
    } else {
        console.log('❌ No active Alumni Hall of Fame wall found!');
    }
    
    return activeAlumniWall;
}

if (require.main === module) {
    findAllAlumniWalls()
        .then(wall => {
            if (wall) {
                console.log(`\n\n✅ Found active alumni wall: ${wall.id}`);
            } else {
                console.log('\n\n❌ No active alumni wall found');
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}