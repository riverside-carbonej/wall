#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://riverside-wall-app-default-rtdb.firebaseio.com",
    storageBucket: "riverside-wall-app.appspot.com"
});

const db = admin.firestore();
const auth = admin.auth();

const wallId = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function updateWallOwnership() {
    try {
        console.log('🔍 Looking for your user account...');
        
        // List all users to find yours
        const listUsersResult = await auth.listUsers(1000);
        
        console.log('📋 Available users:');
        listUsersResult.users.forEach((userRecord, index) => {
            console.log(`${index + 1}. ${userRecord.email || 'No email'} (${userRecord.uid})`);
            if (userRecord.displayName) console.log(`   Name: ${userRecord.displayName}`);
            if (userRecord.providerData) {
                userRecord.providerData.forEach(provider => {
                    console.log(`   Provider: ${provider.providerId}`);
                });
            }
            console.log('');
        });

        // Get the wall document
        const wallRef = db.collection('walls').doc(wallId);
        const wallDoc = await wallRef.get();
        
        if (!wallDoc.exists) {
            console.error('❌ Wall not found!');
            return;
        }

        const wallData = wallDoc.data();
        console.log(`📄 Current wall owner: ${wallData.permissions?.owner || 'No owner set'}`);

        // If there's only one user, use that one
        if (listUsersResult.users.length === 1) {
            const yourUserId = listUsersResult.users[0].uid;
            console.log(`🎯 Setting you as owner: ${listUsersResult.users[0].email} (${yourUserId})`);
            
            await wallRef.update({
                'permissions.owner': yourUserId,
                'permissions.managers': [yourUserId],
                'permissions.editors': [yourUserId],
                updatedAt: admin.firestore.Timestamp.now()
            });

            console.log('✅ Wall ownership updated successfully!');
            console.log(`🔗 You now have full access to: http://localhost:4301/walls/${wallId}`);
            
        } else if (listUsersResult.users.length > 1) {
            console.log('❓ Multiple users found. Please provide your email or user ID as an argument:');
            console.log('   node update-ownership.js YOUR_EMAIL_OR_USER_ID');
            
        } else {
            console.log('❌ No users found. Please sign up in your app first, then run this script again.');
        }

    } catch (error) {
        console.error('❌ Error updating ownership:', error);
    }
}

// Check for command line argument (email or user ID)
const targetUser = process.argv[2];

if (targetUser) {
    // User provided specific email or ID
    updateWallWithSpecificUser(targetUser);
} else {
    // Auto-detect user
    updateWallOwnership();
}

async function updateWallWithSpecificUser(emailOrUid) {
    try {
        console.log(`🔍 Looking for user: ${emailOrUid}`);
        
        let userRecord;
        if (emailOrUid.includes('@')) {
            // It's an email
            userRecord = await auth.getUserByEmail(emailOrUid);
        } else {
            // It's a UID
            userRecord = await auth.getUser(emailOrUid);
        }

        console.log(`✅ Found user: ${userRecord.email} (${userRecord.uid})`);

        const wallRef = db.collection('walls').doc(wallId);
        await wallRef.update({
            'permissions.owner': userRecord.uid,
            'permissions.managers': [userRecord.uid],
            'permissions.editors': [userRecord.uid],
            updatedAt: admin.firestore.Timestamp.now()
        });

        console.log('✅ Wall ownership updated successfully!');
        console.log(`🔗 You now have full access to: http://localhost:4301/walls/${wallId}`);

    } catch (error) {
        console.error('❌ Error finding/updating user:', error);
        console.log('💡 Make sure you\'ve signed up in the app first, or check the email/ID spelling.');
    }
}