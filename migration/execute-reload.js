#!/usr/bin/env node
/**
 * Executes the Alumni Hall of Fame wall reload:
 *   1. Backup current items   2. Schema add (maidenName, inductionYear, Athletic Coach option)
 *   3. Scoped delete (allowlist, per-doc wallId re-check)   4. Insert 168 clean   5. Verify
 * Scoped strictly to wallId dzwsujrWYLvznCJElpri.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();

const WALL_ID = 'dzwsujrWYLvznCJElpri';
const OT_ID = 'ot_1757607682911_brfg8d3ft';
const OWNER = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';
const allowlist = require('./delete-allowlist.json');     // {wallId, ids:[162]}
const inserts = require('./alumni-insert-preview.json');  // 168 fieldData objects

(async () => {
  if (allowlist.wallId !== WALL_ID) throw new Error('allowlist wallId mismatch — abort');
  console.log(`Target wall: ${WALL_ID} | to-delete: ${allowlist.ids.length} | to-insert: ${inserts.length}`);

  // 1) BACKUP --------------------------------------------------------------
  const snap = await db.collection('wall_items').where('wallId','==',WALL_ID).get();
  const backup = snap.docs.map(d => ({ id: d.id, data: d.data() }));
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  if (!fs.existsSync(path.resolve(__dirname,'backups'))) fs.mkdirSync(path.resolve(__dirname,'backups'));
  const backupPath = path.resolve(__dirname, `backups/alumni-${ts}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`1) Backed up ${backup.length} items -> ${backupPath}`);

  // 2) SCHEMA --------------------------------------------------------------
  const wallRef = db.collection('walls').doc(WALL_ID);
  const wall = (await wallRef.get()).data();
  const ots = wall.objectTypes || [];
  const ot = ots.find(o => o.id === OT_ID);
  if (!ot) throw new Error('object type not found — abort');
  const fids = new Set((ot.fields||[]).map(f=>f.id));
  let schemaChanged = false;
  if (!fids.has('maidenName')) {
    ot.fields.push({ id:'maidenName', name:'Maiden Name', type:'text', required:false, placeholder:'Maiden name' });
    schemaChanged = true; console.log('   + added field maidenName');
  }
  if (!fids.has('inductionYear')) {
    ot.fields.push({ id:'inductionYear', name:'Year of Induction', type:'number', required:false, placeholder:'Induction year' });
    schemaChanged = true; console.log('   + added field inductionYear');
  }
  const catField = ot.fields.find(f=>f.id==='category');
  if (catField && Array.isArray(catField.options) && !catField.options.includes('Athletic Coach')) {
    catField.options.push('Athletic Coach');
    schemaChanged = true; console.log('   + added category option "Athletic Coach"');
  }
  if (schemaChanged) {
    await wallRef.update({ objectTypes: ots, updatedAt: admin.firestore.Timestamp.now() });
    console.log('2) Schema updated.');
  } else { console.log('2) Schema already up to date.'); }

  // 3) DELETE (scoped, per-doc re-check) -----------------------------------
  let deleted = 0, skipped = 0;
  let batch = db.batch(), n = 0;
  for (const id of allowlist.ids) {
    const ref = db.collection('wall_items').doc(id);
    const doc = await ref.get();
    if (!doc.exists) { skipped++; continue; }
    if (doc.data().wallId !== WALL_ID) { skipped++; console.warn('   ! skip wrong-wall doc', id); continue; }
    batch.delete(ref); deleted++; n++;
    if (n >= 450) { await batch.commit(); batch = db.batch(); n = 0; }
  }
  if (n > 0) await batch.commit();
  console.log(`3) Deleted ${deleted} items (skipped ${skipped}).`);

  // 4) INSERT 168 ----------------------------------------------------------
  const now = admin.firestore.Timestamp.now();
  let inserted = 0; batch = db.batch(); n = 0;
  for (const fieldData of inserts) {
    const ref = db.collection('wall_items').doc();
    batch.set(ref, { wallId: WALL_ID, objectTypeId: OT_ID, fieldData,
      images: [], createdAt: now, updatedAt: now, createdBy: OWNER, updatedBy: OWNER });
    inserted++; n++;
    if (n >= 450) { await batch.commit(); batch = db.batch(); n = 0; }
  }
  if (n > 0) await batch.commit();
  console.log(`4) Inserted ${inserted} items.`);

  // 5) VERIFY --------------------------------------------------------------
  const after = await db.collection('wall_items').where('wallId','==',WALL_ID).get();
  const byCat = {}; let blankName = 0, withInd = 0;
  after.forEach(d => { const f=d.data().fieldData||{}; byCat[f.category]=(byCat[f.category]||0)+1;
    if(!f.name) blankName++; if(f.inductionYear) withInd++; });
  console.log('\n=== VERIFY ===');
  console.log('items now in wall :', after.size, '(expected 168)');
  console.log('by category       :', JSON.stringify(byCat));
  console.log('blank name        :', blankName, '(expected 0)');
  console.log('with inductionYear:', withInd, '(expected 168)');
  console.log('backup for rollback:', backupPath);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
