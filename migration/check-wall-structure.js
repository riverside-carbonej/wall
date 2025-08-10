const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWallStructure() {
  console.log('Checking wall structure...\n');
  
  try {
    // Get first Veterans Wall
    const wallsSnapshot = await db.collection('walls')
      .where('name', '==', 'Veterans Wall of Honor')
      .limit(1)
      .get();
    
    if (wallsSnapshot.empty) {
      console.log('No Veterans Wall of Honor found');
      return;
    }
    
    const wallDoc = wallsSnapshot.docs[0];
    const wallData = wallDoc.data();
    
    console.log(`Wall ID: ${wallDoc.id}`);
    console.log(`Wall Name: ${wallData.name}`);
    console.log('\nChecking for veterans field...');
    
    if (wallData.veterans) {
      console.log(`Found veterans array with ${wallData.veterans.length} veterans`);
      
      // Show first few veterans
      console.log('\nFirst 3 veterans:');
      console.log('=================');
      
      wallData.veterans.slice(0, 3).forEach((vet, index) => {
        console.log(`\n${index + 1}. ${vet.firstName} ${vet.lastName}`);
        console.log(`   Class: ${vet.classYear || 'N/A'}`);
        console.log(`   Branch: ${vet.branch || 'N/A'}`);
        console.log(`   Keys: ${Object.keys(vet).join(', ')}`);
      });
      
      return wallData.veterans;
    }
    
    // Check for items field
    if (wallData.items) {
      console.log(`Found items array with ${wallData.items.length} items`);
      return;
    }
    
    // Check all fields
    console.log('\nAll top-level fields in wall document:');
    console.log('======================================');
    Object.keys(wallData).forEach(key => {
      const value = wallData[key];
      if (Array.isArray(value)) {
        console.log(`${key}: Array(${value.length})`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`${key}: Object`);
      } else {
        console.log(`${key}: ${typeof value}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking wall structure:', error);
  } finally {
    await admin.app().delete();
  }
}

// Run the check
checkWallStructure();