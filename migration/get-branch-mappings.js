#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function getBranchMappings() {
    try {
        console.log('🔍 Getting branch configuration from Firebase...\n');
        
        // Get the wall document
        const wallDoc = await db.collection('walls').doc(WALL_ID).get();
        const wallData = wallDoc.data();
        
        // Find the veteran object type
        const veteranObjectType = wallData.objectTypes.find(ot => ot.id === 'veteran');
        if (!veteranObjectType) {
            console.error('Veteran object type not found!');
            process.exit(1);
        }
        
        // Find the branches field
        const branchesField = veteranObjectType.fields.find(f => f.id === 'branches');
        if (!branchesField) {
            console.error('Branches field not found!');
            process.exit(1);
        }
        
        console.log('Branch Field Configuration:');
        console.log(`  Field ID: ${branchesField.id}`);
        console.log(`  Field Type: ${branchesField.type}`);
        console.log(`  Field Label: ${branchesField.label}`);
        console.log(`  Is Array: ${branchesField.isArray}`);
        console.log(`  Relationship Type: ${branchesField.relationshipType}`);
        
        // Get all branch objects
        console.log('\n📋 Getting all branch objects...\n');
        const branchesSnapshot = await db.collection('wall_items')
            .where('wallId', '==', WALL_ID)
            .where('objectTypeId', '==', 'branch')
            .get();
        
        const branchMappings = {};
        const branches = [];
        
        branchesSnapshot.forEach(doc => {
            const data = doc.data();
            const branchName = data.fieldData?.name || 'Unknown';
            branches.push({
                id: doc.id,
                name: branchName,
                fieldData: data.fieldData
            });
            
            // Create mappings for common variations
            branchMappings[branchName] = doc.id;
            branchMappings[branchName.toLowerCase()] = doc.id;
            
            // Add common variations
            if (branchName === 'Air Force') {
                branchMappings['airforce'] = doc.id;
                branchMappings['Airforce'] = doc.id;
                branchMappings['USAF'] = doc.id;
            } else if (branchName === 'Marines') {
                branchMappings['Marine Corps'] = doc.id;
                branchMappings['Marine'] = doc.id;
                branchMappings['USMC'] = doc.id;
                branchMappings['marine'] = doc.id;
            } else if (branchName === 'Army') {
                branchMappings['US Army'] = doc.id;
                branchMappings['USA'] = doc.id;
            } else if (branchName === 'Navy') {
                branchMappings['US Navy'] = doc.id;
                branchMappings['USN'] = doc.id;
            } else if (branchName === 'Coast Guard') {
                branchMappings['coastguard'] = doc.id;
                branchMappings['USCG'] = doc.id;
            }
        });
        
        console.log('Available Branches in Firebase:');
        console.log('='.repeat(50));
        branches.forEach(branch => {
            console.log(`  ${branch.name}: ${branch.id}`);
        });
        
        // Save the mappings
        const mappingData = {
            branches: branches,
            mappings: branchMappings,
            fieldConfiguration: {
                fieldId: branchesField.id,
                fieldType: branchesField.type,
                isArray: branchesField.isArray,
                relationshipType: branchesField.relationshipType
            }
        };
        
        require('fs').writeFileSync('./BRANCH-MAPPINGS.json', JSON.stringify(mappingData, null, 2));
        
        console.log('\n✅ Branch mappings saved to BRANCH-MAPPINGS.json');
        console.log('\n⚠️  IMPORTANT:');
        console.log('  - branches field is an ARRAY of branch IDs');
        console.log('  - Cannot use string values like "Army" directly');
        console.log('  - Must use the branch document IDs');
        console.log('  - "Unknown" is NOT a valid branch - use null instead');
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

getBranchMappings();