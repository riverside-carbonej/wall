#!/usr/bin/env node
/** READ-ONLY (writes local files only). Maps the 168 authoritative HOF records
 *  into the "Alumnus" object-type fieldData shape, ready to insert. Produces
 *  alumni-insert-preview.json and insert-preview.csv for review. No Firestore writes. */
const fs = require('fs');
const path = require('path');
const master = require('./parse-master.js');

const NICK = /[“"']([^”"']+)[”"']/;            // "Chip", “Skip”
function mapRecord(m) {
  let first = m.firstName;
  let title = '';
  let nickname = '';
  // title prefix (Dr.)
  const tMatch = first.match(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i);
  if (tMatch) { title = tMatch[1]; first = first.slice(tMatch[0].length).trim(); }
  // nickname in quotes
  const nMatch = first.match(NICK);
  if (nMatch) { nickname = nMatch[1].trim(); first = first.replace(NICK,'').replace(/\s+/g,' ').trim(); }
  // coach role + recovered grad year from the "Coach/1967" note
  let gradYear = m.gradYear;
  if (m.coachNote) {
    if (!title) title = 'Coach';
    const y = (m.coachNote.match(/\d{4}/)||[])[0];
    if (y && !gradYear) gradYear = y;
  }
  // display name: First Last Maiden (title/nickname stay in their own fields)
  const name = [first, m.lastName, m.maidenName].filter(Boolean).join(' ');

  const fieldData = {
    name,
    firstName: first,
    lastName: m.lastName,
    maidenName: m.maidenName || '',          // NEW field
    graduationYear: gradYear ? Number(gradYear) : '',
    inductionYear: m.induction ? Number(m.induction) : '', // NEW field
    category: m.category,                    // "Athletic Coach" requires added option
    title: title || '',
    nickname: nickname || '',
    deceased: m.deceased ? 'true' : '',
    degree: '',
    currentPosition: '',
    email: '',
    originalName: '',
  };
  return { fieldData, _src: m };
}

const recs = master.map(mapRecord);
fs.writeFileSync(path.resolve(__dirname,'alumni-insert-preview.json'), JSON.stringify(recs.map(r=>r.fieldData), null, 2));

// CSV preview
const cols = ['name','firstName','nickname','lastName','maidenName','title','category','graduationYear','inductionYear','deceased'];
const esc = v => { v=(v==null?'':v).toString(); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
const out = [cols.join(',')];
recs.forEach(r => out.push(cols.map(c=>esc(r.fieldData[c])).join(',')));
fs.writeFileSync(path.resolve(__dirname,'insert-preview.csv'), out.join('\n'),'utf8');

// summary + spot checks
console.log('Prepared', recs.length, 'records for insert.');
const byCat={}; recs.forEach(r=>byCat[r.fieldData.category]=(byCat[r.fieldData.category]||0)+1);
console.log('By category:', JSON.stringify(byCat));
console.log('With nickname:', recs.filter(r=>r.fieldData.nickname).length,
            '| with title:', recs.filter(r=>r.fieldData.title).length,
            '| with maiden:', recs.filter(r=>r.fieldData.maidenName).length,
            '| deceased:', recs.filter(r=>r.fieldData.deceased==='true').length,
            '| blank gradYear:', recs.filter(r=>r.fieldData.graduationYear==='').length);
console.log('\nSpot checks:');
['Sorber','Vonhof','Andersen','Yorko','Hanahan','McKenrick'].forEach(k=>{
  const r=recs.find(x=>x.fieldData.name.includes(k)); if(r) console.log('  ', JSON.stringify(r.fieldData));
});
