#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();
const storage = admin.storage().bucket();

async function backupWallData(wallId) {
    try {
        console.log('💾 Starting comprehensive wall data backup...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = `./backups/${timestamp}`;
        
        // Create backup directory
        if (!fs.existsSync('./backups')) {
            fs.mkdirSync('./backups', { recursive: true });
        }
        fs.mkdirSync(backupDir, { recursive: true });

        console.log(`📁 Backup directory: ${backupDir}`);

        // 1. Backup Wall Configuration
        console.log('📄 Backing up wall configuration...');
        const wallDoc = await db.collection('walls').doc(wallId).get();
        
        if (!wallDoc.exists) {
            throw new Error('Wall not found!');
        }

        const wallData = wallDoc.data();
        fs.writeFileSync(
            path.join(backupDir, 'wall-config.json'), 
            JSON.stringify({
                id: wallDoc.id,
                ...wallData,
                backupTimestamp: new Date().toISOString(),
                backupType: 'full-wall-backup'
            }, null, 2)
        );

        console.log(`✅ Wall config saved: ${wallData.name}`);

        // 2. Backup All Wall Items
        console.log('📋 Backing up wall items...');
        const itemsSnapshot = await db.collection('wall_items')
            .where('wallId', '==', wallId)
            .get();

        const items = [];
        const itemsByType = {};

        itemsSnapshot.docs.forEach(doc => {
            const item = {
                id: doc.id,
                ...doc.data()
            };
            items.push(item);
            
            // Group by object type
            const objectType = item.objectTypeId || 'unknown';
            if (!itemsByType[objectType]) {
                itemsByType[objectType] = [];
            }
            itemsByType[objectType].push(item);
        });

        // Save all items
        fs.writeFileSync(
            path.join(backupDir, 'wall-items-all.json'), 
            JSON.stringify(items, null, 2)
        );

        // Save items by type
        Object.keys(itemsByType).forEach(objectType => {
            fs.writeFileSync(
                path.join(backupDir, `items-${objectType}.json`), 
                JSON.stringify(itemsByType[objectType], null, 2)
            );
        });

        console.log(`✅ Backed up ${items.length} items:`);
        Object.keys(itemsByType).forEach(type => {
            console.log(`   • ${itemsByType[type].length} ${type}s`);
        });

        // 3. Backup User Permissions (if any)
        console.log('👥 Backing up user data...');
        try {
            const usersSnapshot = await db.collection('users').get();
            const users = [];
            usersSnapshot.docs.forEach(doc => {
                users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            if (users.length > 0) {
                fs.writeFileSync(
                    path.join(backupDir, 'users.json'), 
                    JSON.stringify(users, null, 2)
                );
                console.log(`✅ Backed up ${users.length} user records`);
            } else {
                console.log('ℹ️  No user records found');
            }
        } catch (error) {
            console.warn('⚠️  Could not backup users (may not exist):', error.message);
        }

        // 4. Create Backup Summary
        const summary = {
            backupTimestamp: new Date().toISOString(),
            wallId: wallId,
            wallName: wallData.name,
            totalItems: items.length,
            itemsByType: Object.keys(itemsByType).map(type => ({
                type,
                count: itemsByType[type].length
            })),
            objectTypes: wallData.objectTypes?.map(ot => ({
                id: ot.id,
                name: ot.name,
                fieldCount: ot.fields?.length || 0
            })) || [],
            permissions: {
                owner: wallData.permissions?.owner,
                isPublished: wallData.visibility?.isPublished,
                requiresLogin: wallData.visibility?.requiresLogin
            },
            files: [
                'wall-config.json',
                'wall-items-all.json',
                ...Object.keys(itemsByType).map(type => `items-${type}.json`)
            ]
        };

        fs.writeFileSync(
            path.join(backupDir, 'backup-summary.json'), 
            JSON.stringify(summary, null, 2)
        );

        // 5. Create README for the backup
        const readmeContent = `# Veterans Wall Backup

**Backup Date:** ${new Date().toISOString()}
**Wall ID:** ${wallId}
**Wall Name:** ${wallData.name}

## Contents

- \`backup-summary.json\` - Overview of this backup
- \`wall-config.json\` - Complete wall configuration and object types
- \`wall-items-all.json\` - All wall items in one file
- \`items-*.json\` - Items grouped by object type

## Statistics

- **Total Items:** ${items.length}
${Object.keys(itemsByType).map(type => `- **${type}:** ${itemsByType[type].length}`).join('\n')}

## Restoration

To restore this backup:
1. Use the Firebase import scripts in the migration folder
2. Or contact your developer with these JSON files

## Firebase Project

- **Project:** riverside-wall-app
- **Storage Bucket:** gs://riverside-wall-app.firebasestorage.app

---
Generated by Veterans Wall backup system
`;

        fs.writeFileSync(path.join(backupDir, 'README.md'), readmeContent);

        console.log('\n🎉 Backup completed successfully!');
        console.log(`📁 Location: ${path.resolve(backupDir)}`);
        console.log(`📊 Files created: ${summary.files.length + 2} files`);
        
        return {
            backupPath: backupDir,
            summary
        };
        
    } catch (error) {
        console.error('❌ Error during backup:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node backup-wall-data.js YOUR_WALL_ID');
    console.exit(1);
}

backupWallData(wallId)
    .then((result) => {
        console.log('\n✨ Your Veterans Wall is safely backed up!');
        console.log(`📂 Backup saved to: ${result.backupPath}`);
        console.log('💡 Tip: Copy this folder to a safe location or cloud storage');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Backup failed:', error);
        process.exit(1);
    });