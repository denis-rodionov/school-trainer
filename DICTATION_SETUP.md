# Dictation Feature Setup Guide

This guide walks you through setting up Google Cloud Platform (GCP) services required for the dictation exercise feature.

## Prerequisites

- A Google account
- Access to Google Cloud Console (https://console.cloud.google.com)
- Your Firebase project already set up (for Firebase Storage)

## Step 1: Enable Text-to-Speech API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one if needed)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Cloud Text-to-Speech API"
5. Click on it and click **Enable**
6. Wait for the API to be enabled (usually takes a few seconds)

## Step 2: Use Existing API Key (or Create One)

**Good news:** You can use the same API key for both Gemini AI and Text-to-Speech API!

### If you already have REACT_APP_GEMINI_API_KEY configured:
- **No additional API key needed!** The same key works for both APIs.
- Just make sure Text-to-Speech API is enabled (Step 1).

### If you don't have an API key yet:
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **API key**
3. Copy the generated API key
4. (Recommended) Click **Restrict key** to secure it:
   - Under **API restrictions**, select **Restrict key**
   - Choose both **Generative Language API** (for Gemini) and **Cloud Text-to-Speech API** from the list
   - Click **Save**

## Step 3: Set Up Firebase Storage (Rules + CORS)

Audio files are stored in Firebase Storage. You need to **deploy Storage rules** and **set CORS** so that uploads work from the app (including localhost).

### 3a. Deploy Storage rules

From the project root:

```bash
firebase deploy --only storage
```

This deploys `storage.rules`, which allows authenticated users to read/write under `dictation/`.

**If that command fails with a 404 error** mentioning "applications" or "App Engine", use the Firebase Console instead: see **[STORAGE_DEPLOY.md](STORAGE_DEPLOY.md)** for step-by-step instructions and the exact rules to paste in **Storage → Rules**.

### 3b. Configure CORS for localhost (required for local dev)

If you run the app on **localhost** (e.g. `http://localhost:3000`), the Storage bucket must allow that origin. Otherwise you get a CORS error when uploading (often reported as "blocked by CORS policy" even when the real issue is the bucket not allowing the origin).

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) if needed (so you have `gsutil`).
2. Log in and set the project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
   Use the same project ID as in your Firebase config (e.g. `school-trainer-70cb5`).
3. Apply CORS using the included config:
   ```bash
   gsutil cors set storage.cors.json gs://YOUR_PROJECT_ID.firebasestorage.app
   ```
   Replace `YOUR_PROJECT_ID` with your Firebase project ID (e.g. `school-trainer-70cb5`).
4. For production, add your app’s origin(s) to the `origin` array in `storage.cors.json`, then run the same `gsutil cors set` command again.

**Optional:** To verify Firebase Storage is enabled in the Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Storage**
2. If Storage is not enabled, click **Get Started** and follow the setup wizard

## Step 4: Verify Environment Variable

**If you already have `REACT_APP_GEMINI_API_KEY` configured:**
- ✅ You're all set! No additional environment variable needed.
- The same API key is used for both Gemini AI and Text-to-Speech API.

**If you don't have it yet:**
1. Open your `.env.local` file in the project root (create it if it doesn't exist)
2. Add the following environment variable:

```bash
REACT_APP_GEMINI_API_KEY=your-api-key-here
```

Replace `your-api-key-here` with the API key from Step 2.

**Example `.env.local` file:**
```bash
# Firebase (existing)
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...

# GCP API Key (used for both Gemini AI and Text-to-Speech)
REACT_APP_GEMINI_API_KEY=AIzaSyC...your-key-here
```

**Note:** The variable is named `REACT_APP_GEMINI_API_KEY` for historical reasons, but it's actually a general GCP API key that works for multiple Google Cloud APIs in your project.

## Step 5: Restart Development Server

After adding the environment variable:

1. Stop your development server (Ctrl+C)
2. Start it again:
   ```bash
   npm start
   ```

**Important:** Environment variables are only loaded when the server starts, so you must restart after adding new variables.

## Step 6: Verify Setup

1. **Test Text-to-Speech API:**
   - Create a new topic with type "Dictation"
   - Generate a practice worksheet with that topic
   - The system should generate audio files and store them in Firebase Storage

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Look for any errors related to Text-to-Speech API
   - Check the Network tab for API calls to `texttospeech.googleapis.com`

3. **Check Firebase Storage:**
   - Go to Firebase Console > Storage
   - You should see a `dictation/` folder with `.mp3` files after generating exercises

## Troubleshooting

### Error: "REACT_APP_GEMINI_API_KEY is not set"
- Make sure `.env.local` exists in the project root
- Verify the variable name is exactly `REACT_APP_GEMINI_API_KEY` (case-sensitive)
- This is the same key used for Gemini AI - check if you have it configured
- Restart the development server

### Error: "Permission denied" or "403"
- Check that Text-to-Speech API is enabled in GCP Console
- Verify the API key has proper permissions
- Check if API key restrictions are too strict

### Error: "Invalid API key" or "400"
- Verify the API key is correct (should start with `AIza`)
- Make sure there are no extra spaces or quotes around the key in `.env.local`
- Regenerate the API key if needed

### CORS error when generating worksheet (e.g. "blocked by CORS policy", "preflight request doesn't pass")
- This usually means the **upload to Firebase Storage** failed (e.g. 403 or missing CORS). The browser often shows "CORS" instead of the real error.
- **Fix 1:** Deploy Storage rules: `firebase deploy --only storage`
- **Fix 2:** Set CORS on the bucket for localhost (see Step 3b above):  
  `gsutil cors set storage.cors.json gs://YOUR_PROJECT_ID.firebasestorage.app`
- Check the browser console: you should now see a clearer message (e.g. "Firebase Storage upload failed") and logs before the upload ("Audio generated from TTS, uploading to Firebase Storage") so you can tell if TTS succeeded and the failure is at upload.

### Audio files not uploading to Firebase Storage
- Verify Firebase Storage is enabled in Firebase Console
- Deploy Storage rules: `firebase deploy --only storage`
- Set CORS for your origin (see Step 3b and "CORS error" above)
- Check browser console for Firebase Storage errors

### Audio playback not working
- Check that audio URLs are accessible (open URL directly in browser)
- Verify CORS is configured correctly for Firebase Storage
- Check browser console for audio loading errors

## Cost Information

### Text-to-Speech API Pricing:
- **Free Tier:** 0-4 million characters per month
- **After Free Tier:** $4.00 per 1 million characters
- **Estimated:** ~1000 characters per exercise → ~4000 exercises/month free

### Firebase Storage Pricing:
- **Free Tier:** 5GB storage, 1GB/day downloads
- **After Free Tier:** $0.026/GB storage, $0.12/GB downloads
- **Estimated:** ~50KB per audio file → ~100,000 files in 5GB free tier

## Security Best Practices

1. **Restrict API Key:**
   - Limit API key to both Generative Language API (Gemini) and Cloud Text-to-Speech API
   - Add HTTP referrer restrictions if deploying to specific domains
   - Never commit `.env.local` to version control (already in `.gitignore`)

2. **Firebase Storage Rules:**
   - Ensure Storage security rules allow authenticated users to read/write
   - Consider adding rules to limit file size and type

## Next Steps

After setup is complete:

1. Create a test topic with type "Dictation"
2. Generate a worksheet with dictation exercises
3. Test audio playback
4. Test student submission and scoring
5. Test trainer review mode

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure APIs are enabled in GCP Console
4. Check Firebase Console for Storage access issues
