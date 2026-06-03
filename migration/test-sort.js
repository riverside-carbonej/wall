#!/usr/bin/env node
/** READ-ONLY. Validates the sort feature's exact comparator logic against LIVE data
 *  for the Alumni (Alumnus) and Veterans (Veteran) pages. No writes. */
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
const db = admin.firestore();

// --- mirror of component logic ---
const isEmpty = v => v===undefined||v===null||v===''||(Array.isArray(v)&&v.length===0);
const get = (it, f) => (it.fieldData||it.data||{})[f];
function sortItems(items, field, type, dir) {
  const present = items.map(it=>get(it,field)).filter(v=>!isEmpty(v));
  const numericText = type!=='date' && present.length>0 && present.every(v=>!isNaN(Number(v)));
  const d = dir==='asc'?1:-1;
  return [...items].sort((a,b)=>{
    const va=get(a,field), vb=get(b,field), ea=isEmpty(va), eb=isEmpty(vb);
    if(ea&&eb)return 0; if(ea)return 1; if(eb)return -1;
    let r;
    if(type==='number'||numericText) r=Number(va)-Number(vb);
    else if(type==='date') r=new Date(va).getTime()-new Date(vb).getTime();
    else r=String(va).localeCompare(String(vb),undefined,{sensitivity:'base',numeric:true});
    return r*d;
  });
}
const show = (items, field, n=5) => items.slice(0,n).map(it=>{const v=get(it,field); return isEmpty(v)?'∅':v;}).join(' , ');
const tail = (items, field, n=3) => items.slice(-n).map(it=>{const v=get(it,field); return isEmpty(v)?'∅':v;}).join(' , ');

async function load(wallId, otId){
  const s=await db.collection('wall_items').where('wallId','==',wallId).get();
  return s.docs.map(d=>d.data()).filter(x=>x.objectTypeId===otId);
}
(async()=>{
  // ALUMNI
  const al = await load('dzwsujrWYLvznCJElpri','ot_1757607682911_brfg8d3ft');
  console.log(`\n===== ALUMNI / Alumnus (${al.length}) =====`);
  let r = sortItems(al,'name','text','asc');
  console.log('name ASC  first:', show(r,'name'));
  console.log('name DESC first:', show(sortItems(al,'name','text','desc'),'name'));
  r = sortItems(al,'inductionYear','number','asc');
  console.log('inductionYear ASC :', show(r,'inductionYear'), ' ... last:', tail(r,'inductionYear'));
  r = sortItems(al,'graduationYear','number','asc');
  console.log('Class Year ASC (68% fill) first:', show(r,'graduationYear'), ' ... LAST (blanks?):', tail(r,'graduationYear'));
  console.log('  blanks-last check: last 3 should be ∅ →', tail(r,'graduationYear').split(' , ').every(x=>x==='∅'));

  // VETERANS
  const vt = await load('Fkzc5Kh7gMpyTEm5Cl6d', (await db.collection('walls').doc('Fkzc5Kh7gMpyTEm5Cl6d').get()).data().objectTypes.find(o=>o.name==='Veteran').id);
  console.log(`\n===== VETERANS / Veteran (${vt.length}) =====`);
  console.log('name ASC  first:', show(sortItems(vt,'name','text','asc'),'name'));
  r = sortItems(vt,'graduationYear','text','asc');   // stored as TEXT but numeric
  console.log('Graduation Year ASC (text→numeric) first:', show(r,'graduationYear'), ' ... last:', tail(r,'graduationYear'));
  console.log('  numeric-not-string check: first value should be the smallest year →', show(r,'graduationYear',1));
  r = sortItems(vt,'rank','text','asc');             // 55% fill
  console.log('Military Rank ASC (55% fill) ... LAST 3 (blanks?):', tail(r,'rank'));
  console.log('  blanks-last check:', tail(r,'rank').split(' , ').every(x=>x==='∅'));
  process.exit(0);
})().catch(e=>{console.error('ERROR:',e);process.exit(1);});
