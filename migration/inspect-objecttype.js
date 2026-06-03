#!/usr/bin/env node
/** READ-ONLY. Prints the prod Alumni wall's object types + field defs + display settings. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
const WALL_ID = 'dzwsujrWYLvznCJElpri';
(async () => {
  const wall = (await db.collection('walls').doc(WALL_ID).get()).data();
  console.log('Wall name:', wall.name, '| visibility/published:', JSON.stringify(wall.visibility||wall.published||wall.status||'?'));
  console.log('permissions:', JSON.stringify(wall.permissions));
  (wall.objectTypes||[]).forEach(ot => {
    console.log('\nObjectType id=', ot.id, ' name=', ot.name);
    console.log('  displaySettings:', JSON.stringify(ot.displaySettings));
    console.log('  fields:');
    (ot.fields||[]).forEach(f => console.log('    -', f.id, '|', f.type, '| required:', f.required, '| name:', f.name));
  });
  // objectTypeId distribution on items
  const snap = await db.collection('wall_items').where('wallId','==',WALL_ID).get();
  const ot = {}; snap.forEach(d => { const t=d.data().objectTypeId||'(none)'; ot[t]=(ot[t]||0)+1; });
  console.log('\nitem objectTypeId distribution:', JSON.stringify(ot));
  // which record has degree
  snap.forEach(d=>{ const f=d.data().fieldData||{}; if(f.degree) console.log('record with degree:', d.id, JSON.stringify({name:f.name,degree:f.degree})); });
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
