/**
 * Netlify Serverless Backend Function for Google Cloud Text-to-Speech (TTS)
 * Endpoint: /.netlify/functions/tts
 */

exports.handler = async (event) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS Preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { text, voiceName, speakingRate, languageCode, gender, pitch } = body;

    if (!text || !text.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing text in request body.' }),
      };
    }

    const apiKey =
      process.env.GOOGLE_TTS_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'GOOGLE_TTS_API_KEY is not configured on the server environment.',
        }),
      };
    }

    // Resolve voice identifier, gender, pitch and language code
    let lang = languageCode || 'my-MM';
    let resolvedVoiceName = 'my-MM-Standard-A';
    let resolvedGender = gender || 'FEMALE';
    let resolvedPitch = typeof pitch === 'number' ? pitch : 0;

    // Authentic Burmese voice mapping with accurate gender & pitch modulation
    if (voiceName === 'mm_thiha' || voiceName === 'thiha' || voiceName === 'mm_male_thiha') {
      lang = 'my-MM';
      resolvedVoiceName = 'my-MM-Standard-A';
      resolvedGender = 'MALE';
      resolvedPitch = -5.0; // Deep Cinematic Narrative
    } else if (voiceName === 'mm_nilar' || voiceName === 'nilar' || voiceName === 'mm_female_nilar') {
      lang = 'my-MM';
      resolvedVoiceName = 'my-MM-Standard-A';
      resolvedGender = 'FEMALE';
      resolvedPitch = 1.0; // Warm & Expressive
    } else if (voiceName === 'mm_aung_kyaw' || voiceName === 'aung_kyaw' || voiceName === 'mm_male_zaw' || voiceName === 'mm_male_aung') {
      lang = 'my-MM';
      resolvedVoiceName = 'my-MM-Standard-A';
      resolvedGender = 'MALE';
      resolvedPitch = -4.0; // Action & Dynamic
    } else if (voiceName === 'mm_hsu_myat' || voiceName === 'hsu_myat' || voiceName === 'mm_female_su') {
      lang = 'my-MM';
      resolvedVoiceName = 'my-MM-Standard-A';
      resolvedGender = 'FEMALE';
      resolvedPitch = 0.0; // Smooth Storyteller
    } else if (voiceName === 'mm_min_khant' || voiceName === 'min_khant') {
      lang = 'my-MM';
      resolvedVoiceName = 'my-MM-Standard-A';
      resolvedGender = 'MALE';
      resolvedPitch = -2.5; // Calm Documentary
    } else if (voiceName === 'mm_may_thu' || voiceName === 'may_thu' || voiceName === 'mm_female_thida') {
      lang = 'my-MM';
      resolvedVoiceName = 'my-MM-Standard-A';
      resolvedGender = 'FEMALE';
      resolvedPitch = 2.0; // Gentle Emotional
    } else if (voiceName === 'en_male_james' || voiceName === 'en_male_david') {
      lang = 'en-US';
      resolvedVoiceName = 'en-US-Neural2-D';
      resolvedGender = 'MALE';
    } else if (voiceName === 'en_female_emma' || voiceName === 'en_female_lily') {
      lang = 'en-US';
      resolvedVoiceName = 'en-US-Neural2-F';
      resolvedGender = 'FEMALE';
    } else if (voiceName === 'kr_male_minho') {
      lang = 'ko-KR';
      resolvedVoiceName = 'ko-KR-Neural2-C';
      resolvedGender = 'MALE';
    }

    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey.trim()}`;

    const requestPayload = {
      input: { text: text.trim() },
      voice: {
        languageCode: lang,
        name: resolvedVoiceName,
        ssmlGender: resolvedGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Number(speakingRate) || 1.0,
        pitch: resolvedPitch,
      },
    };

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await response.json();

    if (!response.ok || !data.audioContent) {
      const errMsg = data?.error?.message || `Google TTS request failed with HTTP ${response.status}`;
      return {
        statusCode: response.status || 500,
        headers,
        body: JSON.stringify({ error: errMsg }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        audioContent: data.audioContent,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error during speech synthesis.',
      }),
    };
  }
};
