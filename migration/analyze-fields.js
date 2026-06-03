#!/usr/bin/env node
/** READ-ONLY. For each given wall: per object type, list fields (display name, type)
 *  with fill-rate, distinct count, and samples — i.e. exactly what a sort dropdown
 *  would offer and how robust each option is. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();

const SORTABLE = new Set(['text','number','date','email','url','select']);
const NOTSORT  = new Set(['file','location','relationship','entity','multiselect','richtext','longtext','boolean','color','daterange','numberrange']);

const isEmpty = v => v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0);
const fmt = v => { if (v&&typeof v==='object') return JSON.stringify(v).slice(0,30); const s=String(v); return s.length>22?s.slice(0,22)+'…':s; };

(async () => {
  const wallIds = process.argv.slice(2);
  for (const wallId of wallIds) {
    const wall = (await db.collection('walls').doc(wallId).get()).data();
    const snap = await db.collection('wall_items').where('wallId','==',wallId).get();
    const items = snap.docs.map(d=>d.data());
    console.log(`\n================ ${wall.name}  (${wallId})  ${items.length} items ================`);
    for (const ot of (wall.objectTypes||[])) {
      const its = items.filter(i=>i.objectTypeId===ot.id);
      console.log(`\n  OBJECT TYPE: ${ot.name}  (${its.length} items)   primaryField=${ot.displaySettings?.primaryField}`);
      console.log(`  ${'field (display name)'.padEnd(28)} ${'id'.padEnd(18)} ${'type'.padEnd(12)} ${'fill'.padEnd(11)} ${'distinct'.padEnd(8)} samples`);
      for (const f of (ot.fields||[])) {
        const vals = its.map(i=>(i.fieldData||i.data||{})[f.id]);
        const filled = vals.filter(v=>!isEmpty(v));
        const distinct = [...new Set(filled.map(v=>typeof v==='object'?JSON.stringify(v):String(v)))];
        const pct = its.length? Math.round(filled.length/its.length*100):0;
        const tag = SORTABLE.has(f.type)?'sort✓':(NOTSORT.has(f.type)?'skip✗':'?');
        const samp = distinct.slice(0,3).map(fmt).join(' | ');
        console.log(`  ${(f.name||f.id).padEnd(28)} ${f.id.padEnd(18)} ${(f.type+' '+tag).padEnd(12)} ${(filled.length+'/'+its.length+' '+pct+'%').padEnd(11)} ${String(distinct.length).padEnd(8)} ${samp}`);
      }
    }
  }
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
