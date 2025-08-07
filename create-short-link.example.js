/**
 * Example script to create short links in Firestore
 * 
 * You can run this in the Firebase Console or create a Node.js script
 * 
 * Steps:
 * 1. Go to Firebase Console > Firestore Database
 * 2. Create a new collection called "wall-short-links"
 * 3. Add documents with the following structure
 */

// Example document structure for wall-short-links collection:
const shortLinkExample = {
  // Document ID should be the short link (e.g., "wall-of-honor")
  // The document ID IS the short link identifier
  
  // Document fields:
  wallId: "actual-wall-id-from-firestore", // Required: The actual wall document ID
  description: "Wall of Honor for distinguished members", // Optional: Description
  createdAt: new Date(), // Optional: When the short link was created
  
  // Optional: You can add more metadata
  active: true, // Optional: To enable/disable links
  analytics: {
    visits: 0,
    lastVisited: null
  }
};

// Example entries to create:
const exampleShortLinks = [
  {
    documentId: "wall-of-honor",
    data: {
      wallId: "YOUR_WALL_OF_HONOR_ID",
      description: "Wall of Honor for distinguished members",
      createdAt: new Date()
    }
  },
  {
    documentId: "events",
    data: {
      wallId: "YOUR_EVENTS_WALL_ID",
      description: "Upcoming events and activities",
      createdAt: new Date()
    }
  },
  {
    documentId: "announcements",
    data: {
      wallId: "YOUR_ANNOUNCEMENTS_WALL_ID",
      description: "Important announcements",
      createdAt: new Date()
    }
  }
];

// To create these in Firestore Console:
// 1. Go to Firestore Database
// 2. Click "Start collection"
// 3. Collection ID: "wall-short-links"
// 4. Document ID: Enter your short link (e.g., "wall-of-honor")
// 5. Add fields:
//    - wallId (string): The actual wall ID
//    - description (string): Optional description
//    - createdAt (timestamp): Current time

// Or use Firebase Admin SDK in a Node.js script:
/*
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function createShortLink(shortId, wallId, description) {
  try {
    await db.collection('wall-short-links').doc(shortId).set({
      wallId: wallId,
      description: description || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Created short link: ${shortId} -> ${wallId}`);
  } catch (error) {
    console.error('Error creating short link:', error);
  }
}

// Usage:
createShortLink('wall-of-honor', 'abc123def456', 'Wall of Honor');
*/