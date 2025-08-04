// Quick fix for the specific problematic wall
const admin = require('firebase-admin');

// You'll need to download the service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate new private key
// Save as: riverside-wall-app-firebase-adminsdk.json
try {
  const serviceAccount = require('./riverside-wall-app-firebase-adminsdk.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Please download Firebase Admin SDK key file first!');
  console.log('1. Go to: https://console.firebase.google.com/project/riverside-wall-app/settings/serviceaccounts/adminsdk');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save as: riverside-wall-app-firebase-adminsdk.json');
  process.exit(1);
}

const db = admin.firestore();

async function fixWall() {
  const wallId = 'NEFBJDvOWXgfZ9ghCRur';
  
  console.log(`🔧 Fixing wall: ${wallId}`);
  
  try {
    const wallRef = db.collection('walls').doc(wallId);
    
    // Remove only legacy isPublic field - keep current visibility settings
    const updates = {
      // Remove legacy fields that conflict with new structure
      isPublic: admin.firestore.FieldValue.delete(),
      ownerId: admin.firestore.FieldValue.delete(),
      sharedWith: admin.firestore.FieldValue.delete(),
      
      // Update timestamp
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await wallRef.update(updates);
    
    console.log('✅ Wall fixed successfully!');
    console.log('Removed legacy isPublic field. Current visibility settings preserved.');
    
  } catch (error) {
    console.error('❌ Error fixing wall:', error);
  }
  
  process.exit(0);
}

fixWall();