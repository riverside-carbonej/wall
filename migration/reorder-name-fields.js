#!/usr/bin/env node
/** Reorder object-type fields so order is: <primaryField/name>, firstName, lastName,
 *  maidenName, then the rest (original order). Schema-only; no item data touched.
 *  Backs up wall docs first. Targets the Veterans Veteran + Alumni Alumnus types. */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();

const TARGETS = [
  { wallId: 'Fkzc5Kh7gMpyTEm5Cl6d', otName: 'Veteran' },
  { wallId: 'dzwsujrWYLvznCJElpri', otName: 'Alumnus' },
];
const LEAD = ['firstName', 'lastName', 'maidenName']; // placed right after the primary/name field

(async () => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (!fs.existsSync(path.resolve(__dirname, 'backups'))) fs.mkdirSync(path.resolve(__dirname, 'backups'));

  for (const t of TARGETS) {
    const ref = db.collection('walls').doc(t.wallId);
    const wall = (await ref.get()).data();
    const ot = (wall.objectTypes || []).find(o => o.name === t.otName);
    if (!ot) { console.log(`! ${t.otName} not found in ${t.wallId}`); continue; }

    fs.writeFileSync(path.resolve(__dirname, `backups/objecttypes-${t.otName}-${ts}.json`), JSON.stringify(ot, null, 2));

    const fields = ot.fields || [];
    const primary = ot.displaySettings?.primaryField;
    const byId = Object.fromEntries(fields.map(f => [f.id, f]));
    const order = [];
    const used = new Set();
    const push = id => { if (byId[id] && !used.has(id)) { order.push(byId[id]); used.add(id); } };

    push(primary);                 // name / display field first
    LEAD.forEach(push);            // firstName, lastName, maidenName
    fields.forEach(f => push(f.id)); // everything else, original order

    const before = fields.map(f => f.id);
    const after = order.map(f => f.id);
    console.log(`\n=== ${t.otName} (${t.wallId}) ===`);
    console.log('  before:', before.join(', '));
    console.log('  after :', after.join(', '));

    if (before.join(',') === after.join(',')) { console.log('  (no change)'); continue; }
    ot.fields = order;
    await ref.update({ objectTypes: wall.objectTypes, updatedAt: admin.firestore.Timestamp.now() });
    console.log('  ✓ reordered & saved');
  }
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
