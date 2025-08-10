#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function fixTimestamps() {
    console.log('🔧 FIXING TIMESTAMP FIELDS (created/updated → createdAt/updatedAt)\n');
    console.log('='.repeat(60));
    
    // Find all veterans
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    const needsFixing = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        // Check if has old format (created/updated) but not new format (createdAt/updatedAt)
        if ((data.created || data.updated) && (!data.createdAt || !data.updatedAt)) {
            needsFixing.push({
                docId: doc.id,
                name: data.fieldData?.name || '[NO NAME]',
                created: data.created,
                updated: data.updated,
                hasCreatedAt: !!data.createdAt,
                hasUpdatedAt: !!data.updatedAt
            });
        }
    });
    
    console.log(`Found ${needsFixing.length} veterans with old timestamp format\n`);
    
    if (needsFixing.length === 0) {
        console.log('✅ All veterans already have correct timestamp fields!');
        process.exit(0);
        return;
    }
    
    // Fix each one
    console.log('Converting timestamp fields:\n');
    
    for (const veteran of needsFixing) {
        try {
            const updates = {};
            
            // Add createdAt if missing
            if (!veteran.hasCreatedAt && veteran.created) {
                updates.createdAt = veteran.created;
            }
            
            // Add updatedAt if missing
            if (!veteran.hasUpdatedAt && veteran.updated) {
                updates.updatedAt = veteran.updated;
            }
            
            // Apply updates
            await db.collection('wall_items').doc(veteran.docId).update(updates);
            
            console.log(`  ✅ Fixed: ${veteran.name}`);
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
    
    let withCreatedAt = 0;
    let withUpdatedAt = 0;
    let withBoth = 0;
    
    verifySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) withCreatedAt++;
        if (data.updatedAt) withUpdatedAt++;
        if (data.createdAt && data.updatedAt) withBoth++;
    });
    
    console.log(`Total veterans: ${verifySnapshot.size}`);
    console.log(`Veterans with createdAt: ${withCreatedAt}`);
    console.log(`Veterans with updatedAt: ${withUpdatedAt}`);
    console.log(`Veterans with BOTH timestamps: ${withBoth}`);
    
    if (withBoth === verifySnapshot.size) {
        console.log('\n✅ SUCCESS! All veterans now have createdAt and updatedAt fields.');
        console.log('The app should now show all 579 veterans!');
    } else {
        console.log(`\n⚠️  Still missing: ${verifySnapshot.size - withBoth} veterans without both timestamps.`);
    }
    
    process.exit(0);
}

fixTimestamps().catch(console.error);