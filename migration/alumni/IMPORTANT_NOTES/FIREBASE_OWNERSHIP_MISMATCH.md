# 🔑 Firebase Ownership Mismatch Issue

## The Problem

Firebase Authentication uses **User IDs** but we were setting **email addresses** as owner.

### What Happened

```javascript
// WRONG - What we did
wall.ownerId = 'jack.carbone@riversideschools.net'

// CORRECT - What Firebase expects  
wall.ownerId = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2'
```

## Why This Matters

The app checks ownership like this:
```javascript
isOwner = (wall.ownerId === currentUser.uid)
```

When we used email instead of UID:
- `'jack.carbone@riversideschools.net' === 'HElXlnY0qPY6rE7t1lpM2G3BMhe2'` = **FALSE**
- Result: Not recognized as owner
- Can't edit, limited view access

## How to Get the Correct User ID

### From Browser Console
When logged in, the console shows:
```
Auth state changed: jack.carbone@riversideschools.net
Setting current user: jack.carbone@riversideschools.net
User details: {uid: 'HElXlnY0qPY6rE7t1lpM2G3BMhe2', ...}
```

### From Firebase Admin
```javascript
const user = await admin.auth().getUserByEmail('jack.carbone@riversideschools.net');
console.log(user.uid); // HElXlnY0qPY6rE7t1lpM2G3BMhe2
```

## The Fix

Always use UID for ownership:
```javascript
const wallData = {
  ownerId: 'HElXlnY0qPY6rE7t1lpM2G3BMhe2',  // UID
  ownerEmail: 'jack.carbone@riversideschools.net', // Keep for reference
  permissions: {
    owner: 'HElXlnY0qPY6rE7t1lpM2G3BMhe2'  // UID here too
  }
}
```

## Common UIDs to Remember

```javascript
// Jack Carbone
const JACK_UID = 'HElXlnY0qPY6rE7t1lpM2G3BMhe2';
const JACK_EMAIL = 'jack.carbone@riversideschools.net';
```

## Red Flags

If console shows:
- `isOwner: false` when you should be owner
- `canEdit: false` when logged in as owner
- Compare `wallOwner` vs `userId` - they must match exactly

## Prevention

Never use email for ownerId. Always use Firebase UID!