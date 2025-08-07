#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATH = 'C:\\Users\\jackc\\OneDrive\\Work\\Riverside\\Wall Of Honor\\mig\\app.db';
const IMAGES_BASE = 'C:\\Users\\jackc\\OneDrive\\Work\\Riverside\\Wall Of Honor\\mig\\Veterans';
const OUTPUT_DIR = './migration-output';

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Connect to SQLite database
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

async function exportData() {
    try {
        // Export Veterans
        const veterans = await queryDatabase(`
            SELECT Id, FirstName, LastName, GraduationYear, Rank, 
                   MilitaryEntryDate, MilitaryExitDate, Description
            FROM Veterans 
            WHERE Deleted = 0
        `);

        // Export Branches
        const branches = await queryDatabase(`
            SELECT Id, Name, Description 
            FROM Branches
        `);

        // Export Deployments
        const deployments = await queryDatabase(`
            SELECT Id, Title, Description, Location, StartDate, EndDate, 
                   PositionX, PositionY 
            FROM Deployments
        `);

        // Export Relationships
        const veteranBranches = await queryDatabase(`
            SELECT VeteransId, BranchesId 
            FROM BeaverBranchBeaverVeteran
        `);

        const veteranDeployments = await queryDatabase(`
            SELECT VeteransId, DeploymentsId 
            FROM BeaverDeploymentBeaverVeteran
        `);

        // Transform data for Firebase wall structure
        const wallData = {
            wall: {
                name: "Veterans Wall of Honor",
                description: "Honoring our veterans who served our country with distinction",
                organizationName: "Riverside Local Schools",
                organizationSubtitle: "Riverside Local Schools",
                settings: {
                    allowComments: true,
                    allowRatings: true,
                    enableNotifications: true,
                    autoSave: true,
                    moderationRequired: false,
                    inactivityTimeout: 10
                },
                visibility: {
                    isPublished: true,
                    requiresLogin: false
                }
            },
            items: {
                veterans: veterans.map(v => ({
                    id: v.Id.toLowerCase(),
                    objectTypeId: 'veteran',
                    fieldData: {
                        name: `${v.FirstName || ''} ${v.LastName || ''}`.trim(),
                        graduationYear: v.GraduationYear?.toString() || '',
                        rank: v.Rank || '',
                        militaryEntryDate: v.MilitaryEntryDate ? new Date(v.MilitaryEntryDate) : null,
                        militaryExitDate: v.MilitaryExitDate ? new Date(v.MilitaryExitDate) : null,
                        description: v.Description || '',
                        branches: getBranchesForVeteran(v.Id, veteranBranches),
                        deployments: getDeploymentsForVeteran(v.Id, veteranDeployments)
                    },
                    images: [`${v.Id.toLowerCase()}.png`], // Will need to be uploaded to Firebase Storage
                    createdAt: new Date(),
                    updatedAt: new Date()
                })),
                branches: branches.map(b => ({
                    id: b.Id.toLowerCase(),
                    objectTypeId: 'branch',
                    fieldData: {
                        name: b.Name,
                        description: b.Description || ''
                    },
                    images: [`${b.Id.toLowerCase()}.png`],
                    createdAt: new Date(),
                    updatedAt: new Date()
                })),
                deployments: deployments.map(d => ({
                    id: d.Id.toLowerCase(),
                    objectTypeId: 'deployment',
                    fieldData: {
                        title: d.Title,
                        description: d.Description || '',
                        location: {
                            lat: d.PositionY,
                            lng: d.PositionX,
                            address: d.Location
                        },
                        startDate: d.StartDate ? new Date(d.StartDate) : null,
                        endDate: d.EndDate ? new Date(d.EndDate) : null
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }))
            },
            imageMapping: {
                veterans: veterans.map(v => ({
                    oldPath: `${IMAGES_BASE}\\Veterans\\Images\\${v.Id.toLowerCase()}.png`,
                    newName: `${v.Id.toLowerCase()}.png`
                })),
                branches: branches.map(b => ({
                    oldPath: `${IMAGES_BASE}\\Branches\\Images\\${b.Id.toLowerCase()}.png`,
                    newName: `${b.Id.toLowerCase()}.png`
                }))
            }
        };

        // Helper functions
        function getBranchesForVeteran(veteranId, relationships) {
            return relationships
                .filter(rel => rel.VeteransId === veteranId)
                .map(rel => rel.BranchesId.toLowerCase());
        }

        function getDeploymentsForVeteran(veteranId, relationships) {
            return relationships
                .filter(rel => rel.VeteransId === veteranId)
                .map(rel => rel.DeploymentsId.toLowerCase());
        }

        // Save to files
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'wall-data.json'),
            JSON.stringify(wallData, null, 2)
        );

        // Create image copy script
        const copyScript = generateImageCopyScript(wallData.imageMapping);
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'copy-images.bat'),
            copyScript
        );

        console.log(`\n✅ Migration data exported to ${OUTPUT_DIR}/`);
        console.log(`📊 Summary:`);
        console.log(`   • ${veterans.length} Veterans`);
        console.log(`   • ${branches.length} Branches`);
        console.log(`   • ${deployments.length} Deployments`);
        console.log(`   • ${veteranBranches.length} Veteran-Branch relationships`);
        console.log(`   • ${veteranDeployments.length} Veteran-Deployment relationships`);

    } catch (error) {
        console.error('Error during export:', error);
    } finally {
        db.close();
    }
}

function queryDatabase(sql) {
    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function generateImageCopyScript(imageMapping) {
    let script = '@echo off\n';
    script += 'echo Copying veteran images...\n';
    script += 'mkdir firebase-images\\veterans 2>nul\n';
    
    imageMapping.veterans.forEach(img => {
        if (fs.existsSync(img.oldPath)) {
            script += `copy "${img.oldPath}" "firebase-images\\veterans\\${img.newName}"\n`;
        }
    });
    
    script += 'echo Copying branch images...\n';
    script += 'mkdir firebase-images\\branches 2>nul\n';
    
    imageMapping.branches.forEach(img => {
        if (fs.existsSync(img.oldPath)) {
            script += `copy "${img.oldPath}" "firebase-images\\branches\\${img.newName}"\n`;
        }
    });
    
    script += 'echo Image copying complete!\n';
    return script;
}

// Run the export
exportData();