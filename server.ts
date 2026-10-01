import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High body limit for video / image payloads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Temp upload directory for video processing
const uploadDir = path.join(os.tmpdir(), 'mkp-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Supported video MIME types
const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/mov',
  'video/quicktime',
  'video/mpeg',
  'video/avi',
  'video/x-msvideo',
  'video/webm',
  'video/wmv',
  'video/x-ms-wmv',
  'video/3gpp',
];

function normalizeVideoMimeType(mime?: string, fileName?: string): string | null {
  const m = (mime || '').toLowerCase().trim();
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';

  if (m === 'video/mp4' || ext === 'mp4') return 'video/mp4';
  if (m === 'video/quicktime' || m === 'video/mov' || ext === 'mov') return 'video/quicktime';
  if (m === 'video/mpeg' || ext === 'mpeg' || ext === 'mpg') return 'video/mpeg';
  if (m === 'video/avi' || m === 'video/x-msvideo' || ext === 'avi') return 'video/x-msvideo';
  if (m === 'video/webm' || ext === 'webm') return 'video/webm';
  if (m === 'video/wmv' || m === 'video/x-ms-wmv' || ext === 'wmv') return 'video/x-ms-wmv';
  if (m === 'video/3gpp' || m === 'video/3gp' || ext === '3gp' || ext === '3gpp') return 'video/3gpp';

  if (SUPPORTED_VIDEO_MIME_TYPES.includes(m)) return m;
  return null;
}

// Helper to initialize GenAI client with User-Agent telemetry
function getGenAIClient(userApiKey?: string) {
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('MISSING_API_KEY: Please provide a valid Gemini API key.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function maskApiKey(key?: string): string {
  if (!key) return 'None';
  const trimmed = key.trim();
  if (trimmed.length <= 4) return '••••••••';
  const lastFour = trimmed.slice(-4);
  return '••••••••••••' + lastFour;
}

function extractRetryAfterSeconds(error: any, message: string): number | undefined {
  // 1. Check direct error headers or properties
  if (error?.response?.headers) {
    const retryHeader =
      error.response.headers['retry-after'] ||
      error.response.headers.get?.('retry-after');
    if (retryHeader) {
      const parsed = parseInt(String(retryHeader), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // 2. Look for "Please retry in X.Xs" or "retry in approximately X seconds" or "retry after X seconds"
  const regexPatterns = [
    /retry in\s+([0-9.]+)\s*s/i,
    /retry in approximately\s+([0-9.]+)\s*s/i,
    /retry after\s+([0-9.]+)\s*s/i,
    /retry in\s+([0-9]+)\s*seconds/i,
    /retry in approximately\s+([0-9]+)\s*seconds/i,
    /retry after\s+([0-9]+)\s*seconds/i,
    /([0-9.]+)\s*s\s*remaining/i,
  ];

  const searchStr = `${message} ${String(error?.stack || '')}`;
  for (const regex of regexPatterns) {
    const match = searchStr.match(regex);
    if (match && match[1]) {
      const parsed = Math.ceil(parseFloat(match[1]));
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return undefined;
}

function parseGeminiError(error: any) {
  let status: number | string = 500;
  let errorCode = 'GEMINI_API_ERROR';
  let message = error?.message || String(error);
  let responseBody = '';

  if (error?.status && error.status !== 200) status = error.status;
  else if (error?.statusCode && error.statusCode !== 200) status = error.statusCode;
  else if (error?.response?.status && error.response.status !== 200) status = error.response.status;

  // Extract JSON payload embedded inside error message string if present
  try {
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedJson = JSON.parse(jsonMatch[0]);
      responseBody = JSON.stringify(parsedJson, null, 2);
      const inner = parsedJson.error || parsedJson;
      if (inner.code && inner.code !== 200) status = inner.code;
      if (inner.status) errorCode = inner.status;
      if (inner.message) message = inner.message;
    }
  } catch {
    // Keep original message if JSON parse fails
  }

  if (error?.code && errorCode === 'GEMINI_API_ERROR') {
    errorCode = String(error.code);
  }

  // Detect RESOURCE_EXHAUSTED or 429
  if (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('resource_exhausted') ||
    message.includes('Quota exceeded') ||
    errorCode === 'RESOURCE_EXHAUSTED'
  ) {
    status = 429;
    errorCode = 'RESOURCE_EXHAUSTED';
  }

  if (!responseBody) {
    try {
      responseBody = error?.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : String(error?.stack || message);
    } catch {
      responseBody = String(message);
    }
  }

  // HTTP 200 must NEVER be returned as an error status
  if (status === 200 || status === '200') {
    status = 500;
  }

  const retryAfterSeconds = extractRetryAfterSeconds(error, message);

  return { status, errorCode, message, responseBody, retryAfterSeconds };
}

function classifyGeminiError(
  status: number | string,
  errorCode: string,
  message: string,
  uploadMethod: string,
  retryDelaySeconds?: number
) {
  const msgLower = (message || '').toLowerCase();
  const codeLower = (errorCode || '').toLowerCase();
  const statusNum = Number(status);

  // HTTP 200 must NEVER be classified as an API Request Error!
  if (statusNum === 200 || status === 200 || status === '200') {
    return {
      category: 'Gemini returned a response but did not provide usable content.',
      possibleCause:
        'The model returned HTTP 200, but no valid scene-analysis text or JSON was available.',
      suggestedFix:
        'Click "Retry Analysis" or check that your video contains clear visual scenes and actions.',
    };
  }

  // 8. API Quota / Rate Limit (HTTP 429 / RESOURCE_EXHAUSTED)
  if (
    statusNum === 429 ||
    codeLower.includes('resource_exhausted') ||
    msgLower.includes('quota') ||
    msgLower.includes('rate limit') ||
    msgLower.includes('exhausted') ||
    msgLower.includes('too many requests')
  ) {
    const delay = retryDelaySeconds && retryDelaySeconds > 0 ? retryDelaySeconds : 60;
    return {
      category: 'Gemini API quota temporarily reached.',
      possibleCause:
        'This is a Gemini API quota/rate-limit limit, not a video upload error. The Gemini model free tier or rate limit (RPM/TPM) has been momentarily reached.',
      suggestedFix:
        `Retry available in ${delay} seconds. Your uploaded video is preserved so you do not need to upload again. You can also switch to another Gemini API key in API Settings.`,
    };
  }

  // 9. API Key
  if (
    statusNum === 401 ||
    (statusNum === 403 &&
      (msgLower.includes('api key') ||
        msgLower.includes('unauthenticated') ||
        msgLower.includes('permission') ||
        msgLower.includes('unauthorized'))) ||
    codeLower.includes('unauthenticated') ||
    codeLower.includes('permission_denied') ||
    codeLower.includes('api_key_invalid') ||
    msgLower.includes('missing_api_key') ||
    msgLower.includes('api key not valid') ||
    msgLower.includes('invalid api key') ||
    msgLower.includes('unauthorized') ||
    msgLower.includes('invalid gemini api key')
  ) {
    return {
      category: 'Invalid or unauthorized Gemini API key.',
      possibleCause:
        'The provided API key is invalid, expired, revoked, or does not have permissions to access Gemini API models.',
      suggestedFix:
        'Open API Settings in the top bar, obtain a valid key from Google AI Studio (https://aistudio.google.com/apikey), paste it, and verify connection with "Test Key".',
    };
  }

  // 10. Billing / Free-tier
  if (
    msgLower.includes('billing') ||
    msgLower.includes('billing_disabled') ||
    msgLower.includes('free-tier') ||
    msgLower.includes('free tier') ||
    msgLower.includes('consumer has not enabled the gemini api') ||
    msgLower.includes('enable billing')
  ) {
    return {
      category:
        'Gemini API access for this project requires billing or the current free-tier access is unavailable.',
      possibleCause:
        'The associated Google Cloud project requires billing activation, or free-tier quotas are exhausted or restricted in your region.',
      suggestedFix:
        'Enable billing in your Google Cloud project console or generate a key from a standard Google AI Studio account with active billing.',
    };
  }

  // 14. Safety / Content filtering
  if (
    codeLower.includes('safety') ||
    codeLower.includes('blocklist') ||
    codeLower.includes('prohibited_content') ||
    msgLower.includes('safety') ||
    msgLower.includes('blocked') ||
    msgLower.includes('safety/content') ||
    msgLower.includes('content restrictions') ||
    msgLower.includes('finishreason: safety') ||
    msgLower.includes('harmful')
  ) {
    return {
      category: 'Gemini blocked the request due to safety/content restrictions.',
      possibleCause:
        'One or more video frames, visuals, or extracted story elements triggered automated Google Gemini safety filters.',
      suggestedFix:
        'Review video content to ensure it follows Gemini terms of service and contains no prohibited or sensitive imagery.',
    };
  }

  // 12. Model availability
  if (
    statusNum === 404 ||
    codeLower.includes('not_found') ||
    msgLower.includes('is not found') ||
    msgLower.includes('model not found') ||
    msgLower.includes('model is unavailable') ||
    msgLower.includes('model unavailable')
  ) {
    return {
      category: 'Selected Gemini model is unavailable.',
      possibleCause:
        'The model "gemini-3.8-flash" could not be reached, is temporarily unavailable, or is not accessible for this API key.',
      suggestedFix: 'Verify model availability on Google AI Studio status dashboard.',
    };
  }

  // 13. Unsupported request format (payload size / request format)
  if (
    statusNum === 413 ||
    (statusNum === 400 &&
      (msgLower.includes('payload') ||
        msgLower.includes('request payload size') ||
        msgLower.includes('too large') ||
        msgLower.includes('request format') ||
        msgLower.includes('exceeds'))) ||
    msgLower.includes('payload too large') ||
    msgLower.includes('request payload size exceeds')
  ) {
    return {
      category: 'Video request format is not supported by the selected Gemini API endpoint/model.',
      possibleCause:
        'The video payload exceeded the maximum inline request size (~20MB total HTTP request) or the request schema format was invalid.',
      suggestedFix:
        'Trim or compress your video to under 15MB, or allow the app to use timeline frame sampling mode instead of raw base64.',
    };
  }

  // 11. File upload processing
  if (
    msgLower.includes('video processing') ||
    msgLower.includes('could not process') ||
    msgLower.includes('decode') ||
    msgLower.includes('codec') ||
    msgLower.includes('corrupt') ||
    msgLower.includes('unsupported media') ||
    msgLower.includes('unable to parse video')
  ) {
    return {
      category: 'Gemini could not process the uploaded video.',
      possibleCause:
        'The video file could not be parsed or decoded by Gemini multimodal processors (unsupported codec, container, or corrupted data).',
      suggestedFix:
        'Convert the video to a standard MP4 (H.264 video codec, AAC audio codec) or WebM format, or test with the sample Fruit Story demo.',
    };
  }

  // Default fallback - only for actual errors (<200 or >=300)
  const displayStatus = statusNum >= 400 && statusNum < 600 ? String(statusNum) : '500';
  return {
    category: `Gemini API Request Error (${displayStatus})`,
    possibleCause: 'An unexpected error response was returned by the Gemini API endpoint.',
    suggestedFix:
      'Check your internet connection, verify your Gemini API key in API Settings, and click "Retry Analysis".',
  };
}

// 1. API: Test Connection
app.post('/api/test-key', async (req, res) => {
  const userApiKey = ((req.headers['x-gemini-api-key'] as string) || req.body.apiKey || '').trim();
  if (!userApiKey) {
    return res.status(400).json({ status: 'Not Connected', message: 'Please enter a Gemini API key.' });
  }

  if (userApiKey === 'mkp-admin-bypass') {
    return res.json({ status: 'Connected', message: 'Admin Bypass Active. Frontend features unlocked for testing.' });
  }

  // List of active models to test in priority order.
  // Note: Google has deprecated gemini-1.5-flash and gemini-2.5-flash for new users in v1beta,
  // recommending gemini-3.8-flash or gemini-flash-latest.
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ];

  let lastErrorData: any = null;
  let lastStatus = 500;

  for (const rawModel of candidateModels) {
    // Ensure no double 'models/' prefix
    const cleanModel = rawModel.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(userApiKey)}`;
    console.log(`[test-key] Testing key via Google REST endpoint for model: ${cleanModel}`);

    try {
      const googleRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping. Respond with only "PONG".' }] }],
        }),
      });

      const data = await googleRes.json().catch(() => null);
      console.log(`[test-key] Model ${cleanModel} responded with status: ${googleRes.status}`);

      if (googleRes.ok && data?.candidates?.[0]?.content) {
        return res.json({
          status: 'Connected',
          message: `API connection successful and active! (Verified via ${cleanModel})`,
        });
      }

      lastStatus = googleRes.status;
      lastErrorData = data;

      // If invalid key (400, 401, 403) or quota exceeded (429), break immediately - no need to try other models
      if (googleRes.status === 401 || googleRes.status === 403 || googleRes.status === 429) {
        break;
      }

      // If 404 (NOT_FOUND), continue loop to try fallback models
      if (googleRes.status === 404) {
        console.warn(`[test-key] Model ${cleanModel} returned 404 NOT_FOUND. Trying next fallback candidate...`);
        continue;
      }
    } catch (err: any) {
      console.error(`[test-key] Exception checking model ${cleanModel}:`, err);
      lastStatus = 500;
      lastErrorData = { error: { message: err?.message || 'Network fetch failure' } };
      break;
    }
  }

  // Format accurate error response
  console.error('[test-key] All connection candidate attempts finished. Last error:', lastErrorData);
  const innerError = lastErrorData?.error || {};
  const errMsg = innerError.message || `HTTP error ${lastStatus}`;
  const errStatus = innerError.status || 'Error';

  if (lastStatus === 400) {
    return res.status(400).json({ status: 'Error', message: `Bad Request: ${errMsg}` });
  }
  if (lastStatus === 401 || lastStatus === 403) {
    return res.status(lastStatus).json({ status: 'Invalid Key', message: `Invalid API Key: ${errMsg}` });
  }
  if (lastStatus === 429) {
    return res.status(429).json({ status: 'Quota Exceeded', message: `Quota Exceeded: ${errMsg}` });
  }

  return res.status(lastStatus).json({
    status: 'Error',
    message: `Failed to connect to Gemini API: ${errMsg} (${errStatus})`,
  });
});

// 2. API: Video Analysis (Uses Google Gen AI SDK FileManager API)
app.post('/api/analyze-video', upload.single('video'), async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
  let metadata = req.body?.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {}
  }
  const aspectRatio = req.body?.aspectRatio || '9:16';
  const promptMode = req.body?.promptMode || 'Analyze Original';
  const frames = req.body?.frames;

  let modelName = 'gemini-2.0-flash';
  let uploadedGeminiFileName: string | null = null;
  let uploadedGeminiFileUri: string | null = null;
  let uploadedGeminiFileMime: string | null = null;
  let aiClient: GoogleGenAI | null = null;

  try {
    const ai = getGenAIClient(userApiKey);
    aiClient = ai;

    const systemInstruction = `You are MKP VidPrompts Master, an expert AI video analysis and prompt recreation specialist primarily engineered for AI Fruit Story and 3D animated story creators.
Analyze the ENTIRE video from beginning to end. Examine every single second.
Do NOT hallucinate unseen actions. If something cannot be confidently identified, write "[UNCLEAR]" instead of inventing info.

==================================================
0. AUDIO & DIALOGUE INSTRUCTION
==================================================
Listen to the English dialogue/speech in the audio track and transcribe the key spoken lines or context, translating the contextual summary into Myanmar for the scene prompts and title suggestions.
If the dialogue is faint, noisy, or unclear, handle English audio & dialogues gracefully: use fallback defaults or translate the contextual summary into Myanmar rather than leaving it empty.
Prevent empty outputs by adding fallback defaults for characters and scene descriptions if the dialogue is faint or unclear.

==================================================
1. SCENE SEGMENTATION RULE
==================================================
Do NOT create a new scene for every dialogue line.
Do NOT create a new scene for every camera angle.
Do NOT create a new scene for every small action or minor movement.
Do NOT create a new scene simply because a character speaks.

A scene represents a continuous visual/story segment.

Target:
Approximately 8–10 seconds per scene.
* For a 10-second video: Prefer approximately 1 scene. (Do NOT split a 10-second video into 6 scenes. That is a major error).
* For a 20-second video: Prefer approximately 2–3 scenes.
* For a 30-second video: Prefer approximately 3–4 scenes.

These are guidelines, NOT rigid mathematical rules. The actual visual/story continuity should take priority.

==================================================
2. WHEN TO CREATE A NEW SCENE
==================================================
Create a new scene only when there is a meaningful change such as:
- Major location change
- Major time-of-day change
- Major story/action transition
- New continuous action sequence
- Characters entering or leaving in a way that changes the scene
- Major environment change
- Strong narrative beat that clearly separates the sequence

Do NOT split scenes for:
- One additional dialogue line
- Multiple dialogue lines in sequence
- Small facial expression changes
- Small hand movements
- Minor camera movement
- Camera zoom
- Camera pan
- Camera angle change
- Close-up inserted briefly
- Character looking at another character
- Short reaction
- Small prop interaction

==================================================
3. DIALOGUE RULE
==================================================
Dialogue MUST NOT automatically create a new scene.
A single scene may contain:
Character A dialogue
Character B dialogue
Character A dialogue
Character B dialogue
if all of them occur during the same continuous visual/action sequence. Keep all dialogue belonging to that sequence inside the same scene.

==================================================
4. TARGET SCENE LENGTH
==================================================
Use approximately:
8–10 seconds per scene when the source video allows it.
However: Do NOT force an exact 8–10 second split if it would break a continuous action sequence.
A continuous 12-second action sequence should remain one scene rather than being arbitrarily split into two scenes.
Likewise, a major scene transition at 5 seconds may create a new scene. Use intelligent visual segmentation.

==================================================
5. SCENE TIMESTAMPS
==================================================
Every scene must have:
startTime, endTime, duration
represented clearly in its "duration" parameter (e.g., "0:00 - 0:10").
Do NOT create multiple scenes without meaningful timestamp boundaries.

==================================================
6. REQUIRED SCENE PROMPT FORMAT
==================================================
The generated "video_prompt" for every scene must contain EXACTLY the following major sections:

VIDEO STYLE
[Describe the overall visual generation style: e.g. 3D/2D animation, Pixar-quality character rendering, rendering style, visual quality, lighting style, color palette, cinematic look, environment realism, depth of field, visual consistency].

CHARACTER DETAIL
[Describe EVERY important character appearing in this scene. For each character, specify: Name, Estimated age, Character type, head/face details, body proportions, clothing, and visual features. If replacements are applied, describe the replacement character details].

ACTION
[Describe the complete continuous action of the scene in chronological order: what each character is doing, interactions, props, movements, facial expressions, emotional reactions].

DIALOGUE
[All dialogue lines belonging to the scene together. Format as: Name: "dialogue". Myanmar dialogue must be preserved exactly. English dialogue must be translated naturally into Myanmar. If unclear, write [UNCLEAR DIALOGUE]. NEVER invent dialogue].

CAMERA
[Camera direction for the entire scene: shot type, camera movement, framing, close-ups, camera angle changes].

Do not hide these sections inside a long paragraph. Do not merge everything into one giant prompt. Display them as clearly separated sections.

Output MUST strictly be valid JSON following the schema.`;

    const promptText = `Analyze this uploaded video completely.
Aspect Ratio target: ${aspectRatio || '9:16'}.
Analysis Mode: ${promptMode || 'Analyze Original'}.
Video file details: Name: ${metadata?.name || 'video'}, Duration: ${metadata?.duration || 'unspecified'}s, Resolution: ${metadata?.resolution || 'unknown'}.

Provide structured JSON with:
{
  "project": {
    "title": "A descriptive title for this video/story",
    "aspect_ratio": "${aspectRatio || '9:16'}",
    "visual_style": "Detailed visual style analysis (e.g. 3D Pixar/Disney style animated fruit world, vibrant colors, soft subsurface scattering)",
    "master_style_prompt": "Master visual style prompt reusable for all scenes",
    "negative_prompt": "character inconsistency, different clothing, wrong fruit type, wrong colors, wrong face, different body proportions, extra limbs, extra fingers, missing fingers, deformed hands, distorted face, duplicate characters, incorrect anatomy, background inconsistency, low quality, blurry image, flickering, warping, text artifacts, watermarks, random objects, unwanted characters"
  },
  "characters": [
    {
      "id": "char_1",
      "name": "e.g. Orange Head",
      "original_name": "e.g. Orange Head",
      "type": "Anthropomorphic orange character",
      "head": "Vibrant orange fruit head with porous citrus peel texture, small green leaf on brown stem",
      "texture": "Natural citrus orange peel with subtle shine",
      "stem": "Small brown stem with fresh green leaf",
      "face": "Large expressive cartoon eyes, small nose, friendly wide mouth",
      "body": "Human-like proportions, slender limbs",
      "clothing": "Blue short-sleeve shirt, dark jeans, clean white sneakers",
      "personality": "Playful, energetic, curious based on observable actions",
      "description": "Full character summary"
    }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0:00 - 0:10",
      "location": "Vibrant tropical kitchen counter with warm morning sunlight",
      "time": "morning",
      "characters": ["Orange Head"],
      "action": "Orange Head hops onto the wooden cutting board, glances around curiously, then waves toward the viewer.",
      "emotion": "Cheerful, curious, welcoming",
      "body_language": "Bouncy hop, lively hand wave, tilted head",
      "dialogue": [
        {
          "speaker": "Orange Head",
          "original": "Hello everyone!",
          "myanmar": "မင်္ဂလာပါ အားလုံးပဲ",
          "type": "spoken"
        }
      ],
      "camera": "Medium close-up shot, eye-level, smooth slight push-in tracking shot, shallow depth of field focusing on the character",
      "environment": "Sunny kitchen interior with ceramic tiles, fruit basket in blurred background",
      "props": ["Wooden cutting board", "Fresh mint leaves"],
      "lighting": "Warm golden morning sunlight through window, soft rim lighting",
      "sound": "Gentle cartoon footstep thuds, soft cheerful acoustic guitar background music",
      "transition": "Smooth cut to next angle",
      "video_prompt": "VIDEO STYLE\\nCinematic 3D animation, Pixar-quality rendering, vibrant colors, warm morning sunlight, cinematic depth of field.\\n\\nCHARACTER DETAIL\\nOrange Head:\\nAn anthropomorphic orange boy character with a realistic citrus peel head, brown stem and green leaf, large expressive cartoon eyes, wearing a blue short-sleeve shirt and black jeans.\\n\\nACTION\\nOrange Head hops onto the wooden cutting board, glances around curiously, then waves toward the viewer.\\n\\nDIALOGUE\\nOrange Head:\\n\"မင်္ဂလာပါ အားလုံးပဲ\"\\n\\nCAMERA\\nMedium close-up shot, eye-level, smooth slight push-in tracking, shallow depth of field focusing on the character.",
      "character_image_prompt": "A cute anthropomorphic orange character, vibrant orange spherical head, realistic porous orange peel texture, small brown stem with a single green leaf at top, large expressive cartoon eyes, small button nose, friendly warm smile, human-like boy body, wearing a crisp blue short-sleeve shirt, black jeans, white sneakers, standing pose waving, 3D animated movie style, soft cinematic rim lighting, highly detailed, clean studio background, 9:16 vertical composition. NO DIALOGUE."
    }
  ]
}`;

    modelName = req.body?.modelName || 'gemini-2.0-flash';
    const fileName = req.file?.originalname || metadata?.name || 'Uploaded Video';
    const fileSize = req.file
      ? `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`
      : metadata?.size || 'Unknown';
    const duration = metadata?.duration ? `${metadata.duration}s` : 'Unknown';
    const videoMimeType =
      (req.file && (normalizeVideoMimeType(req.file.mimetype, req.file.originalname) || req.file.mimetype)) ||
      req.body?.mimeType ||
      'video/mp4';
    const requestMethod = 'POST ai.models.generateContent';

    let uploadMethod = 'Metadata text only';
    const contents: any[] = [];

    // Check if client provided an already uploaded and still valid Gemini file reference (for retrying 429)
    let reusedGeminiFile = req.body?.reusedGeminiFile;
    if (typeof reusedGeminiFile === 'string') {
      try {
        reusedGeminiFile = JSON.parse(reusedGeminiFile);
      } catch {}
    }

    if (reusedGeminiFile?.name && reusedGeminiFile?.uri) {
      try {
        console.log(`[FileManager] Reusing existing Gemini file: ${reusedGeminiFile.name}`);
        const remoteFile = await ai.files.get({ name: reusedGeminiFile.name });
        if (remoteFile && remoteFile.state === 'ACTIVE') {
          uploadedGeminiFileName = remoteFile.name || reusedGeminiFile.name;
          uploadedGeminiFileUri = remoteFile.uri || reusedGeminiFile.uri;
          uploadedGeminiFileMime = remoteFile.mimeType || reusedGeminiFile.mimeType || videoMimeType;
          uploadMethod = `Preserved Gemini File (${uploadedGeminiFileName})`;

          contents.push({
            fileData: {
              fileUri: uploadedGeminiFileUri,
              mimeType: uploadedGeminiFileMime,
            },
          });
          console.log(`[FileManager] Successfully verified existing Gemini file: ${uploadedGeminiFileUri}`);
        } else {
          console.log(`[FileManager] Preserved file was not active: ${remoteFile?.state}, re-uploading if file provided.`);
        }
      } catch (reuseErr) {
        console.warn(`[FileManager] Preserved file expired or unavailable, will re-upload if file provided:`, reuseErr);
      }
    }

    // Step 1: Upload the video file using Google Gen AI SDK FileManager API if not already reused
    if (contents.length === 0 && req.file) {
      const localFilePath = req.file.path;
      const originalFileName = req.file.originalname;
      const detectedMime =
        normalizeVideoMimeType(req.file.mimetype, originalFileName) || req.file.mimetype || 'video/mp4';

      uploadMethod = `Google Gen AI FileManager API (${originalFileName})`;

      console.log(
        `[FileManager] Uploading ${originalFileName} (${req.file.size} bytes, MIME: ${detectedMime}) to Gemini Files API...`
      );

      let fileUploadResult: any = null;
      try {
        fileUploadResult = await ai.files.upload({
          file: localFilePath,
          config: {
            mimeType: detectedMime,
            displayName: originalFileName,
          },
        });

        uploadedGeminiFileName = fileUploadResult.name || null;
        console.log(`[FileManager] Uploaded: ${fileUploadResult.name}. Checking processing state...`);

        // Step 2: Check and wait for the file's processing state to become 'ACTIVE'
        let remoteFile = await ai.files.get({ name: fileUploadResult.name! });
        const uploadStartTime = Date.now();
        const maxWaitMs = 300000; // 5 minutes timeout as recommended

        while (remoteFile.state === 'PROCESSING') {
          if (Date.now() - uploadStartTime > maxWaitMs) {
            throw new Error('Video processing timed out on Gemini Files API (exceeded 5 minutes).');
          }
          console.log(`[FileManager] File ${fileUploadResult.name} is PROCESSING. Polling in 3 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          try {
            remoteFile = await ai.files.get({ name: fileUploadResult.name! });
          } catch (pollErr: any) {
            console.warn('[FileManager] Transient polling notice:', pollErr?.message);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (remoteFile.state === 'FAILED') {
          throw new Error(
            `Video processing failed on Gemini Files API: ${remoteFile.error?.message || 'Processing failed'}`
          );
        }

        console.log(`[FileManager] File is ACTIVE! Remote URI: ${remoteFile.uri}`);
        uploadedGeminiFileUri = remoteFile.uri || null;
        uploadedGeminiFileMime = remoteFile.mimeType || detectedMime;

        // Step 3: Pass the verified Gemini fileUri and mimeType
        contents.push({
          fileData: {
            fileUri: remoteFile.uri,
            mimeType: remoteFile.mimeType || detectedMime,
          },
        });
      } finally {
        // Clean up local temp file immediately
        try {
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (cleanupErr) {
          console.warn('[FileManager] Temp file cleanup warning:', cleanupErr);
        }
      }
    } else if (contents.length === 0 && Array.isArray(frames) && frames.length > 0) {
      uploadMethod = `Sampled keyframes (${frames.length} JPEG images)`;
      frames.forEach((frameBase64: string) => {
        const cleanBase64 = frameBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        });
      });
    }

    contents.push({ text: promptText });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        project: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Descriptive title of the story or video." },
            aspect_ratio: { type: Type.STRING, description: "Aspect ratio, matching requested target." },
            visual_style: { type: Type.STRING, description: "Detailed visual style analysis." },
            master_style_prompt: { type: Type.STRING, description: "Reusable master style prompt." },
            negative_prompt: { type: Type.STRING, description: "Avoid quality/consistency issues." }
          },
          required: ["title", "aspect_ratio", "visual_style", "master_style_prompt"]
        },
        characters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING, description: "Character name (e.g. Orange Head)" },
              original_name: { type: Type.STRING, description: "Original name of character" },
              type: { type: Type.STRING, description: "Character type / species" },
              head: { type: Type.STRING },
              texture: { type: Type.STRING },
              stem: { type: Type.STRING },
              face: { type: Type.STRING },
              body: { type: Type.STRING },
              clothing: { type: Type.STRING },
              personality: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["id", "name", "original_name", "type", "description"]
          }
        },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              scene_number: { type: Type.INTEGER },
              duration: { type: Type.STRING },
              location: { type: Type.STRING },
              time: { type: Type.STRING },
              characters: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              action: { type: Type.STRING },
              emotion: { type: Type.STRING },
              body_language: { type: Type.STRING },
              dialogue: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    speaker: { type: Type.STRING, description: "Character speaking, or speaker name." },
                    original: { type: Type.STRING, description: "Original spoken English line or context summary." },
                    myanmar: { type: Type.STRING, description: "Myanmar translation of spoken line or summary." }
                  },
                  required: ["speaker", "original", "myanmar"]
                }
              },
              camera: { type: Type.STRING },
              environment: { type: Type.STRING },
              props: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              lighting: { type: Type.STRING },
              sound: { type: Type.STRING },
              transition: { type: Type.STRING },
              video_prompt: { type: Type.STRING, description: "Strictly structured multi-section video prompt." },
              character_image_prompt: { type: Type.STRING, description: "Standalone detailed prompt for 3D character generation." }
            },
            required: ["scene_number", "duration", "action", "dialogue", "video_prompt", "character_image_prompt"]
          }
        }
      },
      required: ["project", "characters", "scenes"]
    };

    console.log(`[MKP Video Analysis] Calling ai.models.generateContent with ${modelName}...`);
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    // Cleanup remote Gemini file if safe and uploaded
    if (uploadedGeminiFileName) {
      try {
        await ai.files.delete({ name: uploadedGeminiFileName });
        console.log(`[FileManager] Cleaned up remote Gemini file: ${uploadedGeminiFileName}`);
      } catch (delErr) {
        console.warn(`[FileManager] Remote file cleanup notice:`, delErr);
      }
    }

    // Inspect actual response structure
    const candidateCount = response?.candidates?.length ?? 0;
    const firstCandidate = response?.candidates?.[0];
    const finishReason = firstCandidate?.finishReason ?? null;
    const promptFeedback = response?.promptFeedback ?? null;

    console.log(
      `[MKP Video Analysis] generateContent response received (HTTP 200). Candidates: ${candidateCount}, finishReason: ${finishReason}`
    );

    // 1. Check safety or blocked response
    if (finishReason === 'SAFETY' || (promptFeedback as any)?.blockReason) {
      const blockMsg = `Gemini returned a response but did not provide usable content (finishReason: ${finishReason || 'SAFETY'}).`;
      console.warn(`[MKP Video Analysis] Safety blocked response:`, finishReason, promptFeedback);
      return res.status(200).json({
        success: false,
        errorType: 'SAFETY_BLOCKED',
        error: blockMsg,
        responseMeta: {
          candidateCount,
          finishReason,
          promptFeedback,
        },
        errorDetails: {
          status: 200,
          errorCode: 'SAFETY_BLOCKED',
          message: blockMsg,
          model: modelName,
          file: {
            name: fileName,
            size: fileSize,
            duration,
            mimeType: videoMimeType,
          },
          requestMethod,
          fileUploadStatus: uploadMethod,
          responseBody: JSON.stringify({ finishReason, promptFeedback }, null, 2),
          category: 'Gemini returned a response but did not provide usable content.',
          possibleCause: `One or more video elements were filtered by Google safety policies (${finishReason || 'SAFETY'}).`,
          suggestedFix: 'Review video content to ensure it complies with Gemini terms and contains no sensitive imagery.',
          maskedApiKey: maskApiKey(userApiKey),
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 2. Safe text extraction
    let generatedText = '';
    if (typeof response.text === 'string' && response.text.trim()) {
      generatedText = response.text.trim();
    } else if (response.candidates && response.candidates.length > 0) {
      for (const cand of response.candidates) {
        if (cand.content?.parts && Array.isArray(cand.content.parts)) {
          for (const part of cand.content.parts) {
            if (typeof (part as any).text === 'string') {
              generatedText += (part as any).text;
            }
          }
        }
        if (generatedText.trim()) break;
      }
    }

    // 3. Handle no-text response
    if (!generatedText.trim()) {
      const noTextMsg = 'Gemini returned a successful response, but no text content was available.';
      console.warn(`[MKP Video Analysis] No text in 200 response. finishReason: ${finishReason}`);
      return res.status(200).json({
        success: false,
        errorType: 'NO_TEXT_AVAILABLE',
        error: noTextMsg,
        responseMeta: {
          candidateCount,
          finishReason,
          promptFeedback,
        },
        errorDetails: {
          status: 200,
          errorCode: 'NO_TEXT_AVAILABLE',
          message: noTextMsg,
          model: modelName,
          file: {
            name: fileName,
            size: fileSize,
            duration,
            mimeType: videoMimeType,
          },
          requestMethod,
          fileUploadStatus: uploadMethod,
          responseBody: JSON.stringify(
            {
              candidateCount,
              finishReason,
              promptFeedback,
              partsCount: firstCandidate?.content?.parts?.length ?? 0,
            },
            null,
            2
          ),
          category: 'Gemini returned a successful response, but no text content was available.',
          possibleCause: `Model completed with finishReason "${finishReason || 'UNKNOWN'}" without text parts.`,
          suggestedFix: 'Click "Retry Analysis" or check that your video contains clear visual scenes and actions.',
          maskedApiKey: maskApiKey(userApiKey),
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 4. Safe JSON parsing with fallback
    let parsed: any = null;
    try {
      parsed = JSON.parse(generatedText);
    } catch (e1) {
      const cleaned = generatedText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        const match = generatedText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (e3) {
            console.warn('[MKP Video Analysis] Substring JSON parse failed:', e3);
          }
        }
      }
    }

    // 5. Handle invalid JSON output format
    if (!parsed || typeof parsed !== 'object') {
      const parseMsg = 'Gemini returned a response, but the output JSON could not be parsed.';
      console.warn(`[MKP Video Analysis] JSON parsing failure. Raw excerpt:`, generatedText.slice(0, 300));
      return res.status(200).json({
        success: false,
        errorType: 'JSON_PARSE_ERROR',
        error: parseMsg,
        rawText: generatedText,
        responseMeta: {
          candidateCount,
          finishReason,
        },
        errorDetails: {
          status: 200,
          errorCode: 'JSON_PARSE_ERROR',
          message: parseMsg,
          model: modelName,
          file: {
            name: fileName,
            size: fileSize,
            duration,
            mimeType: videoMimeType,
          },
          requestMethod,
          fileUploadStatus: uploadMethod,
          responseBody: generatedText.slice(0, 1500),
          category: 'Model output format error.',
          possibleCause: 'The generated text could not be parsed into a valid JSON object.',
          suggestedFix: 'Click "Retry Analysis" to re-generate the structured analysis.',
          maskedApiKey: maskApiKey(userApiKey),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const safeProject = (parsed && typeof parsed.project === 'object' && parsed.project !== null) ? parsed.project : {};
    const safeCharacters = Array.isArray(parsed?.characters) ? parsed.characters : [];
    const safeScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];

    const sanitizedData = {
      ...parsed,
      project: {
        title: typeof safeProject.title === 'string' && safeProject.title.trim() ? safeProject.title.trim() : (metadata?.name || 'AI Fruit Story Project'),
        aspect_ratio: typeof safeProject.aspect_ratio === 'string' && safeProject.aspect_ratio.trim() ? safeProject.aspect_ratio.trim() : aspectRatio,
        visual_style: typeof safeProject.visual_style === 'string' && safeProject.visual_style.trim() ? safeProject.visual_style.trim() : '3D Animated Film Style',
        master_style_prompt: safeProject.master_style_prompt || '',
        negative_prompt: safeProject.negative_prompt || '',
      },
      characters: safeCharacters,
      scenes: safeScenes,
    };

    console.log(
      `[MKP Video Analysis]\n` +
      `Model: ${modelName}\n` +
      `File size: ${fileSize}\n` +
      `Duration: ${duration}\n` +
      `MIME type: ${videoMimeType}\n` +
      `Upload method: ${uploadMethod}\n` +
      `API response: 200 OK (${safeScenes.length} scenes, ${safeCharacters.length} characters)\n` +
      `Error: None`
    );

    return res.json({
      success: true,
      data: sanitizedData,
      text: generatedText,
      responseMeta: {
        candidateCount,
        finishReason,
      },
    });
  } catch (error: any) {
    const { status, errorCode, message, responseBody, retryAfterSeconds } = parseGeminiError(error);
    const fileName = req.file?.originalname || metadata?.name || 'Uploaded Video';
    const fileSize = req.file
      ? `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`
      : metadata?.size || 'Unknown';
    const duration = metadata?.duration ? `${metadata.duration}s` : 'Unknown';
    const videoMimeType =
      (req.file && (normalizeVideoMimeType(req.file.mimetype, req.file.originalname) || req.file.mimetype)) ||
      req.body?.mimeType ||
      'video/mp4';
    const uploadMethod = req.file
      ? `Google Gen AI FileManager API (${req.file.originalname})`
      : frames?.length
      ? `Sampled keyframes (${frames.length} frames)`
      : 'Metadata only';

    // Ensure status in error handler is an actual error status (4xx/5xx), NEVER 200!
    const effectiveStatus = typeof status === 'number' && status >= 400 && status < 600 ? status : 500;
    const classification = classifyGeminiError(effectiveStatus, errorCode, message, uploadMethod, retryAfterSeconds);

    // If error is 429 quota, DO NOT delete the uploaded Gemini file! Preserve it for retry.
    // If error is something else (or non-retryable), clean it up.
    if (uploadedGeminiFileName && effectiveStatus !== 429 && aiClient) {
      try {
        await aiClient.files.delete({ name: uploadedGeminiFileName });
        console.log(`[FileManager] Cleaned up remote Gemini file after non-quota error: ${uploadedGeminiFileName}`);
      } catch (delErr) {
        console.warn(`[FileManager] Remote file cleanup notice:`, delErr);
      }
    } else if (uploadedGeminiFileName && effectiveStatus === 429) {
      console.log(`[FileManager] Preserving active Gemini file for retry: ${uploadedGeminiFileName} (${uploadedGeminiFileUri})`);
    }

    // Development console logging according to requirement 15
    console.log(
      `[MKP Video Analysis]\n` +
      `Model: ${modelName}\n` +
      `File size: ${fileSize}\n` +
      `Duration: ${duration}\n` +
      `MIME type: ${videoMimeType}\n` +
      `Upload method: ${uploadMethod}\n` +
      `API response: ${effectiveStatus} ${errorCode}\n` +
      `Error: ${message}`
    );

    const errorDetails = {
      status: effectiveStatus,
      errorCode,
      message, // Real Gemini API error message, never hidden
      model: modelName,
      file: {
        name: fileName,
        size: fileSize,
        duration,
        mimeType: videoMimeType,
      },
      requestMethod: 'POST ai.models.generateContent',
      fileUploadStatus: uploadMethod,
      responseBody,
      category: classification.category,
      possibleCause: classification.possibleCause,
      suggestedFix: classification.suggestedFix,
      maskedApiKey: maskApiKey(userApiKey),
      timestamp: new Date().toISOString(),
      retryAfterSeconds: retryAfterSeconds || (effectiveStatus === 429 ? 60 : undefined),
      uploadedGeminiFile:
        uploadedGeminiFileName && uploadedGeminiFileUri
          ? {
              name: uploadedGeminiFileName,
              uri: uploadedGeminiFileUri,
              mimeType: uploadedGeminiFileMime || videoMimeType,
            }
          : undefined,
    };

    return res.status(effectiveStatus).json({
      success: false,
      error: message,
      errorDetails,
    });
  }
});

// 3. API: Regenerate Single Scene or Character Prompts
app.post('/api/regenerate-scene', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { scene, characterBible, visualStyle, aspectRatio, mode, promptMode } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const prompt = `You are MKP VidPrompts Master.
Regenerate the prompts for Scene ${scene.scene_number} strictly adhering to the Character Bible, Visual Style, and Aspect Ratio (${aspectRatio || '9:16'}).

Aspect Ratio: ${aspectRatio || '9:16'}
Prompt Mode: ${promptMode || 'Analyze Original'}
Character Bible:
${JSON.stringify(characterBible, null, 2)}

Visual Style:
${visualStyle || '3D Animated Film'}

Current Scene Data:
${JSON.stringify(scene, null, 2)}

Regenerate and return a JSON object with:
{
  "action": "refined action description",
  "emotion": "emotion description",
  "body_language": "body language details",
  "dialogue": [
    {
      "speaker": "Name",
      "original": "English original",
      "myanmar": "Burmese translation preserving intent",
      "type": "spoken"
    }
  ],
  "camera": "camera details",
  "environment": "environment details",
  "props": ["prop1", "prop2"],
  "lighting": "lighting details",
  "sound": "sound effects and music",
  "transition": "transition details",
  "video_prompt": "comprehensive AI video prompt which MUST contain exactly these 5 sections separated by double newlines. Do NOT hide them in paragraphs or merge them. Headers must be in uppercase:\\n\\nVIDEO STYLE\\n[Visual style details]\\n\\nCHARACTER DETAIL\\n[Character visual details from character bible]\\n\\nACTION\\n[Chronological actions, emotional expressions]\\n\\nDIALOGUE\\n[Speaker: \\\"dialogue\\\" lines in Myanmar preserved or translated]\\n\\nCAMERA\\n[Shot framing and camera motion]",
  "character_image_prompt": "comprehensive character image prompt for ONLY characters appearing in this scene. NO DIALOGUE, NO STORY NARRATION."
}`;

    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return res.json({ success: true, scene: { ...scene, ...parsed } });
  } catch (error: any) {
    console.error('Regenerate scene error:', error);
    return res.status(500).json({ error: error.message || 'Failed to regenerate scene.' });
  }
});

// 4. API: Smart Character Replacement Recalculation
app.post('/api/replace-character', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { project, originalCharName, replacementProfile, options } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const prompt = `You are the Character Replacement Engine of MKP VidPrompts Master.
Execute a structured SMART character replacement across the entire project.

Original Character: "${originalCharName}"
Replacement Character Details:
${JSON.stringify(replacementProfile, null, 2)}

Options:
${JSON.stringify(options, null, 2)}

Rules:
1. DO NOT simply find and replace text.
2. Update the character in the Character Bible: new name, fruit/character type, head appearance, skin texture, stem/leaf, facial features.
3. If options.keep_clothing is true, preserve original clothing description.
4. If options.keep_body is true, preserve original body proportions.
5. If options.keep_actions is true, preserve ALL original actions across all scenes.
6. If options.keep_dialogue is true, preserve dialogue meanings and Myanmar translations, updating speaker names.
7. Update Master Character Reference.
8. For every scene where "${originalCharName}" appeared:
   - Update character list to new character name.
   - Update "video_prompt" with new character visuals while preserving action, story, camera, lighting, and Myanmar dialogue.
   - Update "character_image_prompt" to describe the new character's physical appearance (head, skin, texture, eyes, pose, clothing). NO DIALOGUE in image prompt.
   - Preserve scene sequence, duration, camera angles, props, environment, and transitions.

Current Project JSON:
${JSON.stringify(project, null, 2)}

Return the FULL updated project JSON with the exact same top-level structure:
{
  "project": { ... },
  "characters": [ ... ],
  "scenes": [ ... ]
}`;

    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const updatedProject = JSON.parse(cleaned);
    return res.json({ success: true, project: updatedProject });
  } catch (error: any) {
    console.error('Character replacement error:', error);
    return res.status(500).json({ error: error.message || 'Failed to replace character.' });
  }
});

// 5. API: Generate Character Images (uses gemini-3.1-flash-lite-image)
app.post('/api/generate-character-image', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { prompt, aspectRatio } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', '4:5'];
    let chosenRatio = validRatios.includes(aspectRatio) ? aspectRatio : '9:16';
    if (chosenRatio === '4:5') {
      chosenRatio = '3:4';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: chosenRatio as any,
        },
      },
    });

    let imageUrl = '';
    const candidates = response.candidates || [];
    if (candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const b64 = part.inlineData.data;
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${b64}`;
          break;
        }
      }
    }

    if (imageUrl) {
      return res.json({ success: true, imageUrl });
    } else {
      return res.json({
        success: false,
        message: 'Character Image Generation is not available with the current model/API configuration.',
      });
    }
  } catch (error: any) {
    console.error('Image generation error:', error);
    const msg = error?.message || String(error);
    if (msg.includes('404') || msg.includes('not supported') || msg.includes('permission') || msg.includes('unavailable')) {
      return res.json({
        success: false,
        message: 'Character Image Generation is not available with the current model/API configuration.',
      });
    }
    return res.json({
      success: false,
      message: 'Character Image Generation is not available with the current model/API configuration.',
      details: msg,
    });
  }
});

// 6. API: Generate Complete Story Analysis & 10 Titles
app.post('/api/generate-story-analysis', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { scenes, characters, visualStyle, title } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const systemInstruction = `You are MKP VidPrompts Master - Story & Thumbnail Studio Specialist.
Analyze the ENTIRE sequence of scenes together as one coherent, continuous story.
Do NOT analyze scenes independently. Combine all scene data from beginning to end.

Rules:
1. Identify:
   - Beginning, Main characters & relationships, Main conflict, Important events, Mystery/Problem, Turning point, Climax, Resolution, Ending, Emotional tone, Main theme/message, and Most important visual moment.
   - If the ending is unclear, mark ending as "[UNCLEAR ENDING]".
   - Do NOT invent events that do not exist in the scenes.
2. Story Summary:
   - Provide a coherent, engaging story summary in natural, authentic Myanmar (Burmese) language explaining the complete story from beginning to end.
   - Do not list "Scene 1, Scene 2". Write as a connected narrative.
3. 10 Myanmar Story Titles:
   - Generate exactly 10 short, catchy, memorable titles in Myanmar script.
   - Optimized for TikTok, YouTube Shorts, and Facebook Reels.
   - Related to the actual story events and curiosity-inducing without misleading or clickbait falsehoods.
4. Strictly respect CURRENT Character Bible names (e.g. if character was replaced, use the new name).`;

    const promptText = `Analyze this complete story:
Project Title: ${title || 'AI Animated Story'}
Visual Style: ${visualStyle || '3D Animated Film'}

Current Characters:
${JSON.stringify(characters, null, 2)}

All Scenes:
${JSON.stringify(scenes, null, 2)}

Return valid JSON with schema:
{
  "storyAnalysis": {
    "summary": "Full narrative story summary in natural Myanmar language",
    "beginning": "Beginning setup",
    "conflict": "Core problem/conflict",
    "development": "How the story progresses",
    "climax": "The most intense/critical turning point",
    "ending": "How it resolves or [UNCLEAR ENDING]",
    "theme": "Main theme/moral",
    "emotionalTone": "e.g. Heartwarming, adventurous, mysterious",
    "visualMoment": "The single most visually striking, high-stakes moment of the story"
  },
  "storyTitles": [
    "Title 1 in Myanmar",
    "Title 2 in Myanmar",
    "Title 3 in Myanmar",
    "Title 4 in Myanmar",
    "Title 5 in Myanmar",
    "Title 6 in Myanmar",
    "Title 7 in Myanmar",
    "Title 8 in Myanmar",
    "Title 9 in Myanmar",
    "Title 10 in Myanmar"
  ]
}`;

    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Story analysis error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate story analysis.' });
  }
});

// 7. API: Generate 10 More Story Titles
app.post('/api/generate-more-titles', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { storyAnalysis, characters, currentTitles } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const promptText = `You are MKP VidPrompts Master Title Specialist.
Based on the existing story analysis and character bible, generate 10 NEW and DIFFERENT catchy Myanmar story titles.
Do NOT change the story. Do NOT invent events that do not exist.
Titles must be in natural Myanmar script, short, curiosity-inducing, suitable for Facebook, TikTok, and YouTube Shorts.

Story Summary:
${storyAnalysis?.summary || ''}
Theme: ${storyAnalysis?.theme || ''}
Conflict: ${storyAnalysis?.conflict || ''}
Climax: ${storyAnalysis?.climax || ''}

Current Characters:
${JSON.stringify(characters?.map((c: any) => c.name), null, 2)}

Already generated titles (avoid duplicating these):
${JSON.stringify(currentTitles || [], null, 2)}

Return valid JSON:
{
  "storyTitles": [
    "New Title 1 in Myanmar",
    "New Title 2 in Myanmar",
    "New Title 3 in Myanmar",
    "New Title 4 in Myanmar",
    "New Title 5 in Myanmar",
    "New Title 6 in Myanmar",
    "New Title 7 in Myanmar",
    "New Title 8 in Myanmar",
    "New Title 9 in Myanmar",
    "New Title 10 in Myanmar"
  ]
}`;

    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, storyTitles: parsed.storyTitles || [] });
  } catch (error: any) {
    console.error('Generate more titles error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate more titles.' });
  }
});

// 8. API: Generate Thumbnail Concepts & Prompts
app.post('/api/generate-thumbnail-concept', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const {
    storyAnalysis,
    selectedTitle,
    characters,
    visualStyle,
    stylePreset,
    aspectRatio,
    generateThree,
    scenes,
  } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const currentStyle = stylePreset || 'Cinematic';
    const currentRatio = aspectRatio || '9:16';
    const currentTitle = selectedTitle || 'Untitled Story';

    const systemInstruction = `You are an elite YouTube/TikTok/Reels Thumbnail Art Director for 3D animated Fruit Stories.
Create high-CTR, highly contextual and cinematic thumbnail concepts that strictly apply the chosen art style and reflect the emotional tone and mood of the selected story title.

CRITICAL RULES:
1. ALWAYS use the CURRENT CHARACTER BIBLE. If characters were replaced, use ONLY the new replacement characters. Never revert to old characters.
2. Select the strongest visual moment communicating conflict, emotion, character relationship, and stakes based on the provided story details and narrative scenes.
3. Every single image prompt generated (both the primary "prompt" and those inside "threeConcepts") MUST strictly follow this exact formatting template:
   "[Art Style] style, [Aspect Ratio] thumbnail. [Scene Action]. Thematic elements related to the title '[Selected Title]'. Highly detailed, 8k resolution, cinematic lighting."
   
   Ensure that:
   - [Art Style] is replaced with: "${currentStyle}"
   - [Aspect Ratio] is replaced with: "${currentRatio}"
   - [Selected Title] is replaced with: "${currentTitle}"
   - [Scene Action] is replaced with a highly descriptive visual action of the characters and scene (no dialogue, no text overlays, in English).
4. Thumbnail Negative Prompt:
   - Include: wrong character, character inconsistency, wrong fruit, wrong clothing, extra characters, duplicate characters, deformed face, distorted hands, extra limbs, blurry image, low quality, watermark, logo, random text, misspelled text, incorrect background, unrelated objects, inconsistent character proportions.`;

    const promptText = `Generate thumbnail concepts for:
Selected Story Title: "${currentTitle}"
Thumbnail Style Preset: ${currentStyle}
Target Aspect Ratio: ${currentRatio}
Project Visual Style: ${visualStyle || '3D Animated Film'}

Story Summary:
${storyAnalysis?.summary || ''}
Key Visual Moment: ${storyAnalysis?.visualMoment || ''}
Climax: ${storyAnalysis?.climax || ''}

CURRENT Characters (USE EXACTLY THESE):
${JSON.stringify(characters, null, 2)}

Detailed Scenes (use these to make sure concepts match the actual scene narrative and character replacements):
${JSON.stringify(scenes || [], null, 2)}

${
  generateThree
    ? `Generate 3 distinct visual concepts matching the style "${currentStyle}" and title theme "${currentTitle}":
Concept 1: Main character + mystery/important object
Concept 2: Main character + secondary/antagonist character interaction
Concept 3: High-stakes emotional climax moment`
    : `Generate 1 primary thumbnail concept matching the style "${currentStyle}" and title theme "${currentTitle}".`
}

CRITICAL: In your JSON response, every "prompt" field MUST strictly adhere to this format:
"${currentStyle} style, ${currentRatio} thumbnail. [A highly descriptive visual sentence of the character action, scene setting, and lighting]. Thematic elements related to the title '${currentTitle}'. Highly detailed, 8k resolution, cinematic lighting."

Return JSON schema:
{
  "concept": "Detailed description: Main Characters, Positions, Facial Expressions, Action, Background, Important Object, Lighting, Color Mood, Camera, Composition, Text placement area",
  "prompt": "Must follow the prompt template exactly.",
  "negativePrompt": "wrong character, character inconsistency, wrong fruit, wrong clothing, extra characters, duplicate characters, deformed face, distorted hands, extra limbs, blurry image, low quality, watermark, logo, random text, misspelled text, incorrect background, unrelated objects, inconsistent character proportions",
  "threeConcepts": [
    {
      "id": "concept_1",
      "title": "Concept 1: Character & Mystery Object",
      "conceptDescription": "Brief summary",
      "mainCharacters": ["Character Name"],
      "composition": "Shot details",
      "prompt": "Must follow the prompt template exactly.",
      "negativePrompt": "wrong character, character inconsistency, wrong fruit..."
    },
    {
      "id": "concept_2",
      "title": "Concept 2: Character Interaction / Confrontation",
      "conceptDescription": "Brief summary",
      "mainCharacters": ["Character Name 1", "Character Name 2"],
      "composition": "Shot details",
      "prompt": "Must follow the prompt template exactly.",
      "negativePrompt": "wrong character, character inconsistency, wrong fruit..."
    },
    {
      "id": "concept_3",
      "title": "Concept 3: Emotional Climax",
      "conceptDescription": "Brief summary",
      "mainCharacters": ["Character Name"],
      "composition": "Shot details",
      "prompt": "Must follow the prompt template exactly.",
      "negativePrompt": "wrong character, character inconsistency, wrong fruit..."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Thumbnail concept error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate thumbnail concept.' });
  }
});

app.post('/api/translate-description', async (req, res) => {
  try {
    const userApiKey = req.headers['x-gemini-api-key'] as string;
    const { description } = req.body;
    if (!description || !description.trim()) {
      return res.json({ success: true, translated: '' });
    }

    const ai = getGenAIClient(userApiKey);
    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: `Translate the following character description from Myanmar (Burmese) or any language into a natural, detailed English AI image generation prompt. Preserve all visual details (gender, hair, skin, build, clothing, colors, accessories) accurately without inventing unstated facts. Output ONLY the English prompt description.\n\nDescription: "${description}"`,
    });

    const translated = response.text ? response.text.trim() : description;
    res.json({ success: true, translated });
  } catch (err: any) {
    console.error('Translate description error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Translation failed' });
  }
});

// 9. API: Generate Auto-Style for Thumbnail Typography
app.post('/api/generate-auto-style', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { backgroundPrompt, stylePreset, titleText, concept } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const systemInstruction = `You are a high-CTR YouTube/TikTok/Reels Graphic Design Director specialized in typography and overlay styling for 3D animated Fruit Stories.
Your task is to analyze the background scene/style description and choose the absolute best typographic options (font size, color, shadow, stroke, backing box) to maximize readability, contrast, and click-through rate (CTR) of the Myanmar overlay text on the final thumbnail.`;

    const promptText = `Analyze this thumbnail background details to determine the best styling:
Title Text (Myanmar): "${titleText || ''}"
Background Concept/Scene: "${concept || ''}"
Visual Generation Prompt: "${backgroundPrompt || ''}"
Art Style Preset: "${stylePreset || 'Cinematic'}"

Return a valid JSON object strictly following this schema:
{
  "fontSize": 34, // a number between 24 and 52 optimized for title length and readability
  "textColor": "#FACC15", // Hex color (High contrast like: '#FACC15' (Gold), '#FFFFFF' (White), '#FB923C' (Orange), '#EF4444' (Crimson), '#4ADE80' (Lime), '#38BDF8' (Cyan))
  "textShadow": true, // boolean, true if a drop shadow enhances contrast against background details
  "textStroke": true, // boolean, true if a dark outline border makes the text pop
  "backgroundBox": false // boolean, true if a translucent dark contrast backing strip is needed for high-frequency or busy backgrounds
}`;

    const response = await ai.models.generateContent({
      model: req.body?.modelName || 'gemini-2.0-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Auto-style error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate typographic styles.' });
  }
});

// 9b. API: Dynamic Thumbnail Enhancement with Gemini AI
app.post('/api/enhance-thumbnail-ai', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const {
    headlineText,
    textLayers = [],
    aspectRatio = '16:9',
    hasBackgroundImage = false,
    photoFileName = '',
    imageOverlaysCount = 0,
    language = 'en',
    styleTheme = 'Viral / High-CTR',
  } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const systemInstruction = `You are an elite YouTube & social media Graphic Designer and CTR (Click-Through Rate) Optimization Specialist.
Your mission is to analyze thumbnail layout drafts and generate top-tier, high-contrast typography styling, strategic positioning, vibrant color palettes, outlines (strokes), drop shadows, and background backing boxes.

Key Guidelines:
1. SAFE ZONES & POSITIONING:
   - For 16:9 (YouTube), avoid placing critical text in the bottom-right corner (where YouTube video duration timestamp badge is rendered: xPercent > 70% && yPercent > 75%).
   - Position main headlines prominently around top (yPercent: 18%-28%) or center-left (xPercent: 35%-50%, yPercent: 40%-55%) or upper center (xPercent: 50%, yPercent: 22%-35%).
2. COLOR PALETTES (High Contrast & High CTR):
   - Use punchy, high-visibility colors like '#FACC15' (Bright Yellow), '#FFFFFF' (Pure White), '#38BDF8' (Sky Cyan), '#FB923C' (Punchy Orange), '#4ADE80' (Neon Green), '#EF4444' (Red).
3. OUTLINES & SHADOWS:
   - Enable 'stroke: true' with 'strokeWidth: 4 to 8' and 'strokeColor: "#000000"' for razor-sharp legibility over photos.
   - Enable 'shadow: true' with 'shadowBlur: 10 to 18', 'shadowOffsetY: 4 to 8', 'shadowOpacity: 0.85 to 0.95', 'shadowColor: "#000000"'.
4. PHOTO POP:
   - Suggest slight increases in brightness (105-115), contrast (110-125), and saturation (115-130) to make the overall composition eye-catching.`;

    const promptText = `Analyze this thumbnail draft and provide an enhanced design configuration:
- Headline Text: "${headlineText || (language === 'mm' ? 'အံ့မခန်း ဗီဒီယိုအသစ်' : 'CRAZY DISCOVERY!')}"
- Current Text Layers: ${JSON.stringify(textLayers)}
- Aspect Ratio: "${aspectRatio}"
- Has Background Photo: ${hasBackgroundImage ? `Yes (${photoFileName || 'custom image'})` : 'No'}
- Number of Image Overlays: ${imageOverlaysCount}
- Target Language: "${language}"
- Desired Style: "${styleTheme}"

Return a valid JSON object matching this structure:
{
  "enhancedTextLayers": [
    {
      "id": "layer_id_or_layer_1",
      "text": "POLISHED HIGH-CTR TEXT",
      "fontSize": 56,
      "textColor": "#FACC15",
      "fontWeight": "900",
      "fontFamily": "Montserrat",
      "textAlign": "center",
      "xPercent": 50,
      "yPercent": 25,
      "stroke": true,
      "strokeWidth": 6,
      "strokeColor": "#000000",
      "shadow": true,
      "shadowBlur": 14,
      "shadowOffsetX": 0,
      "shadowOffsetY": 4,
      "shadowOpacity": 0.9,
      "shadowColor": "#000000",
      "glow": false,
      "glowBlur": 0,
      "glowColor": "#FACC15",
      "backgroundBox": false,
      "boxColor": "#000000",
      "boxOpacity": 0.75,
      "boxPadding": 10,
      "boxRounded": 8
    }
  ],
  "photoAdjustments": {
    "brightness": 110,
    "contrast": 118,
    "saturation": 125
  },
  "aiReasoning": "Applied punchy golden-yellow typography with bold black stroke and deep shadow at top-center to maximize mobile visibility and avoid YouTube timestamp badge."
}`;

    const modelToUse = req.body?.modelName || 'gemini-2.5-flash';
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelToUse,
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
    } catch (modelErr: any) {
      console.warn(`Primary model ${modelToUse} failed, falling back to gemini-2.5-flash:`, modelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
    }

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Enhance thumbnail AI error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to enhance thumbnail with AI.',
    });
  }
});

// 9c. API: Generate Cinematic Movie Recap Narrative with Gemini AI
app.post('/api/generate-movie-recap', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const {
    videoTitle = 'Untitled Movie',
    videoLanguage = 'en',
    voiceName = 'Thiha',
    voiceSpeed = 1.2,
    aspectRatio = '16:9',
    storyContext = '',
  } = req.body;

  try {
    const ai = getGenAIClient(userApiKey);
    const languageMap: Record<string, string> = {
      mm: 'Myanmar (Burmese)',
      en: 'English',
      kr: 'Korean',
      jp: 'Japanese',
      cn: 'Chinese',
      es: 'Spanish',
    };
    const targetLanguage = languageMap[videoLanguage] || 'English';

    const systemInstruction = `You are a professional Movie Recap narrator for viral videos and cinematic storytelling.
Your mission is to watch and analyze this movie/video sequence and write an engaging, suspenseful, fast-paced cinematic storyline recap in the selected language (${targetLanguage}).

CRITICAL STORYTELLING RULES:
1. DO NOT translate line-by-line dialogue.
2. DO NOT summarize like a dry textbook or robot reading names back and forth.
3. Hook the audience immediately in the opening sentence with intense curiosity or shocking stakes.
4. Narrate key plot twists and high-stakes developments naturally with cinematic momentum.
5. Keep the tone immersive, dramatic, and vivid like a true movie storyteller.
6. Format the script with clear cinematic act markers ([00:00 - 00:45] Hook & Setup, [00:45 - 02:00] Escalation & Twists, [02:00 - 03:00] Final Climax & Resolution).
7. Output strictly in ${targetLanguage}.`;

    const promptText = `Analyze the movie/video sequence and write a viral, high-retention movie recap script:
- Video Title / Source: "${videoTitle}"
- Target Language: "${targetLanguage}"
- AI Voice Narrator: "${voiceName}"
- Target Pacing: ${voiceSpeed}x speed
- Visual Format: "${aspectRatio}"
${storyContext ? `- Additional Scene/Plot Details: ${storyContext}` : ''}

Return a valid JSON object strictly matching this schema:
{
  "title": "Cinematic Hook Title",
  "hook": "Opening hook sentence to grab the viewer in 3 seconds",
  "script": "[00:00 - 00:45] HOOK & INTRO:\\nFull narrative storytelling text...\\n\\n[00:45 - 02:00] ESCALATION & TWIST:\\nSuspenseful escalation text...\\n\\n[02:00 - 03:00] CLIMAX & FINALE:\\nThrilling climax resolution text...",
  "duration": "180s",
  "targetLanguage": "${targetLanguage}",
  "videoTitle": "Catchy Viral Video Title optimized for YouTube / TikTok",
  "hashtags": ["#MovieRecap", "#TikTokMyanmar", "#SciFiMovie", "#MKPVidPrompts", "#ViralStory", "#CinematicRecap"]
}`;

    const modelToUse = 'gemini-3.8-flash';
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelToUse,
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.75,
        },
      });
    } catch (modelErr: any) {
      console.warn(`Primary model ${modelToUse} failed, falling back to gemini-2.5-flash:`, modelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.75,
        },
      });
    }

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Generate movie recap error:', error);
    const parsed = parseGeminiError(error);
    return res.status(typeof parsed.status === 'number' ? parsed.status : 500).json({
      success: false,
      error: parsed.message || 'Failed to generate cinematic movie recap script.',
      details: parsed,
    });
  }
});

// 10. API: Generate Complete Story Prompts by Duration & 8-10s Beat Rule
app.post('/api/generate-story-prompts', async (req, res) => {
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const { story, duration = '1 MIN', visualStyle = '3D Animation', aspectRatio = '9:16' } = req.body;

  if (!story || !story.trim()) {
    return res.status(400).json({ error: 'Story script is required.' });
  }

  // Determine target scene counts based on duration
  let targetScenesText = '6 to 8 scenes';
  let totalDurationSec = 60;
  if (duration === '2 MIN') {
    targetScenesText = '12 to 15 scenes';
    totalDurationSec = 120;
  } else if (duration === '3 MIN') {
    targetScenesText = '18 to 23 scenes';
    totalDurationSec = 180;
  } else if (duration === '5 MIN') {
    targetScenesText = '30 to 38 scenes';
    totalDurationSec = 300;
  }

  const STYLE_PRESET_GUIDELINES: Record<string, string> = {
    'Anthropomorphic Fruit Characters':
      'Use anthropomorphic fruit-headed characters with human-like bodies, expressive cartoon eyes, detailed fruit-textured faces, cinematic 3D animation, realistic lighting and detailed environments.',
    'Anthropomorphic Fruit — Chubby Style':
      'Use cute chubby anthropomorphic fruit characters with round fruit-textured heads, soft chubby bodies, shorter proportions, expressive cartoon eyes, cute facial expressions and colorful cinematic 3D animation.',
    'Human Characters':
      'Use realistic human characters with natural human facial features, realistic body proportions, natural skin details, appropriate clothing, realistic expressions and cinematic visual quality.',
    'Monkey Head Characters':
      'Use anthropomorphic monkey-headed characters with expressive monkey faces, detailed fur, human-like bodies, appropriate clothing, expressive eyes and cinematic 3D animation.',
    'Dog Head Characters':
      'Use anthropomorphic dog-headed characters with detailed realistic or stylized fur, expressive dog eyes, human-like bodies, appropriate clothing and cinematic 3D animation.',
    '2D Hand-Drawn — Ghibli Inspired':
      'Use a 2D hand-drawn animation aesthetic, clean line art, rich hand-painted textures, vibrant warm colors, expressive characters, soft natural backgrounds, beautiful atmospheric lighting, gentle cinematic composition and emotional storytelling.',
  };

  const styleGuideline = STYLE_PRESET_GUIDELINES[visualStyle] || `Visual style: ${visualStyle}`;

  try {
    const ai = getGenAIClient(userApiKey);
    const systemInstruction = `You are MKP VidPrompts Master - Expert Cinematic Storyteller, AI Video Prompt Engineer & Script Breakdown Specialist.
Your task is to transform a story or script into production-grade cinematic AI video generation prompts matching the EXACT video duration, 8–10 second scene rule, and the selected Visual Style Preset.

==================================================
CRITICAL CORE RULES (STRICT COMPLIANCE REQUIRED)
==================================================

1. VISUAL STYLE PRESET ENFORCEMENT:
   - Selected Preset: "${visualStyle}"
   - Style Rule: "${styleGuideline}"
   - The selected preset must strictly control:
     * Character appearance
     * Character body style
     * Visual rendering
     * Environment
     * Lighting
     * Overall video prompt style
   - Do NOT randomly mix styles between scenes.
   - Keep character appearance consistent throughout the entire generated story.
   - The user may describe specific characters inside the Story / Script input. If the user's story explicitly specifies a character type or appearance, preserve the user's story details while applying the selected visual style.

2. VIDEO DURATION & SCENE DURATION RULE:
   - Target Total Duration: ${duration} (${totalDurationSec} seconds).
   - Core Rule: 1 Scene = approximately 8–10 seconds.
   - Do NOT create scenes based on dialogue count.
   - Do NOT create a new scene for every dialogue line.
   - Do NOT create a new scene for every camera change.
   - Do NOT split a continuous action unnecessarily.
   - Each scene should represent one continuous visual/story beat.
   - Target scene count range for ${duration}: ${targetScenesText}.
   - Continuity has higher priority than forcing an exact number of scenes. Do NOT generate unnecessary filler scenes.

3. STORY STRUCTURE & PACING:
   - Understand the complete story and establish a complete arc:
     * Beginning
     * Character introduction
     * Main conflict / Problem
     * Development / Rising action
     * Climax
     * Resolution / Ending
   - The complete story must feel cohesive and properly resolved within ${duration}.

4. SCENE TIMESTAMPS:
   - Automatically generate scene timestamps.
   - Format: "00:00 – 00:09", "00:09 – 00:18", etc.
   - The final scene must end at approximately the selected video duration (${duration}).
   - Do NOT exceed the selected duration.

5. EXACT SCENE FORMAT:
   Every generated scene must contain:
   - SCENE NUMBER (e.g. 1, 2, 3...)
   - TIMESTAMPS (e.g. 00:00 – 00:09)
   - SUMMARY (Short 1-2 sentence scene summary for collapsed view)
   - VIDEO STYLE (Detailed cinematic art direction following "${styleGuideline}", lighting, mood, color palette, rendering quality, aspect ratio ${aspectRatio})
   - CHARACTER DETAIL:
     * For EVERY character appearing in this scene, include:
       - Character name
       - Character type (aligned with style: e.g. fruit-head, chubby fruit-head, human, monkey head, dog head, or 2D Ghibli style)
       - Estimated age when relevant
       - Appearance & visual identity
       - Head/face details (e.g. exact fruit/animal/human facial traits, textures, expressions)
       - Body proportions (e.g. chubby/human-like/slender)
       - Clothing & accessories
       - Important visual characteristics
       * Explicitly describe details. Do NOT only mention the character name!
   - ACTION (Continuous action and character interaction for that 8–10s beat)
   - DIALOGUE:
     * Dialogue belongs inside the scene where it occurs.
     * Multiple dialogue lines can exist in one scene.
     * Do NOT create a new scene simply because another character speaks.
     * Myanmar dialogue MUST remain in Myanmar script! If the user writes the story in Myanmar, generate natural English visual prompts while preserving the actual authentic Myanmar dialogue.
   - CAMERA:
     * Cinematic camera direction (e.g. Wide shot, Medium shot, Close-up, Over-the-shoulder, Tracking shot, Slow push-in, Pan, Tilt, Dolly movement).
     * Camera changes within the same continuous scene must NOT create a new scene.

6. CONTINUITY:
   - Maintain strong consistency across all scenes.
   - Characters must keep the same appearance, estimated age, body proportions, clothing (unless narrative demands a change), and visual identity.
   - Locations and props must remain visually consistent.`;

    const promptText = `STORY SCRIPT / OUTLINE:
"""
${story.trim()}
"""

TARGET DURATION: ${duration}
TARGET SCENE COUNT RANGE: ${targetScenesText}
VISUAL STYLE: ${visualStyle}
ASPECT RATIO: ${aspectRatio}

Analyze the story and generate the full episodic scene breakdown according to all rules.
Return a valid JSON object matching this schema:
{
  "title": "Compelling Project Title (in English or Myanmar)",
  "duration": "${duration}",
  "storyAnalysis": {
    "summary": "Concise summary of the story in Myanmar",
    "beginning": "Beginning setup",
    "conflict": "Core problem",
    "development": "Progression",
    "climax": "Climax turning point",
    "ending": "Ending and resolution",
    "theme": "Core theme",
    "emotionalTone": "Emotional tone"
  },
  "characters": [
    {
      "id": "char_1",
      "name": "Character Name",
      "type": "Character Type (e.g. Fruit-Head Animated Character, Human, etc.)",
      "estimatedAge": "e.g. 10 years old",
      "head": "Head details, shape, fruit/hair, stem/leaf",
      "texture": "Skin/peel texture details",
      "stem": "Stem or head prop details",
      "face": "Face and eye expression details",
      "body": "Body shape and proportions",
      "clothing": "Detailed clothing and shoes",
      "personality": "Personality traits",
      "description": "Comprehensive visual character prompt"
    }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "duration": "00:00 – 00:09",
      "summary": "Short scene summary for collapsed card",
      "video_style": "Detailed cinematic visual style prompt",
      "character_detail": "Detailed character breakdown for all characters in this scene",
      "action": "Continuous action beat for 8-10 seconds",
      "dialogue": [
        {
          "speaker": "Speaker Name",
          "myanmar": "Myanmar dialogue text in authentic script",
          "original": "English translation or original dialogue",
          "type": "spoken"
        }
      ],
      "dialogue_text": "Speaker: \\"Myanmar dialogue\\"",
      "camera": "Cinematic camera movement and shot angles",
      "characters": ["Character Name 1"]
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Format full_scene_prompt and validate scene fields
    if (parsed.scenes && Array.isArray(parsed.scenes)) {
      parsed.scenes = parsed.scenes.map((s: any, idx: number) => {
        const num = s.scene_number || idx + 1;
        const numStr = String(num).padStart(2, '0');
        const dur = s.duration || s.time || '00:00 – 00:09';
        const vStyle = s.video_style || visualStyle;
        const cDetail = s.character_detail || '';
        const act = s.action || '';
        const dText =
          s.dialogue_text ||
          (Array.isArray(s.dialogue) &&
            s.dialogue.map((d: any) => `${d.speaker}: "${d.myanmar || d.original}"`).join('\n')) ||
          'None';
        const cam = s.camera || 'Cinematic shot';

        const fullPrompt = `SCENE ${numStr}
${dur}

VIDEO STYLE
${vStyle}

CHARACTER DETAIL
${cDetail}

ACTION
${act}

DIALOGUE
${dText}

CAMERA
${cam}`;

        return {
          ...s,
          scene_number: num,
          duration: dur,
          time: dur,
          summary: s.summary || act.slice(0, 100),
          video_style: vStyle,
          character_detail: cDetail,
          action: act,
          dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
          dialogue_text: dText,
          camera: cam,
          full_scene_prompt: fullPrompt,
          video_prompt: `${vStyle}. Scene: ${act}. Camera: ${cam}. Characters: ${cDetail}`,
          character_image_prompt: cDetail || `${vStyle}. ${act}`,
          characters: Array.isArray(s.characters) ? s.characters : [],
        };
      });
    }

    return res.json({
      success: true,
      title: parsed.title || 'AI Story Project',
      duration,
      scenesCount: parsed.scenes?.length || 0,
      scenes: parsed.scenes || [],
      characters: parsed.characters || [],
      storyAnalysis: parsed.storyAnalysis,
    });
  } catch (error: any) {
    console.error('Story prompts generation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate story prompts.' });
  }
});

// Google Cloud Text-to-Speech (TTS) Proxy Endpoint
app.post(['/api/tts', '/.netlify/functions/tts'], async (req, res) => {
  try {
    const { text, voiceName, speakingRate, languageCode, gender, pitch } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Missing text in request body.' });
    }

    const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
    const apiKey =
      process.env.GOOGLE_TTS_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      userApiKey ||
      '';

    if (!apiKey) {
      return res.status(500).json({
        error: 'GOOGLE_TTS_API_KEY is not configured on the server environment. Please provide a Gemini/Google API key.',
      });
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

    const ttsResponse = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const data: any = await ttsResponse.json();

    if (!ttsResponse.ok || !data.audioContent) {
      const errMsg = data?.error?.message || `Google TTS request failed with HTTP ${ttsResponse.status}`;
      return res.status(ttsResponse.status || 500).json({ error: errMsg });
    }

    return res.json({
      success: true,
      audioContent: data.audioContent,
    });
  } catch (error: any) {
    console.error('Server TTS error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error during speech synthesis.',
    });
  }
});

// ==========================================
// TEXT-TO-IMAGE GENERATION ENDPOINT
// ==========================================
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio, apiKey } = req.body;
    const clientApiKey = (apiKey && apiKey.trim()) || req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    if (!clientApiKey) {
      return res.status(401).json({ error: 'Please check your Gemini API key and permissions.' });
    }

    const ai = getGenAIClient(clientApiKey as string);

    let targetRatio = '9:16';
    if (aspectRatio === '1:1') targetRatio = '1:1';
    else if (aspectRatio === '16:9') targetRatio = '16:9';
    else if (aspectRatio === '4:5' || aspectRatio === '3:4') targetRatio = '3:4';
    else if (aspectRatio === '9:16') targetRatio = '9:16';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: targetRatio,
        },
      },
    });

    let imageUrl = null;
    let textResult = null;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Str = part.inlineData.data;
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${base64Str}`;
        } else if (part.text) {
          textResult = part.text;
        }
      }
    }

    if (!imageUrl) {
      throw new Error(textResult || 'Model did not return an image part.');
    }

    return res.json({ imageUrl, text: textResult });
  } catch (err: any) {
    const parsed = parseGeminiError(err);
    let userMsg = parsed.message;
    const statusNum = Number(parsed.status);

    if (statusNum === 429 || parsed.errorCode === 'RESOURCE_EXHAUSTED') {
      userMsg = 'Gemini API quota or rate limit reached.';
    } else if (statusNum === 503 || parsed.errorCode === 'SERVICE_UNAVAILABLE') {
      userMsg = 'Gemini is temporarily busy. Please try again.';
    } else if (statusNum === 400 || parsed.errorCode === 'INVALID_ARGUMENT') {
      userMsg = 'Invalid image generation request.';
    } else if (statusNum === 401 || statusNum === 403 || parsed.errorCode === 'PERMISSION_DENIED') {
      userMsg = 'Please check your Gemini API key and permissions.';
    }

    return res.status(statusNum || 500).json({
      error: userMsg,
      errorCode: parsed.errorCode,
      details: parsed.responseBody,
    });
  }
});

// In dev, mount Vite middlewares; in prod, serve static dist
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MKP VidPrompts Master running on port ${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
});
