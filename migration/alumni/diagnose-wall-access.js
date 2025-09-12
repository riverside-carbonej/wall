const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function diagnoseWallAccess() {
  try {
    const wallId = 'dzwsujrWYLvznCJElpri';
    
    console.log('🔍 DIAGNOSING WALL ACCESS ISSUES\n');
    
    // 1. Check if wall exists and structure
    console.log('1. Checking wall existence and structure...');
    const wallDoc = await db.collection('walls').doc(wallId).get();
    
    if (!wallDoc.exists) {
      console.log('❌ Wall does not exist!');
      return;
    }
    
    const wallData = wallDoc.data();
    console.log('✅ Wall exists');
    console.log(`   Name: "${wallData.name}"`);
    console.log(`   Published: ${wallData.published}`);
    console.log(`   Owner: ${wallData.ownerId}`);
    
    // 2. Check object types structure
    console.log('\n2. Checking object types...');
    if (!wallData.objectTypes || !Array.isArray(wallData.objectTypes)) {
      console.log('❌ objectTypes is not an array!');
      console.log(`   Current type: ${typeof wallData.objectTypes}`);
      console.log(`   Current value:`, wallData.objectTypes);
    } else {
      console.log(`✅ objectTypes is an array with ${wallData.objectTypes.length} items`);
      
      wallData.objectTypes.forEach((ot, index) => {
        console.log(`   [${index}] "${ot.name}" - ID: ${ot.id}`);
        console.log(`       Fields: ${ot.fields ? ot.fields.length : 'undefined'}`);
        
        if (ot.fields && !Array.isArray(ot.fields)) {
          console.log(`       ❌ Fields is not an array! Type: ${typeof ot.fields}`);
        }
      });
    }
    
    // 3. Check permissions structure
    console.log('\n3. Checking permissions...');
    if (wallData.permissions) {
      console.log('✅ Permissions exist');
      console.log(`   Owner: ${wallData.permissions.owner}`);
      console.log(`   Editors: ${JSON.stringify(wallData.permissions.editors || [])}`);
      console.log(`   Managers: ${JSON.stringify(wallData.permissions.managers || [])}`);
    } else {
      console.log('❌ No permissions structure');
    }
    
    // 4. Check visibility settings
    console.log('\n4. Checking visibility...');
    if (wallData.visibility) {
      console.log('✅ Visibility settings exist');
      console.log(`   Published: ${wallData.visibility.isPublished}`);
      console.log(`   Requires Login: ${wallData.visibility.requiresLogin}`);
    } else {
      console.log('❌ No visibility structure');
    }
    
    // 5. Compare with a working wall structure
    console.log('\n5. Comparing with working Alumni Hall of Fame wall...');
    const workingWallDoc = await db.collection('walls').doc('qBcqG1oBN8VnwanOSrLg').get();
    
    if (workingWallDoc.exists) {
      const workingWallData = workingWallDoc.data();
      console.log('Working wall structure:');
      console.log(`   ObjectTypes type: ${typeof workingWallData.objectTypes}`);
      console.log(`   Has permissions: ${!!workingWallData.permissions}`);
      console.log(`   Has visibility: ${!!workingWallData.visibility}`);
    }
    
    // 6. Try to fix the wall structure if needed
    console.log('\n6. Attempting to fix wall structure...');
    
    const updates = {};
    let needsUpdate = false;
    
    // Ensure basic properties
    if (wallData.published !== true) {
      updates.published = true;
      needsUpdate = true;
    }
    
    // Ensure permissions structure
    if (!wallData.permissions || !wallData.permissions.owner) {
      updates.permissions = {
        owner: 'jack.carbone@riversideschools.net',
        editors: [],
        managers: [],
        viewers: [],
        allowDepartmentEdit: false
      };
      needsUpdate = true;
    }
    
    // Ensure visibility structure
    if (!wallData.visibility) {
      updates.visibility = {
        isPublished: true,
        requiresLogin: false
      };
      needsUpdate = true;
    }
    
    // Ensure owner fields
    if (wallData.ownerId !== 'jack.carbone@riversideschools.net') {
      updates.ownerId = 'jack.carbone@riversideschools.net';
      updates.ownerEmail = 'jack.carbone@riversideschools.net';
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('Applying fixes...');
      await db.collection('walls').doc(wallId).update(updates);
      console.log('✅ Wall structure updated');
    } else {
      console.log('✅ Wall structure looks good');
    }
    
    // 7. Final verification
    console.log('\n7. Final verification...');
    const finalWallDoc = await db.collection('walls').doc(wallId).get();
    const finalWallData = finalWallDoc.data();
    
    console.log('Final wall status:');
    console.log(`   Published: ${finalWallData.published}`);
    console.log(`   Owner: ${finalWallData.ownerId}`);
    console.log(`   Permissions owner: ${finalWallData.permissions?.owner}`);
    console.log(`   Visibility published: ${finalWallData.visibility?.isPublished}`);
    console.log(`   ObjectTypes count: ${finalWallData.objectTypes?.length}`);
    
    const objectTypeId = finalWallData.objectTypes?.[0]?.id;
    console.log(`\n🔗 Try this URL: /walls/${wallId}/preset/${objectTypeId}/items`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

diagnoseWallAccess();