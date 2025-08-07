#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();

async function addAwardsObjectType(wallId) {
    try {
        console.log('🏅 Adding Awards object type to Veterans Wall...');
        
        // Get the current wall configuration
        const wallRef = db.collection('walls').doc(wallId);
        const wallDoc = await wallRef.get();
        
        if (!wallDoc.exists) {
            throw new Error('Wall not found!');
        }

        const wallData = wallDoc.data();
        console.log(`📄 Current wall has ${wallData.objectTypes?.length || 0} object types`);

        // Create the Award object type
        const awardObjectType = {
            id: 'award',
            wallId: wallId,
            name: 'Award',
            description: 'Military awards, decorations, and honors',
            icon: 'military_tech',
            color: '#ffd700', // Gold color for awards
            fields: [
                { 
                    id: 'name', 
                    name: 'Award Name', 
                    type: 'text', 
                    required: true,
                    description: 'Official name of the award or decoration'
                },
                { 
                    id: 'category', 
                    name: 'Category', 
                    type: 'select', 
                    required: false,
                    options: [
                        'Medal of Honor',
                        'Distinguished Service Cross',
                        'Silver Star', 
                        'Bronze Star',
                        'Purple Heart',
                        'Combat Action Ribbon',
                        'Good Conduct Medal',
                        'National Defense Service Medal',
                        'Campaign Medal',
                        'Service Ribbon',
                        'Unit Citation',
                        'Other'
                    ],
                    description: 'Type or category of award'
                },
                { 
                    id: 'dateAwarded', 
                    name: 'Date Awarded', 
                    type: 'date', 
                    required: false,
                    description: 'Date the award was presented'
                },
                { 
                    id: 'citation', 
                    name: 'Citation', 
                    type: 'longtext', 
                    required: false,
                    description: 'Official citation or reason for award'
                },
                { 
                    id: 'awardingUnit', 
                    name: 'Awarding Unit', 
                    type: 'text', 
                    required: false,
                    description: 'Unit or command that presented the award'
                },
                { 
                    id: 'theater', 
                    name: 'Theater of Operations', 
                    type: 'text', 
                    required: false,
                    description: 'Geographic area or campaign where award was earned'
                }
            ],
            displaySettings: {
                primaryField: 'name',
                secondaryField: 'category',
                tertiaryField: 'dateAwarded',
                showOnMap: false,
                cardLayout: 'detailed'
            },
            isActive: true,
            sortOrder: 3, // After veteran, branch, deployment
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };

        // Update veteran object type to include awards relationship
        const updatedObjectTypes = wallData.objectTypes.map(objectType => {
            if (objectType.id === 'veteran') {
                // Add awards field to veteran
                const updatedFields = [...objectType.fields];
                
                // Check if awards field already exists
                const awardsFieldIndex = updatedFields.findIndex(f => f.id === 'awards');
                
                if (awardsFieldIndex === -1) {
                    // Add new awards field
                    updatedFields.push({
                        id: 'awards',
                        name: 'Military Awards',
                        type: 'entity',
                        required: false,
                        entityConfig: {
                            targetObjectTypeId: 'award',
                            allowMultiple: true,
                            displayMode: 'chips'
                        },
                        description: 'Military awards and decorations received'
                    });
                } else {
                    // Update existing awards field to be entity type
                    updatedFields[awardsFieldIndex] = {
                        ...updatedFields[awardsFieldIndex],
                        type: 'entity',
                        entityConfig: {
                            targetObjectTypeId: 'award',
                            allowMultiple: true,
                            displayMode: 'chips'
                        }
                    };
                }

                return {
                    ...objectType,
                    fields: updatedFields,
                    updatedAt: admin.firestore.Timestamp.now()
                };
            }
            return objectType;
        });

        // Add the award object type to the array
        updatedObjectTypes.push(awardObjectType);

        // Update the wall with the new object types
        await wallRef.update({
            objectTypes: updatedObjectTypes,
            updatedAt: admin.firestore.Timestamp.now()
        });

        console.log('✅ Awards object type added successfully!');
        console.log(`📊 Wall now has ${updatedObjectTypes.length} object types:`);
        updatedObjectTypes.forEach((ot, index) => {
            console.log(`   ${index + 1}. ${ot.name} (${ot.id}) - ${ot.fields.length} fields`);
        });

        // Create some sample awards that are commonly awarded
        console.log('🏅 Creating sample military awards...');
        
        const sampleAwards = [
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Purple Heart',
                    category: 'Purple Heart',
                    citation: 'For military merit and for wounds received in action against an enemy of the United States.',
                    awardingUnit: 'United States Armed Forces',
                    theater: ''
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Bronze Star Medal',
                    category: 'Bronze Star',
                    citation: 'For heroic or meritorious achievement or service in a combat zone.',
                    awardingUnit: 'United States Army',
                    theater: ''
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Combat Action Ribbon',
                    category: 'Combat Action Ribbon',
                    citation: 'For active participation in ground or surface combat.',
                    awardingUnit: 'United States Armed Forces',
                    theater: ''
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Good Conduct Medal',
                    category: 'Good Conduct Medal',
                    citation: 'For exemplary behavior, efficiency, and fidelity during military service.',
                    awardingUnit: 'United States Armed Forces',
                    theater: ''
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'National Defense Service Medal',
                    category: 'National Defense Service Medal',
                    citation: 'For honorable active military service during a designated national emergency.',
                    awardingUnit: 'United States Armed Forces',
                    theater: ''
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Vietnam Service Medal',
                    category: 'Campaign Medal',
                    citation: 'For service in the Vietnam War between 1965 and 1973.',
                    awardingUnit: 'United States Armed Forces',
                    theater: 'Southeast Asia'
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Iraq Campaign Medal',
                    category: 'Campaign Medal',
                    citation: 'For service in Iraq during Operation Iraqi Freedom.',
                    awardingUnit: 'United States Armed Forces',
                    theater: 'Iraq'
                }
            },
            {
                objectTypeId: 'award',
                fieldData: {
                    name: 'Afghanistan Campaign Medal',
                    category: 'Campaign Medal',
                    citation: 'For service in Afghanistan during Operation Enduring Freedom.',
                    awardingUnit: 'United States Armed Forces',
                    theater: 'Afghanistan'
                }
            }
        ];

        const batch = db.batch();
        let createdAwards = 0;

        for (const award of sampleAwards) {
            const awardRef = db.collection('wall_items').doc();
            batch.set(awardRef, {
                ...award,
                id: awardRef.id,
                wallId: wallId,
                images: [], // Awards don't typically have individual images
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            });
            createdAwards++;
        }

        await batch.commit();
        console.log(`✅ Created ${createdAwards} sample awards`);

        console.log('\n🎉 Awards system setup complete!');
        console.log('📋 Next steps:');
        console.log('   • Veterans can now be linked to their awards');
        console.log('   • Add specific awards for individual veterans');
        console.log('   • Upload award ribbon/medal images if available');
        
    } catch (error) {
        console.error('❌ Error adding awards object type:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node add-awards-object-type.js YOUR_WALL_ID');
    process.exit(1);
}

addAwardsObjectType(wallId)
    .then(() => {
        console.log('\n✨ Veterans Wall now includes a comprehensive awards system!');
        console.log(`🔗 View your wall: http://localhost:4301/walls/${wallId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Awards setup failed:', error);
        process.exit(1);
    });