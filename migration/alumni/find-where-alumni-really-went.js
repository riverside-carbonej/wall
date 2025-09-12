const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findWhereAlumniReallyWent() {
  try {
    console.log('🔍 FINDING WHERE OUR 162 ALUMNI ACTUALLY WENT\n');
    
    const alumniWallId = 'dzwsujrWYLvznCJElpri';
    
    // First, let's see what's actually in our target wall
    console.log('1. What is ACTUALLY in the target alumni wall:');
    const targetWallItems = await db.collection('wall-items')
      .where('wallId', '==', alumniWallId)
      .get();
    
    console.log(`   Items in target wall: ${targetWallItems.size}`);
    
    if (targetWallItems.size <= 5) {
      targetWallItems.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   [${index + 1}] "${data.name}" (created: ${data.createdAt?.toDate?.() || 'unknown'})`);
      });
    }
    
    // Now search for our specific alumni names across ALL walls
    console.log('\n2. Searching for our known alumni across ALL walls:');
    
    const knownAlumniNames = [
      'Anthony Montonini',
      'Gretchen Reed', 
      'Mary Thrasher*',
      '1970 Peter',
      '2001 Jason',
      '1988 Del'
    ];
    
    for (const name of knownAlumniNames) {
      console.log(`\n   Searching for "${name}":`);
      
      const itemsSnapshot = await db.collection('wall-items')
        .where('name', '==', name)
        .get();
      
      if (itemsSnapshot.size === 0) {
        console.log(`     ❌ Not found anywhere`);
      } else {
        itemsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`     ✅ Found in wall: ${data.wallId}`);
          console.log(`        Object type: ${data.objectTypeId}`);
          console.log(`        Created: ${data.createdAt?.toDate?.() || 'unknown'}`);
          console.log(`        Document ID: ${doc.id}`);
        });
      }
    }
    
    // Search for items created around the time we ran our import (Sep 11, 2025 12:45:28)
    console.log('\n3. Searching for items created around our import time (Sep 11 12:45):');
    
    const importTime = new Date('2025-09-11T12:45:00');
    const timeBefore = new Date(importTime.getTime() - 10 * 60 * 1000); // 10 minutes before
    const timeAfter = new Date(importTime.getTime() + 10 * 60 * 1000);  // 10 minutes after
    
    const timeRangeItems = await db.collection('wall-items')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(timeBefore))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(timeAfter))
      .get();
    
    console.log(`   Found ${timeRangeItems.size} items created around import time:`);
    
    const itemsByWall = {};
    timeRangeItems.docs.forEach(doc => {
      const data = doc.data();
      const wallId = data.wallId;
      
      if (!itemsByWall[wallId]) {
        itemsByWall[wallId] = [];
      }
      itemsByWall[wallId].push(data.name);
    });
    
    Object.entries(itemsByWall).forEach(([wallId, items]) => {
      console.log(`     Wall ${wallId}: ${items.length} items`);
      console.log(`       Sample: ${items.slice(0, 3).join(', ')}`);
      
      if (items.length === 162) {
        console.log(`       🎯 THIS WALL HAS 162 ITEMS - THESE ARE OUR ALUMNI!`);
      }
    });
    
    console.log('\n💡 CONCLUSION:');
    if (targetWallItems.size === 2) {
      console.log('Our alumni were NEVER imported to the target wall.');
      console.log('The import script either:');
      console.log('1. Failed silently and we didnt notice');
      console.log('2. Imported to a different wall ID');
      console.log('3. Got overwritten by subsequent operations');
      console.log('\n✅ SOLUTION: Re-run the import script to actually import the alumni!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findWhereAlumniReallyWent();