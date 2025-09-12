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

async function fixWallAccess() {
    console.log('🔧 Fixing wall access and visibility...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Get the wall
    const wallRef = db.collection('walls').doc(ALUMNI_WALL_ID);
    const wallDoc = await wallRef.get();
    
    if (!wallDoc.exists) {
        throw new Error('Wall not found!');
    }
    
    const wallData = wallDoc.data();
    console.log(`Wall: "${wallData.name}"`);
    console.log(`Current owner: ${wallData.ownerId || 'None'}`);
    console.log(`Current visibility:`, wallData.visibility);
    console.log(`Published: ${wallData.published}`);
    
    // Find a user to set as owner (get the first user in the system)
    console.log('\n🔍 Finding a user to set as owner...');
    const usersSnapshot = await db.collection('users').limit(5).get();
    
    if (usersSnapshot.empty) {
        console.log('❌ No users found in the system!');
        console.log('Making the wall public instead...');
        
        // Make it fully public without an owner
        await wallRef.update({
            published: true,
            visibility: {
                type: 'public',
                requiresAuth: false
            },
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        console.log('✅ Wall set to public access (no authentication required)');
    } else {
        // List available users
        console.log('Available users:');
        const users = [];
        usersSnapshot.docs.forEach((doc, index) => {
            const user = doc.data();
            users.push({
                id: doc.id,
                email: user.email || 'No email',
                displayName: user.displayName || 'No name'
            });
            console.log(`  ${index + 1}. ${user.email || 'No email'} (${user.displayName || 'No name'}) - ID: ${doc.id}`);
        });
        
        // Use the first user as owner
        const owner = users[0];
        console.log(`\n📝 Setting owner to: ${owner.email} (${owner.id})`);
        
        // Update the wall with owner and proper visibility
        await wallRef.update({
            ownerId: owner.id,
            published: true,
            visibility: {
                type: 'public',
                requiresAuth: false
            },
            permissions: {
                owners: [owner.id],
                editors: [owner.id],
                viewers: []
            },
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        console.log('✅ Wall ownership and visibility fixed!');
        console.log(`  Owner: ${owner.email}`);
        console.log(`  Published: true`);
        console.log(`  Visibility: public (no auth required)`);
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying access...');
    const verifyDoc = await wallRef.get();
    const verifyData = verifyDoc.data();
    
    console.log('Current settings:');
    console.log(`  Owner: ${verifyData.ownerId || 'None'}`);
    console.log(`  Published: ${verifyData.published}`);
    console.log(`  Visibility:`, verifyData.visibility);
    
    // Get the correct object type ID for URLs
    const objectTypeId = Object.keys(verifyData.objectTypes || {})[0];
    
    console.log('\n📋 ACCESS URLS:');
    console.log('='*60);
    console.log('Public wall view:');
    console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}`);
    
    if (objectTypeId) {
        console.log('\nView all alumni:');
        console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}/preset/${objectTypeId}/items`);
        
        console.log('\nAdd new alumni (requires login):');
        console.log(`https://rlswall.app/walls/${ALUMNI_WALL_ID}/preset/${objectTypeId}/items/add`);
    }
    
    return {
        wallId: ALUMNI_WALL_ID,
        ownerId: verifyData.ownerId,
        published: verifyData.published,
        visibility: verifyData.visibility
    };
}

if (require.main === module) {
    fixWallAccess()
        .then(result => {
            console.log('\n✅ Wall access fixed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed to fix access:', error);
            process.exit(1);
        });
}