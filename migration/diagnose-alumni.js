#!/usr/bin/env node
/**
 * READ-ONLY diagnostic. Lists all walls, their object types/fields, and
 * counts wall_items per wall + per object type. Identifies the Alumni wall.
 * Does NOT write anything.
 */
const admin = require('firebase-admin');
const path = require('path');

const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();

(async () => {
  const wallsSnap = await db.collection('walls').get();
  console.log(`\n=== WALLS (${wallsSnap.size}) ===`);

  // Count all wall_items grouped by wallId + objectTypeId
  const itemsSnap = await db.collection('wall_items').get();
  const countByWall = {};            // wallId -> total
  const countByWallType = {};        // wallId -> { objectTypeId -> n }
  itemsSnap.forEach(d => {
    const it = d.data();
    const w = it.wallId || '(none)';
    const t = it.objectTypeId || '(none)';
    countByWall[w] = (countByWall[w] || 0) + 1;
    (countByWallType[w] = countByWallType[w] || {})[t] = (countByWallType[w][t] || 0) + 1;
  });

  wallsSnap.forEach(doc => {
    const w = doc.data();
    console.log(`\n----------------------------------------------------------------`);
    console.log(`Wall ID : ${doc.id}`);
    console.log(`Name    : ${w.name}`);
    console.log(`Org     : ${w.organizationName || 'N/A'}`);
    console.log(`Items   : ${countByWall[doc.id] || 0}`);
    (w.objectTypes || []).forEach(ot => {
      const n = (countByWallType[doc.id] || {})[ot.id] || 0;
      const fields = (ot.fields || []).map(f => `${f.id}:${f.type}`).join(', ');
      console.log(`  • objectType "${ot.name}" (id=${ot.id})  items=${n}`);
      console.log(`      primaryField=${ot.displaySettings?.primaryField}  secondary=${ot.displaySettings?.secondaryField}`);
      console.log(`      fields=[${fields}]`);
    });
  });

  // Orphan items (wallId not matching any wall)
  const wallIds = new Set(wallsSnap.docs.map(d => d.id));
  const orphans = Object.keys(countByWall).filter(w => !wallIds.has(w));
  if (orphans.length) {
    console.log(`\n=== ORPHAN item groups (wallId has no wall doc) ===`);
    orphans.forEach(w => console.log(`  wallId=${w}  items=${countByWall[w]}`));
  }
  console.log(`\nTOTAL wall_items in collection: ${itemsSnap.size}`);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
