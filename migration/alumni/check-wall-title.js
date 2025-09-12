const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkWallTitle() {
  try {
    const wallDoc = await db.collection('walls').doc('dzwsujrWYLvznCJElpri').get();
    
    if (wallDoc.exists) {
      const wallData = wallDoc.data();
      console.log(`Wall Title: "${wallData.name || wallData.title || 'No title found'}"`);
      console.log(`Wall ID: ${wallDoc.id}`);
      console.log(`Owner: ${wallData.ownerEmail || wallData.ownerId || 'Unknown'}`);
      console.log(`Published: ${wallData.published}`);
    } else {
      console.log('❌ Wall not found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWallTitle();