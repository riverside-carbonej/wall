#!/usr/bin/env node
/**
 * READ-ONLY. Builds alumni-comparison.csv: every Firestore Alumni item with its
 * CURRENT (old) values next to the PROPOSED (new) values matched from the
 * authoritative HOF table (master-paste.txt). Also lists master entries with no
 * Firestore match (to ADD). Writes nothing to Firestore.
 */
const fs = require('fs');
const path = require('path');
const master = require('./parse-master.js');           // 168 authoritative records
const items = require('./alumni-raw.json');             // 162 Firestore items

const norm = s => (s||'').toString().toLowerCase()
  .replace(/["'`.,*^]/g,'').replace(/\bjr\b|\bphd\b|\bsr\b/g,'')
  .replace(/\s+/g,' ').trim();
const cleanName = s => (s||'').toString()
  .replace(/\*|\^/g,'')
  .replace(/^coach\/?\d*\s+/i,'').replace(/^coach\s+/i,'')
  .replace(/^\d{4}\s+/,'').replace(/\s+\d{4}$/,'').replace(/category$/i,'').trim();

// Firestore candidate name (most complete of name/originalName)
function fsBest(it) {
  const f = it.fieldData;
  const cands = [cleanName(f.name), cleanName(f.originalName)].filter(Boolean);
  cands.sort((a,b)=>b.split(/\s+/).length - a.split(/\s+/).length);
  return cands[0] || cleanName(f.firstName) || '';
}

function scorePair(it, m) {
  const f = it.fieldData;
  const fsName = fsBest(it);
  const fsFirst = norm(cleanName(f.firstName) || fsName.split(' ')[0]);
  const fsTokens = norm(fsName).split(' ').filter(Boolean);
  const fsLast = norm(cleanName(f.lastName));
  const mFirst = norm(m.firstName), mLast = norm(m.lastName), mMaiden = norm(m.maidenName);
  const mFull = norm(m.fullName);
  let s = 0; const why = [];
  const firstMatch = fsFirst && fsFirst === mFirst;
  // exact full name
  if (norm(fsName) === mFull && mFull) { s += 12; why.push('full-name'); }
  if (firstMatch) { s += 3; why.push('first'); }
  // last name present in fs tokens or fs.lastName
  if (mLast && (fsLast === mLast || fsTokens.includes(mLast))) { s += 5; why.push('last'); }
  if (mMaiden && (fsLast === mMaiden || fsTokens.includes(mMaiden))) { s += 3; why.push('maiden'); }
  // year field — FS sometimes stores class year, sometimes induction year
  const fy = (f.graduationYear||'').toString().trim();
  if (fy && m.gradYear && fy === m.gradYear) { s += 5; why.push('gradYr'); }
  else if (fy && fy === m.induction) { s += 4; why.push('indYr'); }
  // category
  if (f.category && norm(f.category) === norm(m.category)) { s += 2; why.push('cat'); }
  // gate: require at least a first-name or last-name signal
  if (!firstMatch && !(mLast && fsTokens.includes(mLast))) s = 0;
  return { s, why };
}

// Greedy one-to-one assignment by descending score
const pairs = [];
items.forEach((it, i) => master.forEach((m, j) => {
  const { s, why } = scorePair(it, m);
  if (s > 0) pairs.push({ i, j, s, why });
}));
pairs.sort((a,b)=>b.s-a.s);
const itemMatch = new Array(items.length).fill(null);
const masterTaken = new Array(master.length).fill(false);
const altByItem = {};
for (const p of pairs) {
  if (itemMatch[p.i]) { (altByItem[p.i]=altByItem[p.i]||[]).push(p); continue; }
  if (masterTaken[p.j]) continue;
  itemMatch[p.i] = p; masterTaken[p.j] = true;
}
// Fallback: link any still-unmatched FS row to its best available master by
// first-name (handles corrupted names like '1984 Gerald "Chip"'). Marked LOW.
items.forEach((it, i) => {
  if (itemMatch[i]) return;
  const fsName = fsBest(it);
  const fsFirst = norm(cleanName(it.fieldData.firstName) || fsName.split(' ')[0]);
  let best = null;
  master.forEach((m, j) => {
    if (masterTaken[j]) return;
    if (fsFirst && fsFirst === norm(m.firstName)) {
      const fy = (it.fieldData.graduationYear||'').toString().trim();
      let s = 1; const why = ['first(fallback)'];
      if (fy && (fy === m.gradYear || fy === m.induction)) { s += 3; why.push('yr'); }
      if (it.fieldData.category && norm(it.fieldData.category)===norm(m.category)) { s += 1; why.push('cat'); }
      if (!best || s > best.s) best = { i, j, s, why };
    }
  });
  if (best) { itemMatch[i] = best; masterTaken[best.j] = true; }
});

function conf(p){ if(!p) return 'NONE'; if(p.s>=12||(p.why.includes('last')&&p.why.includes('gradYr')))return'HIGH';
  if(p.why.includes('last')||p.why.includes('gradYr'))return'MEDIUM'; return'LOW'; }

const csvEsc = v => { v=(v==null?'':v).toString(); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
const cols = ['status','confidence','match_on','itemId',
  'old_name','old_firstName','old_lastName','old_gradYear','old_category','old_degree','old_currentPosition',
  'NEW_category','NEW_firstName','NEW_lastName','NEW_maidenName','NEW_gradYear','NEW_inductionYear','NEW_deceased','NEW_fullName',
  'alternatives','notes'];
const out = [cols.join(',')];

items.forEach((it, i) => {
  const f = it.fieldData; const p = itemMatch[i]; const m = p ? master[p.j] : null;
  const alts = (altByItem[i]||[]).slice(0,3).map(a=>`${master[a.j].fullName} (${master[a.j].induction}/${master[a.j].gradYear||'-'}) s${a.s}`).join(' | ');
  out.push([
    m?'MATCH':'NO-MATCH', conf(p), p?p.why.join('+'):'',
    it.id,
    f.name, f.firstName, f.lastName, f.graduationYear, f.category, f.degree, f.currentPosition,
    m?m.category:'', m?m.firstName:'', m?m.lastName:'', m?m.maidenName:'', m?m.gradYear:'', m?m.induction:'', m?m.deceased:'', m?m.fullName:'',
    alts, ''
  ].map(csvEsc).join(','));
});

// Master entries never matched => MISSING (need to be added)
const missing = master.map((m,j)=>({m,j})).filter(x=>!masterTaken[x.j]);
missing.forEach(({m})=>{
  out.push(['MISSING-ADD','', '', '',
    '','','','','','','',
    m.category,m.firstName,m.lastName,m.maidenName,m.gradYear,m.induction,m.deceased,m.fullName,
    '', 'On website, not found in Firestore'].map(csvEsc).join(','));
});

fs.writeFileSync(path.resolve(__dirname,'alumni-comparison.csv'), out.join('\n'), 'utf8');

// Summary
const byConf = {HIGH:0,MEDIUM:0,LOW:0};
items.forEach((it,i)=>{ const p=itemMatch[i]; if(p) byConf[conf(p)]++; });
const noMatch = itemMatch.filter(x=>!x).length;
console.log('=== SUMMARY ===');
console.log('Firestore items:', items.length, '| Master (should-be):', master.length);
console.log('Matched HIGH:', byConf.HIGH, '| MEDIUM:', byConf.MEDIUM, '| LOW:', byConf.LOW);
console.log('Firestore items with NO match:', noMatch);
console.log('Master entries MISSING from Firestore (to add):', missing.length);
console.log('  ', missing.map(x=>`${x.m.fullName} (${x.m.category} ${x.m.induction})`).join(' | '));
console.log('\nWrote alumni-comparison.csv (', out.length-1, 'rows )');
