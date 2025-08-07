#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();

async function checkDeployments(wallId) {
    try {
        console.log('🔍 Checking deployment items...\n');
        
        // Get all deployment items for this wall
        const wallItemsRef = db.collection('wall_items');
        const snapshot = await wallItemsRef
            .where('wallId', '==', wallId)
            .where('objectTypeId', '==', 'deployment')
            .get();
        
        console.log(`Found ${snapshot.size} deployment items:\n`);
        
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`\n${index + 1}. Deployment ID: ${doc.id}`);
            console.log('   Field Data:');
            
            if (data.fieldData) {
                Object.entries(data.fieldData).forEach(([key, value]) => {
                    if (key === 'location' || key === 'theater' || key === 'base' || key === 'country') {
                        console.log(`   - ${key}: ${JSON.stringify(value, null, 2)}`);
                    }
                });
                
                // Show all fields if no location fields found
                if (!data.fieldData.location && !data.fieldData.theater && !data.fieldData.base) {
                    console.log('   All fields:', Object.keys(data.fieldData).join(', '));
                }
            } else {
                console.log('   No fieldData found');
            }
        });
        
        console.log('\n\n📊 Summary:');
        console.log(`Total deployments: ${snapshot.size}`);
        
        // Count different field types
        let hasLocation = 0;
        let hasTheater = 0;
        let hasBase = 0;
        let needsUpdate = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.fieldData) {
                if (data.fieldData.location) {
                    hasLocation++;
                    if (typeof data.fieldData.location === 'string' || 
                        !data.fieldData.location.lat || !data.fieldData.location.lng) {
                        needsUpdate++;
                    }
                }
                if (data.fieldData.theater) hasTheater++;
                if (data.fieldData.base) hasBase++;
            }
        });
        
        console.log(`- With location field: ${hasLocation}`);
        console.log(`- With theater field: ${hasTheater}`);
        console.log(`- With base field: ${hasBase}`);
        console.log(`- Need coordinate update: ${needsUpdate}`);
        
    } catch (error) {
        console.error('❌ Error checking deployments:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2] || 'Fkzc5Kh7gMpyTEm5Cl6d';

checkDeployments(wallId)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed:', error);
        process.exit(1);
    });