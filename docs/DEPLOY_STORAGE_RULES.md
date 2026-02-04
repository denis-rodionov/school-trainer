# Deploying Storage Rules (Workaround for App Engine Error)

## Current Setup
Storage rules are **excluded from `firebase.json`** to avoid App Engine errors. This allows `firebase deploy` to work normally for Firestore and Hosting.

## Problem
When running `firebase deploy` with storage rules in `firebase.json`, you may encounter:
```
Error: HTTP Error: 404, Resource 'projects/school-trainer-70cb5/locations/global/applications/school-trainer-70cb5' was not found
```

This happens because Firebase CLI requires an App Engine application to be set up, even when deploying only storage rules.

## Solution: Deploy via Firebase Console

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/project/school-trainer-70cb5/storage
2. Click on the **Rules** tab

### Step 2: Copy Storage Rules
Copy the contents of `storage.rules` file:

```rules
rules_version = '2';
// Firebase Storage rules — deploy with: firebase deploy --only storage
// Required for dictation audio uploads from the web app (including localhost).
service firebase.storage {
  match /b/{bucket}/o {
    // Dictation audio: authenticated users can read/write (trainers generate, students read)
    match /dictation/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 3: Paste and Deploy
1. Paste the rules into the editor in Firebase Console
2. Click **Publish**

### Step 4: Deploy Other Services (Firestore, Hosting)
Since storage is excluded from `firebase.json`, you can deploy everything else with:

```bash
firebase deploy
```

This will deploy Firestore rules and Hosting without trying to deploy storage.

### If You Need to Deploy Storage Rules via CLI
If you need to deploy storage rules via CLI in the future, temporarily add the storage section back to `firebase.json`:

```json
"storage": {
  "rules": "storage.rules"
}
```

Then deploy with: `firebase deploy --only storage` (or set up App Engine to use `firebase deploy`).

## Alternative: Set Up App Engine (Requires Billing)

If you want to use CLI deployment, you can set up App Engine:
1. Go to https://console.cloud.google.com/appengine
2. Create an App Engine application (requires billing account)
3. After setup, `firebase deploy` should work normally

## Note
This is a known Firebase CLI limitation. Storage rules can be deployed via Console without App Engine, but CLI deployment requires it.
