# Migration Scripts Setup

## Important: Firebase Service Account Key

To run these migration scripts, you need a Firebase service account key.

### Setup Instructions:

1. **Get your service account key**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the downloaded JSON file

2. **Place the key file**:
   - Save it as `firebase-service-account-key.json` in this migration folder
   - This file is already in .gitignore and will NOT be committed to the repository

3. **NEVER commit this file**:
   - The service account key contains sensitive credentials
   - It's automatically ignored by git
   - Keep it secure and local only

### Running Migrations:

Once you have the service account key in place:

```bash
# List all walls
node list-walls.js

# Update deployment locations with real coordinates
node update-deployment-locations.js [WALL_ID]

# Fix incorrect coordinates
node fix-deployment-coordinates.js [WALL_ID]

# Check deployment data
node check-deployments.js [WALL_ID]
```

### Security Notes:

- Service account keys grant admin access to your Firebase project
- Never share them publicly or commit them to version control
- Rotate keys periodically for security
- Consider using environment variables for production deployments