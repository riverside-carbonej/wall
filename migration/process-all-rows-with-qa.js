#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

// Quality check functions
function fixBranch(branch) {
    if (!branch) return null;
    
    const fixes = {
        'unkniwn': 'Unknown',
        'unknown': 'Unknown',
        'airforce': 'Air Force',
        'air force': 'Air Force',
        'army': 'Army',
        'navy': 'Navy',
        'marines': 'Marines',
        'marine corps': 'Marines',
        'marine': 'Marines',
        'coast guard': 'Coast Guard',
        'coastguard': 'Coast Guard',
        'space force': 'Space Force',
        'national guard': 'National Guard',
        'air national guard': 'Air National Guard',
        'army national guard': 'Army National Guard'
    };
    
    // Clean up branch string
    let cleaned = branch.trim();
    
    // Remove parenthetical years like "Navy (1952-1956)"
    cleaned = cleaned.replace(/\([^)]*\)/g, '').trim();
    
    // Check for exact match first
    const lower = cleaned.toLowerCase();
    if (fixes[lower]) {
        return fixes[lower];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(fixes)) {
        if (lower.includes(key)) {
            return value;
        }
    }
    
    // Return cleaned original if no match
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function fixGraduationYear(year) {
    if (!year) return null;
    
    // Clean the year string
    const cleaned = year.toString().trim();
    
    // Handle "1960 Or 61" type entries
    const match = cleaned.match(/(\d{4})/);
    if (match) {
        const yearNum = parseInt(match[1]);
        
        // Flag suspicious years
        if (yearNum > 2030 || yearNum < 1920) {
            return {
                value: match[1],
                issue: `Suspicious year: ${yearNum}`
            };
        }
        
        return match[1];
    }
    
    return null;
}

function parseServiceYears(yearsStr) {
    if (!yearsStr) return null;
    
    // Handle various formats
    const patterns = [
        /(\d{4})\s*[-–]\s*(\d{4})/,  // 1952-1956
        /(\d{2})\s*[-–]\s*(\d{2})/,   // 52-56
        /(\d{4})\s+to\s+(\d{4})/i,    // 1952 to 1956
    ];
    
    for (const pattern of patterns) {
        const match = yearsStr.match(pattern);
        if (match) {
            let start = match[1];
            let end = match[2];
            
            // Convert 2-digit years
            if (start.length === 2) {
                start = (parseInt(start) > 30 ? '19' : '20') + start;
            }
            if (end.length === 2) {
                end = (parseInt(end) > 30 ? '19' : '20') + end;
            }
            
            return {
                entryDate: `${start}-01-01T00:00:00.000Z`,
                exitDate: `${end}-01-01T00:00:00.000Z`
            };
        }
    }
    
    // Try single year
    const singleYear = yearsStr.match(/(\d{4})/);
    if (singleYear) {
        return {
            entryDate: `${singleYear[1]}-01-01T00:00:00.000Z`,
            exitDate: null
        };
    }
    
    return null;
}

function capitalizeName(name) {
    if (!name) return '';
    
    return name.split(' ').map(word => {
        // Handle special cases
        if (['jr', 'sr', 'ii', 'iii', 'iv'].includes(word.toLowerCase())) {
            return word.toUpperCase();
        }
        
        // Handle hyphenated names
        if (word.includes('-')) {
            return word.split('-').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join('-');
        }
        
        // Handle names with periods (initials)
        if (word.length === 1 || (word.length === 2 && !word.includes('.'))) {
            return word.toUpperCase() + '.';
        }
        
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

async function processAllRows() {
    try {
        console.log('🔄 Processing all CSV rows with quality checks...\n');
        
        // Load CSV
        const csvPath = 'C:\\Users\\jackc\\Downloads\\_Riverside Veterans List_ 2022 - Form Responses 1.csv';
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        
        // Parse with headers
        const headers = ['Date', 'Email', 'FirstName', 'LastName', 'GraduationYear', 'PhotoStatus', 
                        'Branch', 'Rank', 'ServiceYears', 'Status', 'Notes', 'Extra'];
        
        const lines = csvContent.split('\n').filter(line => line.trim());
        const records = lines.map(line => {
            const values = line.split(',').map(v => v.trim());
            const record = {};
            headers.forEach((header, i) => {
                record[header] = values[i] || '';
            });
            return record;
        });
        
        console.log(`📊 Total CSV rows: ${records.length}\n`);
        
        // Get all Firebase veterans
        const snapshot = await db.collection('wall_items')
            .where('wallId', '==', WALL_ID)
            .where('objectTypeId', '==', 'veteran')
            .get();
        
        // Build Firebase index
        const firebaseVeterans = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const name = data.fieldData?.name || '';
            const normalized = normalizeName(name);
            
            firebaseVeterans[normalized] = {
                docId: doc.id,
                ...data.fieldData,
                hasImages: data.images && data.images.length > 0
            };
        });
        
        console.log(`🔥 Firebase veterans: ${snapshot.size}\n`);
        
        // Process each row
        const differential = {
            processed: [],
            newVeterans: [],
            conflicts: [],
            skipped: [],
            statistics: {
                totalRows: records.length,
                processed: 0,
                newVeterans: 0,
                updates: 0,
                skipped: 0,
                conflicts: 0,
                fixes: {
                    branchTypos: 0,
                    nameFormatting: 0,
                    yearIssues: 0
                }
            }
        };
        
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNum = i + 1;
            
            // Skip empty or header rows
            if (!record.FirstName || record.FirstName.toLowerCase() === 'first name' || 
                !record.LastName || record.LastName.toLowerCase() === 'last name') {
                differential.skipped.push({
                    row: rowNum,
                    reason: 'Invalid or header row'
                });
                differential.statistics.skipped++;
                continue;
            }
            
            // Process name
            const csvName = capitalizeName(`${record.FirstName} ${record.LastName}`);
            const normalizedCsvName = normalizeName(csvName);
            
            // Process other fields with quality checks
            const branch = fixBranch(record.Branch);
            const graduationYear = fixGraduationYear(record.GraduationYear);
            const serviceYears = parseServiceYears(record.ServiceYears);
            const rank = record.Rank ? record.Rank.trim() : null;
            
            // Find Firebase match
            const fbVeteran = firebaseVeterans[normalizedCsvName];
            
            if (!fbVeteran) {
                // New veteran
                const yearValue = (typeof graduationYear === 'object' && graduationYear) ? graduationYear.value : graduationYear;
                const yearIssues = (typeof graduationYear === 'object' && graduationYear) ? [graduationYear.issue] : [];
                
                differential.newVeterans.push({
                    row: rowNum,
                    name: csvName,
                    graduationYear: yearValue,
                    branch: branch,
                    rank: rank,
                    militaryEntryDate: serviceYears?.entryDate,
                    militaryExitDate: serviceYears?.exitDate,
                    status: record.Status,
                    notes: record.Notes,
                    issues: yearIssues
                });
                differential.statistics.newVeterans++;
            } else {
                // Existing veteran - check for updates
                const updates = [];
                const issues = [];
                
                // Check name formatting
                if (csvName !== fbVeteran.name && csvName.replace(/\./g, '') !== fbVeteran.name.replace(/\./g, '')) {
                    updates.push({
                        field: 'name',
                        current: fbVeteran.name,
                        proposed: csvName,
                        type: 'formatting'
                    });
                    differential.statistics.fixes.nameFormatting++;
                }
                
                // Check graduation year
                const csvYear = typeof graduationYear === 'object' && graduationYear ? graduationYear.value : graduationYear;
                if (csvYear && csvYear !== fbVeteran.graduationYear) {
                    if (!fbVeteran.graduationYear) {
                        updates.push({
                            field: 'graduationYear',
                            current: null,
                            proposed: csvYear,
                            type: 'addition'
                        });
                    } else {
                        issues.push({
                            field: 'graduationYear',
                            conflict: `Firebase: ${fbVeteran.graduationYear}, CSV: ${csvYear}`
                        });
                        differential.statistics.conflicts++;
                    }
                }
                
                // Check branch
                if (branch && branch !== fbVeteran.branch) {
                    if (!fbVeteran.branch) {
                        updates.push({
                            field: 'branch',
                            current: null,
                            proposed: branch,
                            type: 'addition'
                        });
                        
                        // Track if we fixed a typo
                        if (record.Branch && record.Branch.toLowerCase() === 'unkniwn') {
                            differential.statistics.fixes.branchTypos++;
                        }
                    }
                }
                
                // Check rank
                if (rank && !fbVeteran.rank) {
                    updates.push({
                        field: 'rank',
                        current: null,
                        proposed: rank,
                        type: 'addition'
                    });
                }
                
                // Check service dates
                if (serviceYears) {
                    if (!fbVeteran.militaryEntryDate && serviceYears.entryDate) {
                        updates.push({
                            field: 'militaryEntryDate',
                            current: null,
                            proposed: serviceYears.entryDate,
                            type: 'addition'
                        });
                    }
                    if (!fbVeteran.militaryExitDate && serviceYears.exitDate) {
                        updates.push({
                            field: 'militaryExitDate',
                            current: null,
                            proposed: serviceYears.exitDate,
                            type: 'addition'
                        });
                    }
                }
                
                if (updates.length > 0 || issues.length > 0) {
                    differential.processed.push({
                        row: rowNum,
                        firebaseId: fbVeteran.docId,
                        name: fbVeteran.name,
                        updates: updates,
                        issues: issues
                    });
                    
                    if (updates.length > 0) {
                        differential.statistics.updates++;
                    }
                }
                
                differential.statistics.processed++;
            }
            
            // Progress update every 100 rows
            if (rowNum % 100 === 0) {
                console.log(`  Processed ${rowNum}/${records.length} rows...`);
            }
        }
        
        // Summary
        console.log('\n📊 PROCESSING COMPLETE\n');
        console.log('='.repeat(60));
        console.log(`Total rows processed: ${differential.statistics.processed}`);
        console.log(`New veterans found: ${differential.statistics.newVeterans}`);
        console.log(`Veterans with updates: ${differential.statistics.updates}`);
        console.log(`Rows skipped: ${differential.statistics.skipped}`);
        console.log(`Conflicts found: ${differential.statistics.conflicts}`);
        console.log('\nQuality Fixes Applied:');
        console.log(`  Branch typos fixed: ${differential.statistics.fixes.branchTypos}`);
        console.log(`  Name formatting: ${differential.statistics.fixes.nameFormatting}`);
        console.log(`  Year issues flagged: ${differential.statistics.fixes.yearIssues}`);
        
        // Save differential
        fs.writeFileSync('./migration/COMPLETE-DIFFERENTIAL-WITH-QA.json', JSON.stringify(differential, null, 2));
        console.log('\n📄 Complete differential saved to: COMPLETE-DIFFERENTIAL-WITH-QA.json');
        console.log('\nReview this file to see all proposed changes before applying.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

processAllRows();