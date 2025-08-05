import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import {initializeApp} from "firebase-admin/app";
import * as logger from "firebase-functions/logger";

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