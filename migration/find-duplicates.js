#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

// Function to normalize names for comparison
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/[^a-z ]/g, '') // Remove non-letters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

// Function to check if names are similar (fuzzy match)
function areSimilar(name1, name2) {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    
    // Exact match
    if (n1 === n2) return true;
    
    // Check if one contains the other (for Jr, Sr, III variations)
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Check for swapped first/last names
    const parts1 = n1.split(' ');
    const parts2 = n2.split(' ');
    if (parts1.length === 2 && parts2.length === 2) {
        if (parts1[0] === parts2[1] && parts1[1] === parts2[0]) return true;
    }
    
    // Check Levenshtein distance for typos
    const distance = levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity > 0.85; // 85% similar
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

async function findDuplicates() {
    console.log('🔍 CHECKING FOR DUPLICATES IN FIREBASE WALL\n');
    console.log('='.repeat(60));
    
    try {
        // Get all veterans
        const snapshot = await db.collection('wall_items')
            .where('wallId', '==', WALL_ID)
            .where('objectTypeId', '==', 'veteran')
            .get();
        
        console.log(`Total veterans in wall: ${snapshot.size}\n`);
        
        // Build index
        const veterans = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            veterans.push({
                id: doc.id,
                name: data.fieldData?.name || '',
                graduationYear: data.fieldData?.graduationYear || '',
                branch: data.fieldData?.branches || [],
                hasImage: data.images && data.images.length > 0
            });
        });
        
        // Sort by name for easier review
        veterans.sort((a, b) => a.name.localeCompare(b.name));
        
        // Find exact duplicates
        const exactDuplicates = {};
        const nameCounts = {};
        
        veterans.forEach(vet => {
            const normalized = normalizeName(vet.name);
            if (!nameCounts[normalized]) {
                nameCounts[normalized] = [];
            }
            nameCounts[normalized].push(vet);
        });
        
        console.log('🔴 EXACT DUPLICATES (same normalized name):\n');
        let exactCount = 0;
        Object.entries(nameCounts).forEach(([normalized, vets]) => {
            if (vets.length > 1) {
                exactCount++;
                console.log(`  "${vets[0].name}" appears ${vets.length} times:`);
                vets.forEach(v => {
                    console.log(`    - ID: ${v.id.substring(0, 8)}... Year: ${v.graduationYear || 'none'}, Image: ${v.hasImage ? 'Yes' : 'No'}`);
                });
                console.log();
            }
        });
        
        if (exactCount === 0) {
            console.log('  None found!\n');
        }
        
        // Find similar names (fuzzy matching)
        console.log('🟡 SIMILAR NAMES (possible duplicates):\n');
        const similarGroups = [];
        const processed = new Set();
        
        for (let i = 0; i < veterans.length; i++) {
            if (processed.has(i)) continue;
            
            const similar = [veterans[i]];
            processed.add(i);
            
            for (let j = i + 1; j < veterans.length; j++) {
                if (processed.has(j)) continue;
                
                if (areSimilar(veterans[i].name, veterans[j].name)) {
                    similar.push(veterans[j]);
                    processed.add(j);
                }
            }
            
            if (similar.length > 1) {
                similarGroups.push(similar);
            }
        }
        
        if (similarGroups.length > 0) {
            similarGroups.forEach(group => {
                console.log(`  Similar names group:`);
                group.forEach(v => {
                    console.log(`    - "${v.name}" (Year: ${v.graduationYear || 'none'}, Image: ${v.hasImage ? 'Yes' : 'No'})`);
                });
                console.log();
            });
        } else {
            console.log('  None found!\n');
        }
        
        // Check for specific patterns
        console.log('🔵 SPECIFIC PATTERNS:\n');
        
        // Names with Jr/Sr/III variations
        const suffixPatterns = ['jr', 'sr', 'ii', 'iii', 'iv'];
        const withSuffixes = veterans.filter(v => {
            const lower = v.name.toLowerCase();
            return suffixPatterns.some(suffix => lower.includes(suffix));
        });
        
        console.log(`  Names with Jr/Sr/II/III suffixes: ${withSuffixes.length}`);
        if (withSuffixes.length > 0 && withSuffixes.length < 20) {
            withSuffixes.forEach(v => {
                console.log(`    - ${v.name}`);
            });
        }
        
        // Faculty/Staff entries
        const facultyStaff = veterans.filter(v => {
            const lower = v.name.toLowerCase();
            return lower.includes('teacher') || lower.includes('staff') || 
                   lower.includes('faculty') || lower.includes('principal') ||
                   lower.includes('super');
        });
        
        console.log(`\n  Faculty/Staff entries: ${facultyStaff.length}`);
        if (facultyStaff.length > 0) {
            facultyStaff.forEach(v => {
                console.log(`    - ${v.name}`);
            });
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY:\n');
        console.log(`Total veterans: ${veterans.length}`);
        console.log(`Exact duplicates found: ${exactCount}`);
        console.log(`Similar name groups: ${similarGroups.length}`);
        console.log(`Veterans with suffixes: ${withSuffixes.length}`);
        console.log(`Faculty/Staff entries: ${facultyStaff.length}`);
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            totalVeterans: veterans.length,
            exactDuplicates: Object.entries(nameCounts).filter(([_, v]) => v.length > 1),
            similarGroups: similarGroups,
            withSuffixes: withSuffixes,
            facultyStaff: facultyStaff
        };
        
        require('fs').writeFileSync('./DUPLICATE-REPORT.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to: DUPLICATE-REPORT.json');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findDuplicates();