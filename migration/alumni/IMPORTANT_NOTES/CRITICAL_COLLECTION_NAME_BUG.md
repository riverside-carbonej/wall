# 🚨 CRITICAL BUG: Collection Name Mismatch

## THE BUG THAT BROKE EVERYTHING

**Date Discovered**: September 12, 2025  
**Severity**: CRITICAL  
**Time Wasted**: ~4 hours

## The Problem

Firestore security rules and the app use different collection names:

- **Security Rules expect**: `wall_items` (with underscore)
- **Migration scripts used**: `wall-items` (with hyphen)

## Why This Caused Total Failure

1. **App couldn't read items** - Security rules blocked access to wrong collection
2. **Add button disabled** - Can't write to collection without security rules
3. **Only 2 items showed** - Those were in the correct collection from the app
4. **Admin SDK worked fine** - It bypasses security rules entirely

## Symptoms We Saw

- ✅ Database showed 162 items (admin SDK view)
- ❌ App showed "no items" or only 2 items
- ❌ Add button always disabled
- ❌ Console showed "found 2 items" even though 162 existed
- ✅ Veterans wall worked (items were in correct collection)

## The Fix

```javascript
// Move items from wrong collection to right collection
const wrongCollection = db.collection('wall-items');
const correctCollection = db.collection('wall_items');

// Get all items from wrong place
const items = await wrongCollection.where('wallId', '==', wallId).get();

// Move to correct place
const batch = db.batch();
items.forEach(doc => {
  batch.set(correctCollection.doc(doc.id), doc.data());
});
await batch.commit();
```

## LESSONS LEARNED

### ⚠️ ALWAYS CHECK:

1. **Collection names match between:**
   - Firestore security rules
   - App code
   - Migration scripts
   
2. **Use consistent naming:**
   - Firestore convention: `snake_case` (underscore)
   - NOT: `kebab-case` (hyphen)

3. **Test with the app, not just admin SDK:**
   - Admin SDK bypasses security rules
   - App uses security rules
   - Different results = security rule issue

## Prevention

### Before ANY migration:

```javascript
// CHECK THE APP CODE FIRST
// Search for collection names in the app:
grep -r "collection(" src/ | grep -E "wall|item"

// CHECK SECURITY RULES
// Look at firestore.rules for collection names

// USE EXACT SAME NAMES
const COLLECTION_NAME = 'wall_items'; // NOT 'wall-items'
```

## Time Impact

- **4 hours debugging** the wrong things:
  - Fixed ownership (not the issue)
  - Fixed field mapping (not the issue)  
  - Created new walls (not the issue)
  - Cleared cache (not the issue)
  - Rebuilt app (not the issue)

- **5 minutes to fix** once we found the real issue

## Red Flags We Missed

1. **Veterans wall worked** - Should have compared collection names
2. **Console said "found 2 items"** - Should have checked WHERE those 2 were
3. **Add button disabled** - Should have checked security rules first

## The Real Heroes

- Checking browser console logs carefully
- Reading the Firestore security rules file
- Comparing working vs broken implementations

---

**REMEMBER**: When the app can't see data that exists in the database, CHECK THE COLLECTION NAMES AND SECURITY RULES FIRST!