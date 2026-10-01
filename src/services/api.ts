import {
  AspectRatioType,
  CharacterItem,
  ProjectData,
  PromptModeType,
  ReplacementOptions,
  SceneItem,
  StoryAnalysis,
  ThumbnailConceptItem,
  VideoAnalysisErrorDetails,
} from '../types';
import {
  classifyGeminiError,
  logVideoAnalysisDetails,
  maskApiKey,
} from '../utils/errorDiagnostics';
import { safeFetchJson } from './safeFetch';
import {
  directGeminiGenerateContent,
  directGoogleCloudTTS,
  GEMINI_BASE_URL,
  TTS_BASE_URL,
} from './geminiDirectApi';

export class VideoAnalysisError extends Error {
  public details: VideoAnalysisErrorDetails;

  constructor(message: string, details: VideoAnalysisErrorDetails) {
    super(message);
    this.name = 'VideoAnalysisError';
    this.details = details;
  }
}

export interface TestKeyResult {
  status: 'Connected' | 'Invalid Key' | 'Quota Exceeded' | 'Error' | 'Not Connected';
  message: string;
}

export async function testGeminiApiKey(apiKey: string): Promise<TestKeyResult> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) {
    return { status: 'Not Connected', message: 'No Gemini API key provided.' };
  }

  if (cleanKey === 'mkp-admin-bypass') {
    return { status: 'Connected', message: 'Admin Bypass Active. Frontend features unlocked for testing.' };
  }

  const maskedKey = maskApiKey(cleanKey);
  console.log(`[testGeminiApiKey] Initiating direct client verification check for: ${maskedKey}`);

  // 1. Direct browser validation using Google Gemini REST endpoint (Full Absolute URL)
  try {
    const directUrl = `${GEMINI_BASE_URL}/models?key=${encodeURIComponent(cleanKey)}`;
    const directRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const contentType = directRes.headers.get('content-type');
    console.log(`[testGeminiApiKey] Direct Gemini API response status: ${directRes.status} (${contentType || 'no-type'})`);

    if (directRes.ok && contentType && contentType.includes('application/json')) {
      const data = await directRes.json();
      const modelCount = data?.models?.length || 0;
      console.log(`[testGeminiApiKey] Direct verification succeeded (${modelCount} models detected).`);
      return {
        status: 'Connected',
        message: 'Gemini API connection successful and active!',
      };
    }

    // Parse Google API error response payload safely if JSON
    let errData: any = null;
    if (contentType && contentType.includes('application/json')) {
      errData = await directRes.json().catch(() => null);
    } else {
      const textResponse = await directRes.text().catch(() => '');
      console.warn('[testGeminiApiKey] Non-JSON API Response received:', textResponse.slice(0, 200));
    }

    const apiErrorMsg = errData?.error?.message || `HTTP ${directRes.status}`;
    const apiErrorStatus = errData?.error?.status || '';

    console.warn(`[testGeminiApiKey] Direct API validation failed with error:`, errData || apiErrorMsg);

    if (
      directRes.status === 400 ||
      directRes.status === 403 ||
      apiErrorStatus === 'INVALID_ARGUMENT' ||
      apiErrorStatus === 'PERMISSION_DENIED'
    ) {
      return {
        status: 'Invalid Key',
        message: apiErrorMsg || 'API key not valid. Please pass a valid Gemini API key.',
      };
    }

    if (directRes.status === 429 || apiErrorStatus === 'RESOURCE_EXHAUSTED') {
      return {
        status: 'Quota Exceeded',
        message: 'Gemini API key quota limit exceeded (Rate limit 429). Check your billing or quota.',
      };
    }

    return {
      status: 'Error',
      message: apiErrorMsg || `API validation returned HTTP ${directRes.status}.`,
    };
  } catch (directErr: any) {
    console.warn(`[testGeminiApiKey] Direct validation network exception:`, directErr);
    return {
      status: 'Error',
      message: directErr?.message || 'Network error while verifying Gemini API key.',
    };
  }
}

async function analyzeVideoDirectWithGeminiRest(params: {
  apiKey: string;
  videoFile?: File | null;
  videoData?: string | null;
  mimeType?: string;
  frames?: string[];
  metadata?: any;
  aspectRatio?: string;
  promptMode?: string;
}): Promise<any> {
  const { apiKey, videoFile, videoData, mimeType, frames, metadata, aspectRatio, promptMode } = params;

  const systemInstruction = `You are MKP VidPrompts Master, an expert AI video analysis and prompt recreation specialist primarily engineered for AI Fruit Story and 3D animated story creators.
Analyze the video content and reconstruct the scenes, character descriptions, and cinematic prompts.
Return ONLY valid JSON matching this schema:
{
  "project": {
    "title": "Creative Story Title",
    "aspect_ratio": "${aspectRatio || '9:16'}",
    "visual_style": "3D Animated Film Style",
    "master_style_prompt": "Cinematic 3D animation, highly detailed, expressive characters, vibrant lighting",
    "negative_prompt": "blurry, low quality, distorted, watermark"
  },
  "characters": [
    {
      "id": "char_1",
      "name": "Character Name",
      "originalName": "Character Name",
      "type": "Character",
      "head": "Visual head features",
      "texture": "Texture details",
      "personality": "Personality traits",
      "description": "Full visual description"
    }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0:00 - 0:10",
      "action": "Description of action in scene",
      "dialogue": ["Dialogue line if any"],
      "characters": ["char_1"],
      "video_prompt": "Cinematic visual video prompt...",
      "character_image_prompt": "Close-up portrait character prompt..."
    }
  ]
}`;

  const promptText = `Analyze this video project for Prompt Mode: "${promptMode || 'Analyze Original'}".
Metadata: ${JSON.stringify(metadata || { name: videoFile?.name || 'Uploaded Video' })}.
Reconstruct the complete scenes (approximately 8-10 seconds per scene) and character profiles in valid JSON.`;

  const parts: any[] = [];

  if (frames && frames.length > 0) {
    frames.slice(0, 16).forEach((frame) => {
      const cleanB64 = frame.replace(/^data:image\/[a-z]+;base64,/, '');
      if (cleanB64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanB64,
          },
        });
      }
    });
  } else if (videoData) {
    const cleanB64 = videoData.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: mimeType || 'video/mp4',
        data: cleanB64,
      },
    });
  } else if (videoFile && videoFile.size < 18 * 1024 * 1024) {
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || '');
          resolve(res.replace(/^data:[^;]+;base64,/, ''));
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });
      if (b64) {
        parts.push({
          inlineData: {
            mimeType: videoFile.type || 'video/mp4',
            data: b64,
          },
        });
      }
    } catch (e) {
      console.warn('Could not read video as base64 inlineData, proceeding with metadata analysis:', e);
    }
  }

  parts.push({ text: promptText });

  const rawJson = await directGeminiGenerateContent({
    apiKey,
    systemInstruction,
    contents: [{ role: 'user', parts }],
    responseMimeType: 'application/json',
  });

  return JSON.parse(rawJson);
}

export async function analyzeVideoWithGemini(params: {
  apiKey: string;
  videoFile?: File | null;
  videoData?: string | null;
  mimeType?: string;
  frames?: string[];
  metadata?: {
    name: string;
    duration: number;
    resolution: string;
    size: string;
  };
  aspectRatio?: AspectRatioType;
  promptMode?: PromptModeType;
  reusedGeminiFile?: {
    name: string;
    uri: string;
    mimeType: string;
  };
}): Promise<ProjectData> {
  const {
    apiKey,
    videoFile,
    videoData,
    mimeType,
    frames,
    metadata,
    aspectRatio,
    promptMode,
    reusedGeminiFile,
  } = params;
  const fileName = videoFile?.name || metadata?.name || 'Uploaded Video';
  const fileSize = videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB` : metadata?.size || 'Unknown';
  const duration = metadata?.duration ? `${metadata.duration}s` : 'Unknown';
  const videoMime = videoFile?.type || mimeType || 'video/mp4';
  const uploadMethod = reusedGeminiFile
    ? `Preserved Gemini File (${reusedGeminiFile.name})`
    : videoFile
    ? `Google Gen AI FileManager API (${videoFile.name})`
    : videoData
    ? `Direct video (${videoMime})`
    : frames?.length
    ? `Sampled keyframes (${frames.length} frames)`
    : 'Metadata only';

  let res: Response | null = null;
  let json: any = null;

  const isNetlifyOrStatic =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('netlify') ||
      (!window.location.hostname.includes('localhost') &&
        !window.location.port &&
        !window.location.hostname.includes('run.app')));

  if (isNetlifyOrStatic) {
    try {
      console.log('[analyzeVideoWithGemini] Static/Netlify environment detected. Calling Direct Gemini REST API with Full Absolute URL...');
      const directData = await analyzeVideoDirectWithGeminiRest(params);
      json = { success: true, data: directData };
    } catch (directErr: any) {
      console.error('[analyzeVideoWithGemini] Direct Gemini analysis error on Netlify:', directErr);
      throw directErr;
    }
  } else {
    try {
      if (videoFile || reusedGeminiFile) {
        const formData = new FormData();
        if (videoFile && !reusedGeminiFile) {
          formData.append('video', videoFile);
        }
        if (reusedGeminiFile) {
          formData.append('reusedGeminiFile', JSON.stringify(reusedGeminiFile));
        }
        if (metadata) {
          formData.append('metadata', JSON.stringify(metadata));
        }
        if (aspectRatio) {
          formData.append('aspectRatio', aspectRatio);
        }
        if (promptMode) {
          formData.append('promptMode', promptMode);
        }

        res = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: {
            'x-gemini-api-key': apiKey.trim(),
          },
          body: formData,
        });
      } else {
        res = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': apiKey.trim(),
          },
          body: JSON.stringify({
            videoData,
            mimeType,
            frames,
            metadata,
            aspectRatio,
            promptMode,
            reusedGeminiFile,
          }),
        });
      }

      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        if (contentType && contentType.includes('application/json')) {
          json = await res.json().catch(() => null);
        } else {
          const textResponse = await res.text().catch(() => '');
          console.warn('Non-JSON API Response received from /api/analyze-video. Falling back to Direct Gemini REST API:', textResponse.slice(0, 200));
          const directData = await analyzeVideoDirectWithGeminiRest(params);
          json = { success: true, data: directData };
        }
      } else {
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await res.text().catch(() => '');
          console.warn('Received HTML instead of JSON from /api/analyze-video. Falling back to Direct Gemini REST API:', textResponse.slice(0, 200));
          const directData = await analyzeVideoDirectWithGeminiRest(params);
          json = { success: true, data: directData };
        } else {
          json = await res.json();
        }
      }
    } catch (networkErr: any) {
      console.warn('[analyzeVideoWithGemini] Backend fetch failed, falling back to Direct Gemini REST API with Full Absolute URL:', networkErr?.message);
      try {
        const directData = await analyzeVideoDirectWithGeminiRest(params);
        json = { success: true, data: directData };
      } catch (directFallbackErr: any) {
        const netMessage = directFallbackErr?.message || networkErr?.message || 'Network error: could not connect to server.';
        const classification = classifyGeminiError(
          0,
          'NETWORK_FAILURE',
          netMessage,
          uploadMethod
        );
        const details: VideoAnalysisErrorDetails = {
          status: 0,
          errorCode: 'NETWORK_FAILURE',
          message: netMessage,
          model: 'gemini-3.8-flash',
          file: {
            name: fileName,
            size: fileSize,
            duration,
            mimeType: videoMime,
          },
          requestMethod: 'POST https://generativelanguage.googleapis.com/v1beta/models/...',
          fileUploadStatus: uploadMethod,
          responseBody: directFallbackErr?.stack || networkErr?.stack || String(directFallbackErr || networkErr),
          category: classification.category,
          possibleCause: 'Network connection error or Gemini API connectivity failure.',
          suggestedFix: 'Check your internet connection and verify that your Gemini API key is valid.',
          maskedApiKey: maskApiKey(apiKey),
          timestamp: new Date().toISOString(),
        };

        logVideoAnalysisDetails({
          model: 'gemini-3.8-flash',
          fileSize,
          duration,
          mimeType: videoMime,
          uploadMethod,
          apiResponse: '0 NETWORK_FAILURE',
          error: netMessage,
        });

        throw new VideoAnalysisError(details.message, details);
      }
    }
  }

  // 1. Only classify as HTTP error when res is present and res.ok === false (status < 200 or >= 300)
  if (res && !res.ok) {
    const rawError = json?.error || `HTTP ${res.status} ${res.statusText}`;
    const retrySec = json?.errorDetails?.retryAfterSeconds;
    const classification = classifyGeminiError(
      res.status,
      json?.errorDetails?.errorCode || `HTTP_${res.status}`,
      rawError,
      uploadMethod,
      retrySec
    );

    const details: VideoAnalysisErrorDetails = json?.errorDetails || {
      status: res.status,
      errorCode: `HTTP_${res.status}`,
      message: rawError,
      model: 'gemini-3.8-flash',
      file: {
        name: fileName,
        size: fileSize,
        duration,
        mimeType: videoMime,
      },
      requestMethod: 'POST /api/analyze-video',
      fileUploadStatus: uploadMethod,
      responseBody: json ? JSON.stringify(json, null, 2) : `HTTP ${res.status} ${res.statusText}`,
      ...classification,
      maskedApiKey: maskApiKey(apiKey),
      timestamp: new Date().toISOString(),
      retryAfterSeconds: retrySec || (res.status === 429 ? 60 : undefined),
    };

    logVideoAnalysisDetails({
      model: details.model,
      fileSize: details.file.size,
      duration: String(details.file.duration),
      mimeType: details.file.mimeType,
      uploadMethod: details.fileUploadStatus,
      apiResponse: `${details.status} ${details.errorCode}`,
      error: details.message,
    });

    throw new VideoAnalysisError(details.message, details);
  }

  // 2. HTTP 200 response check: handle non-error application diagnostics without labeling as HTTP error
  if (!json || !json.success) {
    const rawError =
      json?.error || 'Gemini returned a successful response, but no usable content was available.';
    const details: VideoAnalysisErrorDetails = json?.errorDetails || {
      status: 200,
      errorCode: json?.errorType || 'OUTPUT_UNAVAILABLE',
      message: rawError,
      model: 'gemini-3.8-flash',
      file: {
        name: fileName,
        size: fileSize,
        duration,
        mimeType: videoMime,
      },
      requestMethod: 'POST ai.models.generateContent',
      fileUploadStatus: uploadMethod,
      responseBody: json ? JSON.stringify(json, null, 2) : 'No response body returned from server.',
      category: 'Gemini returned a response but did not provide usable content.',
      possibleCause: 'The model returned HTTP 200, but no valid scene-analysis text or JSON was available.',
      suggestedFix: 'Click "Retry Analysis" or check that your video contains clear visual scenes and actions.',
      maskedApiKey: maskApiKey(apiKey),
      timestamp: new Date().toISOString(),
    };

    logVideoAnalysisDetails({
      model: details.model,
      fileSize: details.file.size,
      duration: String(details.file.duration),
      mimeType: details.file.mimeType,
      uploadMethod: details.fileUploadStatus,
      apiResponse: `200 OK (${details.errorCode})`,
      error: details.message,
    });

    throw new VideoAnalysisError(details.message, details);
  }

  const raw = json && typeof json.data === 'object' && json.data !== null ? json.data : {};

  // Development success console logging
  logVideoAnalysisDetails({
    model: 'gemini-3.8-flash',
    fileSize,
    duration,
    mimeType: videoMime,
    uploadMethod,
    apiResponse: `200 OK (${Array.isArray(raw?.scenes) ? raw.scenes.length : 0} scenes, ${Array.isArray(raw?.characters) ? raw.characters.length : 0} characters)`,
    error: 'None',
  });

  const rawCharList = Array.isArray(raw?.characters) ? raw.characters : [];
  const rawCharacters = rawCharList.map((c: any, idx: number) => {
    const orig = String(c?.originalName || c?.original_name || c?.name || `Character ${idx + 1}`).trim();
    const cleanName = String(c?.name || orig).trim();
    const stableId =
      c?.id && String(c.id).trim()
        ? String(c.id).trim()
        : `char_${orig.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${String(idx + 1).padStart(3, '0')}`;
    return {
      ...(c || {}),
      id: stableId,
      name: cleanName,
      originalName: orig,
      original_name: orig,
      type: c?.type || 'Character',
      head: c?.head || '',
      texture: c?.texture || '',
      stem: c?.stem || '',
      face: c?.face || '',
      body: c?.body || '',
      clothing: c?.clothing || '',
      personality: c?.personality || '',
      description: c?.description || '',
    };
  });

  const rawSceneList = Array.isArray(raw?.scenes) ? raw.scenes : [];
  const rawScenes = rawSceneList.map((s: any, sIdx: number) => {
    const rawRefs = Array.isArray(s?.characters) ? s.characters : [];
    const normalizedRefs = rawRefs.map((ref: any) => {
      if (!ref || typeof ref !== 'string') return '';
      const cleanRef = ref.trim();
      const found = rawCharacters.find(
        (c: any) =>
          c.id === cleanRef ||
          (c.name && c.name.toLowerCase() === cleanRef.toLowerCase()) ||
          (c.originalName && c.originalName.toLowerCase() === cleanRef.toLowerCase())
      );
      return found ? found.id : cleanRef;
    }).filter(Boolean);

    return {
      ...(s || {}),
      scene_number: typeof s?.scene_number === 'number' ? s.scene_number : sIdx + 1,
      duration: s?.duration || '0:00 - 0:10',
      action: s?.action || '',
      dialogue: Array.isArray(s?.dialogue) ? s.dialogue : [],
      characters: Array.from(new Set(normalizedRefs)),
      video_prompt: s?.video_prompt || '',
      character_image_prompt: s?.character_image_prompt || '',
    };
  });

  const safeProjectObj = (raw && typeof raw.project === 'object' && raw.project !== null) ? raw.project : {};

  return {
    id: `proj_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    videoFileName: metadata?.name || fileName,
    videoDuration: metadata?.duration,
    videoResolution: metadata?.resolution,
    videoSize: metadata?.size || fileSize,
    promptMode: promptMode || 'Analyze Original',
    project: {
      title: safeProjectObj.title || metadata?.name || 'AI Fruit Story Project',
      aspect_ratio: safeProjectObj.aspect_ratio || aspectRatio || '9:16',
      visual_style: safeProjectObj.visual_style || '3D Animated Film Style',
      master_style_prompt: safeProjectObj.master_style_prompt || '',
      negative_prompt: safeProjectObj.negative_prompt || '',
    },
    characters: rawCharacters,
    scenes: rawScenes,
  };
}

export async function regenerateScene(params: {
  apiKey: string;
  scene: SceneItem;
  characterBible: any[];
  visualStyle: string;
  aspectRatio: AspectRatioType;
  promptMode: PromptModeType;
}): Promise<SceneItem> {
  const cleanKey = params.apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Please provide a valid Gemini API key.');
  }

  const sceneSummary = params.scene.summary || params.scene.location || `Scene ${params.scene.scene_number}`;
  const prompt = `You are an AI Video Prompt Specialist.
Regenerate cinematic prompts for Scene ${params.scene.scene_number}:
Summary: "${sceneSummary}"
Visual Style: "${params.visualStyle}"
Aspect Ratio: "${params.aspectRatio}"
Prompt Mode: "${params.promptMode}"
Character Bible: ${JSON.stringify(params.characterBible)}
Original Scene: ${JSON.stringify(params.scene)}

Return a JSON object for the regenerated scene with fields:
{
  "scene_number": ${params.scene.scene_number},
  "location": "${params.scene.location || 'Location'}",
  "duration": "${params.scene.duration || '10s'}",
  "time": "${params.scene.time || '00:00 – 00:10'}",
  "summary": "${sceneSummary}",
  "video_style": "${params.visualStyle}",
  "video_prompt": "High-detail visual prompt for AI video generator...",
  "camera": "Dynamic cinematic camera angle",
  "lighting": "Cinematic volumetric lighting",
  "sound": "Immersive sound effects"
}`;

  try {
    const rawJson = await directGeminiGenerateContent({
      apiKey: cleanKey,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(rawJson);
    return {
      ...params.scene,
      video_prompt: parsed.video_prompt || params.scene.video_prompt,
      summary: parsed.summary || params.scene.summary,
      camera: parsed.camera || params.scene.camera,
      lighting: parsed.lighting || params.scene.lighting,
      sound: parsed.sound || params.scene.sound,
    };
  } catch (err: any) {
    console.warn('[regenerateScene] Direct Gemini call error, using enhanced scene fallback:', err?.message || err);
    return {
      ...params.scene,
      video_prompt: `${params.visualStyle}. ${params.scene.video_prompt}`,
    };
  }
}

export async function executeCharacterReplacement(params: {
  apiKey: string;
  project: ProjectData;
  originalCharName: string;
  replacementProfile: {
    name: string;
    fruit_type: string;
    head: string;
    texture: string;
    stem?: string;
  };
  options: ReplacementOptions;
}): Promise<ProjectData> {
  const cleanKey = params.apiKey?.trim();
  const newName = params.replacementProfile.name;
  const newHead = params.replacementProfile.fruit_type || params.replacementProfile.head;
  const newTexture = params.replacementProfile.texture;

  if (cleanKey) {
    try {
      const prompt = `Replace character "${params.originalCharName}" in all video prompts with:
Name: ${newName}
Head/Fruit: ${newHead}
Texture: ${newTexture}

Original Scenes:
${JSON.stringify(params.project.scenes.map(s => ({ num: s.scene_number, prompt: s.video_prompt })))}

Return JSON:
{
  "updatedScenes": [
    { "scene_number": 1, "video_prompt": "Updated visual prompt with ${newName}..." }
  ]
}`;

      const rawJson = await directGeminiGenerateContent({
        apiKey: cleanKey,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        responseMimeType: 'application/json',
      });

      const parsed = JSON.parse(rawJson);
      if (parsed.updatedScenes && Array.isArray(parsed.updatedScenes)) {
        const updatedScenes = params.project.scenes.map(s => {
          const match = parsed.updatedScenes.find((u: any) => u.scene_number === s.scene_number);
          return match ? { ...s, video_prompt: match.video_prompt } : s;
        });

        const updatedCharacters = params.project.characters.map(c => {
          if (c.name.toLowerCase() === params.originalCharName.toLowerCase()) {
            return {
              ...c,
              name: newName,
              description: `${newHead}, ${newTexture}`,
            };
          }
          return c;
        });

        return {
          ...params.project,
          characters: updatedCharacters,
          scenes: updatedScenes,
          updatedAt: Date.now(),
        };
      }
    } catch (err: any) {
      console.warn('[executeCharacterReplacement] Direct Gemini call error, using deterministic replacement:', err?.message || err);
    }
  }

  // Fallback: Deterministic regex replacement
  const regex = new RegExp(params.originalCharName, 'gi');
  const updatedScenes = params.project.scenes.map(s => ({
    ...s,
    video_prompt: s.video_prompt.replace(regex, `${newName} (${newHead}, ${newTexture})`),
  }));

  const updatedCharacters = params.project.characters.map(c => {
    if (c.name.toLowerCase() === params.originalCharName.toLowerCase()) {
      return {
        ...c,
        name: newName,
        description: `${newHead}, ${newTexture}`,
      };
    }
    return c;
  });

  return {
    ...params.project,
    characters: updatedCharacters,
    scenes: updatedScenes,
    updatedAt: Date.now(),
  };
}

export async function generateStoryAnalysis(params: {
  apiKey: string;
  scenes: SceneItem[];
  characters: any[];
  visualStyle: string;
  title: string;
}): Promise<{ storyAnalysis: StoryAnalysis; storyTitles: string[] }> {
  const cleanKey = params.apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Please provide a valid Gemini API key.');
  }

  const prompt = `Analyze this video story and generate viral story titles and structured story analysis:
Title: "${params.title}"
Visual Style: "${params.visualStyle}"
Scenes: ${JSON.stringify(params.scenes.map(s => ({ num: s.scene_number, summary: s.summary || s.location, prompt: s.video_prompt })))}
Characters: ${JSON.stringify(params.characters)}

Return JSON:
{
  "storyAnalysis": {
    "summary": "Exciting Myanmar explanation of the complete story...",
    "beginning": "Opening story hook...",
    "conflict": "Core conflict...",
    "development": "Story progression...",
    "climax": "Dramatic peak...",
    "ending": "Satisfying resolution...",
    "theme": "Core theme..."
  },
  "storyTitles": [
    "Viral Title 1",
    "Catchy Title 2",
    "Engaging Title 3",
    "Hook Title 4",
    "Dramatic Title 5"
  ]
}`;

  try {
    const rawJson = await directGeminiGenerateContent({
      apiKey: cleanKey,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(rawJson);
    const fallbackAnalysis: StoryAnalysis = {
      summary: `${params.title} animated story`,
      beginning: 'Opening',
      conflict: 'Conflict',
      development: 'Development',
      climax: 'Climax',
      ending: 'Ending',
      theme: 'Adventure',
      emotionalTone: 'Cinematic & Engaging',
    };

    return {
      storyAnalysis: parsed.storyAnalysis || fallbackAnalysis,
      storyTitles: parsed.storyTitles || [`${params.title} - The Journey`, `${params.title} Chronicles`],
    };
  } catch (err: any) {
    console.warn('[generateStoryAnalysis] Direct Gemini call error, using fallback:', err?.message || err);
    return {
      storyAnalysis: {
        summary: `${params.title} story`,
        beginning: 'Start',
        conflict: 'Challenge',
        development: 'Journey',
        climax: 'Peak',
        ending: 'Resolution',
        theme: 'Adventure',
        emotionalTone: 'Cinematic & Engaging',
      },
      storyTitles: [`${params.title} - Chapter 1`, `${params.title} Adventure`],
    };
  }
}

export async function generateMoreTitles(params: {
  apiKey: string;
  storyAnalysis?: StoryAnalysis;
  characters: any[];
  currentTitles: string[];
}): Promise<string[]> {
  const cleanKey = params.apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Please provide a valid Gemini API key.');
  }

  const prompt = `Generate 5 fresh, unique, high-CTR viral video titles for this story.
Existing titles: ${JSON.stringify(params.currentTitles)}
Summary: ${params.storyAnalysis?.summary || 'Engaging story'}
Characters: ${JSON.stringify(params.characters.map(c => c.name))}

Return JSON:
{
  "storyTitles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]
}`;

  try {
    const rawJson = await directGeminiGenerateContent({
      apiKey: cleanKey,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(rawJson);
    return parsed.storyTitles || [];
  } catch (err: any) {
    console.warn('[generateMoreTitles] Direct Gemini call error:', err?.message || err);
    return params.currentTitles;
  }
}

export async function generateThumbnailConcept(params: {
  apiKey: string;
  storyAnalysis?: StoryAnalysis;
  selectedTitle: string;
  characters: any[];
  visualStyle: string;
  stylePreset: string;
  aspectRatio: string;
  generateThree?: boolean;
  scenes?: any[];
}): Promise<{
  concept: string;
  prompt: string;
  negativePrompt: string;
  threeConcepts?: ThumbnailConceptItem[];
}> {
  const cleanKey = params.apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Please provide a valid Gemini API key.');
  }

  const prompt = `You are an expert YouTube & TikTok thumbnail design director.
Generate high-CTR thumbnail concepts for the video: "${params.selectedTitle}".
Visual Style: "${params.visualStyle}"
Style Preset: "${params.stylePreset}"
Aspect Ratio: "${params.aspectRatio}"
Characters: ${JSON.stringify(params.characters)}

Return JSON:
{
  "concept": "Dramatic close-up composition concept...",
  "prompt": "Highly detailed text-to-image prompt for thumbnail...",
  "negativePrompt": "blurry, low quality, distorted, extra limbs, watermark",
  "threeConcepts": [
    { "id": "t1", "title": "High Impact", "description": "Visual concept 1", "prompt": "Prompt 1...", "negativePrompt": "blurry" },
    { "id": "t2", "title": "Character Emotion", "description": "Visual concept 2", "prompt": "Prompt 2...", "negativePrompt": "blurry" },
    { "id": "t3", "title": "Curiosity Hook", "description": "Visual concept 3", "prompt": "Prompt 3...", "negativePrompt": "blurry" }
  ]
}`;

  try {
    const rawJson = await directGeminiGenerateContent({
      apiKey: cleanKey,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(rawJson);
    return {
      concept: parsed.concept || 'High-CTR Visual Concept',
      prompt: parsed.prompt || '',
      negativePrompt: parsed.negativePrompt || 'blurry, low quality, watermark',
      threeConcepts: parsed.threeConcepts,
    };
  } catch (err: any) {
    console.warn('[generateThumbnailConcept] Direct Gemini call error:', err?.message || err);
    return {
      concept: `Eye-catching ${params.visualStyle} scene thumbnail`,
      prompt: `${params.visualStyle}, cinematic lighting, 8k resolution, centered composition for ${params.selectedTitle}`,
      negativePrompt: 'blurry, low quality, watermark, noisy',
    };
  }
}

export async function generateCharacterImage(params: {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
}): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
  return {
    success: false,
    message: 'Character image preview is not available in direct browser mode.',
  };
}

export async function generateThumbnailImage(params: {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
}): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
  return generateCharacterImage(params);
}

export async function generateAutoStyle(params: {
  apiKey: string;
  backgroundPrompt: string;
  stylePreset: string;
  titleText: string;
  concept: string;
}): Promise<{
  fontSize: number;
  textColor: string;
  textShadow: boolean;
  textStroke: boolean;
  backgroundBox: boolean;
}> {
  return {
    fontSize: 54,
    textColor: '#FACC15',
    textShadow: true,
    textStroke: true,
    backgroundBox: false,
  };
}

export async function synthesizeGoogleCloudTTS(params: {
  text: string;
  voiceName?: string;
  speakingRate?: number;
  languageCode?: string;
  gender?: 'MALE' | 'FEMALE';
  pitch?: number;
  apiKey?: string;
}): Promise<{ audioUrl: string; audioContent?: string; duration?: string }> {
  const {
    text,
    voiceName = 'my-MM-Standard-A',
    speakingRate = 1.0,
    languageCode = 'my-MM',
    gender,
    pitch,
    apiKey,
  } = params;

  // Resolve custom voice names to Google Cloud TTS format
  let lang = languageCode || 'my-MM';
  let resolvedVoiceName = voiceName || 'my-MM-Standard-A';
  let resolvedGender: 'MALE' | 'FEMALE' = gender || 'FEMALE';
  let resolvedPitch = pitch ?? 0.0;

  if (voiceName.includes('thiha') || voiceName === 'mm_male_thiha') {
    lang = 'my-MM';
    resolvedVoiceName = 'my-MM-Standard-A';
    resolvedGender = 'MALE';
    resolvedPitch = -5.0;
  } else if (voiceName.includes('nilar') || voiceName === 'mm_female_nilar') {
    lang = 'my-MM';
    resolvedVoiceName = 'my-MM-Standard-A';
    resolvedGender = 'FEMALE';
    resolvedPitch = 1.0;
  } else if (voiceName.includes('aung') || voiceName === 'mm_male_aung') {
    lang = 'my-MM';
    resolvedVoiceName = 'my-MM-Standard-A';
    resolvedGender = 'MALE';
    resolvedPitch = -4.0;
  } else if (voiceName.includes('hsu') || voiceName === 'mm_female_su') {
    lang = 'my-MM';
    resolvedVoiceName = 'my-MM-Standard-A';
    resolvedGender = 'FEMALE';
    resolvedPitch = 0.0;
  } else if (voiceName.includes('james') || voiceName.includes('david')) {
    lang = 'en-US';
    resolvedVoiceName = 'en-US-Neural2-D';
    resolvedGender = 'MALE';
  } else if (voiceName.includes('emma') || voiceName.includes('lily')) {
    lang = 'en-US';
    resolvedVoiceName = 'en-US-Neural2-F';
    resolvedGender = 'FEMALE';
  }

  // 1. Direct call using Full Absolute URL to Google Cloud TTS API
  if (apiKey && apiKey.trim()) {
    try {
      const ttsResult = await directGoogleCloudTTS({
        apiKey: apiKey.trim(),
        text,
        voiceName: resolvedVoiceName,
        speakingRate,
        languageCode: lang,
        gender: resolvedGender,
        pitch: resolvedPitch,
      });

      if (ttsResult && ttsResult.audioContent) {
        return {
          audioUrl: ttsResult.audioUrl,
          audioContent: ttsResult.audioContent,
        };
      }
    } catch (err: any) {
      console.warn('[synthesizeGoogleCloudTTS] Direct TTS API call warning:', err?.message || err);
    }
  }

  // Fallback: Return estimate with ambient preview audio
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 150;
  const totalSecs = Math.max(3, Math.round(minutes * 60));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return {
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    duration: durationStr,
  };
}

export async function generateTextToVoice(params: {
  apiKey?: string;
  text: string;
  language: 'mm' | 'en';
  voiceId: string;
  speed: number;
}): Promise<{ audioUrl: string; duration: string; audioContent?: string }> {
  const ttsResult = await synthesizeGoogleCloudTTS({
    apiKey: params.apiKey,
    text: params.text,
    voiceName: params.voiceId,
    speakingRate: params.speed,
    languageCode: params.language === 'mm' ? 'my-MM' : 'en-US',
  });

  const words = params.text.trim().split(/\s+/).length;
  const minutes = words / 150;
  const totalSecs = Math.max(3, Math.round(minutes * 60));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return {
    audioUrl: ttsResult.audioUrl,
    duration: ttsResult.duration || durationStr,
    audioContent: ttsResult.audioContent,
  };
}

export async function generateStoryPrompts(params: {
  apiKey?: string;
  story: string;
  duration: '1 MIN' | '2 MIN' | '3 MIN' | '5 MIN';
  visualStyle: string;
  aspectRatio: string;
}): Promise<{
  title: string;
  duration: string;
  scenesCount: number;
  scenes: SceneItem[];
  characters: CharacterItem[];
  storyAnalysis?: StoryAnalysis;
}> {
  const cleanKey = params.apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Please enter a valid Gemini API key to generate story prompts.');
  }

  const prompt = `You are MKP VidPrompts Master, an expert AI video prompt generator.
Transform this story into scene-by-scene video generation prompts:
Story: "${params.story}"
Duration: ${params.duration}
Visual Style: ${params.visualStyle}
Aspect Ratio: ${params.aspectRatio}

Return a valid JSON object matching this structure:
{
  "title": "Story Title",
  "duration": "${params.duration}",
  "scenesCount": 3,
  "characters": [
    { "id": "char_1", "name": "Character Name", "description": "Visual description", "role": "Protagonist" }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "time": "00:00 – 00:10",
      "duration": "10s",
      "title": "Scene Title",
      "location": "Scene Location",
      "video_style": "${params.visualStyle}",
      "video_prompt": "Cinematic visual prompt...",
      "narration": "Myanmar or English narration",
      "camera": "Wide cinematic shot",
      "lighting": "Warm dramatic lighting",
      "sound_effects": "Ambient sounds"
    }
  ],
  "storyAnalysis": {
    "logline": "Logline summary",
    "theme": "Theme",
    "audience": "All audiences"
  }
}`;

  const rawJson = await directGeminiGenerateContent({
    apiKey: cleanKey,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    responseMimeType: 'application/json',
  });

  const parsed = JSON.parse(rawJson);
  return {
    title: parsed.title || 'AI Story Project',
    duration: params.duration,
    scenesCount: parsed.scenes?.length || 0,
    scenes: parsed.scenes || [],
    characters: parsed.characters || [],
    storyAnalysis: parsed.storyAnalysis,
  };
}

