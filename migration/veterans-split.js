#!/usr/bin/env node
/** READ-ONLY (writes local preview files only — NO Firestore writes).
 *  Parses all Veteran `name` strings into firstName / lastName / maidenName,
 *  keeping middle + suffix in the display name. Flags every anomaly for manual review. */
const fs = require('fs');
const path = require('path');

const SUFFIX = /^(jr|sr|ii|iii|iv|v|vi|vii|phd|md|esq|dds|usn|usa|usaf)\.?$/i;
// Surname particles that belong WITH the last name (e.g. "Van Pelt", "De La Cruz")
const PARTICLES = new Set(['van','von','de','del','della','di','da','la','le','du','der','den','ter','ten','des','do','dos','st','st.','vande','vander']);
const titleCase = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

function parse(rawName) {
  const original = (rawName || '').toString();   // display name — NEVER modified
  let core = original.trim();                     // working copy for deriving fields only
  let maiden = '';
  const notes = [];

  // trailing parenthetical -> maiden name (single word) / keep year in name / flag unclear.
  // NOTE: we only strip from `core` for parsing; `original` (the display name) keeps it -> no data loss.
  const m = core.match(/\s*\(([^)]*)\)\s*$/);
  if (m) {
    const inside = m[1].trim();
    core = core.slice(0, m.index).trim();
    if (/^\d+$/.test(inside)) notes.push(`paren-year-kept-in-name:(${inside})`);
    else if (/^[A-Za-z][A-Za-z'’-]*$/.test(inside)) { maiden = titleCase(inside); notes.push(`maiden<-(${inside})`); }
    else notes.push(`paren-UNCLEAR-left-in-name:(${inside})`);
  }
  if (/,/.test(core)) notes.push('COMMA-review');
  if (/\d/.test(core)) notes.push('DIGIT-IN-NAME-REVIEW');

  let tokens = core.split(/\s+/).filter(Boolean);
  const suffixes = [];
  while (tokens.length > 1 && SUFFIX.test(tokens[tokens.length - 1])) suffixes.unshift(tokens.pop());

  let first = tokens[0] || '';
  let last = '', middle = '';
  if (tokens.length === 1) {
    notes.push('SINGLE-TOKEN-no-last');
  } else if (tokens.length > 1) {
    // last name = final token, plus any leading particle(s) like "Van"/"De La"
    let start = tokens.length - 1;
    while (start - 1 >= 1 && PARTICLES.has(tokens[start - 1].toLowerCase())) start--;
    last = tokens.slice(start).join(' ');
    middle = tokens.slice(1, start).join(' ');
    if (start < tokens.length - 1) notes.push(`particle-surname:"${last}"`);
  }
  if (!first) notes.push('EMPTY-name');

  return { original, first, middle, last, suffix: suffixes.join(' '), maiden, notes };
}

module.exports = { parse };

if (require.main === module) {
  const admin = require('firebase-admin');
  const KEY = path.resolve(__dirname, '../../riverside-wall-app-firebase-adminsdk-fbsvc-c5ea715451.json');
  admin.initializeApp({ credential: admin.credential.cert(require(KEY)) });
  const db = admin.firestore();
  (async () => {
  const wall = (await db.collection('walls').doc('Fkzc5Kh7gMpyTEm5Cl6d').get()).data();
  const otId = wall.objectTypes.find(o => o.name === 'Veteran').id;
  const snap = await db.collection('wall_items').where('wallId', '==', 'Fkzc5Kh7gMpyTEm5Cl6d').get();
  const docs = snap.docs.filter(d => d.data().objectTypeId === otId);
  const rows = docs.map(d => ({ id: d.id, ...parse(d.data().fieldData?.name) }));

  // CSV
  const esc = v => { v = (v == null ? '' : v).toString(); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const cols = ['id', 'original_name', 'firstName', 'middle(in name)', 'lastName', 'suffix(in name)', 'maidenName', 'notes'];
  const csv = [cols.join(',')];
  rows.forEach(r => csv.push([r.id, r.original, r.first, r.middle, r.last, r.suffix, r.maiden, r.notes.join('; ')].map(esc).join(',')));
  fs.writeFileSync(path.resolve(__dirname, 'veterans-split-preview.csv'), csv.join('\n'));

  // Human-readable full list for manual verification
  const txt = [];
  txt.push(`VETERANS NAME SPLIT PREVIEW — ${rows.length} records (NO writes performed)\n`);
  const flagged = rows.filter(r => r.notes.length);
  txt.push(`=== FLAGGED FOR REVIEW (${flagged.length}) ===`);
  flagged.forEach(r => txt.push(`  "${r.original}"  =>  first="${r.first}" last="${r.last}" maiden="${r.maiden}" suffix="${r.suffix}"   [${r.notes.join(', ')}]`));
  txt.push(`\n=== ALL RECORDS (original => first | middle | last | suffix | maiden) ===`);
  rows.forEach((r, i) => txt.push(`${String(i + 1).padStart(3)}. ${r.original}  =>  ${r.first} | ${r.middle || '-'} | ${r.last || '-'} | ${r.suffix || '-'} | ${r.maiden || '-'}`));
  fs.writeFileSync(path.resolve(__dirname, 'veterans-split-preview.txt'), txt.join('\n'));

  // summary
  console.log('Records:', rows.length);
  console.log('Flagged for review:', flagged.length);
  const byNote = {};
  flagged.forEach(r => r.notes.forEach(n => { const k = n.split(':')[0]; byNote[k] = (byNote[k] || 0) + 1; }));
  console.log('Anomaly buckets:', JSON.stringify(byNote, null, 0));
  console.log('Wrote veterans-split-preview.csv and veterans-split-preview.txt');
  })().catch(e => { console.error('ERROR:', e); process.exit(1); });
}
