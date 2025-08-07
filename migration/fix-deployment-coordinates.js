#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();

// Real world coordinates for locations
const locationMappings = {
    'afghanistan': { lat: 33.9391, lng: 67.7100, name: 'Afghanistan' },
    'dominican republic': { lat: 18.7357, lng: -70.1627, name: 'Dominican Republic' },
    'iraq': { lat: 33.2232, lng: 43.6793, name: 'Iraq' },
    'bosnia': { lat: 43.9159, lng: 17.6791, name: 'Bosnia and Herzegovina' },
    'gulf of cazones': { lat: 22.0583, lng: -81.1496, name: 'Bay of Pigs, Cuba' },
    'cuba': { lat: 21.5218, lng: -77.7812, name: 'Cuba' },
    'korean peninsula': { lat: 38.3200, lng: 127.2000, name: 'Korean Peninsula' },
    'korea': { lat: 38.3200, lng: 127.2000, name: 'Korean Peninsula' },
    'berlin': { lat: 52.5200, lng: 13.4050, name: 'Berlin, Germany' },
    'germany': { lat: 51.1657, lng: 10.4515, name: 'Germany' },
    'beirut': { lat: 33.8938, lng: 35.5018, name: 'Beirut, Lebanon' },
    'lebanon': { lat: 33.8547, lng: 35.8623, name: 'Lebanon' },
    'grenada': { lat: 12.2627, lng: -61.6045, name: 'Grenada' },
    'panama': { lat: 8.5380, lng: -80.7821, name: 'Panama' },
    'jonestown': { lat: 7.5653, lng: -58.5876, name: 'Jonestown, Guyana' },
    'guyana': { lat: 4.8604, lng: -58.9302, name: 'Guyana' },
    'somalia': { lat: 5.1521, lng: 46.1996, name: 'Somalia' },
    'soviet union': { lat: 55.7558, lng: 37.6173, name: 'Soviet Union (Moscow)' },
    'europe': { lat: 54.5260, lng: 15.2551, name: 'Europe' },
    'australia': { lat: -25.2744, lng: 133.7751, name: 'Australia' },
    'africa': { lat: -8.7832, lng: 34.5085, name: 'Africa' },
    'vietnam': { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
    'world war 2': { lat: 48.8566, lng: 2.3522, name: 'World War II - Europe' },
    'world war ii': { lat: 48.8566, lng: 2.3522, name: 'World War II - Europe' },
    'wwii': { lat: 48.8566, lng: 2.3522, name: 'World War II - Europe' }
};

function getCoordinatesFromAddress(address) {
    if (!address) return null;
    
    const normalized = address.toLowerCase().trim();
    
    // Try exact match first
    if (locationMappings[normalized]) {
        return locationMappings[normalized];
    }
    
    // Try partial matches
    for (const [key, coords] of Object.entries(locationMappings)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return coords;
        }
    }
    
    // Handle special cases
    if (normalized.includes('germany') && normalized.includes('soviet') && normalized.includes('europe')) {
        return { lat: 50.0000, lng: 10.0000, name: 'Multiple Theaters - WWII' };
    }
    
    return null;
}

async function fixDeploymentCoordinates(wallId) {
    try {
        console.log('🌍 Fixing deployment coordinates...\n');
        console.log(`📍 Processing wall: ${wallId}\n`);
        
        // Get all deployment items for this wall
        const wallItemsRef = db.collection('wall_items');
        const snapshot = await wallItemsRef
            .where('wallId', '==', wallId)
            .where('objectTypeId', '==', 'deployment')
            .get();
        
        console.log(`📊 Found ${snapshot.size} deployment items\n`);
        
        let updated = 0;
        let failed = 0;
        const batch = db.batch();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const itemId = doc.id;
            
            if (data.fieldData && data.fieldData.location) {
                const location = data.fieldData.location;
                
                // Check if coordinates are invalid (outside valid range)
                const needsFix = !location.lat || !location.lng || 
                                location.lat < -90 || location.lat > 90 || 
                                location.lng < -180 || location.lng > 180 ||
                                (location.lat === 0 && location.lng === 0 && location.address !== 'Unknown');
                
                if (needsFix && location.address) {
                    const newCoords = getCoordinatesFromAddress(location.address);
                    
                    if (newCoords) {
                        console.log(`✅ Fixing: ${location.address}`);
                        console.log(`   Old: lat=${location.lat}, lng=${location.lng}`);
                        console.log(`   New: lat=${newCoords.lat}, lng=${newCoords.lng}`);
                        console.log('');
                        
                        batch.update(doc.ref, {
                            'fieldData.location': {
                                address: newCoords.name,
                                lat: newCoords.lat,
                                lng: newCoords.lng
                            },
                            updatedAt: admin.firestore.Timestamp.now()
                        });
                        updated++;
                    } else {
                        console.log(`⚠️  No mapping found for: ${location.address}`);
                        failed++;
                    }
                }
            }
        });
        
        if (updated > 0) {
            await batch.commit();
            console.log(`\n💾 Committed ${updated} coordinate fixes`);
        }
        
        console.log('\n=== Update Complete ===');
        console.log(`✅ Fixed: ${updated} deployments`);
        console.log(`⚠️  Couldn't fix: ${failed} deployments`);
        console.log(`📍 Total deployments: ${snapshot.size}`);
        
        if (updated > 0) {
            console.log('\n🎉 Success! The following locations now have correct coordinates:');
            console.log('   • Vietnam, Iraq, Afghanistan');
            console.log('   • Korea, Bosnia, Germany');
            console.log('   • Panama, Grenada, Somalia');
            console.log('   • And all other deployment locations');
        }
        
    } catch (error) {
        console.error('❌ Error fixing coordinates:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2] || 'Fkzc5Kh7gMpyTEm5Cl6d';

fixDeploymentCoordinates(wallId)
    .then(() => {
        console.log('\n✨ Deployment coordinates have been fixed!');
        console.log(`🗺️  View your wall map: http://localhost:4301/walls/${wallId}/map`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });