const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createFreshAlumniWall() {
  try {
    console.log('🏗️  CREATING FRESH ALUMNI WALL (Clean Slate)\n');
    
    const userId = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';
    const userEmail = 'jack.carbone@riversideschools.net';
    const timestamp = admin.firestore.Timestamp.now();
    
    // Generate new IDs
    const newWallId = db.collection('walls').doc().id;
    const newObjectTypeId = `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🆔 New Wall ID: ${newWallId}`);
    console.log(`🆔 New Object Type ID: ${newObjectTypeId}`);
    
    // Create the fresh wall document
    const freshWallData = {
      name: "Alumni Wall 2024",
      description: "Fresh Alumni Wall - All Riverside Graduates",
      organizationName: "Riverside Local Schools", 
      organizationSubtitle: "Riverside Local Schools",
      organizationLogoUrl: "",
      
      // Essential permissions
      ownerId: userId,
      ownerEmail: userEmail,
      published: true,
      
      permissions: {
        owner: userId,
        editors: [],
        managers: [],
        viewers: [],
        allowDepartmentEdit: false
      },
      
      visibility: {
        isPublished: true,
        requiresLogin: false,
        publishedAt: timestamp,
        publishedBy: userId
      },
      
      // Simple object type structure
      objectTypes: [
        {
          id: newObjectTypeId,
          wallId: newWallId,
          name: "Alumni",
          description: "Riverside Alumni",
          icon: "school",
          color: "#2563eb",
          
          fields: [
            {
              id: "name",
              name: "Full Name", 
              type: "text",
              required: true,
              placeholder: "Enter full name..."
            },
            {
              id: "graduationYear",
              name: "Graduation Year",
              type: "number", 
              required: true,
              placeholder: "Enter graduation year..."
            },
            {
              id: "category",
              name: "Category",
              type: "text",
              required: false,
              placeholder: "Alumni, Faculty, etc."
            },
            {
              id: "inductionYear", 
              name: "Induction Year",
              type: "text",
              required: false,
              placeholder: "Year inducted..."
            }
          ],
          
          relationships: [],
          displaySettings: {
            cardLayout: "detailed",
            showOnMap: false,
            primaryField: "name",
            secondaryField: "category"
          },
          
          isActive: true,
          sortOrder: 0,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      
      relationshipDefinitions: [],
      settings: {
        allowComments: false,
        allowRatings: false,
        enableNotifications: true,
        autoSave: true,
        moderationRequired: false
      },
      
      theme: {
        id: "default",
        name: "Default",
        isCustom: false
      },
      
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActivityAt: timestamp
    };
    
    console.log('💾 Creating wall document...');
    await db.collection('walls').doc(newWallId).set(freshWallData);
    console.log('✅ Wall created successfully');
    
    // Now import the alumni data
    console.log('\n📊 Importing alumni data...');
    
    // Load alumni data
    const fs = require('fs');
    const path = require('path');
    const alumniData = JSON.parse(fs.readFileSync(path.join(__dirname, 'alumni-data.json'), 'utf8'));
    
    console.log(`Found ${alumniData.length} alumni to import`);
    
    // Import in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let totalImported = 0;
    
    for (const alumni of alumniData) {
      const wallItem = {
        wallId: newWallId,
        objectTypeId: newObjectTypeId,
        name: alumni.fullName || `${alumni.firstName} ${alumni.lastName}` || 'Unknown Alumni',
        published: true,
        
        fields: {
          name: alumni.fullName || `${alumni.firstName} ${alumni.lastName}` || '',
          graduationYear: alumni.graduationYear ? parseInt(alumni.graduationYear) || null : null,
          category: alumni.category || '',
          inductionYear: alumni.inductionYear || ''
        },
        
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Add to batch
      const docRef = db.collection('wall-items').doc();
      batch.set(docRef, wallItem);
      count++;
      
      // Commit batch when it reaches the limit
      if (count >= batchSize) {
        await batch.commit();
        totalImported += count;
        console.log(`✅ Imported ${totalImported} alumni...`);
        batch = db.batch();
        count = 0;
      }
    }
    
    // Commit any remaining items
    if (count > 0) {
      await batch.commit();
      totalImported += count;
    }
    
    console.log(`\n🎉 SUCCESS! Fresh Alumni Wall Created!`);
    console.log(`📊 Imported: ${totalImported} alumni`);
    console.log(`🔗 URL: https://rlswall.app/walls/${newWallId}/preset/${newObjectTypeId}/items`);
    console.log(`\n✅ This fresh wall should work perfectly with:`);
    console.log(`   - All ${totalImported} alumni visible`);
    console.log(`   - Add button enabled`);
    console.log(`   - No frontend issues`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createFreshAlumniWall();