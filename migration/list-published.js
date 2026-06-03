#!/usr/bin/env node
/** READ-ONLY. Lists published walls with item counts to identify the prod walls. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
(async () => {
  const walls = await db.collection('walls').get();
  const items = await db.collection('wall_items').get();
  const cnt = {}; items.forEach(d => { const w=d.data().wallId; cnt[w]=(cnt[w]||0)+1; });
  const rows = [];
  walls.forEach(doc => {
    const w = doc.data();
    rows.push({ id: doc.id, name: w.name, pub: !!(w.visibility?.isPublished),
      login: !!(w.visibility?.requiresLogin), items: cnt[doc.id]||0,
      owner: w.permissions?.owner||'' });
  });
  rows.sort((a,b)=>b.items-a.items);
  console.log('PUBLISHED walls (sorted by item count):');
  rows.filter(r=>r.pub).forEach(r=>console.log(`  ${r.items.toString().padStart(4)}  ${r.id}  pub=${r.pub} login=${r.login}  "${r.name}"`));
  console.log('\nTop 8 walls by item count (any status):');
  rows.slice(0,8).forEach(r=>console.log(`  ${r.items.toString().padStart(4)}  ${r.id}  pub=${r.pub}  "${r.name}"`));
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
