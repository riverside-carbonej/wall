const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function compareWalls() {
  try {
    console.log('🔍 COMPARING WORKING VETERANS WALL VS BROKEN ALUMNI WALL\n');
    
    // Get both walls - find a working veterans wall and the broken alumni wall
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    // Find a veterans wall that works
    const allWallsSnapshot = await db.collection('walls').get();
    let veteransWall = null;
    
    allWallsSnapshot.forEach(doc => {
      const wall = doc.data();
      if (wall.name && wall.name.toLowerCase().includes('veteran')) {
        veteransWall = {
          id: doc.id,
          data: wall
        };
      }
    });
    
    if (!veteransWall) {
      console.log('❌ No veterans wall found');
      return;
    }
    
    console.log(`Comparing:`);
    console.log(`✅ Working Veterans Wall: "${veteransWall.data.name}" (${veteransWall.id})`);
    
    // Get alumni wall
    const alumniWallDoc = await db.collection('walls').doc(alumniWallId).get();
    const alumniWall = alumniWallDoc.data();
    
    console.log(`❌ Broken Alumni Wall: "${alumniWall.name}" (${alumniWallId})\n`);
    
    // Compare structures
    console.log('📋 STRUCTURE COMPARISON:\n');
    
    console.log('1. BASIC PROPERTIES:');
    console.log(`Veterans - Published: ${veteransWall.data.published}, Owner: ${veteransWall.data.ownerId}`);
    console.log(`Alumni   - Published: ${alumniWall.published}, Owner: ${alumniWall.ownerId}`);
    
    console.log('\n2. OBJECT TYPES:');
    console.log(`Veterans - Type: ${typeof veteransWall.data.objectTypes}, IsArray: ${Array.isArray(veteransWall.data.objectTypes)}, Count: ${veteransWall.data.objectTypes?.length || 0}`);
    console.log(`Alumni   - Type: ${typeof alumniWall.objectTypes}, IsArray: ${Array.isArray(alumniWall.objectTypes)}, Count: ${alumniWall.objectTypes?.length || 0}`);
    
    // Show object type structures
    if (veteransWall.data.objectTypes && Array.isArray(veteransWall.data.objectTypes)) {
      const vetOT = veteransWall.data.objectTypes[0];
      console.log('\n✅ WORKING Veterans ObjectType:');
      console.log(`   ID: ${vetOT.id}`);
      console.log(`   Name: ${vetOT.name}`);
      console.log(`   Fields Type: ${typeof vetOT.fields}, IsArray: ${Array.isArray(vetOT.fields)}, Count: ${vetOT.fields?.length || 0}`);
    }
    
    if (alumniWall.objectTypes && Array.isArray(alumniWall.objectTypes)) {
      const alumOT = alumniWall.objectTypes[0];
      console.log('\n❌ BROKEN Alumni ObjectType:');
      console.log(`   ID: ${alumOT.id}`);
      console.log(`   Name: ${alumOT.name}`);
      console.log(`   Fields Type: ${typeof alumOT.fields}, IsArray: ${Array.isArray(alumOT.fields)}, Count: ${alumOT.fields?.length || 0}`);
      
      if (alumOT.fields && !Array.isArray(alumOT.fields)) {
        console.log('   ❌ PROBLEM: Fields is not an array!');
        console.log('   First few field keys:', Object.keys(alumOT.fields).slice(0, 5));
      }
    }
    
    console.log('\n3. PERMISSIONS:');
    console.log(`Veterans - Has permissions: ${!!veteransWall.data.permissions}`);
    console.log(`Alumni   - Has permissions: ${!!alumniWall.permissions}`);
    
    console.log('\n4. VISIBILITY:');
    console.log(`Veterans - Has visibility: ${!!veteransWall.data.visibility}`);
    console.log(`Alumni   - Has visibility: ${!!alumniWall.visibility}`);
    
    // Check if alumni wall has the same broken structure as the old wall
    if (alumniWall.objectTypes && Array.isArray(alumniWall.objectTypes)) {
      const alumOT = alumniWall.objectTypes[0];
      if (alumOT.fields && typeof alumOT.fields === 'object' && !Array.isArray(alumOT.fields)) {
        console.log('\n🚨 FOUND THE PROBLEM:');
        console.log('The Alumni wall has fields as an OBJECT instead of ARRAY!');
        console.log('This is the same issue that broke the old wall.');
        console.log('\n🔧 FIXING...');
        
        // Convert fields object to array
        const fieldsArray = Object.values(alumOT.fields);
        console.log(`Converting ${Object.keys(alumOT.fields).length} fields to array format...`);
        
        // Update the wall
        const updatedObjectType = {
          ...alumOT,
          fields: fieldsArray
        };
        
        await db.collection('walls').doc(alumniWallId).update({
          'objectTypes.0.fields': fieldsArray
        });
        
        console.log('✅ Fixed alumni wall fields structure!');
        console.log('\nTry the URL again:');
        console.log('https://rlswall.app/walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

compareWalls();