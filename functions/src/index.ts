import {setGlobalOptions} from "firebase-functions";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import {sendBugReportEmail} from "./sendEmail";

// Initialize Firebase Admin
initializeApp();

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

// Cloud function to search Firebase Auth users
export const searchUsers = onCall({
  cors: true,
}, async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {searchTerm} = request.data;

  if (!searchTerm || searchTerm.length < 3) {
    throw new HttpsError("invalid-argument", "Search term must be at least 3 characters");
  }

  try {
    const auth = getAuth();
    const listUsersResult = await auth.listUsers(1000); // Get up to 1000 users

    const searchLower = searchTerm.toLowerCase();
    const matchingUsers = listUsersResult.users
      .filter((userRecord) => {
        // Filter out the current user
        if (userRecord.uid === request.auth!.uid) {
          return false;
        }

        // Search in email and display name
        const email = userRecord.email?.toLowerCase() || "";
        const displayName = userRecord.displayName?.toLowerCase() || "";

        return email.includes(searchLower) || displayName.includes(searchLower);
      })
      .slice(0, 10) // Limit to 10 results
      .map((userRecord) => ({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL || null,
      }));

    logger.info(`Search for "${searchTerm}" returned ${matchingUsers.length} results`);
    return {users: matchingUsers};
  } catch (error) {
    logger.error("Error searching users:", error);
    throw new HttpsError("internal", "Failed to search users");
  }
});

// Cloud function to get Firebase Auth users by UIDs
export const getUsersByUids = onCall({
  cors: true,
}, async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {uids} = request.data;

  if (!uids || !Array.isArray(uids) || uids.length === 0) {
    throw new HttpsError("invalid-argument", "UIDs array is required");
  }

  if (uids.length > 100) {
    throw new HttpsError("invalid-argument", "Cannot request more than 100 users at once");
  }

  try {
    const auth = getAuth();
    const users = [];

    // Get users in batches (Firebase Admin SDK supports getting multiple users)
    for (const uid of uids) {
      try {
        const userRecord = await auth.getUser(uid);
        users.push({
          uid: userRecord.uid,
          email: userRecord.email || null,
          displayName: userRecord.displayName || null,
          photoURL: userRecord.photoURL || null,
        });
      } catch (error) {
        logger.warn(`Could not fetch user ${uid}:`, error);
        // Add a placeholder for missing users
        users.push({
          uid: uid,
          email: null,
          displayName: null,
          photoURL: null,
        });
      }
    }

    logger.info(`Retrieved ${users.length} users for ${uids.length} UIDs`);
    return {users};
  } catch (error) {
    logger.error("Error getting users by UIDs:", error);
    throw new HttpsError("internal", "Failed to get users");
  }
});

// Cloud function to send bug report email
export const sendBugReport = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const bugReport = req.body;
    
    // Save to Firestore for admin dashboard
    const db = getFirestore();
    const reportRef = await db.collection('bug-reports').add({
      ...bugReport,
      createdAt: new Date().toISOString(),
      status: 'new',
      read: false
    });
    
    logger.info("🐛 Bug report saved to Firestore", {
      id: reportRef.id,
      from: bugReport.userEmail || 'Anonymous',
      description: bugReport.description?.substring(0, 100)
    });
    
    // Try to send email notification (optional)
    await sendBugReportEmail(bugReport);
    
    res.status(200).json({
      success: true, 
      message: "Bug report sent successfully",
      reportId: reportRef.id
    });
  } catch (error) {
    logger.error("Error processing bug report:", error);
    
    // Try to at least save basic info
    try {
      const db = getFirestore();
      await db.collection('bug-reports').add({
        userEmail: req.body.userEmail || 'unknown',
        description: req.body.description || 'Error saving full report',
        timestamp: new Date().toISOString(),
        error: String(error),
        status: 'error',
        read: false
      });
    } catch (saveError) {
      logger.error("Failed to save bug report:", saveError);
    }
    
    res.status(200).json({
      success: true,
      message: "Bug report received",
      note: "Report saved with limited information"
    });
  }
});