export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5';

export type OutputAspectRatioType = 'Original' | '9:16' | '16:9' | '1:1' | '4:5';

export type PromptModeType = 'Analyze Original' | 'Recreate With Characters';

export type DialogueType = 'spoken' | 'narration' | 'subtitle' | 'on-screen' | 'sfx';

export interface DialogueItem {
  speaker: string;
  original: string;
  myanmar: string;
  type: DialogueType;
}

export interface CharacterItem {
  id: string;
  name: string;
  originalName?: string;
  original_name?: string;
  type: string;
  estimatedAge?: string;
  head: string;
  texture: string;
  stem?: string;
  face: string;
  body: string;
  clothing: string;
  shoes?: string;
  personality: string;
  description: string;
  originalDescription?: string;
  promptDescription?: string;
  reference_image_url?: string;
  importance?: 'PRIMARY' | 'SECONDARY' | 'BACKGROUND';
  scenesCount?: number;
}

export interface SceneItem {
  scene_number: number;
  duration: string;
  location: string;
  time: string;
  characters: string[];
  action: string;
  emotion: string;
  body_language: string;
  dialogue: DialogueItem[];
  camera: string;
  environment: string;
  props: string[];
  lighting: string;
  sound: string;
  transition: string;
  video_prompt: string;
  character_image_prompt: string;
  generated_image_url?: string;
  is_generating_image?: boolean;
  summary?: string;
  video_style?: string;
  character_detail?: string;
  dialogue_text?: string;
  full_scene_prompt?: string;
}

export interface ProjectMetadata {
  title: string;
  aspect_ratio: AspectRatioType;
  output_aspect_ratio?: OutputAspectRatioType;
  visual_style: string;
  master_style_prompt: string;
  negative_prompt: string;
  original_video_info?: {
    width?: number;
    height?: number;
    resolution?: string;
    formattedRatio?: string;
    duration?: string;
    sizeMb?: string;
  };
}

export type ThumbnailStyle =
  | 'Cinematic'
  | 'Emotional'
  | 'Mystery'
  | 'Dramatic'
  | 'Funny'
  | 'Heartwarming'
  | 'Action'
  | 'Dark Mystery';

export interface StoryAnalysis {
  summary: string; // Concise Myanmar explanation of the complete story
  beginning: string;
  conflict: string;
  development: string;
  climax: string;
  ending: string;
  theme: string;
  emotionalTone: string;
  visualMoment?: string;
}

export interface ThumbnailConceptItem {
  id: string;
  title: string;
  conceptDescription: string;
  mainCharacters: string[];
  composition: string;
  prompt: string;
  negativePrompt: string;
}

export interface UploadedFont {
  id: string;
  name: string;
  fileName: string;
  fontFamily: string;
  format: string;
  fileSize: number;
  uploadedAt: number;
}

export interface TextLayerItem {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '900';
  textColor: string;
  color?: string;
  textAlign: 'left' | 'center' | 'right';
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  widthPercent?: number; // 10 to 100
  stroke: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  glow: boolean;
  glowColor: string;
  glowBlur: number;
  backgroundBox: boolean;
  boxColor: string;
  boxOpacity: number;
  boxPadding: number;
  boxRounded: number;
}

export interface BadgeItem {
  id: string;
  text: string;
  type: 'NEW' | 'HOT' | 'LIVE' | 'PART 1' | 'CUSTOM';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color: string;
  bgColor: string;
  enabled: boolean;
}

export interface EmojiElementItem {
  id: string;
  emoji: string;
  xPercent: number;
  yPercent: number;
  size: number;
}

export interface ImageLayerItem {
  id: string;
  src: string;
  name?: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  widthPercent: number; // 10 to 100
  opacity?: number; // 0 to 1
  zIndex?: number;
  // Border / Stroke
  borderEnabled?: boolean;
  borderWidth?: number; // 1 to 20
  borderColor?: string;
  borderRadius?: number; // 0 to 50
  // Drop Shadow / Glow
  shadowEnabled?: boolean;
  shadowBlur?: number; // 0 to 30
  shadowOffsetX?: number; // -30 to 30
  shadowOffsetY?: number; // -30 to 30
  shadowColor?: string;
  // Image Filters
  brightness?: number; // 50 to 150
  contrast?: number; // 50 to 150
  saturation?: number; // 0 to 200
  grayscale?: boolean;
  originalSrc?: string;
  bgRemoved?: boolean;
}

export interface PhotoThumbnailData {
  photoUrl: string | null;
  backgroundImage?: string | null;
  imageLayers?: ImageLayerItem[];
  photoFileName?: string;
  aspectRatio: '16:9' | '9:16' | '4:5';
  brightness: number; // 50 to 150
  contrast: number; // 50 to 150
  saturation: number; // 0 to 200
  blur: number; // 0 to 20
  bgRemoved: boolean;
  safeZoneGuide: boolean;
  textLayers: TextLayerItem[];
  badges: BadgeItem[];
  emojis: EmojiElementItem[];
}

export interface ThumbnailData {
  ratio: OutputAspectRatioType;
  style: ThumbnailStyle;
  concept: string;
  prompt: string;
  negativePrompt: string;
  imageUrl?: string;
  text: string;
  textPosition: 'top' | 'center' | 'bottom';
  fontSize: number;
  textColor?: string;
  textShadow: boolean;
  textStroke: boolean;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontName?: string;
  backgroundBox?: boolean;
}

export interface ProjectData {
  id: string;
  projectType?: 'video-prompts' | 'text-to-voice' | 'thumbnail' | 'story-prompts' | 'movie-recap' | 'text-to-image';
  ownerUid?: string;
  createdAt: number;
  updatedAt: number;
  videoFileName?: string;
  videoDuration?: number;
  videoResolution?: string;
  videoSize?: string;
  promptMode: PromptModeType;
  project: ProjectMetadata;
  characters: CharacterItem[];
  scenes: SceneItem[];
  originalProject?: {
    characters: CharacterItem[];
    scenes: SceneItem[];
    project: ProjectMetadata;
    storyAnalysis?: StoryAnalysis;
    thumbnail?: ThumbnailData;
    thumbnailConcepts?: ThumbnailConceptItem[];
  };
  characterMappings?: Record<string, any>;
  customCharacters?: CharacterItem[];
  storyAnalysis?: StoryAnalysis;
  storyTitles?: string[];
  selectedStoryTitle?: string;
  storyDuration?: '1 MIN' | '2 MIN' | '3 MIN' | '5 MIN';
  storyScript?: string;
  thumbnail?: ThumbnailData;
  thumbnailConcepts?: ThumbnailConceptItem[];
  photoThumbnailData?: PhotoThumbnailData;
  textVoiceData?: {
    text: string;
    language: 'mm' | 'en';
    selectedVoice: string;
    voiceSpeed: number;
    audioUrl?: string;
    duration?: string;
  };
}

export interface ReplacementOptions {
  keep_head: boolean;
  keep_clothing: boolean;
  keep_body: boolean;
}

export interface ReplacementMapping {
  original_character: string;
  replacement_name: string;
  replacement_profile: {
    head: string;
    texture: string;
    stem?: string;
    fruit_type: string;
  };
  options: ReplacementOptions;
}

export type ConnectionStatus =
  | 'Not Connected'
  | 'Connected'
  | 'Invalid Key'
  | 'Quota Exceeded'
  | 'Error'
  | 'Testing';

export interface VideoAnalysisErrorDetails {
  status: number | string;
  errorCode: string;
  message: string;
  model: string;
  file: {
    name: string;
    size: string;
    duration: string | number;
    mimeType: string;
  };
  requestMethod: string;
  fileUploadStatus: string;
  responseBody?: string;
  category: string;
  possibleCause: string;
  suggestedFix: string;
  maskedApiKey?: string;
  timestamp?: string;
  retryAfterSeconds?: number;
  uploadedGeminiFile?: {
    name: string;
    uri: string;
    mimeType: string;
  };
}
