# Deploying Storage Rules (Workaround for App Engine Error)

## Current Setup
`storage.rules` is wired in `firebase.json`. Deploy with:

```bash
firebase deploy --only storage
```

For routine deploys (Firestore + Hosting only), use:

```bash
firebase deploy --only firestore,hosting
```

This avoids pulling Storage into a full `firebase deploy` if you hit the App Engine error below.

## Problem (CLI full deploy)
When running `firebase deploy` (all targets) with storage in `firebase.json`, you may encounter:
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
// Firebase Storage rules — deploy via Firebase Console (see below)
// Required for dictation audio and reading books from the web app (including localhost).
service firebase.storage {
  match /b/{bucket}/o {
    // Dictation audio: authenticated users can read/write (trainers generate, students read)
    match /dictation/{allPaths=**} {
      allow read, write: if request.auth != null;
    }

    // Reading books (epub): authenticated users can read; uploads done out-of-band by admin
    match /books/{allPaths=**} {
      allow read: if request.auth != null;
    }
  }
}
```

### Step 3: Upload books (reading exercises)
1. In Firebase Console → **Storage** → **Files**, create folder `books/` if needed
2. Upload `.epub` files (e.g. `grimm.epub` from the repo `books/` folder)
3. Or from the command line (with `gcloud`/`gsutil` authenticated):
   ```bash
   ./scripts/upload-books.sh
   ```

### Step 4: Paste and Deploy rules
1. Paste the rules into the editor in Firebase Console
2. Click **Publish**

**Or via CLI** (after `firebase.json` includes the `storage` section):

```bash
firebase deploy --only storage
```

### Step 5: Sync books for the app (reading exercises)

The app serves epubs from `public/books/` (same origin — no Storage CORS). Before dev or build:

```bash
npm run copy:books
```

This runs automatically on `npm start` and `npm run build`. Source files live in repo `books/`; optional upload to Storage is for backup only (`./scripts/upload-books.sh`).

### Step 6: Configure CORS (dictation audio uploads only)

CORS on the Storage bucket is required for **dictation audio uploads** from the browser, not for reading book downloads.

```bash
gcloud auth login   # once
npm run storage:cors
```

### Step 7: Deploy Other Services (Firestore, Hosting)

Deploy Firestore rules and Hosting (books are bundled via `prebuild` → `public/books/`):

```bash
firebase deploy --only firestore,hosting
```

### If You Need to Deploy Storage Rules via CLI
Storage is already in `firebase.json`. Run:

```bash
firebase deploy --only storage
```

If that fails with an App Engine 404, use the Console steps above or set up App Engine (requires billing):

## Alternative: Set Up App Engine (Requires Billing)

If you want to use CLI deployment, you can set up App Engine:
1. Go to https://console.cloud.google.com/appengine
2. Create an App Engine application (requires billing account)
3. After setup, `firebase deploy` should work normally

## Note
This is a known Firebase CLI limitation. Storage rules can be deployed via Console without App Engine, but CLI deployment requires it.
