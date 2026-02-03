/**
 * Text-to-Speech Service using Google Cloud Platform REST APIs
 * 
 * Converts text to audio using GCP Text-to-Speech API and stores in Firebase Storage
 * 
 * Setup required:
 * 1. Enable Text-to-Speech API in GCP Console
 * 2. Uses the same API key as Gemini AI (REACT_APP_GEMINI_API_KEY)
 *    - No additional environment variable needed if Gemini is already configured
 * 
 * Pricing:
 * - Free tier: 0-4 million characters/month
 * - After free tier: $4.00 per 1 million characters
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Voice configuration constants
export const VOICE_CONFIG = {
  // Default voice settings - can be customized per language
  'en': {
    languageCode: 'en-US',
    name: 'en-US-Standard-C',
    ssmlGender: 'NEUTRAL' as const,
  },
  'ru': {
    languageCode: 'ru-RU',
    name: 'ru-RU-Standard-C',
    ssmlGender: 'NEUTRAL' as const,
  },
  'de': {
    languageCode: 'de-DE',
    name: 'de-DE-Standard-C',
    ssmlGender: 'NEUTRAL' as const,
  },
};

// Audio format configuration
const AUDIO_ENCODING = 'MP3' as const;

/**
 * Generate audio from text using GCP Text-to-Speech REST API
 * 
 * @param text - Text to convert to speech
 * @param languageCode - Language code (e.g., 'en', 'ru', 'de')
 * @returns Promise resolving to the public URL of the audio file
 */
export const generateAudioFromText = async (
  text: string,
  languageCode: string = 'en'
): Promise<string> => {
  // Use the same API key as Gemini AI (they're in the same GCP project)
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'REACT_APP_GEMINI_API_KEY is not set.\n\n' +
      'Please add it to your .env.local file:\n' +
      'REACT_APP_GEMINI_API_KEY=your-api-key\n\n' +
      'This same API key is used for both Gemini AI and Text-to-Speech API.\n' +
      'Get your API key from GCP Console > APIs & Services > Credentials'
    );
  }

  // Get voice configuration for the language (default to English)
  const voiceConfig = VOICE_CONFIG[languageCode as keyof typeof VOICE_CONFIG] || VOICE_CONFIG['en'];

  try {
    // Generate audio using Text-to-Speech REST API
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const requestBody = {
      input: { text },
      voice: voiceConfig,
      audioConfig: {
        audioEncoding: AUDIO_ENCODING,
        speakingRate: 1.0, // Normal speed
      },
    };

    console.log('Generating audio from text:', {
      textLength: text.length,
      languageCode: voiceConfig.languageCode,
      voice: voiceConfig.name,
    });

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Text-to-Speech API error: ${response.status} ${response.statusText}\n` +
        `${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error('No audio content returned from Text-to-Speech API');
    }

    // Decode base64 audio content
    const audioContent = data.audioContent;
    const audioBuffer = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const hash = text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const filename = `dictation/${timestamp}-${hash}.mp3`;

    console.log('Audio generated from TTS, uploading to Firebase Storage:', filename);

    // Upload to Firebase Storage
    const storage = getStorage();
    const storageRef = ref(storage, filename);

    // Convert Uint8Array to Blob for upload
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });

    try {
      await uploadBytes(storageRef, blob, {
        contentType: 'audio/mpeg',
        customMetadata: {
          textLength: text.length.toString(),
          languageCode: voiceConfig.languageCode,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (uploadError: any) {
      console.error('Firebase Storage upload failed:', uploadError);
      const msg = uploadError?.message || String(uploadError);
      throw new Error(
        'Failed to upload audio to Firebase Storage. ' +
          (msg.includes('CORS') || msg.includes('cors')
            ? 'Configure CORS on your Storage bucket (see DICTATION_SETUP.md).'
            : 'Ensure Storage rules are deployed (firebase deploy --only storage) and CORS is set for localhost (see DICTATION_SETUP.md). ') +
          `Details: ${msg}`
      );
    }

    // Get public download URL
    let publicUrl: string;
    try {
      publicUrl = await getDownloadURL(storageRef);
    } catch (urlError: any) {
      console.error('Firebase Storage getDownloadURL failed:', urlError);
      throw new Error(`Failed to get audio URL after upload: ${urlError?.message || urlError}`);
    }

    console.log('Audio generated and uploaded:', {
      filename,
      url: publicUrl,
      size: audioBuffer.length,
    });

    return publicUrl;
  } catch (error: any) {
    console.error('Text-to-Speech error:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('403')) {
      throw new Error(
        'Permission denied. Please check:\n' +
        '1. Text-to-Speech API is enabled in GCP Console\n' +
        '2. API key has proper permissions\n' +
        '3. Cloud Storage bucket exists and is accessible\n' +
        `Error: ${error.message}`
      );
    }

    if (error.message?.includes('INVALID_ARGUMENT') || error.message?.includes('400')) {
      throw new Error(
        `Invalid request. Please check:\n` +
        `1. Text length is within limits (max 5000 characters)\n` +
        `2. Language code is valid\n` +
        `Error: ${error.message}`
      );
    }

    throw new Error(`Failed to generate audio: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Delete audio file from Firebase Storage
 * 
 * @param audioUrl - Public URL of the audio file
 */
export const deleteAudioFile = async (audioUrl: string): Promise<void> => {
  try {
    const { deleteObject, ref } = await import('firebase/storage');
    const storage = getStorage();
    
    // Extract filename from URL
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlParts = audioUrl.split('/o/');
    if (urlParts.length < 2) {
      console.warn('Invalid Firebase Storage URL:', audioUrl);
      return;
    }
    
    const pathWithQuery = urlParts[1].split('?')[0]; // Remove query params
    const filename = decodeURIComponent(pathWithQuery);
    
    const storageRef = ref(storage, filename);
    await deleteObject(storageRef);
    
    console.log('Audio file deleted:', filename);
  } catch (error: any) {
    console.error('Failed to delete audio file:', error);
    // Don't throw - deletion is not critical
  }
};
