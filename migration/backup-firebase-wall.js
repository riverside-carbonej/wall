#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const WALL_ID = 'Fkzc5Kh7gMpyTEm5Cl6d';

async function backupWall() {
    console.log('🔒 CREATING COMPLETE BACKUP OF FIREBASE WALL\n');
    console.log('='.repeat(60));
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
        timestamp: timestamp,
        wallId: WALL_ID,
        veterans: [],
        statistics: {
            totalVeterans: 0,
            veteransWithImages: 0,
            veteransWithBranch: 0,
            veteransWithRank: 0,
            veteransWithGraduationYear: 0,
            veteransWithServiceDates: 0
        }
    };
    
    try {
        // Get all veterans
        console.log('📥 Fetching all veterans from Firebase...');
        const snapshot = await db.collection('wall_items')
            .where('wallId', '==', WALL_ID)
            .where('objectTypeId', '==', 'veteran')
            .get();
        
        console.log(`Found ${snapshot.size} veterans\n`);
        
        // Process each veteran
        snapshot.forEach(doc => {
            const data = doc.data();
            const veteran = {
                docId: doc.id,
                wallId: data.wallId,
                objectTypeId: data.objectTypeId,
                fieldData: data.fieldData || {},
                images: data.images || [],
                created: data.created,
                updated: data.updated,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy
            };
            
            backupData.veterans.push(veteran);
            
            // Update statistics
            backupData.statistics.totalVeterans++;
            if (veteran.images && veteran.images.length > 0) {
                backupData.statistics.veteransWithImages++;
            }
            if (veteran.fieldData.branch) {
                backupData.statistics.veteransWithBranch++;
            }
            if (veteran.fieldData.rank) {
                backupData.statistics.veteransWithRank++;
            }
            if (veteran.fieldData.graduationYear) {
                backupData.statistics.veteransWithGraduationYear++;
            }
            if (veteran.fieldData.militaryEntryDate || veteran.fieldData.militaryExitDate) {
                backupData.statistics.veteransWithServiceDates++;
            }
        });
        
        // Save backup
        const backupPath = `./BACKUP-${timestamp}.json`;
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        
        console.log('✅ BACKUP COMPLETE!\n');
        console.log('Backup Statistics:');
        console.log(`  Total veterans: ${backupData.statistics.totalVeterans}`);
        console.log(`  With images: ${backupData.statistics.veteransWithImages}`);
        console.log(`  With branch: ${backupData.statistics.veteransWithBranch}`);
        console.log(`  With rank: ${backupData.statistics.veteransWithRank}`);
        console.log(`  With graduation year: ${backupData.statistics.veteransWithGraduationYear}`);
        console.log(`  With service dates: ${backupData.statistics.veteransWithServiceDates}`);
        console.log(`\n📄 Backup saved to: ${backupPath}`);
        console.log('\n⚠️  KEEP THIS FILE SAFE - It contains your complete wall data!');
        
        // Also create a restore script
        const restoreScript = `#!/usr/bin/env node

// RESTORE SCRIPT FOR BACKUP: ${timestamp}
// Run this script to restore the wall to this backup state

const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function restore() {
    console.log('⚠️  WARNING: This will restore the wall to the backup from ${timestamp}');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const backup = JSON.parse(fs.readFileSync('${backupPath}', 'utf8'));
    console.log(\`Restoring \${backup.veterans.length} veterans...\`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const veteran of backup.veterans) {
        const docRef = db.collection('wall_items').doc(veteran.docId);
        batch.set(docRef, {
            wallId: veteran.wallId,
            objectTypeId: veteran.objectTypeId,
            fieldData: veteran.fieldData,
            images: veteran.images,
            created: veteran.created,
            updated: veteran.updated,
            createdBy: veteran.createdBy,
            updatedBy: veteran.updatedBy
        });
        
        count++;
        if (count % 100 === 0) {
            console.log(\`  Prepared \${count} veterans for restore...\`);
        }
    }
    
    await batch.commit();
    console.log('✅ Restore complete!');
    process.exit(0);
}

restore().catch(console.error);`;
        
        fs.writeFileSync(`./RESTORE-${timestamp}.js`, restoreScript);
        console.log(`📄 Restore script saved to: RESTORE-${timestamp}.js`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

backupWall();