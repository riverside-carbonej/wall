#!/usr/bin/env node
/** READ-ONLY. Dumps Alumni wall items with ALL relevant name fields. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();
const WALL_ID = 'dzwsujrWYLvznCJElpri';
(async () => {
  const snap = await db.collection('wall_items').where('wallId', '==', WALL_ID).get();
  const rows = [];
  snap.forEach(d => {
    const f = d.data().fieldData || d.data().data || {};
    rows.push({
      id: d.id,
      name: f.name ?? '',
      originalName: f.originalName ?? '',
      title: f.title ?? '',
      firstName: f.firstName ?? '',
      lastName: f.lastName ?? '',
      graduationYear: f.graduationYear ?? '',
    });
  });
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
