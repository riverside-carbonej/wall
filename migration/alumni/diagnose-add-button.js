const admin = require('firebase-admin');
const path = require('path');

const NEW_WALL_ID = 'dzwsujrWYLvznCJElpri';

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function diagnoseAddButton() {
    console.log('🔍 DIAGNOSING WHY ADD BUTTON IS DISABLED...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get the new wall
    const wallRef = db.collection('walls').doc(NEW_WALL_ID);
    const wallDoc = await wallRef.get();
    const wallData = wallDoc.data();
    
    console.log('📋 WALL INFO:');
    console.log(`Name: ${wallData.name}`);
    console.log(`ID: ${NEW_WALL_ID}`);
    console.log(`Owner: ${wallData.permissions?.owner || 'NONE'}`);
    console.log(`Published: ${wallData.visibility?.isPublished}`);
    console.log(`Requires Login: ${wallData.visibility?.requiresLogin}`);
    
    // Check the object types
    console.log('\n📦 OBJECT TYPES:');
    if (Array.isArray(wallData.objectTypes)) {
        console.log(`Count: ${wallData.objectTypes.length}`);
        wallData.objectTypes.forEach(ot => {
            console.log(`  - ${ot.id}: ${ot.name}`);
            console.log(`    Wall ID in object type: ${ot.wallId}`);
            console.log(`    Wall ID matches: ${ot.wallId === NEW_WALL_ID}`);
        });
    }
    
    // Check user permissions
    console.log('\n👤 USER PERMISSIONS:');
    const ownerUserId = wallData.permissions?.owner;
    if (ownerUserId) {
        const userDoc = await db.collection('users').doc(ownerUserId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log(`Owner User: ${userData.email} (${userData.displayName})`);
            console.log(`Owner ID: ${ownerUserId}`);
        } else {
            console.log(`❌ Owner user ${ownerUserId} not found in users collection!`);
        }
    }
    
    console.log(`\nEditors: ${wallData.permissions?.editors?.join(', ') || 'None'}`);
    console.log(`Managers: ${wallData.permissions?.managers?.join(', ') || 'None'}`);
    
    // Check for preset URL issues
    console.log('\n🌐 PRESET URL ANALYSIS:');
    const objectTypeId = wallData.objectTypes?.[0]?.id;
    console.log(`Object Type ID: ${objectTypeId}`);
    console.log(`Expected URL format: /walls/${NEW_WALL_ID}/preset/${objectTypeId}/items`);
    
    // Possible issues
    console.log('\n❓ POSSIBLE ISSUES FOR DISABLED ADD BUTTON:');
    
    const issues = [];
    
    if (!wallData.permissions?.owner) {
        issues.push('No owner set for the wall');
    }
    
    if (!wallData.visibility?.isPublished) {
        issues.push('Wall is not published');
    }
    
    if (wallData.visibility?.requiresLogin) {
        issues.push('Wall requires login - user might not be logged in');
    }
    
    if (!wallData.objectTypes || wallData.objectTypes.length === 0) {
        issues.push('No object types defined');
    }
    
    if (wallData.objectTypes?.[0]?.wallId !== NEW_WALL_ID) {
        issues.push('Object type wallId does not match the actual wall ID');
    }
    
    // Check for required fields that might block the form
    if (wallData.objectTypes?.[0]?.fields) {
        const requiredFields = wallData.objectTypes[0].fields.filter(f => f.required);
        if (requiredFields.length > 0) {
            console.log('\n⚠️  REQUIRED FIELDS (must be filled to enable save):');
            requiredFields.forEach(field => {
                console.log(`  - ${field.name} (${field.type})`);
            });
        }
    }
    
    if (issues.length > 0) {
        console.log('\n❌ Issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
        console.log('✅ No obvious issues found');
        console.log('\n💡 The Add button might be disabled because:');
        console.log('1. You\'re not logged in as the owner (jack.carbone@riversideschools.net)');
        console.log('2. You\'re using a different account than the one that created the wall');
        console.log('3. The preset URL doesn\'t match the object type ID');
        console.log('4. Browser cache issues');
    }
    
    // Check all users to see who could edit
    console.log('\n👥 USERS WHO CAN EDIT THIS WALL:');
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.docs.forEach(doc => {
        const user = doc.data();
        const canEdit = 
            doc.id === wallData.permissions?.owner ||
            wallData.permissions?.editors?.includes(doc.id) ||
            wallData.permissions?.managers?.includes(doc.id);
        
        if (canEdit) {
            console.log(`  ✅ ${user.email} (${doc.id})`);
        }
    });
}

if (require.main === module) {
    diagnoseAddButton()
        .then(() => {
            console.log('\n✅ Diagnosis complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Diagnosis failed:', error);
            process.exit(1);
        });
}