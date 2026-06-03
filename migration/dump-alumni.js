#!/usr/bin/env node
/** READ-ONLY. Dumps all items of the Alumni Hall of Fame wall as JSON to stdout. */
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
    const it = d.data();
    const f = it.fieldData || it.data || {};
    rows.push({
      id: d.id,
      objectTypeId: it.objectTypeId,
      firstName: f.firstName ?? '',
      lastName: f.lastName ?? '',
      maidenName: f.maidenName ?? '',
      graduationYear: f.graduationYear ?? '',
      profession: f.profession ?? '',
      currentLocation: f.currentLocation ?? '',
      email: f.email ?? '',
      achievements: typeof f.achievements === 'string' ? f.achievements.slice(0, 60) : f.achievements,
      otherKeys: Object.keys(f).filter(k => !['firstName','lastName','maidenName','graduationYear','profession','currentLocation','email','achievements'].includes(k)),
    });
  });
  console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
