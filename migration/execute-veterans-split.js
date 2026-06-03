#!/usr/bin/env node
/**
 * Veterans name migration:
 *  1. Backup all Veteran items
 *  2. Register firstName/lastName/maidenName fields on the Veteran object type (optional)
 *  3. Populate those fields per record from parse(name) — `name` is NEVER modified (lossless)
 *  4. Delete the image-less Dolan duplicate (keep the one with the photo)
 *  5. Verify
 * Scoped to the Veterans wall + Veteran object type only.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { parse } = require('./veterans-split.js');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();

const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';
const DUP_DELETE_ID = '6mtwqM7BjrwwlyoVmHzq'; // "Jerry (gerald) Dolan" (0 images); keep kf04 (has image)
const NEW_FIELDS = [
  { id: 'firstName',  name: 'First Name',  type: 'text', required: false, placeholder: 'First name' },
  { id: 'lastName',   name: 'Last Name',   type: 'text', required: false, placeholder: 'Last name' },
  { id: 'maidenName', name: 'Maiden Name', type: 'text', required: false, placeholder: 'Maiden name' },
];

(async () => {
  const wallRef = db.collection('walls').doc(WALL_ID);
  const wall = (await wallRef.get()).data();
  const ot = (wall.objectTypes || []).find(o => o.name === 'Veteran');
  if (!ot) throw new Error('Veteran object type not found — abort');
  const OT_ID = ot.id;
  console.log('Veteran object type:', OT_ID);

  const snap = await db.collection('wall_items').where('wallId', '==', WALL_ID).get();
  const vets = snap.docs.filter(d => d.data().objectTypeId === OT_ID);
  console.log('Veteran items:', vets.length);

  // 1) BACKUP
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (!fs.existsSync(path.resolve(__dirname, 'backups'))) fs.mkdirSync(path.resolve(__dirname, 'backups'));
  const backupPath = path.resolve(__dirname, `backups/veterans-${ts}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(vets.map(d => ({ id: d.id, data: d.data() })), null, 2));
  console.log('1) Backed up', vets.length, 'items ->', backupPath);

  // 2) SCHEMA
  const existing = new Set((ot.fields || []).map(f => f.id));
  let added = 0;
  NEW_FIELDS.forEach(f => { if (!existing.has(f.id)) { ot.fields.push(f); added++; console.log('   + field', f.id); } });
  if (added) { await wallRef.update({ objectTypes: wall.objectTypes, updatedAt: admin.firestore.Timestamp.now() });
    console.log('2) Schema updated (+' + added + ' fields).'); }
  else console.log('2) Schema already has the fields.');

  // 3) POPULATE (name untouched)
  let batch = db.batch(), n = 0, written = 0;
  let lossErrors = 0;
  for (const d of vets) {
    if (d.id === DUP_DELETE_ID) continue; // will be deleted
    const f = d.data().fieldData || {};
    const p = parse(f.name);
    // losslessness guard: we only ADD fields, never change name
    if (p.original !== (f.name || '').toString()) { lossErrors++; console.warn('   ! name mismatch', d.id); }
    batch.update(d.ref, {
      'fieldData.firstName': p.first,
      'fieldData.lastName': p.last,
      'fieldData.maidenName': p.maiden,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    written++; n++;
    if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
  }
  if (n > 0) await batch.commit();
  console.log('3) Populated first/last/maiden on', written, 'items. lossErrors:', lossErrors);

  // 4) DEDUP
  const dupRef = db.collection('wall_items').doc(DUP_DELETE_ID);
  const dup = await dupRef.get();
  if (dup.exists && dup.data().wallId === WALL_ID && /dolan/i.test(dup.data().fieldData?.name || '')) {
    await dupRef.delete();
    console.log('4) Deleted duplicate', DUP_DELETE_ID, `("${dup.data().fieldData?.name}")`);
  } else console.log('4) Duplicate not deleted (already gone or mismatch).');

  // 5) VERIFY
  const after = await db.collection('wall_items').where('wallId', '==', WALL_ID).get();
  const v2 = after.docs.filter(d => d.data().objectTypeId === OT_ID);
  const withFirst = v2.filter(d => (d.data().fieldData?.firstName || '') !== '').length;
  const withLast = v2.filter(d => (d.data().fieldData?.lastName || '') !== '').length;
  const withMaiden = v2.filter(d => (d.data().fieldData?.maidenName || '') !== '').length;
  console.log('\n=== VERIFY ===');
  console.log('Veteran items now:', v2.length, '(expected 578)');
  console.log('firstName filled:', withFirst, '| lastName filled:', withLast, '| maidenName filled:', withMaiden);
  console.log('backup:', backupPath);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
