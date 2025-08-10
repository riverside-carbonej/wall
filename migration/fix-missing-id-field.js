#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function fixMissingIds() {
    console.log('🔧 FIXING MISSING ID FIELDS\n');
    console.log('='.repeat(60));
    
    // Find all veterans without 'id' field
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    const missingIdVeterans = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.id === undefined) {
            missingIdVeterans.push({
                docId: doc.id,
                name: data.fieldData?.name || '[NO NAME]',
                data: data
            });
        }
    });
    
    console.log(`Found ${missingIdVeterans.length} veterans missing 'id' field\n`);
    
    if (missingIdVeterans.length === 0) {
        console.log('✅ All veterans already have id field!');
        process.exit(0);
        return;
    }
    
    // Fix each one
    console.log('Adding id field to veterans:\n');
    
    for (const veteran of missingIdVeterans) {
        try {
            // Add the 'id' field with the document ID as its value
            await db.collection('wall_items').doc(veteran.docId).update({
                id: veteran.docId
            });
            
            console.log(`  ✅ Fixed: ${veteran.name} (ID: ${veteran.docId})`);
        } catch (error) {
            console.error(`  ❌ Error fixing ${veteran.name}:`, error.message);
        }
    }
    
    // Verify the fix
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION:\n');
    
    const verifySnapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    let withId = 0;
    let withoutId = 0;
    
    verifySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.id !== undefined) {
            withId++;
        } else {
            withoutId++;
        }
    });
    
    console.log(`Veterans WITH 'id' field: ${withId}`);
    console.log(`Veterans WITHOUT 'id' field: ${withoutId}`);
    
    if (withoutId === 0) {
        console.log('\n✅ SUCCESS! All veterans now have the id field.');
        console.log('The app should now show all 579 veterans!');
    } else {
        console.log('\n⚠️  Some veterans still missing id field.');
    }
    
    process.exit(0);
}

fixMissingIds().catch(console.error);