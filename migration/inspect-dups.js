#!/usr/bin/env node
/** READ-ONLY. Dump full fieldData for the suspected duplicate / test-entry records. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
const TARGETS = [/dolan/i, /script blank/i];
(async () => {
  const snap = await db.collection('wall_items').where('wallId','==','Fkzc5Kh7gMpyTEm5Cl6d').get();
  snap.docs.forEach(d => {
    const f = d.data().fieldData || {};
    const name = (f.name||'').toString();
    if (TARGETS.some(re => re.test(name))) {
      console.log('\n--- id:', d.id, '---');
      console.log('  images:', (d.data().images||[]).length);
      Object.entries(f).forEach(([k,v]) => { if (v!==''&&v!=null&&!(Array.isArray(v)&&!v.length)) console.log(`  ${k}:`, JSON.stringify(v).slice(0,80)); });
    }
  });
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
