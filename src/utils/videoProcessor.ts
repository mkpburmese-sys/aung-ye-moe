export interface VideoInspection {
  duration: number;
  width: number;
  height: number;
  resolution: string;
  formattedDuration: string;
  sizeMb: string;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function inspectVideoFile(file: File): Promise<VideoInspection> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

      resolve({
        duration,
        width,
        height,
        resolution: `${width}x${height}`,
        formattedDuration: formatDuration(duration),
        sizeMb,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to inspect video metadata. Please verify the video format.'));
    };
  });
}

/**
 * Samples keyframes from the video file at calculated intervals
 * to provide a comprehensive chronological frame sequence for Gemini.
 */
export async function sampleVideoFrames(
  file: File,
  maxFrames: number = 10,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    (video as any).playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const frames: string[] = [];

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || duration <= 0) {
        URL.revokeObjectURL(objectUrl);
        return resolve([]);
      }

      // Determine time intervals
      const numFrames = Math.min(Math.max(4, Math.floor(duration / 2)), maxFrames);
      const step = duration / (numFrames + 1);
      const timestamps: number[] = [];
      for (let i = 1; i <= numFrames; i++) {
        timestamps.push(i * step);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Scale down slightly for optimal AI payload transfer while retaining high detail
      const targetWidth = Math.min(video.videoWidth || 720, 720);
      const scale = targetWidth / (video.videoWidth || 720);
      const targetHeight = Math.round((video.videoHeight || 1280) * scale);
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      let currentIndex = 0;

      const captureNext = () => {
        if (currentIndex >= timestamps.length) {
          URL.revokeObjectURL(objectUrl);
          resolve(frames);
          return;
        }

        const t = timestamps[currentIndex];
        video.currentTime = t;
      };

      video.onseeked = () => {
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        frames.push(dataUrl);
        currentIndex++;
        if (onProgress) {
          onProgress(Math.round((currentIndex / timestamps.length) * 100));
        }
        captureNext();
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        // If frame extraction fails, resolve whatever we have or empty
        resolve(frames);
      };

      captureNext();
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve([]);
    };
  });
}

/**
 * Converts small video files to base64 if under max bytes (e.g. 15MB)
 */
export async function fileToBase64(file: File, maxMb: number = 15): Promise<string | null> {
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return null; // File too large for direct base64 transfer, use frame sampling
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // remove data:video/...;base64,
      const base64 = result.split(',')[1] || null;
      resolve(base64);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
