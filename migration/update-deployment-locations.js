#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://riverside-wall-app.firebasestorage.app"
});

const db = admin.firestore();

// World coordinates for military deployments and locations
const locationMappings = {
    // Vietnam War Locations
    'vietnam': { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
    'saigon': { lat: 10.8231, lng: 106.6297, name: 'Saigon (Ho Chi Minh City)' },
    'ho chi minh city': { lat: 10.8231, lng: 106.6297, name: 'Ho Chi Minh City' },
    'hanoi': { lat: 21.0285, lng: 105.8542, name: 'Hanoi, Vietnam' },
    'da nang': { lat: 16.0544, lng: 108.2022, name: 'Da Nang, Vietnam' },
    'hue': { lat: 16.4637, lng: 107.5909, name: 'Hue, Vietnam' },
    'khe sanh': { lat: 16.6267, lng: 106.7233, name: 'Khe Sanh Combat Base' },
    'cam ranh bay': { lat: 11.8796, lng: 109.2195, name: 'Cam Ranh Bay' },
    'long binh': { lat: 10.9470, lng: 106.8236, name: 'Long Binh Post' },
    'cu chi': { lat: 10.9733, lng: 106.4933, name: 'Cu Chi' },
    'mekong delta': { lat: 10.0341, lng: 105.7818, name: 'Mekong Delta' },
    'dmz vietnam': { lat: 17.0000, lng: 107.0000, name: 'Vietnamese DMZ' },
    'pleiku': { lat: 13.9833, lng: 108.0000, name: 'Pleiku' },
    'nha trang': { lat: 12.2388, lng: 109.1967, name: 'Nha Trang' },
    'phu bai': { lat: 16.4014, lng: 107.7031, name: 'Phu Bai Combat Base' },
    
    // Korean War Locations
    'korea': { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
    'south korea': { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
    'north korea': { lat: 40.3399, lng: 127.5101, name: 'North Korea' },
    'seoul': { lat: 37.5665, lng: 126.9780, name: 'Seoul, South Korea' },
    'pusan': { lat: 35.1796, lng: 129.0756, name: 'Busan (Pusan)' },
    'busan': { lat: 35.1796, lng: 129.0756, name: 'Busan' },
    'inchon': { lat: 37.4563, lng: 126.7052, name: 'Inchon' },
    'chosin reservoir': { lat: 40.4500, lng: 127.2000, name: 'Chosin Reservoir' },
    'dmz korea': { lat: 38.3200, lng: 127.2000, name: 'Korean DMZ' },
    '38th parallel': { lat: 38.0000, lng: 127.0000, name: '38th Parallel' },
    'panmunjom': { lat: 37.9558, lng: 126.6790, name: 'Panmunjom' },
    'osan': { lat: 37.0906, lng: 127.0306, name: 'Osan Air Base' },
    'camp humphreys': { lat: 36.9658, lng: 127.0314, name: 'Camp Humphreys' },
    'camp casey': { lat: 37.9167, lng: 127.0500, name: 'Camp Casey' },
    
    // Iraq War Locations
    'iraq': { lat: 33.2232, lng: 43.6793, name: 'Iraq' },
    'baghdad': { lat: 33.3152, lng: 44.3661, name: 'Baghdad, Iraq' },
    'green zone': { lat: 33.3089, lng: 44.3869, name: 'Green Zone, Baghdad' },
    'fallujah': { lat: 33.3500, lng: 43.7833, name: 'Fallujah' },
    'mosul': { lat: 36.3350, lng: 43.1189, name: 'Mosul' },
    'basra': { lat: 30.5081, lng: 47.7803, name: 'Basra' },
    'tikrit': { lat: 34.6167, lng: 43.6833, name: 'Tikrit' },
    'ramadi': { lat: 33.4225, lng: 43.3074, name: 'Ramadi' },
    'camp victory': { lat: 33.2625, lng: 44.2750, name: 'Camp Victory' },
    'camp speicher': { lat: 34.5986, lng: 43.6772, name: 'Camp Speicher' },
    'balad air base': { lat: 33.9403, lng: 44.3661, name: 'Balad Air Base' },
    'al asad': { lat: 33.7856, lng: 42.4414, name: 'Al Asad Airbase' },
    'camp taji': { lat: 33.5242, lng: 44.2569, name: 'Camp Taji' },
    'abu ghraib': { lat: 33.2914, lng: 44.0656, name: 'Abu Ghraib' },
    
    // Afghanistan War Locations
    'afghanistan': { lat: 33.9391, lng: 67.7100, name: 'Afghanistan' },
    'kabul': { lat: 34.5553, lng: 69.2075, name: 'Kabul, Afghanistan' },
    'kandahar': { lat: 31.6289, lng: 65.7372, name: 'Kandahar' },
    'bagram': { lat: 34.9461, lng: 69.2650, name: 'Bagram Airfield' },
    'helmand': { lat: 31.3411, lng: 64.3602, name: 'Helmand Province' },
    'camp bastion': { lat: 31.8639, lng: 64.1856, name: 'Camp Bastion' },
    'camp leatherneck': { lat: 31.8639, lng: 64.1856, name: 'Camp Leatherneck' },
    'herat': { lat: 34.3482, lng: 62.1997, name: 'Herat' },
    'jalalabad': { lat: 34.4303, lng: 70.4519, name: 'Jalalabad' },
    'mazar-i-sharif': { lat: 36.7098, lng: 67.1107, name: 'Mazar-i-Sharif' },
    'fob chapman': { lat: 33.3339, lng: 69.9511, name: 'FOB Chapman' },
    'tora bora': { lat: 34.1167, lng: 70.2167, name: 'Tora Bora' },
    'korengal valley': { lat: 35.2544, lng: 70.8961, name: 'Korengal Valley' },
    'marjah': { lat: 31.5211, lng: 64.1142, name: 'Marjah' },
    
    // Gulf War / Desert Storm
    'kuwait': { lat: 29.3117, lng: 47.4818, name: 'Kuwait' },
    'kuwait city': { lat: 29.3759, lng: 47.9774, name: 'Kuwait City' },
    'saudi arabia': { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
    'riyadh': { lat: 24.7136, lng: 46.6753, name: 'Riyadh, Saudi Arabia' },
    'dhahran': { lat: 26.2361, lng: 50.0393, name: 'Dhahran' },
    'king fahd': { lat: 26.2658, lng: 50.1522, name: 'King Fahd Air Base' },
    'khobar': { lat: 26.2172, lng: 50.1971, name: 'Khobar' },
    
    // WWII Pacific Theater
    'pearl harbor': { lat: 21.3670, lng: -157.9385, name: 'Pearl Harbor' },
    'iwo jima': { lat: 24.7840, lng: 141.3228, name: 'Iwo Jima' },
    'okinawa': { lat: 26.3344, lng: 127.8056, name: 'Okinawa' },
    'guadalcanal': { lat: -9.6457, lng: 160.1562, name: 'Guadalcanal' },
    'midway': { lat: 28.2072, lng: -177.3735, name: 'Midway Atoll' },
    'philippines': { lat: 12.8797, lng: 121.7740, name: 'Philippines' },
    'manila': { lat: 14.5995, lng: 120.9842, name: 'Manila' },
    'bataan': { lat: 14.7567, lng: 120.4822, name: 'Bataan' },
    'corregidor': { lat: 14.3819, lng: 120.5731, name: 'Corregidor' },
    'leyte': { lat: 10.7936, lng: 124.9381, name: 'Leyte' },
    'guam': { lat: 13.4443, lng: 144.7937, name: 'Guam' },
    'saipan': { lat: 15.2123, lng: 145.7545, name: 'Saipan' },
    'wake island': { lat: 19.2823, lng: 166.6470, name: 'Wake Island' },
    
    // WWII European Theater
    'normandy': { lat: 49.3473, lng: -0.8814, name: 'Normandy, France' },
    'd-day beaches': { lat: 49.3473, lng: -0.8814, name: 'D-Day Beaches' },
    'omaha beach': { lat: 49.3697, lng: -0.8569, name: 'Omaha Beach' },
    'utah beach': { lat: 49.4156, lng: -1.1757, name: 'Utah Beach' },
    'paris': { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
    'berlin': { lat: 52.5200, lng: 13.4050, name: 'Berlin, Germany' },
    'bastogne': { lat: 50.0015, lng: 5.7164, name: 'Bastogne' },
    'battle of the bulge': { lat: 50.0000, lng: 5.7167, name: 'Ardennes (Battle of the Bulge)' },
    'italy': { lat: 41.8719, lng: 12.5674, name: 'Italy' },
    'anzio': { lat: 41.4475, lng: 12.6269, name: 'Anzio' },
    'monte cassino': { lat: 41.4902, lng: 13.8138, name: 'Monte Cassino' },
    'sicily': { lat: 37.6000, lng: 14.0154, name: 'Sicily' },
    'north africa': { lat: 26.3351, lng: 17.2283, name: 'North Africa' },
    'tunisia': { lat: 33.8869, lng: 9.5375, name: 'Tunisia' },
    'algeria': { lat: 28.0339, lng: 1.6596, name: 'Algeria' },
    
    // Other Military Locations
    'germany': { lat: 51.1657, lng: 10.4515, name: 'Germany' },
    'ramstein': { lat: 49.4369, lng: 7.6003, name: 'Ramstein Air Base' },
    'landstuhl': { lat: 49.4047, lng: 7.5706, name: 'Landstuhl Medical Center' },
    'japan': { lat: 36.2048, lng: 138.2529, name: 'Japan' },
    'yokosuka': { lat: 35.2814, lng: 139.6714, name: 'Yokosuka Naval Base' },
    'camp pendleton': { lat: 33.3869, lng: -117.5475, name: 'Camp Pendleton' },
    'fort bragg': { lat: 35.1415, lng: -79.0085, name: 'Fort Bragg' },
    'fort liberty': { lat: 35.1415, lng: -79.0085, name: 'Fort Liberty (Fort Bragg)' },
    'fort benning': { lat: 32.3508, lng: -84.9636, name: 'Fort Benning' },
    'fort moore': { lat: 32.3508, lng: -84.9636, name: 'Fort Moore (Fort Benning)' },
    'fort hood': { lat: 31.1349, lng: -97.7764, name: 'Fort Hood' },
    'fort cavazos': { lat: 31.1349, lng: -97.7764, name: 'Fort Cavazos (Fort Hood)' },
    'parris island': { lat: 32.3518, lng: -80.6829, name: 'Parris Island' },
    'camp lejeune': { lat: 34.6269, lng: -77.4017, name: 'Camp Lejeune' },
    'twentynine palms': { lat: 34.2372, lng: -116.0569, name: 'Twentynine Palms' },
    'diego garcia': { lat: -7.3195, lng: 72.4228, name: 'Diego Garcia' },
    'djibouti': { lat: 11.5721, lng: 43.1456, name: 'Djibouti' },
    'camp lemonnier': { lat: 11.5473, lng: 43.1594, name: 'Camp Lemonnier, Djibouti' },
    'kosovo': { lat: 42.6026, lng: 20.9030, name: 'Kosovo' },
    'bosnia': { lat: 43.9159, lng: 17.6791, name: 'Bosnia' },
    'sarajevo': { lat: 43.8563, lng: 18.4131, name: 'Sarajevo' },
    'mogadishu': { lat: 2.0469, lng: 45.3182, name: 'Mogadishu, Somalia' },
    'somalia': { lat: 5.1521, lng: 46.1996, name: 'Somalia' },
    'panama': { lat: 8.5380, lng: -80.7821, name: 'Panama' },
    'grenada': { lat: 12.2627, lng: -61.6045, name: 'Grenada' },
    'beirut': { lat: 33.8938, lng: 35.5018, name: 'Beirut, Lebanon' },
    'lebanon': { lat: 33.8547, lng: 35.8623, name: 'Lebanon' },
    'syria': { lat: 34.8021, lng: 38.9968, name: 'Syria' },
    'yemen': { lat: 15.5527, lng: 48.5164, name: 'Yemen' },
    'libya': { lat: 26.3351, lng: 17.2283, name: 'Libya' },
    'benghazi': { lat: 32.1194, lng: 20.0868, name: 'Benghazi, Libya' },
    'tripoli': { lat: 32.8872, lng: 13.1913, name: 'Tripoli, Libya' },
    'niger': { lat: 17.6078, lng: 8.0817, name: 'Niger' },
    'mali': { lat: 17.5707, lng: -3.9962, name: 'Mali' },
    'chad': { lat: 15.4542, lng: 18.7322, name: 'Chad' },
    'ukraine': { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
    'poland': { lat: 51.9194, lng: 19.1451, name: 'Poland' },
    'romania': { lat: 45.9432, lng: 24.9668, name: 'Romania' },
    'turkey': { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
    'incirlik': { lat: 37.0014, lng: 35.4259, name: 'Incirlik Air Base' },
    
    // Generic/Unknown
    'overseas': { lat: 0, lng: 0, name: 'Overseas Deployment' },
    'classified': { lat: 0, lng: 0, name: 'Classified Location' },
    'undisclosed': { lat: 0, lng: 0, name: 'Undisclosed Location' },
    'middle east': { lat: 29.2985, lng: 42.5510, name: 'Middle East Region' },
    'southeast asia': { lat: 3.1390, lng: 101.6869, name: 'Southeast Asia' },
    'pacific': { lat: -8.7832, lng: 124.5085, name: 'Pacific Theater' },
    'europe': { lat: 54.5260, lng: 15.2551, name: 'Europe' },
    'africa': { lat: -8.7832, lng: 34.5085, name: 'Africa' },
    'central america': { lat: 12.7690, lng: -85.6024, name: 'Central America' },
    'south america': { lat: -8.7832, lng: -55.4915, name: 'South America' }
};

/**
 * Get coordinates for a location string
 */
function getCoordinates(location) {
    if (!location || typeof location !== 'string') return null;
    
    const normalized = location.toLowerCase().trim();
    
    // Check exact match first
    if (locationMappings[normalized]) {
        return locationMappings[normalized];
    }
    
    // Check partial matches
    for (const [key, coords] of Object.entries(locationMappings)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return coords;
        }
    }
    
    // Special cases
    if (normalized.includes('classified') || normalized.includes('undisclosed')) {
        return locationMappings['classified'];
    }
    
    if (normalized.includes('overseas')) {
        return locationMappings['overseas'];
    }
    
    return null;
}

async function updateDeploymentLocations(wallId) {
    try {
        console.log('🌍 Starting deployment location update...');
        console.log(`📍 Processing wall: ${wallId}`);
        
        // Get all wall items for this wall
        const wallItemsRef = db.collection('wall_items');
        const snapshot = await wallItemsRef.where('wallId', '==', wallId).get();
        
        console.log(`📊 Found ${snapshot.size} wall items to process`);
        
        let updated = 0;
        let skipped = 0;
        let deploymentCount = 0;
        const batch = db.batch();
        let batchCount = 0;
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const itemId = doc.id;
            
            // Check if this is a deployment item
            if (data.objectTypeId === 'deployment' && data.fieldData) {
                deploymentCount++;
                let needsUpdate = false;
                const updates = { fieldData: { ...data.fieldData } };
                
                // Look for location field
                if (data.fieldData.location) {
                    // Check if it's a string that needs geocoding
                    if (typeof data.fieldData.location === 'string') {
                        const coords = getCoordinates(data.fieldData.location);
                        if (coords) {
                            console.log(`  ✅ ${data.fieldData.location} → ${coords.name} (${coords.lat}, ${coords.lng})`);
                            updates.fieldData.location = {
                                address: coords.name,
                                lat: coords.lat,
                                lng: coords.lng
                            };
                            needsUpdate = true;
                        } else {
                            console.log(`  ⚠️  No coordinates found for: ${data.fieldData.location}`);
                        }
                    } else if (typeof data.fieldData.location === 'object' && 
                              (!data.fieldData.location.lat || !data.fieldData.location.lng)) {
                        // Has location object but missing coordinates
                        const addressStr = data.fieldData.location.address || data.fieldData.location.name || '';
                        const coords = getCoordinates(addressStr);
                        if (coords) {
                            console.log(`  ✅ ${addressStr} → ${coords.name} (${coords.lat}, ${coords.lng})`);
                            updates.fieldData.location = {
                                ...data.fieldData.location,
                                address: coords.name,
                                lat: coords.lat,
                                lng: coords.lng
                            };
                            needsUpdate = true;
                        }
                    }
                }
                
                // Also check for theater field
                if (data.fieldData.theater && typeof data.fieldData.theater === 'string') {
                    const coords = getCoordinates(data.fieldData.theater);
                    if (coords && !data.fieldData.location) {
                        console.log(`  📍 Using theater as location: ${data.fieldData.theater} → ${coords.name}`);
                        updates.fieldData.location = {
                            address: coords.name,
                            lat: coords.lat,
                            lng: coords.lng
                        };
                        needsUpdate = true;
                    }
                }
                
                if (needsUpdate) {
                    batch.update(doc.ref, {
                        fieldData: updates.fieldData,
                        updatedAt: admin.firestore.Timestamp.now()
                    });
                    updated++;
                    batchCount++;
                    
                    // Commit batch every 500 items
                    if (batchCount >= 500) {
                        await batch.commit();
                        console.log(`  💾 Committed batch of ${batchCount} updates`);
                        batchCount = 0;
                    }
                } else {
                    skipped++;
                }
            }
        }
        
        // Commit any remaining updates
        if (batchCount > 0) {
            await batch.commit();
            console.log(`  💾 Committed final batch of ${batchCount} updates`);
        }
        
        console.log('\n=== Update Complete ===');
        console.log(`🎖️  Total deployments found: ${deploymentCount}`);
        console.log(`✅ Updated: ${updated} items`);
        console.log(`⏭️  Skipped: ${skipped} items`);
        
        if (updated > 0) {
            console.log('\n📍 Locations updated with world coordinates:');
            console.log('   • Vietnam, Iraq, Afghanistan theaters');
            console.log('   • Korean War locations');
            console.log('   • WWII Pacific and European theaters');
            console.log('   • Modern deployment locations');
            console.log('   • Military bases worldwide');
        }
        
    } catch (error) {
        console.error('❌ Error updating deployment locations:', error);
        throw error;
    }
}

// Get wallId from command line argument
const wallId = process.argv[2];
if (!wallId) {
    console.error('Please provide the wall ID as an argument:');
    console.error('node update-deployment-locations.js YOUR_WALL_ID');
    console.error('\nExample:');
    console.error('node update-deployment-locations.js abc123xyz');
    process.exit(1);
}

// Run the migration
updateDeploymentLocations(wallId)
    .then(() => {
        console.log('\n✨ Deployment locations have been updated with real-world coordinates!');
        console.log(`🗺️  View your wall map: http://localhost:4301/walls/${wallId}/map`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });