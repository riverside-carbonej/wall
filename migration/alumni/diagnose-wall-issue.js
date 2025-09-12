const admin = require('firebase-admin');
const path = require('path');

const ALUMNI_WALL_ID = 'qBcqG1oBN8VnwanOSrLg';

function initializeFirebase() {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'gs://riverside-wall-app.firebasestorage.app'
    });
}

async function diagnoseWallIssue() {
    console.log('🔍 Diagnosing wall accessibility issue...\n');
    
    initializeFirebase();
    const db = admin.firestore();
    
    // Check if the wall exists
    console.log('1️⃣ CHECKING WALL EXISTENCE...');
    const wallRef = db.collection('walls').doc(ALUMNI_WALL_ID);
    const wallDoc = await wallRef.get();
    
    if (!wallDoc.exists) {
        console.log('❌ Wall document does not exist!');
        return;
    }
    
    console.log('✅ Wall document exists');
    
    const wallData = wallDoc.data();
    
    // Check critical wall fields
    console.log('\n2️⃣ CHECKING WALL DATA STRUCTURE...');
    console.log(`Name: "${wallData.name || 'MISSING'}"`);
    console.log(`Created: ${wallData.createdAt?.toDate?.() || 'MISSING'}`);
    console.log(`Deleted: ${wallData.deletedAt?.toDate?.() || 'Not deleted'}`);
    console.log(`Soft Deleted: ${wallData.softDeleted || false}`);
    console.log(`Is Deleted: ${wallData.isDeleted || false}`);
    console.log(`Published: ${wallData.published}`);
    console.log(`Owner ID: ${wallData.ownerId || 'MISSING'}`);
    console.log(`Visibility: ${wallData.visibility || 'MISSING'}`);
    
    // Check object types structure
    console.log('\n3️⃣ CHECKING OBJECT TYPES...');
    if (!wallData.objectTypes) {
        console.log('❌ No objectTypes field!');
    } else if (typeof wallData.objectTypes !== 'object') {
        console.log(`❌ objectTypes is not an object! Type: ${typeof wallData.objectTypes}`);
    } else if (Array.isArray(wallData.objectTypes)) {
        console.log('❌ objectTypes is an array, should be an object!');
        console.log('Array contents:', JSON.stringify(wallData.objectTypes, null, 2));
    } else {
        const objectTypeKeys = Object.keys(wallData.objectTypes);
        console.log(`✅ objectTypes is an object with ${objectTypeKeys.length} key(s)`);
        
        objectTypeKeys.forEach(key => {
            const objType = wallData.objectTypes[key];
            console.log(`\nObject Type "${key}":`);
            console.log(`  Type: ${typeof objType}`);
            if (objType && typeof objType === 'object') {
                console.log(`  Name: ${objType.name || 'MISSING'}`);
                console.log(`  ID: ${objType.id || 'MISSING'}`);
                console.log(`  Fields: ${objType.fields ? Object.keys(objType.fields).length : 'MISSING'}`);
                console.log(`  Icon: ${objType.icon || 'MISSING'}`);
                
                // Check if fields is properly structured
                if (objType.fields && typeof objType.fields === 'object') {
                    const fieldKeys = Object.keys(objType.fields);
                    console.log(`  Field IDs: ${fieldKeys.slice(0, 5).join(', ')}${fieldKeys.length > 5 ? '...' : ''}`);
                }
            } else {
                console.log('  ❌ Invalid object type structure!');
            }
        });
    }
    
    // Check for wall permissions/visibility issues
    console.log('\n4️⃣ CHECKING ACCESS CONFIGURATION...');
    if (!wallData.visibility) {
        console.log('⚠️  No visibility setting - might default to private');
    }
    if (!wallData.ownerId && !wallData.published) {
        console.log('⚠️  No owner and not published - might be inaccessible');
    }
    
    // Check items
    console.log('\n5️⃣ CHECKING WALL ITEMS...');
    const itemsQuery = db.collection('wall-items').where('wallId', '==', ALUMNI_WALL_ID).limit(5);
    const itemsSnapshot = await itemsQuery.get();
    console.log(`Sample items found: ${itemsSnapshot.size}`);
    
    if (itemsSnapshot.size > 0) {
        const uniqueObjectTypeIds = new Set();
        itemsSnapshot.docs.forEach(doc => {
            const item = doc.data();
            uniqueObjectTypeIds.add(item.objectTypeId);
        });
        console.log(`Unique objectTypeIds in items: ${Array.from(uniqueObjectTypeIds).join(', ')}`);
    }
    
    // Check for potential app routing issues
    console.log('\n6️⃣ POTENTIAL ISSUES IDENTIFIED:');
    const issues = [];
    
    if (!wallData.name) issues.push('Missing wall name');
    if (!wallData.objectTypes) issues.push('Missing objectTypes field');
    if (Array.isArray(wallData.objectTypes)) issues.push('objectTypes is an array instead of object');
    if (!wallData.visibility && !wallData.published) issues.push('Wall might be private/inaccessible');
    if (!wallData.ownerId) issues.push('No owner set');
    
    if (wallData.objectTypes && typeof wallData.objectTypes === 'object' && !Array.isArray(wallData.objectTypes)) {
        const keys = Object.keys(wallData.objectTypes);
        if (keys.length === 0) issues.push('objectTypes object is empty');
        
        // Check if the object type structure is valid
        keys.forEach(key => {
            const objType = wallData.objectTypes[key];
            if (!objType || typeof objType !== 'object') {
                issues.push(`Object type "${key}" is invalid`);
            } else if (!objType.fields || typeof objType.fields !== 'object') {
                issues.push(`Object type "${key}" has invalid fields structure`);
            }
        });
    }
    
    if (issues.length > 0) {
        console.log('❌ Issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
        console.log('✅ No obvious issues found');
    }
    
    console.log('\n7️⃣ RECOMMENDATIONS:');
    if (Array.isArray(wallData.objectTypes)) {
        console.log('⚠️  CRITICAL: objectTypes was converted to an array. This needs to be fixed!');
        console.log('The app expects objectTypes to be an object with keys, not an array.');
    }
    
    return wallData;
}

if (require.main === module) {
    diagnoseWallIssue()
        .then(wallData => {
            console.log('\n✅ Diagnosis complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Diagnosis failed:', error);
            process.exit(1);
        });
}