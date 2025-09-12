const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Target wall ID - ONLY touch this wall
const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';

// Initialize Firebase Admin SDK
function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Firebase service account key not found at: ${serviceAccountPath}`);
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
    
    console.log('🔥 Firebase Admin SDK initialized');
}

async function verifyWallExists(wallId) {
    console.log(`🔍 Verifying wall ${wallId} exists...`);
    
    const db = admin.firestore();
    const wallDoc = await db.collection('walls').doc(wallId).get();
    
    if (!wallDoc.exists) {
        throw new Error(`Wall ${wallId} does not exist!`);
    }
    
    const wallData = wallDoc.data();
    console.log(`✅ Found wall: "${wallData.name || 'Unnamed'}" (ID: ${wallId})`);
    
    return wallData;
}

async function loadAlumniData() {
    console.log('📖 Loading alumni data...');
    
    const dataPath = path.join(__dirname, 'alumni-data.json');
    if (!fs.existsSync(dataPath)) {
        throw new Error(`Alumni data not found at: ${dataPath}`);
    }
    
    const alumniData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`✅ Loaded ${alumniData.length} alumni records`);
    
    return alumniData;
}

function createWallItem(alumni, wallId) {
    // Convert alumni data to wall item format matching the alumni wall's "Alumnus" object type
    const wallItem = {
        wallId: wallId,
        name: alumni.fullName,
        objectTypeId: "0", // Alumni wall has object type ID "0" for "Alumnus"
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        published: true,
        fields: {
            // Map to the alumni wall's object type fields:
            // Field 0: "Full Name" (text)
            "0": alumni.fullName,
            
            // Field 1: "Graduation Year" (number) - convert to number if available
            "1": alumni.graduationYear && alumni.graduationYear !== '' ? parseInt(alumni.graduationYear) || null : null,
            
            // Field 2: "Degree" (text) - we'll put the category here
            "2": alumni.category,
            
            // Field 3: "Current Position" (text) - we'll use induction info
            "3": `Hall of Fame Inductee ${alumni.inductionYear}${alumni.maidenName ? ` (${alumni.maidenName})` : ''}`,
            
            // Field 4: "Email" (email) - we don't have this, leave null
            "4": null,
            
            // Keep original fields for debugging/backup
            _original: {
                firstName: alumni.firstName,
                lastName: alumni.lastName,
                category: alumni.category,
                inductionYear: alumni.inductionYear,
                graduationYear: alumni.graduationYear,
                maidenName: alumni.maidenName
            }
        }
    };
    
    return wallItem;
}

async function clearWallItems(wallId) {
    console.log(`🗑️  Clearing existing wall items for wall ${wallId}...`);
    
    const db = admin.firestore();
    
    // Query all wall items for this specific wall
    const wallItemsQuery = db.collection('wall-items').where('wallId', '==', wallId);
    const snapshot = await wallItemsQuery.get();
    
    if (snapshot.empty) {
        console.log('✅ No existing wall items to clear');
        return 0;
    }
    
    console.log(`🔍 Found ${snapshot.size} existing wall items to clear`);
    
    // Delete in batches
    const BATCH_SIZE = 500;
    let deleted = 0;
    
    while (true) {
        const batch = db.batch();
        const querySnapshot = await wallItemsQuery.limit(BATCH_SIZE).get();
        
        if (querySnapshot.empty) break;
        
        querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        deleted += querySnapshot.size;
        console.log(`  🗑️  Deleted ${deleted} wall items...`);
    }
    
    console.log(`✅ Cleared ${deleted} wall items from wall ${wallId}`);
    return deleted;
}

async function importAlumniData() {
    console.log('🚀 Starting alumni data import...');
    
    try {
        // Initialize Firebase
        initializeFirebase();
        
        // Verify the target wall exists
        const wallData = await verifyWallExists(ALUMNI_WALL_ID);
        
        // Clear existing wall items for this wall ONLY
        const clearedCount = await clearWallItems(ALUMNI_WALL_ID);
        
        // Load alumni data
        const alumniData = await loadAlumniData();
        
        // Convert to wall items
        console.log('🔄 Converting alumni data to wall items...');
        const wallItems = alumniData.map(alumni => createWallItem(alumni, ALUMNI_WALL_ID));
        
        // Import in batches
        const db = admin.firestore();
        const BATCH_SIZE = 500;
        let imported = 0;
        
        console.log(`📤 Importing ${wallItems.length} wall items in batches of ${BATCH_SIZE}...`);
        
        for (let i = 0; i < wallItems.length; i += BATCH_SIZE) {
            const batch = wallItems.slice(i, i + BATCH_SIZE);
            const firestoreBatch = db.batch();
            
            batch.forEach(item => {
                const docRef = db.collection('wall-items').doc();
                firestoreBatch.set(docRef, item);
            });
            
            await firestoreBatch.commit();
            imported += batch.length;
            
            console.log(`  ✅ Imported ${imported}/${wallItems.length} items`);
        }
        
        console.log(`🎉 Successfully imported all ${imported} alumni records to wall ${ALUMNI_WALL_ID}`);
        
        // Summary
        const categories = {};
        alumniData.forEach(alumni => {
            categories[alumni.category] = (categories[alumni.category] || 0) + 1;
        });
        
        console.log('\n📈 Import summary by category:');
        Object.entries(categories).forEach(([category, count]) => {
            console.log(`  ${category}: ${count} members`);
        });
        
        return {
            wallId: ALUMNI_WALL_ID,
            totalImported: imported,
            categories
        };
        
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        throw error;
    }
}

// Safety check function
function confirmTarget() {
    console.log('⚠️  SAFETY CHECK ⚠️');
    console.log(`Target Wall ID: ${ALUMNI_WALL_ID}`);
    console.log('This script will ONLY modify this specific wall.');
    console.log('No other walls or data will be affected.');
    console.log('');
}

if (require.main === module) {
    confirmTarget();
    
    importAlumniData()
        .then(result => {
            console.log('\n✅ Alumni import completed successfully!');
            console.log(`Wall: ${result.wallId}`);
            console.log(`Records: ${result.totalImported}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Alumni import failed:', error);
            process.exit(1);
        });
}

module.exports = { importAlumniData, ALUMNI_WALL_ID };