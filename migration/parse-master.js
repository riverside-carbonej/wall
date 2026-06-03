#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.resolve(__dirname, 'master-paste.txt'), 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim().length);
const master = [];
for (const line of lines) {
  const c = line.split('\t');
  const rec = {
    category: (c[0]||'').trim(),
    induction: (c[1]||'').trim(),
    gradYear: (c[2]||'').trim(),
    firstName: (c[3]||'').trim(),
    lastName: (c[4]||'').trim(),
    maidenName: (c[5]||'').trim(),
  };
  // deceased markers * (deceased) and ^ on the final visible name token
  const strip = s => s.replace(/[*^]+$/,'').trim();
  rec.deceased = /[*^]/.test(rec.lastName) || /[*^]/.test(rec.maidenName) || /[*^]/.test(rec.firstName);
  rec.firstName = strip(rec.firstName);
  rec.lastName = strip(rec.lastName);
  rec.maidenName = strip(rec.maidenName);
  // "Coach"/"Coach/1967" in the gradYear column is not a real graduation year
  if (/coach/i.test(rec.gradYear)) { rec.coachNote = rec.gradYear; rec.gradYear = ''; }
  // Display order follows the table columns: First + Last + Maiden
  rec.fullName = [rec.firstName, rec.lastName, rec.maidenName].filter(Boolean).join(' ');
  master.push(rec);
}
module.exports = master;

if (require.main === module) {
  console.log('TOTAL parsed:', master.length);
  const byCat = {};
  master.forEach(m => byCat[m.category] = (byCat[m.category]||0)+1);
  console.log('By category:', JSON.stringify(byCat, null, 0));
  console.log('Deceased (*/^):', master.filter(m=>m.deceased).length);
  console.log('Has maiden name:', master.filter(m=>m.maidenName).length);
  console.log('Blank gradYear:', master.filter(m=>!m.gradYear).length, '(Faculty/Coach typically blank)');
  const bad = master.filter(m => !m.firstName || !m.lastName || !m.induction);
  console.log('Rows missing first/last/induction:', bad.length);
  bad.forEach(b => console.log('  ⚠', JSON.stringify(b)));
  console.log('\nFirst 3:', JSON.stringify(master.slice(0,3)));
  console.log('Last 2:', JSON.stringify(master.slice(-2)));
}
