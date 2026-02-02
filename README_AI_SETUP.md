# AI Exercise Generation Setup

This application uses **Google Gemini API** (Gemini 1.5 Flash) to automatically generate exercises from topic prompts.

## Why Gemini 1.5 Flash?

- **Cost-effective**: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
- **Fast**: Optimized for simple tasks like exercise generation
- **Good quality**: Sufficient for educational exercise generation
- **Simple setup**: Direct API calls from browser (no Cloud Function needed!)

## Quick Setup (5 minutes)

### 1. Enable Gemini API (REQUIRED - Do This First!)

**Important**: If you get "Model not available" or "API key not granted" errors, the API is not enabled!

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your Firebase project**: `school-trainer-70cb5`
3. Navigate to **"APIs & Services"** > **"Library"** (or search "APIs & Services" in top search bar)
4. Search for **"Generative Language API"** (not "Gemini API" - use the exact name)
5. Click on **"Generative Language API"** from the results
6. Click the big **"ENABLE"** button
7. **Wait 1-2 minutes** for the API to be fully enabled

**Verify it's enabled**: Go to **"APIs & Services"** > **"Enabled APIs"** → Search "Generative Language API" → Should appear in list

**Still having issues?** See `ENABLE_GEMINI_API.md` for detailed troubleshooting.

### 2. Get Your API Key

**Important**: Create the API key in your Firebase project (`school-trainer-70cb5`) to keep billing consolidated!

1. In Google Cloud Console, navigate to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. Copy your API key (starts with `AIza...`)

**Note**: If you create the key in Google AI Studio, it will be in "Default Gemini Project" instead of your Firebase project. Creating it in Cloud Console ensures everything is in the same project for easier billing and management.

### 3. Restrict Your API Key (Recommended)

**Important**: Restrict your API key to prevent abuse!

**Note**: API key restrictions are managed in Google Cloud Console, not directly in AI Studio.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `school-trainer-70cb5`
3. Navigate to **"APIs & Services"** > **"Credentials"**
4. Find your API key (the one you just created) and click on it to edit
5. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Choose **"Don't restrict key"** (for now) or select specific APIs if you want
6. Under **"Application restrictions"**:
   - Select **"HTTP referrers (web sites)"**
   - Click **"Add an item"**
   - Add your domain: `https://school-trainer-70cb5.web.app/*`
   - (Optional) Add localhost for development: `http://localhost:3000/*`
7. Click **"Save"**

**Alternative**: If you can't find these options, you can also restrict the key later. The API will work without restrictions, but it's less secure.

### 3.5. Understanding API Quotas (Optional)

When you look at **"APIs & Services"** > **"Quotas"** for "Gemini for Google Cloud API", you'll see multiple quota types. Here are the most relevant ones for exercise generation:

**Most Important Quotas:**
- **Requests per day** - Total API calls per day (e.g., 1000/day)
- **Requests per minute** - Rate limit (e.g., 60/minute)
- **Tokens per day** - Total tokens used per day (input + output)
- **Tokens per minute** - Token rate limit

**Other Quotas You Might See:**
- **Concurrent requests** - Simultaneous API calls
- **Model-specific quotas** - Different limits for Flash vs Pro models
- **Operation-specific quotas** - Limits for different API operations
- **Per-user quotas** - If you have multiple users

**For Your Use Case:**
- **Requests per day**: Set to 1000-5000 (depending on expected usage)
- **Requests per minute**: Set to 60 (default is usually 15)
- **Tokens per day**: Usually not needed to set (unlimited by default)
- **Other quotas**: Leave as default unless you have specific needs

**To Set Quotas:**
1. Go to **APIs & Services** > **Quotas**
2. Search for "Gemini for Google Cloud API"
3. Click on the quota you want to modify
4. Click **"Edit Quotas"** and set your desired limit
5. Submit a request (may require approval for increases)

### 4. Configure Environment Variables

Add to your `.env.local` file:

```env
REACT_APP_GEMINI_API_KEY=your-api-key-here
```

**Important**: 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- For production, set this in Firebase Hosting environment variables

### 5. That's It! ✅

The app will now use Gemini API directly. No Cloud Function needed!

## Cost Estimation

For a typical exercise generation:
- Input: ~200 tokens (prompt + system instructions)
- Output: ~100 tokens (exercise text)
- Cost per exercise: ~$0.00003 (3 cents per 1000 exercises)

**Example**: Generating 10 exercises costs approximately **$0.0003** (less than 1 cent).

**Free tier**: 15 requests/minute rate limit (no cost limit, just rate limit)

## Production Deployment

### Firebase Hosting Environment Variables

For production, set the API key in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `school-trainer-70cb5`
3. Go to **Hosting** > **Environment Configuration**
4. Add environment variable:
   - Key: `REACT_APP_GEMINI_API_KEY`
   - Value: Your API key
5. Redeploy your app:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Security Best Practices

1. ✅ **Restrict API key by domain** (see step 2 above)
2. ✅ **Set reasonable quotas** (daily/monthly limits)
3. ✅ **Monitor usage** in Google AI Studio
4. ✅ **Revoke and regenerate** if compromised
5. ⚠️ **Never commit API keys** to git

## Troubleshooting

### "REACT_APP_GEMINI_API_KEY environment variable is not set"

- Make sure `.env.local` exists in the project root
- Check that the variable name is exactly `REACT_APP_GEMINI_API_KEY`
- Restart your development server after adding the variable

### "API key not valid"

- Verify the API key in Google AI Studio
- Check that the API key is not restricted to a different domain
- Make sure you're using the correct key (not a revoked one)

### "Quota exceeded"

- Check your quotas in Google AI Studio
- Increase daily quota if needed
- Wait for quota reset (daily quotas reset at midnight Pacific Time)

### "Failed to generate exercise"

- Check browser console for detailed error messages
- Verify API key is correct
- Check network tab to see the API response
- Ensure domain restrictions allow your current domain

## Alternative: Vertex AI (Not Recommended for This App)

If you need enterprise features (custom model training, BigQuery integration, etc.), you can use Vertex AI instead. However, it requires:

- Cloud Function deployment
- Service account setup
- More complex authentication

See `GEMINI_VS_VERTEX_COMPARISON.md` for details.

## Migration from Vertex AI

If you were previously using Vertex AI via Cloud Function:

1. ✅ Code is already updated to use Gemini API
2. Remove Cloud Function environment variables from `.env.local`:
   - Remove `REACT_APP_AI_GENERATION_ENDPOINT`
   - Remove `REACT_APP_GCP_PROJECT_ID`
3. Add `REACT_APP_GEMINI_API_KEY` (see step 3 above)
4. You can optionally delete the Cloud Function (not required)

## API Reference

The app uses the Gemini API REST endpoint:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}
```

See [Gemini API Documentation](https://ai.google.dev/docs) for more details.
