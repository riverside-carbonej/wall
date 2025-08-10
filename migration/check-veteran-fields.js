#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function checkFields() {
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    console.log(`Total veterans: ${snapshot.size}\n`);
    
    // Check all unique field names
    const allFields = new Set();
    const statusCounts = {};
    let withoutCreatedBy = 0;
    let withoutUpdatedBy = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        
        // Collect all field names
        Object.keys(data).forEach(key => allFields.add(key));
        
        // Check for various status fields
        if (data.status !== undefined) {
            const status = data.status;
            statusCounts[`status=${status}`] = (statusCounts[`status=${status}`] || 0) + 1;
        }
        
        if (data.visibility !== undefined) {
            const vis = data.visibility;
            statusCounts[`visibility=${vis}`] = (statusCounts[`visibility=${vis}`] || 0) + 1;
        }
        
        if (data.published !== undefined) {
            const pub = data.published;
            statusCounts[`published=${pub}`] = (statusCounts[`published=${pub}`] || 0) + 1;
        }
        
        if (data.isDraft !== undefined) {
            const draft = data.isDraft;
            statusCounts[`isDraft=${draft}`] = (statusCounts[`isDraft=${draft}`] || 0) + 1;
        }
        
        if (data.isVisible !== undefined) {
            const visible = data.isVisible;
            statusCounts[`isVisible=${visible}`] = (statusCounts[`isVisible=${visible}`] || 0) + 1;
        }
        
        // Check created/updated by
        if (!data.createdBy) withoutCreatedBy++;
        if (!data.updatedBy) withoutUpdatedBy++;
    });
    
    console.log('All document fields found:');
    console.log(Array.from(allFields).sort().join(', '));
    
    console.log('\nStatus-related fields:');
    Object.entries(statusCounts).forEach(([field, count]) => {
        console.log(`  ${field}: ${count} veterans`);
    });
    
    console.log('\nMissing user fields:');
    console.log(`  Without createdBy: ${withoutCreatedBy}`);
    console.log(`  Without updatedBy: ${withoutUpdatedBy}`);
    
    // Now let's specifically check the 20 most recently added
    console.log('\n20 Most Recently Created Veterans:');
    
    const veteransArray = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        veteransArray.push({
            id: doc.id,
            name: data.fieldData?.name || '[NO NAME]',
            created: data.created,
            createdBy: data.createdBy,
            year: data.fieldData?.graduationYear
        });
    });
    
    // Sort by creation date (newest first)
    veteransArray.sort((a, b) => {
        if (!a.created) return 1;
        if (!b.created) return -1;
        return b.created.toMillis() - a.created.toMillis();
    });
    
    veteransArray.slice(0, 20).forEach((v, i) => {
        const createdStr = v.created ? new Date(v.created.toMillis()).toISOString() : 'NO DATE';
        console.log(`  ${i + 1}. ${v.name} (${v.year || 'no year'})`);
        console.log(`     Created: ${createdStr}`);
        console.log(`     CreatedBy: ${v.createdBy || 'NOT SET'}`);
    });
    
    process.exit(0);
}

checkFields().catch(console.error);