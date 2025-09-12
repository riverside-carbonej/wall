const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const NEW_WALL_ID = 'dzwsujrWYLvznCJElpri'; // The new alumni wall

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function analyzeNewWallStructure() {
    console.log('🔬 ANALYZING NEW WALL STRUCTURE (Created through app UI)...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    const wallRef = db.collection('walls').doc(NEW_WALL_ID);
    const wallDoc = await wallRef.get();
    
    if (!wallDoc.exists) {
        console.log('❌ Wall not found!');
        return;
    }
    
    const wallData = wallDoc.data();
    
    console.log('📋 WALL BASIC INFO:');
    console.log(`Name: ${wallData.name}`);
    console.log(`Created: ${wallData.createdAt?.toDate?.()}`);
    console.log(`Owner: ${wallData.ownerId || 'NONE'}`);
    console.log(`Published: ${wallData.published}`);
    
    console.log('\n🔍 OBJECT TYPES STRUCTURE:');
    console.log(`Type of objectTypes: ${typeof wallData.objectTypes}`);
    console.log(`Is Array: ${Array.isArray(wallData.objectTypes)}`);
    
    if (wallData.objectTypes) {
        if (Array.isArray(wallData.objectTypes)) {
            console.log(`\n📦 Object Types Array (${wallData.objectTypes.length} items):`);
            wallData.objectTypes.forEach((ot, index) => {
                console.log(`\n[${index}] Object Type:`);
                console.log(`  ID: ${ot.id}`);
                console.log(`  Name: ${ot.name}`);
                console.log(`  Wall ID: ${ot.wallId}`);
                console.log(`  Fields type: ${typeof ot.fields}`);
                console.log(`  Fields is Array: ${Array.isArray(ot.fields)}`);
                
                if (ot.fields) {
                    if (Array.isArray(ot.fields)) {
                        console.log(`  Fields Array (${ot.fields.length} items):`);
                        ot.fields.forEach((field, fidx) => {
                            console.log(`    [${fidx}] ${field.id || field.name}: ${field.type} (required: ${field.required})`);
                        });
                    } else {
                        console.log(`  Fields Object (${Object.keys(ot.fields).length} keys):`);
                        Object.entries(ot.fields).forEach(([key, field]) => {
                            console.log(`    "${key}": ${field.name} (${field.type})`);
                        });
                    }
                }
            });
        } else {
            console.log(`\n📦 Object Types Object (${Object.keys(wallData.objectTypes).length} keys):`);
            Object.entries(wallData.objectTypes).forEach(([key, ot]) => {
                console.log(`\n"${key}" Object Type:`);
                console.log(`  Name: ${ot.name}`);
                console.log(`  Fields type: ${typeof ot.fields}`);
            });
        }
    }
    
    // Save the structure to a file for analysis
    const outputPath = './new-wall-structure.json';
    fs.writeFileSync(outputPath, JSON.stringify(wallData, null, 2));
    console.log(`\n💾 Full wall data saved to ${outputPath}`);
    
    // Check how the app expects to use this
    console.log('\n🎯 KEY OBSERVATIONS:');
    if (Array.isArray(wallData.objectTypes)) {
        console.log('✅ objectTypes is stored as an ARRAY in Firestore');
        console.log('   This is how the app creates it!');
        
        if (wallData.objectTypes[0]?.fields && Array.isArray(wallData.objectTypes[0].fields)) {
            console.log('✅ fields is also stored as an ARRAY');
            console.log('   This is the app\'s native format!');
        }
    }
    
    return wallData;
}

if (require.main === module) {
    analyzeNewWallStructure()
        .then(() => {
            console.log('\n✅ Analysis complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Analysis failed:', error);
            process.exit(1);
        });
}