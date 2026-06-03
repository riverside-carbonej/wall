#!/usr/bin/env node
/** READ-ONLY. Assess whether Veteran `name` can be reliably split into first/last. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
const SUFFIX = /^(jr|sr|ii|iii|iv|v|phd|md|esq)\.?$/i;

(async () => {
  const wall = (await db.collection('walls').doc('Fkzc5Kh7gMpyTEm5Cl6d').get()).data();
  const otId = wall.objectTypes.find(o => o.name === 'Veteran').id;
  const snap = await db.collection('wall_items').where('wallId','==','Fkzc5Kh7gMpyTEm5Cl6d').get();
  const names = snap.docs.map(d=>d.data()).filter(x=>x.objectTypeId===otId)
    .map(x=>(x.fieldData?.name ?? '').toString().trim());

  const tokenCounts = {};
  const suffixed = [], single = [], empty = [], manyToken = [];
  names.forEach(n => {
    if (!n) { empty.push(n); return; }
    const t = n.split(/\s+/);
    tokenCounts[t.length] = (tokenCounts[t.length]||0)+1;
    if (t.length === 1) single.push(n);
    if (t.length >= 4) manyToken.push(n);
    if (SUFFIX.test(t[t.length-1])) suffixed.push(n);
  });

  const derive = n => { const t=n.split(/\s+/); let last=t[t.length-1];
    if (SUFFIX.test(last) && t.length>1) last=t[t.length-2];
    return { first: t[0], last }; };

  console.log('Total Veteran names:', names.length);
  console.log('Token-count distribution:', JSON.stringify(tokenCounts));
  console.log('Empty:', empty.length, '| Single-token:', single.length, '| Suffix-ending:', suffixed.length, '| 4+ tokens:', manyToken.length);
  console.log('\nSingle-token (no last name derivable):', single.slice(0,20).join(' | ') || '(none)');
  console.log('\nSuffix-ending examples:', suffixed.slice(0,10).join(' | ') || '(none)');
  console.log('\n4+ token examples:', manyToken.slice(0,12).join(' | ') || '(none)');
  console.log('\nSample derivations (first | last):');
  names.slice(0, 12).forEach(n => { const d=derive(n); console.log(`  "${n}"  ->  ${d.first} | ${d.last}`); });
  console.log('\nLast-name sort preview (first 12 by derived last):');
  [...names].filter(Boolean).sort((a,b)=>derive(a).last.localeCompare(derive(b).last,undefined,{sensitivity:'base'}))
    .slice(0,12).forEach(n=>console.log('  ', n, ' => last:', derive(n).last));
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
