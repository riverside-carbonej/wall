/**
 * Script to update location fields in Firebase with proper coordinates
 * Run with: npx ts-node scripts/update-locations.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, where, query } from 'firebase/firestore';

// Your Firebase config (copy from your app.config.ts)
const firebaseConfig = {
  // TODO: Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Location mappings for common places
const locationMappings: Record<string, { lat: number; lng: number }> = {
  // Universities
  "university of california riverside": { lat: 33.9737, lng: -117.3281 },
  "ucr": { lat: 33.9737, lng: -117.3281 },
  "uc riverside": { lat: 33.9737, lng: -117.3281 },
  "riverside campus": { lat: 33.9737, lng: -117.3281 },
  
  // UCR Buildings and Landmarks
  "bell tower": { lat: 33.9752, lng: -117.3266 },
  "ucr bell tower": { lat: 33.9752, lng: -117.3266 },
  "rivera library": { lat: 33.9729, lng: -117.3268 },
  "tomás rivera library": { lat: 33.9729, lng: -117.3268 },
  "science library": { lat: 33.9744, lng: -117.3255 },
  "orbach library": { lat: 33.9722, lng: -117.3281 },
  "student recreation center": { lat: 33.9765, lng: -117.3296 },
  "src": { lat: 33.9765, lng: -117.3296 },
  "hub": { lat: 33.9735, lng: -117.3279 },
  "ucr hub": { lat: 33.9735, lng: -117.3279 },
  "university theatre": { lat: 33.9714, lng: -117.3315 },
  "arts building": { lat: 33.9709, lng: -117.3318 },
  "pierce hall": { lat: 33.9748, lng: -117.3251 },
  "watkins hall": { lat: 33.9724, lng: -117.3272 },
  "humanities building": { lat: 33.9721, lng: -117.3289 },
  "olmsted hall": { lat: 33.9718, lng: -117.3263 },
  "sproul hall": { lat: 33.9734, lng: -117.3263 },
  "physics building": { lat: 33.9741, lng: -117.3244 },
  "bourns hall": { lat: 33.9756, lng: -117.3267 },
  "winston chung hall": { lat: 33.9754, lng: -117.3274 },
  "materials science and engineering": { lat: 33.9749, lng: -117.3260 },
  "multidisciplinary research building": { lat: 33.9761, lng: -117.3249 },
  "university office building": { lat: 33.9729, lng: -117.3255 },
  "surge building": { lat: 33.9726, lng: -117.3251 },
  "life sciences building": { lat: 33.9716, lng: -117.3253 },
  "biological sciences": { lat: 33.9716, lng: -117.3253 },
  "genomics building": { lat: 33.9709, lng: -117.3242 },
  "boyce hall": { lat: 33.9703, lng: -117.3249 },
  "webber hall": { lat: 33.9706, lng: -117.3257 },
  "geology building": { lat: 33.9741, lng: -117.3237 },
  "statistics building": { lat: 33.9735, lng: -117.3242 },
  "skye hall": { lat: 33.9749, lng: -117.3231 },
  "chass interdisciplinary south": { lat: 33.9714, lng: -117.3296 },
  "chass interdisciplinary north": { lat: 33.9719, lng: -117.3296 },
  
  // Dining Halls & Food
  "glasgow": { lat: 33.9768, lng: -117.3289 },
  "glasgow dining": { lat: 33.9768, lng: -117.3289 },
  "lothian": { lat: 33.9789, lng: -117.3271 },
  "lothian dining": { lat: 33.9789, lng: -117.3271 },
  "ai dining": { lat: 33.9777, lng: -117.3314 },
  "market at glen mor": { lat: 33.9802, lng: -117.3359 },
  "bytes": { lat: 33.9735, lng: -117.3279 },
  "coffee bean": { lat: 33.9735, lng: -117.3279 },
  "subway": { lat: 33.9735, lng: -117.3279 },
  "panda express": { lat: 33.9735, lng: -117.3279 },
  "habit burger": { lat: 33.9735, lng: -117.3279 },
  "ivan's food court": { lat: 33.9765, lng: -117.3296 },
  
  // Residence Halls
  "pentland hills": { lat: 33.9789, lng: -117.3254 },
  "lothian": { lat: 33.9789, lng: -117.3271 },
  "aberdeen inverness": { lat: 33.9777, lng: -117.3314 },
  "ai": { lat: 33.9777, lng: -117.3314 },
  "dundee": { lat: 33.9802, lng: -117.3337 },
  "glen mor": { lat: 33.9802, lng: -117.3359 },
  "glen mor 1": { lat: 33.9802, lng: -117.3359 },
  "glen mor 2": { lat: 33.9812, lng: -117.3371 },
  "falkirk": { lat: 33.9824, lng: -117.3358 },
  "bannockburn village": { lat: 33.9696, lng: -117.3189 },
  "oban": { lat: 33.9696, lng: -117.3202 },
  "stonehaven": { lat: 33.9708, lng: -117.3195 },
  "university plaza": { lat: 33.9681, lng: -117.3307 },
  "campus apartments": { lat: 33.9666, lng: -117.3295 },
  
  // Parking Lots
  "lot 1": { lat: 33.9749, lng: -117.3306 },
  "lot 6": { lat: 33.9722, lng: -117.3235 },
  "lot 13": { lat: 33.9698, lng: -117.3268 },
  "lot 15": { lat: 33.9711, lng: -117.3227 },
  "lot 24": { lat: 33.9795, lng: -117.3286 },
  "lot 26": { lat: 33.9785, lng: -117.3238 },
  "lot 30": { lat: 33.9767, lng: -117.3218 },
  "lot 32": { lat: 33.9812, lng: -117.3347 },
  "big springs parking structure": { lat: 33.9755, lng: -117.3219 },
  
  // Athletic Facilities
  "sports field": { lat: 33.9782, lng: -117.3335 },
  "soccer field": { lat: 33.9795, lng: -117.3321 },
  "softball field": { lat: 33.9773, lng: -117.3348 },
  "baseball field": { lat: 33.9761, lng: -117.3361 },
  "track and field": { lat: 33.9788, lng: -117.3308 },
  "tennis courts": { lat: 33.9757, lng: -117.3312 },
  "basketball courts": { lat: 33.9765, lng: -117.3302 },
  
  // Other Campus Locations
  "bookstore": { lat: 33.9735, lng: -117.3279 },
  "ucr bookstore": { lat: 33.9735, lng: -117.3279 },
  "health center": { lat: 33.9726, lng: -117.3296 },
  "student health center": { lat: 33.9726, lng: -117.3296 },
  "counseling center": { lat: 33.9721, lng: -117.3303 },
  "career center": { lat: 33.9738, lng: -117.3289 },
  "international center": { lat: 33.9695, lng: -117.3313 },
  "alumni center": { lat: 33.9688, lng: -117.3251 },
  "university village": { lat: 33.9681, lng: -117.3307 },
  "uv": { lat: 33.9681, lng: -117.3307 },
  "botanical gardens": { lat: 33.9708, lng: -117.3211 },
  "ucr botanic gardens": { lat: 33.9708, lng: -117.3211 },
  
  // Riverside Landmarks
  "downtown riverside": { lat: 33.9806, lng: -117.3755 },
  "mission inn": { lat: 33.9814, lng: -117.3727 },
  "riverside city hall": { lat: 33.9839, lng: -117.3728 },
  "fox performing arts center": { lat: 33.9829, lng: -117.3735 },
  "riverside convention center": { lat: 33.9783, lng: -117.3718 },
  "mount rubidoux": { lat: 33.9847, lng: -117.3878 },
  "fairmount park": { lat: 33.9650, lng: -117.3839 },
  "california citrus state historic park": { lat: 33.9936, lng: -117.3103 },
  "riverside national cemetery": { lat: 33.8744, lng: -117.2503 },
  "march field air museum": { lat: 33.8894, lng: -117.2594 },
  
  // Default for unknown locations (UCR center)
  "default": { lat: 33.9737, lng: -117.3281 }
};

/**
 * Convert natural language location to coordinates
 */
function getCoordinates(location: string): { lat: number; lng: number } | null {
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
  
  // Return null if no match found
  return null;
}

/**
 * Update wall items with proper coordinates
 */
async function updateWallItemLocations() {
  console.log('Starting location update process...');
  
  try {
    // Get all wall items
    const wallItemsRef = collection(db, 'wall_items');
    const snapshot = await getDocs(wallItemsRef);
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const itemId = docSnap.id;
      
      // Check if item has location fields
      if (data.fieldData) {
        let needsUpdate = false;
        const updates: any = { fieldData: { ...data.fieldData } };
        
        // Look for location fields
        for (const [fieldId, fieldValue] of Object.entries(data.fieldData)) {
          // Check if this is a location field (string that might be a place name)
          if (typeof fieldValue === 'string' && fieldValue.length > 0) {
            // Try to get coordinates
            const coords = getCoordinates(fieldValue);
            if (coords) {
              console.log(`Found location "${fieldValue}" -> ${coords.lat}, ${coords.lng}`);
              
              // Update the field with proper location object
              updates.fieldData[fieldId] = {
                address: fieldValue,
                lat: coords.lat,
                lng: coords.lng
              };
              needsUpdate = true;
            }
          } else if (
            typeof fieldValue === 'object' && 
            fieldValue !== null && 
            'address' in fieldValue &&
            (!('lat' in fieldValue) || !('lng' in fieldValue))
          ) {
            // Has address but missing coordinates
            const coords = getCoordinates(fieldValue.address);
            if (coords) {
              console.log(`Updating coordinates for "${fieldValue.address}"`);
              updates.fieldData[fieldId] = {
                ...fieldValue,
                lat: coords.lat,
                lng: coords.lng
              };
              needsUpdate = true;
            }
          }
        }
        
        if (needsUpdate) {
          // Update the document
          const docRef = doc(db, 'wall_items', itemId);
          await updateDoc(docRef, updates);
          console.log(`✅ Updated item ${itemId}`);
          updated++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
    
    console.log('\n=== Update Complete ===');
    console.log(`✅ Updated: ${updated} items`);
    console.log(`⏭️  Skipped: ${skipped} items`);
    console.log(`❌ Failed: ${failed} items`);
    
  } catch (error) {
    console.error('Error updating locations:', error);
  }
}

// Run the update
updateWallItemLocations().then(() => {
  console.log('Process complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});