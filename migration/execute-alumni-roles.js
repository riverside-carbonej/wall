#!/usr/bin/env node
/**
 * Alumni "Role" migration (clean, no legacy left):
 *  1. Backup wall doc + all Alumni items
 *  2. Create "Role" object type + 4 Role records (with nice descriptions)
 *  3. Add entity field `role` on Alumnus (after the name fields)
 *  4. Remove legacy fields: `category` (replaced by Role) + `originalName` (import artifact),
 *     and repoint displaySettings.tertiaryField (was `category`) -> `inductionYear`
 *  5. Backfill: every inductee's role link from their old category; clear category/originalName values
 *  6. Verify
 * Scoped to the Alumni wall + Alumnus object type only.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const WALL_ID = 'dzwsujrWYLvznCJElpri';
const ALUMNUS_OT = 'ot_1757607682911_brfg8d3ft';
const ROLE_OT = 'role';
const OWNER = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';

const ROLES = [
  { name: 'Alumni',          description: 'Riverside graduates whose accomplishments and character continue to make their alma mater proud.' },
  { name: 'Athlete',         description: 'Standout competitors who left a lasting legacy in Riverside athletics.' },
  { name: 'Faculty & Staff', description: 'Teachers, mentors, and staff who shaped generations of Riverside students.' },
  { name: 'Athletic Coach',  description: 'Coaches who built winning programs and mentored student-athletes on and off the field.' },
];

(async () => {
  const now = admin.firestore.Timestamp.now();
  const wallRef = db.collection('walls').doc(WALL_ID);
  const wall = (await wallRef.get()).data();
  const alumnus = wall.objectTypes.find(o => o.id === ALUMNUS_OT);
  if (!alumnus) throw new Error('Alumnus object type not found — abort');

  const snap = await db.collection('wall_items').where('wallId', '==', WALL_ID).get();
  const items = snap.docs.filter(d => d.data().objectTypeId === ALUMNUS_OT);

  // 1) BACKUP
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (!fs.existsSync(path.resolve(__dirname, 'backups'))) fs.mkdirSync(path.resolve(__dirname, 'backups'));
  const bp = path.resolve(__dirname, `backups/alumni-roles-${ts}.json`);
  fs.writeFileSync(bp, JSON.stringify({ objectTypes: wall.objectTypes, items: items.map(d => ({ id: d.id, data: d.data() })) }, null, 2));
  console.log('1) Backed up wall schema +', items.length, 'items ->', bp);

  // 2) Create Role records first (need their IDs for the backfill)
  const roleIdByName = {};
  let b = db.batch();
  for (const r of ROLES) {
    const ref = db.collection('wall_items').doc();
    roleIdByName[r.name] = ref.id;
    b.set(ref, { wallId: WALL_ID, objectTypeId: ROLE_OT, fieldData: { name: r.name, description: r.description },
      images: [], createdAt: now, updatedAt: now, createdBy: OWNER, updatedBy: OWNER });
  }
  await b.commit();
  console.log('2) Created', ROLES.length, 'Role records:', JSON.stringify(roleIdByName));

  // 3+4) Schema: add Role object type, add role entity field, drop legacy fields, fix tertiary
  if (!wall.objectTypes.find(o => o.id === ROLE_OT)) {
    wall.objectTypes.push({
      id: ROLE_OT, name: 'Role', description: 'Hall of Fame induction role', icon: 'badge', color: '#9c27b0',
      wallId: WALL_ID, isActive: true, sortOrder: 1, createdAt: now, updatedAt: now,
      displaySettings: { primaryField: 'name', secondaryField: 'description', cardLayout: 'compact', showOnMap: false, aspectRatio: '0.90 / 1' },
      fields: [
        { id: 'name', name: 'Role', type: 'text', required: true, description: '', placeholder: '' },
        { id: 'description', name: 'Description', type: 'text', required: false, description: '', placeholder: '' },
      ],
    });
  }
  // drop legacy field defs, add role entity field right after maidenName
  alumnus.fields = alumnus.fields.filter(f => f.id !== 'category' && f.id !== 'originalName');
  if (!alumnus.fields.find(f => f.id === 'role')) {
    const roleField = { id: 'role', name: 'Role', type: 'entity', required: false, description: '', placeholder: '',
      entityConfig: { targetObjectTypeId: ROLE_OT, allowMultiple: false } };
    const idx = alumnus.fields.findIndex(f => f.id === 'maidenName');
    if (idx >= 0) alumnus.fields.splice(idx + 1, 0, roleField); else alumnus.fields.push(roleField);
  }
  if (alumnus.displaySettings?.tertiaryField === 'category') alumnus.displaySettings.tertiaryField = 'inductionYear';
  await wallRef.update({ objectTypes: wall.objectTypes, updatedAt: now });
  console.log('3+4) Schema: Role type added, role entity field added, removed category+originalName, tertiary -> inductionYear');

  // 5) Backfill role links + clear legacy values
  let batch = db.batch(), n = 0, linked = 0, unmatched = 0;
  for (const d of items) {
    const cat = (d.data().fieldData?.category || '').toString();
    const roleId = roleIdByName[cat];
    if (!roleId) { unmatched++; console.warn('   ! no role for category:', JSON.stringify(cat), d.id); }
    batch.update(d.ref, {
      'fieldData.role': roleId ? [roleId] : [],
      'fieldData.category': FieldValue.delete(),
      'fieldData.originalName': FieldValue.delete(),
      updatedAt: now,
    });
    if (roleId) linked++;
    n++; if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
  }
  if (n > 0) await batch.commit();
  console.log('5) Linked role on', linked, 'items (unmatched:', unmatched, '); cleared category+originalName');

  // 6) VERIFY
  const after = await db.collection('wall_items').where('wallId', '==', WALL_ID).get();
  const al = after.docs.filter(d => d.data().objectTypeId === ALUMNUS_OT);
  const roleItems = after.docs.filter(d => d.data().objectTypeId === ROLE_OT);
  const withRole = al.filter(d => Array.isArray(d.data().fieldData?.role) && d.data().fieldData.role.length).length;
  const stillCat = al.filter(d => d.data().fieldData?.category !== undefined).length;
  const w2 = (await wallRef.get()).data();
  const al2 = w2.objectTypes.find(o => o.id === ALUMNUS_OT);
  console.log('\n=== VERIFY ===');
  console.log('Role records:', roleItems.length, '(expected 4)');
  console.log('Alumni items:', al.length, '| with role link:', withRole, '| still have category:', stillCat, '(expected 0)');
  console.log('Alumnus fields now:', al2.fields.map(f => f.id).join(', '));
  console.log('objectTypes now:', w2.objectTypes.map(o => o.name).join(', '));
  console.log('backup:', bp);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
