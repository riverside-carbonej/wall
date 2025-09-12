# 📍 Working Wall IDs & URLs

## Alumni Wall (FIXED & WORKING)

```javascript
{
  "wallId": "dzwsujrWYLvznCJElpri",
  "wallName": "New Alumni Wall",
  "objectTypeId": "ot_1757607682911_brfg8d3ft",
  "itemCount": 164,
  "isPublished": true,
  "requiresLogin": false,
  "owner": "HElXlnY0qPY6rE7t1lpM2G3BMhe2"
}
```

### Direct URL
```
https://rlswall.app/walls/dzwsujrWYLvznCJElpri/preset/ot_1757607682911_brfg8d3ft/items
```

### Status
- ✅ **164 alumni items** in correct collection (`wall_items`)
- ✅ **Ownership fixed** (using UID not email)
- ✅ **Published and accessible**
- ✅ **Add button should work** when logged in as owner

## Key Information

### Collection Name (CRITICAL!)
```javascript
// CORRECT - Use this
const COLLECTION = 'wall_items';  // with underscore

// WRONG - Never use this  
const WRONG = 'wall-items';  // with hyphen
```

### Owner Information
```javascript
const OWNER_UID = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';
const OWNER_EMAIL = 'jack.carbone@riversideschools.net';
```

### Wall Structure
- **Wall ID**: `dzwsujrWYLvznCJElpri`
- **Object Type ID**: `ot_1757607682911_brfg8d3ft`
- **Object Type Name**: "Alumnus"
- **Required Fields**: name (text), graduationYear (number)

## Quick Verification

```javascript
// Check item count
db.collection('wall_items')
  .where('wallId', '==', 'dzwsujrWYLvznCJElpri')
  .get()
  .then(snap => console.log('Alumni items:', snap.size));
// Should show: 164
```

## If Issues Persist

1. **Clear browser cache completely**
2. **Log out and log back in**
3. **Hard refresh** (Ctrl+F5 or Cmd+Shift+R)
4. **Check browser console** for errors

---

Last Updated: September 12, 2025
Status: WORKING ✅