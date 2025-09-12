# ✅ Wall Migration Checklist

## BEFORE YOU START

### 1. Check Collection Names
```bash
# Check what the app uses
grep -r "collection(" ../../rlswallapp/src | grep -i item

# Check security rules
cat ../../firestore.rules | grep "match /"
```

**CRITICAL**: The app uses `wall_items` (underscore), NOT `wall-items` (hyphen)!

### 2. Get Correct User ID
```javascript
// Your Firebase UID (not email!)
const OWNER_UID = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';
// NOT: 'jack.carbone@riversideschools.net'
```

### 3. Understand Wall Structure
```javascript
// Walls expect:
{
  objectTypes: [...],  // ARRAY not object
  fields: [...]        // ARRAY not object  
}
```

## CREATING A WALL

### Option 1: Through App UI (RECOMMENDED)
1. Go to https://rlswall.app
2. Create wall through UI
3. Note the generated IDs
4. Use those IDs in migration

### Option 2: Programmatically
```javascript
const wallId = db.collection('walls').doc().id;
const objectTypeId = `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const wallData = {
  ownerId: OWNER_UID,  // Use UID not email!
  published: true,
  permissions: {
    owner: OWNER_UID   // UID here too!
  },
  objectTypes: [...],  // MUST be array
  // ... rest of structure
};
```

## IMPORTING ITEMS

### CRITICAL: Use Correct Collection Name
```javascript
// CORRECT
db.collection('wall_items')  // underscore

// WRONG  
db.collection('wall-items')  // hyphen - THIS WILL BREAK!
```

### Required Item Structure
```javascript
const item = {
  wallId: 'wall_id_here',
  objectTypeId: 'ot_xxxxx_xxxxx',  // Must match wall's objectType.id
  name: 'Display Name',
  published: true,
  fields: {
    // Field IDs must match wall's field definitions
    name: 'value',
    graduationYear: 2024  // Number if field type is number!
  },
  createdAt: admin.firestore.Timestamp.now(),
  updatedAt: admin.firestore.Timestamp.now()
}
```

## VERIFICATION STEPS

### 1. Check Database
```javascript
// Verify items exist
const items = await db.collection('wall_items')
  .where('wallId', '==', wallId)
  .get();
console.log(`Found ${items.size} items`);
```

### 2. Check in App
1. Visit: `https://rlswall.app/walls/[wallId]/preset/[objectTypeId]/items`
2. Should see all items
3. Add button should work

### 3. Check Browser Console
Look for:
- `Wall items query successful, found X items`
- `isOwner: true`
- No security rule errors

## COMMON ISSUES & FIXES

### Issue: "No items" in app but database has items
**Cause**: Wrong collection name
**Fix**: Move items from `wall-items` to `wall_items`

### Issue: Only seeing 2 default items
**Cause**: Items in wrong collection or wrong objectTypeId
**Fix**: Verify collection name and objectTypeId match

### Issue: Add button disabled
**Causes**: 
- Not logged in as owner
- Wrong collection in security rules
- Invalid field definitions

### Issue: Can't access wall
**Cause**: ownerId is email instead of UID
**Fix**: Update ownerId to Firebase UID

## THE GOLDEN RULES

1. **ALWAYS use `wall_items` (underscore) for collection name**
2. **ALWAYS use Firebase UID for ownerId, not email**
3. **ALWAYS verify in the app, not just database**
4. **ALWAYS check browser console for real errors**
5. **NEVER trust "successful" console logs without verification**

## Quick Debug Commands

```javascript
// Check what's in wall_items (correct)
db.collection('wall_items').where('wallId', '==', 'YOUR_WALL_ID').get()
  .then(snap => console.log('wall_items:', snap.size));

// Check what's in wall-items (wrong)  
db.collection('wall-items').where('wallId', '==', 'YOUR_WALL_ID').get()
  .then(snap => console.log('wall-items:', snap.size));

// If items in wrong place, move them!
```

---

**Remember**: 4 hours of debugging could have been 5 minutes if we checked collection names first!