import { safeFetchJson } from './safeFetch';

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const TTS_BASE_URL = 'https://texttospeech.googleapis.com/v1';

export interface DirectGeminiOptions {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  contents: Array<{
    role?: 'user' | 'model';
    parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    >;
  }>;
  responseMimeType?: string;
  temperature?: number;
}

/**
 * Direct client-side call to Google Gemini REST endpoint using Full Absolute URL.
 * Works seamlessly on Netlify, static hosts, or local Vite dev server without relying on local proxies.
 */
export async function directGeminiGenerateContent(
  options: DirectGeminiOptions
): Promise<string> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY: Please provide a valid Gemini API key.');
  }

  const model = options.model || 'gemini-3.8-flash';
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const bodyPayload: any = {
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    },
  };

  if (options.systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const data = await safeFetchJson<any>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
  if (!text) {
    throw new Error('Gemini API returned an empty candidate response.');
  }

  return text;
}

/**
 * Direct client-side call to Google Cloud Text-to-Speech REST endpoint using Full Absolute URL.
 * Endpoint: https://texttospeech.googleapis.com/v1/text:synthesize
 */
export async function directGoogleCloudTTS(params: {
  apiKey: string;
  text: string;
  voiceName?: string;
  speakingRate?: number;
  languageCode?: string;
  gender?: 'MALE' | 'FEMALE';
  pitch?: number;
}): Promise<{ audioUrl: string; audioContent: string }> {
  const apiKey = params.apiKey?.trim();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY: No Google Cloud API key provided.');
  }

  const url = `${TTS_BASE_URL}/text:synthesize?key=${encodeURIComponent(apiKey)}`;

  const bodyPayload = {
    input: { text: params.text },
    voice: {
      languageCode: params.languageCode || 'my-MM',
      name: params.voiceName || 'my-MM-Standard-A',
      ...(params.gender ? { ssmlGender: params.gender } : {}),
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: params.speakingRate ?? 1.0,
      pitch: params.pitch ?? 0.0,
    },
  };

  const data = await safeFetchJson<any>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!data?.audioContent) {
    throw new Error('Google Cloud TTS returned no audio content.');
  }

  return {
    audioUrl: `data:audio/mp3;base64,${data.audioContent}`,
    audioContent: data.audioContent,
  };
}
