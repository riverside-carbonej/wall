#!/usr/bin/env node
/** READ-ONLY. (1) Prints category/deceased select options. (2) Proves the delete
 *  scope: lists the exact wall_items doc IDs belonging ONLY to the Alumni wall,
 *  re-verifies each doc's wallId, and shows other walls are unaffected.
 *  Writes the verified allowlist to delete-allowlist.json for the eventual delete. */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
const WALL_ID = 'dzwsujrWYLvznCJElpri';

(async () => {
  // --- select options ---
  const wall = (await db.collection('walls').doc(WALL_ID).get()).data();
  const ot = (wall.objectTypes||[]).find(o => o.id === 'ot_1757607682911_brfg8d3ft');
  ['category','deceased'].forEach(fid => {
    const f = (ot.fields||[]).find(x => x.id === fid);
    console.log(`select "${fid}" options:`, JSON.stringify(f && (f.multiselectConfig?.options || f.options || f.selectConfig?.options || '(no options array found)')));
    console.log(`   raw field config:`, JSON.stringify(f));
  });

  // --- delete scope proof ---
  const snap = await db.collection('wall_items').where('wallId','==',WALL_ID).get();
  const ids = snap.docs.map(d => d.id);
  // paranoia re-check: every doc truly has this wallId
  const mismatches = snap.docs.filter(d => d.data().wallId !== WALL_ID);
  console.log('\n=== DELETE SCOPE ===');
  console.log('wallId targeted        :', WALL_ID, '(', wall.name, ')');
  console.log('docs matching wallId   :', ids.length);
  console.log('docs with WRONG wallId :', mismatches.length, '(must be 0)');

  // total collection + a few other walls to show isolation
  const all = await db.collection('wall_items').get();
  const byWall = {}; all.forEach(d => { const w=d.data().wallId; byWall[w]=(byWall[w]||0)+1; });
  console.log('total wall_items in collection :', all.size);
  console.log('items that are NOT in this wall :', all.size - ids.length, '(these stay untouched)');
  console.log('this wall as fraction          :', ids.length + ' of ' + all.size);
  console.log('sample of OTHER walls (unaffected):');
  Object.entries(byWall).filter(([w])=>w!==WALL_ID).slice(0,5).forEach(([w,n])=>console.log('   wall', w, '->', n, 'items'));

  fs.writeFileSync(path.resolve(__dirname,'delete-allowlist.json'),
    JSON.stringify({ wallId: WALL_ID, objectTypeId: 'ot_1757607682911_brfg8d3ft', count: ids.length, ids }, null, 2));
  console.log('\nWrote delete-allowlist.json with', ids.length, 'verified IDs (used by the scoped delete).');
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
