#!/usr/bin/env node

const fs = require('fs');

// Load the differential
const data = JSON.parse(fs.readFileSync('./COMPLETE-DIFFERENTIAL-WITH-QA.json', 'utf8'));

console.log('🧹 Cleaning differential data...\n');

// Track fixes
let fixStats = {
    year2040Fixed: 0,
    branchesFixed: 0,
    nameFormattingFixed: 0,
    invalidBranchesRemoved: 0
};

// Fix branch typos and invalid data
function cleanBranch(branch) {
    if (!branch) return null;
    
    // Remove invalid branches (numbers, nonsense)
    const invalidBranches = ['67', 'There is a Buddy?? in yearbook', '?'];
    if (invalidBranches.includes(branch)) {
        fixStats.invalidBranchesRemoved++;
        return null;
    }
    
    // Fix remaining typos
    const fixes = {
        'Unknwon': 'Unknown',
        'unknwon': 'Unknown',
        'Airforce': 'Air Force',
        'air force': 'Air Force',
        'AIR FORCE': 'Air Force',
        'ARMY': 'Army',
        'NAVY': 'Navy',
        'MARINES': 'Marines',
        'Marine': 'Marines',
        'marine': 'Marines'
    };
    
    if (fixes[branch]) {
        fixStats.branchesFixed++;
        return fixes[branch];
    }
    
    return branch;
}

// Fix name formatting issues
function cleanName(name) {
    if (!name) return name;
    
    // Fix issues like "Donovan (. Don)" -> "Donovan (Don)"
    let cleaned = name.replace(/\(\.\s*/g, '(');
    
    // Fix "ED. Watson" -> "Ed Watson"
    cleaned = cleaned.replace(/ED\./g, 'Ed');
    cleaned = cleaned.replace(/([A-Z])\.(\s+[A-Z])/g, '$1$2');
    
    // Remove unnecessary periods after parentheses
    cleaned = cleaned.replace(/\)\./g, ')');
    
    if (cleaned !== name) {
        fixStats.nameFormattingFixed++;
    }
    
    return cleaned;
}

// Process the differential
const cleanedDifferential = {
    ...data,
    processed: data.processed.map(veteran => {
        const cleaned = { ...veteran };
        
        // Clean updates
        if (veteran.updates) {
            cleaned.updates = veteran.updates.map(update => {
                const cleanedUpdate = { ...update };
                
                // Fix branch updates
                if (update.field === 'branch' && update.proposed) {
                    const cleanedBranch = cleanBranch(update.proposed);
                    if (cleanedBranch !== update.proposed) {
                        cleanedUpdate.proposed = cleanedBranch;
                        cleanedUpdate.cleaned = true;
                    }
                    // Remove update if branch became null
                    if (!cleanedBranch) {
                        return null;
                    }
                }
                
                // Fix name formatting
                if (update.field === 'name' && update.proposed) {
                    const cleanedName = cleanName(update.proposed);
                    if (cleanedName !== update.proposed) {
                        cleanedUpdate.proposed = cleanedName;
                        cleanedUpdate.cleaned = true;
                    }
                }
                
                // Fix year 2040 issues
                if (update.field === 'graduationYear' && update.proposed === '2040') {
                    fixStats.year2040Fixed++;
                    return null; // Remove this update - make it blank
                }
                
                return cleanedUpdate;
            }).filter(u => u !== null); // Remove null updates
        }
        
        // Fix issues
        if (veteran.issues) {
            cleaned.issues = veteran.issues.filter(issue => {
                // Remove year 2040 conflicts - we're blanking them out
                if (issue.field === 'graduationYear' && issue.conflict && issue.conflict.includes('2040')) {
                    fixStats.year2040Fixed++;
                    return false;
                }
                return true;
            });
        }
        
        return cleaned;
    }),
    
    newVeterans: data.newVeterans.map(veteran => {
        const cleaned = { ...veteran };
        
        // Fix year 2040
        if (cleaned.graduationYear === '2040') {
            cleaned.graduationYear = null;
            fixStats.year2040Fixed++;
        }
        
        // Clean branch
        if (cleaned.branch) {
            const cleanedBranch = cleanBranch(cleaned.branch);
            if (cleanedBranch !== cleaned.branch) {
                cleaned.branch = cleanedBranch;
            }
        }
        
        // Clean name
        if (cleaned.name) {
            const cleanedName = cleanName(cleaned.name);
            if (cleanedName !== cleaned.name) {
                cleaned.name = cleanedName;
            }
        }
        
        return cleaned;
    })
};

// Update statistics
cleanedDifferential.statistics.cleaningApplied = fixStats;

// Save the cleaned differential
fs.writeFileSync('./CLEANED-DIFFERENTIAL.json', JSON.stringify(cleanedDifferential, null, 2));

console.log('✅ Cleaning complete!\n');
console.log('Fixes applied:');
console.log(`  - Year 2040 blanked out: ${fixStats.year2040Fixed}`);
console.log(`  - Branch typos fixed: ${fixStats.branchesFixed}`);
console.log(`  - Invalid branches removed: ${fixStats.invalidBranchesRemoved}`);
console.log(`  - Name formatting fixed: ${fixStats.nameFormattingFixed}`);
console.log('\n📄 Cleaned differential saved to: CLEANED-DIFFERENTIAL.json');
console.log('\nThis is the final version ready for review and application.');