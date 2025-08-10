#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function compareStructures() {
    console.log('🔍 COMPARING OLD VS NEW VETERAN STRUCTURES\n');
    console.log('='.repeat(60));
    
    const snapshot = await db.collection('wall_items')
        .where('wallId', '==', WALL_ID)
        .where('objectTypeId', '==', 'veteran')
        .get();
    
    const veterans = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        veterans.push({
            id: doc.id,
            data: data,
            created: data.created,
            name: data.fieldData?.name || '[NO NAME]'
        });
    });
    
    // Sort by creation date
    veterans.sort((a, b) => {
        if (!a.created) return 1;
        if (!b.created) return -1;
        return a.created.toMillis() - b.created.toMillis();
    });
    
    // Get 20 oldest and 20 newest
    const oldest20 = veterans.slice(0, 20);
    const newest20 = veterans.slice(-20);
    
    // Analyze structure differences
    console.log('📊 OLDEST 20 VETERANS (likely working in app):\n');
    const oldestFields = new Set();
    oldest20.forEach(v => {
        Object.keys(v.data).forEach(k => oldestFields.add(k));
    });
    console.log('Fields present:', Array.from(oldestFields).sort().join(', '));
    
    // Check a sample
    console.log('\nSample oldest veteran structure:');
    const oldSample = oldest20[0];
    console.log('  Name:', oldSample.name);
    console.log('  ID:', oldSample.id);
    Object.keys(oldSample.data).forEach(key => {
        if (key !== 'fieldData') {
            const value = oldSample.data[key];
            const valueStr = value === null ? 'null' : 
                           value === undefined ? 'undefined' :
                           typeof value === 'object' ? JSON.stringify(value).substring(0, 50) :
                           String(value).substring(0, 50);
            console.log(`  ${key}:`, valueStr);
        }
    });
    
    console.log('\n📊 NEWEST 20 VETERANS (possibly not showing):\n');
    const newestFields = new Set();
    newest20.forEach(v => {
        Object.keys(v.data).forEach(k => newestFields.add(k));
    });
    console.log('Fields present:', Array.from(newestFields).sort().join(', '));
    
    // Check a sample
    console.log('\nSample newest veteran structure:');
    const newSample = newest20[19];
    console.log('  Name:', newSample.name);
    console.log('  ID:', newSample.id);
    Object.keys(newSample.data).forEach(key => {
        if (key !== 'fieldData') {
            const value = newSample.data[key];
            const valueStr = value === null ? 'null' : 
                           value === undefined ? 'undefined' :
                           typeof value === 'object' ? JSON.stringify(value).substring(0, 50) :
                           String(value).substring(0, 50);
            console.log(`  ${key}:`, valueStr);
        }
    });
    
    // Find missing fields
    console.log('\n⚠️  FIELDS MISSING IN NEW VETERANS:');
    const missingInNew = Array.from(oldestFields).filter(f => !newestFields.has(f));
    if (missingInNew.length > 0) {
        console.log('  Missing:', missingInNew.join(', '));
    } else {
        console.log('  None - all fields present');
    }
    
    console.log('\n⚠️  EXTRA FIELDS IN NEW VETERANS:');
    const extraInNew = Array.from(newestFields).filter(f => !oldestFields.has(f));
    if (extraInNew.length > 0) {
        console.log('  Extra:', extraInNew.join(', '));
    } else {
        console.log('  None');
    }
    
    // Check specific important fields
    console.log('\n🔍 CHECKING KEY FIELDS:');
    
    const keyFields = ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'primaryImageIndex'];
    
    keyFields.forEach(field => {
        const inOld = oldest20.filter(v => v.data[field] !== undefined).length;
        const inNew = newest20.filter(v => v.data[field] !== undefined).length;
        
        if (inOld !== inNew) {
            console.log(`  ${field}: ${inOld}/20 old vs ${inNew}/20 new`);
        }
    });
    
    // Check if 'id' field is the issue
    console.log('\n🔴 CRITICAL: Checking "id" field (might be required by app):');
    const withIdField = veterans.filter(v => v.data.id !== undefined).length;
    const withoutIdField = veterans.filter(v => v.data.id === undefined).length;
    console.log(`  Veterans WITH 'id' field: ${withIdField}`);
    console.log(`  Veterans WITHOUT 'id' field: ${withoutIdField}`);
    
    if (withoutIdField === 20) {
        console.log('\n  ⚠️  FOUND THE ISSUE! Exactly 20 veterans missing "id" field!');
        console.log('  These are likely the 20 not showing in the app.\n');
        
        console.log('  Veterans missing "id" field:');
        veterans.filter(v => v.data.id === undefined).slice(0, 20).forEach(v => {
            console.log(`    - ${v.name}`);
        });
    }
    
    process.exit(0);
}

compareStructures().catch(console.error);