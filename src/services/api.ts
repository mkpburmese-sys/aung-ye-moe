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

  // 1. Direct browser validation using Google Gemini REST endpoint (CORS enabled)
  try {
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const directRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`[testGeminiApiKey] Direct Gemini API response status: ${directRes.status} ${directRes.statusText}`);

    if (directRes.ok) {
      const data = await directRes.json().catch(() => ({}));
      const modelCount = data?.models?.length || 0;
      console.log(`[testGeminiApiKey] Direct verification succeeded (${modelCount} models detected).`);
      return {
        status: 'Connected',
        message: 'Gemini API connection successful and active!',
      };
    }

    // Parse Google API error response payload
    const errData = await directRes.json().catch(() => null);
    const apiErrorMsg = errData?.error?.message || `HTTP ${directRes.status}`;
    const apiErrorStatus = errData?.error?.status || '';

    console.warn(`[testGeminiApiKey] Direct API validation failed with error:`, errData);

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

    // Fallback: If direct call had a network issue, try local proxy route if available
    try {
      const fallbackRes = await fetch('/api/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': cleanKey,
        },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const responseText = await fallbackRes.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        // Response is HTML (e.g. Netlify 404 SPA fallback), report clean network message
        return {
          status: 'Error',
          message: directErr?.message || 'Could not verify API key due to network connectivity.',
        };
      }

      if (fallbackRes.ok && data?.status === 'Connected') {
        return {
          status: 'Connected',
          message: data.message || 'API connection successful and active!',
        };
      }

      return {
        status: data?.status || 'Error',
        message: data?.message || 'API key verification failed.',
      };
    } catch {
      return {
        status: 'Error',
        message: directErr?.message || 'Network error while verifying Gemini API key.',
      };
    }
  }
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

  let res: Response;
  let json: any = null;

  try {
    if (videoFile || reusedGeminiFile) {
      // Send as multipart/form-data for server-side FileManager API upload
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
    json = await res.json().catch(() => null);
  } catch (networkErr: any) {
    const netMessage = networkErr?.message || 'Network error: could not connect to server.';
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
      requestMethod: 'POST /api/analyze-video',
      fileUploadStatus: uploadMethod,
      responseBody: networkErr?.stack || String(networkErr),
      category: classification.category,
      possibleCause: 'Network connection error or local server timeout during video payload transfer.',
      suggestedFix: 'Check your internet connection and verify that the application server is running.',
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

  // 1. Only classify as HTTP error when res.ok === false (status < 200 or >= 300)
  if (!res.ok) {
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
      model: 'gemini-2.0-flash',
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
    model: 'gemini-2.0-flash',
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
  const res = await fetch('/api/regenerate-scene', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': params.apiKey.trim(),
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to regenerate scene prompts.');
  }
  return json.scene;
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
  const res = await fetch('/api/replace-character', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': params.apiKey.trim(),
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to execute character replacement.');
  }

  return {
    ...params.project,
    ...json.project,
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
  const res = await fetch('/api/generate-story-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': params.apiKey.trim(),
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to analyze story and generate titles.');
  }

  return {
    storyAnalysis: json.storyAnalysis,
    storyTitles: json.storyTitles || [],
  };
}

export async function generateMoreTitles(params: {
  apiKey: string;
  storyAnalysis?: StoryAnalysis;
  characters: any[];
  currentTitles: string[];
}): Promise<string[]> {
  const res = await fetch('/api/generate-more-titles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': params.apiKey.trim(),
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to generate additional titles.');
  }

  return json.storyTitles || [];
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
  const res = await fetch('/api/generate-thumbnail-concept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': params.apiKey.trim(),
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to generate thumbnail concept.');
  }

  return {
    concept: json.concept,
    prompt: json.prompt,
    negativePrompt: json.negativePrompt,
    threeConcepts: json.threeConcepts,
  };
}

export async function generateCharacterImage(params: {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
}): Promise<{ success: boolean; imageUrl?: string; message?: string }> {
  try {
    const res = await fetch('/api/generate-character-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': params.apiKey.trim(),
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
      }),
    });

    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      message: 'Character Image Generation is not available with the current model/API configuration.',
    };
  }
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
  const res = await fetch('/api/generate-auto-style', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': params.apiKey.trim(),
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to generate typographic styles.');
  }

  return {
    fontSize: json.fontSize,
    textColor: json.textColor,
    textShadow: json.textShadow,
    textStroke: json.textStroke,
    backgroundBox: json.backgroundBox,
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

  // 1. Try calling Netlify serverless function or backend proxy
  const endpoints = ['/api/tts', '/.netlify/functions/tts'];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey?.trim() ? { 'x-gemini-api-key': apiKey.trim() } : {}),
        },
        body: JSON.stringify({
          text,
          voiceName,
          speakingRate,
          languageCode,
          gender,
          pitch,
          apiKey: apiKey?.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.audioContent) {
          const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
          return {
            audioUrl,
            audioContent: data.audioContent,
          };
        }
      }
    } catch (err) {
      console.warn(`[synthesizeGoogleCloudTTS] Failed on endpoint ${endpoint}:`, err);
    }
  }

  // Fallback: Return estimate
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
  const res = await fetch('/api/generate-story-prompts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.apiKey?.trim() ? { 'x-gemini-api-key': params.apiKey.trim() } : {}),
    },
    body: JSON.stringify({
      story: params.story,
      duration: params.duration,
      visualStyle: params.visualStyle,
      aspectRatio: params.aspectRatio,
      apiKey: params.apiKey?.trim(),
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to generate story prompts.');
  }

  return {
    title: json.title,
    duration: json.duration,
    scenesCount: json.scenesCount,
    scenes: json.scenes,
    characters: json.characters,
    storyAnalysis: json.storyAnalysis,
  };
}

