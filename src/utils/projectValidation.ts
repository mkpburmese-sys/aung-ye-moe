import { ProjectData } from '../types';

/**
 * Checks whether a project is considered "empty" and should NOT be saved into recent project lists.
 *
 * Requirements:
 * 1. A story project is considered "empty" and SHOULD NOT be saved if:
 *    scenes.length === 0 && characters.length === 0 && globalStoryContext.trim() === ""
 *
 * 2. A thumbnail project is considered "empty" and SHOULD NOT be saved if:
 *    !backgroundImage && textElements.length === 0 && badges.length === 0
 */
export function isProjectEmpty(proj: ProjectData | null | undefined): boolean {
  if (!proj) return true;

  // 1. Story Prompts Project
  if (proj.projectType === 'story-prompts') {
    const scenesCount = proj.scenes?.length || 0;
    const charsCount = (proj.characters?.length || 0) + (proj.customCharacters?.length || 0);
    const storyText = (proj.storyScript || (proj as any).globalStoryContext || '').trim();

    return scenesCount === 0 && charsCount === 0 && storyText === '';
  }

  // 2. Thumbnail Studio / Photo Thumbnail Project
  if (proj.projectType === 'thumbnail') {
    const photoData = proj.photoThumbnailData;
    const bgImage = (
      photoData?.backgroundImage ||
      photoData?.photoUrl ||
      proj.thumbnail?.imageUrl ||
      ''
    ).trim();

    const textLayers = photoData?.textLayers || (photoData as any)?.textElements || [];
    // Only count text elements that contain meaningful text
    const meaningfulTextLayers = textLayers.filter(
      (layer: any) => layer && typeof layer.text === 'string' && layer.text.trim().length > 0
    );

    const badges = photoData?.badges || [];
    const emojis = photoData?.emojis || [];
    const imageLayers = photoData?.imageLayers || [];

    return (
      !bgImage &&
      meaningfulTextLayers.length === 0 &&
      badges.length === 0 &&
      emojis.length === 0 &&
      imageLayers.length === 0
    );
  }

  // 3. Text to Voice Project
  if (proj.projectType === 'text-to-voice') {
    const voiceText = (proj.textVoiceData?.text || '').trim();
    const audioUrl = proj.textVoiceData?.audioUrl;
    return !voiceText && !audioUrl;
  }

  // 4. Video Prompts Project
  if (proj.projectType === 'video-prompts' || !proj.projectType) {
    const scenesCount = proj.scenes?.length || 0;
    const videoFileName = proj.videoFileName || '';
    return scenesCount === 0 && !videoFileName;
  }

  return false;
}
