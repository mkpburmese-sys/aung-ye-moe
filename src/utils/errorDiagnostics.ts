import { VideoAnalysisErrorDetails } from '../types';

/**
 * Masks an API key for safe display and logging without revealing secrets.
 * Example output: ••••••••••••1234
 */
export function maskApiKey(key?: string): string {
  if (!key) return 'None';
  const trimmed = key.trim();
  if (trimmed.length <= 4) return '••••••••';
  const lastFour = trimmed.slice(-4);
  return '••••••••••••' + lastFour;
}

/**
 * Classifies Gemini API errors into the required diagnostic categories, causes, and fixes.
 */
export function classifyGeminiError(
  status: number | string,
  errorCode: string,
  message: string,
  uploadMethod: string,
  retryDelaySeconds?: number
): { category: string; possibleCause: string; suggestedFix: string } {
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

/**
 * Standardized development console logging format.
 */
export function logVideoAnalysisDetails(params: {
  model: string;
  fileSize: string;
  duration: string;
  mimeType: string;
  uploadMethod: string;
  apiResponse: string;
  error: string;
}) {
  console.log(
    `[MKP Video Analysis]\n` +
      `Model: ${params.model}\n` +
      `File size: ${params.fileSize}\n` +
      `Duration: ${params.duration}\n` +
      `MIME type: ${params.mimeType}\n` +
      `Upload method: ${params.uploadMethod}\n` +
      `API response: ${params.apiResponse}\n` +
      `Error: ${params.error}`
  );
}

/**
 * Formats error details into a clean plaintext block for the [ Copy Error Details ] button.
 */
export function formatErrorForClipboard(error: VideoAnalysisErrorDetails): string {
  return [
    '==================================================',
    'VIDEO ANALYSIS ERROR',
    '==================================================',
    `Status: ${error.status}`,
    `Error Code: ${error.errorCode}`,
    `Message: ${error.message}`,
    `Model: ${error.model}`,
    `File: ${error.file.name} (${error.file.size}, ${error.file.duration}, ${error.file.mimeType})`,
    `Request Method: ${error.requestMethod}`,
    `Upload Method: ${error.fileUploadStatus}`,
    `API Key: ${error.maskedApiKey || '••••••••••••'}`,
    '',
    `Diagnostic: ${error.category}`,
    `Possible Cause: ${error.possibleCause}`,
    `Suggested Fix: ${error.suggestedFix}`,
    error.retryAfterSeconds ? `Retry After: ${error.retryAfterSeconds}s` : '',
    '',
    error.responseBody ? `Response Body / Details:\n${error.responseBody}\n` : '',
    `Timestamp: ${error.timestamp || new Date().toISOString()}`,
    '==================================================',
  ]
    .filter(Boolean)
    .join('\n');
}
