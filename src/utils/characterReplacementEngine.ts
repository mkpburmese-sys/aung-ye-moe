import {
  CharacterItem,
  DialogueItem,
  ProjectData,
  ProjectMetadata,
  ReplacementOptions,
  SceneItem,
} from '../types';

export interface ReplacementMappingItem {
  characterId: string;
  originalName: string;
  replacementName: string;
  replacementProfile: {
    name: string;
    fruit_type: string;
    head: string;
    texture: string;
    stem?: string;
    clothing?: string;
    body?: string;
    face?: string;
    personality?: string;
    promptDescription?: string;
  };
  options: ReplacementOptions;
  applied: boolean;
  appliedAt?: number;
}

export type CharacterMappingsMap = Record<string, ReplacementMappingItem>;

export interface ReplacementSummary {
  charactersReplacedCount: number;
  videoPromptsUpdatedCount: number;
  characterImagePromptsUpdatedCount: number;
  affectedSceneNumbers: number[];
  details: Array<{
    characterId?: string;
    originalName: string;
    replacementName: string;
    affectedScenes: number[];
  }>;
}

/**
 * Known fruit-specific keywords to clean up when swapping fruit characters
 */
const FRUIT_KEYWORDS_MAP: Record<string, string[]> = {
  orange: ['orange citrus', 'citrus peel', 'porous orange peel', 'dimpled orange', 'orange peel', 'orange fruit', 'citrus', 'orange'],
  banana: ['yellow banana', 'curved banana', 'banana peel', 'smooth yellow peel', 'banana fruit', 'banana stalk', 'banana'],
  apple: ['red apple', 'glossy apple', 'apple peel', 'apple fruit', 'apple skin', 'apple'],
  pear: ['teardrop pear', 'pear skin', 'pear fruit', 'yellow-green pear', 'pear'],
  mango: ['ripe mango', 'golden mango', 'mango peel', 'mango skin', 'mango fruit', 'mango'],
  watermelon: ['striped watermelon', 'watermelon rind', 'green watermelon', 'watermelon fruit', 'watermelon'],
  strawberry: ['ruby red strawberry', 'strawberry seeds', 'strawberry fruit', 'strawberry calyx', 'strawberry'],
  pineapple: ['pineapple head', 'spiky pineapple crown', 'pineapple bark', 'diamond-scaled pineapple', 'pineapple fruit', 'pineapple crown', 'pineapple'],
  coconut: ['brown coconut', 'coconut husk', 'fibrous coconut', 'coconut shell', 'coconut fruit', 'coconut'],
  lemon: ['yellow lemon', 'sour lemon', 'lemon peel', 'dimpled lemon', 'lemon citrus', 'lemon'],
};

/**
 * Derives fruit type keyword from name or type string
 */
function extractFruitKeyword(name: string, type: string = ''): string {
  const combined = `${name} ${type}`.toLowerCase();
  for (const fruit of Object.keys(FRUIT_KEYWORDS_MAP)) {
    if (combined.includes(fruit)) return fruit;
  }
  return name.split(' ')[0].toLowerCase();
}

/**
 * Escapes regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace character name as a whole word/boundary-safe phrase
 */
export function replaceCharacterName(text: string, originalName: string, newName: string): string {
  if (!text || !originalName || !newName) return text;
  const regex = new RegExp(`\\b${escapeRegex(originalName)}\\b`, 'g');
  return text.replace(regex, newName);
}

/**
 * Checks if a scene references a character by ID or display name
 */
export function isCharacterInScene(char: CharacterItem, scene: SceneItem): boolean {
  if (!scene.characters || !Array.isArray(scene.characters)) return false;
  const targetId = (char.id || '').toLowerCase();
  const currentName = (char.name || '').toLowerCase();
  const origName = (char.originalName || char.original_name || '').toLowerCase();

  return scene.characters.some((ref) => {
    if (!ref) return false;
    const refLower = ref.toLowerCase();
    return (
      (targetId && refLower === targetId) ||
      (currentName && refLower === currentName) ||
      (origName && refLower === origName)
    );
  });
}

/**
 * Normalizes Project Data:
 * 1. Guarantees every character has a permanent stable ID (char_001 format) and originalName.
 * 2. Calculates scene counts and importance ranking (PRIMARY, SECONDARY, BACKGROUND).
 * 3. Ensures every scene's characters array references characters using their permanent stable IDs.
 */
export function normalizeProjectData(project: ProjectData): ProjectData {
  if (!project) return project;

  const sceneCounts: Record<string, number> = {};
  const sceneList = Array.isArray(project.scenes) ? project.scenes : [];
  sceneList.forEach((scene) => {
    if (!scene) return;
    const refs = Array.isArray(scene.characters) ? scene.characters : [];
    refs.forEach((ref) => {
      if (!ref || typeof ref !== 'string') return;
      const key = ref.trim().toLowerCase();
      if (key) {
        sceneCounts[key] = (sceneCounts[key] || 0) + 1;
      }
    });
  });

  // 1. Ensure characters have permanent stable IDs, safe strings, and importance ranking
  const rawCharList = Array.isArray(project.characters) ? project.characters : [];
  const characters = rawCharList.map((c, idx) => {
    if (!c || typeof c !== 'object') {
      const fallbackName = `Character ${idx + 1}`;
      return {
        id: `char_${String(idx + 1).padStart(3, '0')}`,
        name: fallbackName,
        originalName: fallbackName,
        original_name: fallbackName,
        type: 'Character',
        head: '',
        texture: '',
        stem: '',
        face: '',
        body: '',
        clothing: '',
        personality: '',
        description: '',
        importance: (idx < 2 ? 'PRIMARY' : 'SECONDARY') as 'PRIMARY' | 'SECONDARY' | 'BACKGROUND',
        scenesCount: 1,
      };
    }

    const orig = String(c.originalName || c.original_name || c.name || `Character ${idx + 1}`).trim();
    const charName = String(c.name || orig).trim();
    const stableId =
      c.id && String(c.id).startsWith('char_')
        ? String(c.id).trim()
      : `char_${String(idx + 1).padStart(3, '0')}`;

    const origKey = orig.toLowerCase();
    const nameKey = charName.toLowerCase();
    const idKey = stableId.toLowerCase();

    const count =
      c.scenesCount ||
      sceneCounts[origKey] ||
      sceneCounts[nameKey] ||
      sceneCounts[idKey] ||
      1;

    let importance = c.importance;
    if (!importance) {
      if (count >= 3 || idx < 2) importance = 'PRIMARY';
      else if (count === 2 || idx < 5) importance = 'SECONDARY';
      else importance = 'BACKGROUND';
    }

    return {
      ...c,
      id: stableId,
      name: charName,
      originalName: orig,
      original_name: orig,
      type: c.type || 'Character',
      scenesCount: count,
      importance,
    };
  });

  // 2. Ensure scenes reference characters by stable ID and have safe properties
  const scenes: SceneItem[] = sceneList.map((scene, sIdx) => {
    const s = (scene || {}) as Partial<SceneItem>;
    const rawRefs = Array.isArray(s.characters) ? s.characters : [];
    const normalizedRefs = rawRefs.map((ref: any) => {
      if (!ref || typeof ref !== 'string') return '';
      const cleanRef = ref.trim();
      const found = characters.find(
        (c) =>
          c.id === cleanRef ||
          (c.name && c.name.toLowerCase() === cleanRef.toLowerCase()) ||
          (c.originalName && c.originalName.toLowerCase() === cleanRef.toLowerCase()) ||
          (c.original_name && c.original_name.toLowerCase() === cleanRef.toLowerCase())
      );
      return found ? found.id : cleanRef;
    }).filter(Boolean);

    return {
      scene_number: typeof s.scene_number === 'number' ? s.scene_number : sIdx + 1,
      duration: s.duration || '0:00 - 0:10',
      location: s.location || 'Scene environment',
      time: s.time || 'day',
      characters: Array.from(new Set(normalizedRefs)),
      action: s.action || '',
      emotion: s.emotion || '',
      body_language: s.body_language || '',
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      camera: s.camera || 'Medium shot',
      environment: s.environment || '',
      props: Array.isArray(s.props) ? s.props : [],
      lighting: s.lighting || '',
      sound: s.sound || '',
      transition: s.transition || 'cut',
      video_prompt: s.video_prompt || 'VIDEO STYLE\n3D Animated Film Style\n\nACTION\nContinuous scene action.',
      character_image_prompt: s.character_image_prompt || '',
      generated_image_url: s.generated_image_url,
      is_generating_image: s.is_generating_image,
    };
  });

  const rawMeta = (project.project || {}) as any;
  const safeProjectMeta = {
    ...rawMeta,
    title: rawMeta.title || project.videoFileName || 'AI Fruit Story Project',
    aspect_ratio: rawMeta.aspect_ratio || '9:16',
    visual_style: rawMeta.visual_style || '3D Animated Film Style',
    master_style_prompt: rawMeta.master_style_prompt || '',
    negative_prompt: rawMeta.negative_prompt || '',
  };

  const originalSnapshot = project.originalProject
    ? project.originalProject
    : {
        characters: JSON.parse(JSON.stringify(characters)),
        scenes: JSON.parse(JSON.stringify(scenes)),
        project: JSON.parse(JSON.stringify(safeProjectMeta)),
        storyAnalysis: project.storyAnalysis ? JSON.parse(JSON.stringify(project.storyAnalysis)) : undefined,
        thumbnail: project.thumbnail ? JSON.parse(JSON.stringify(project.thumbnail)) : undefined,
        thumbnailConcepts: project.thumbnailConcepts ? JSON.parse(JSON.stringify(project.thumbnailConcepts)) : undefined,
      };

  return {
    ...project,
    project: safeProjectMeta,
    characters,
    scenes,
    originalProject: originalSnapshot,
  };
}

/**
 * Synthesize a clean, compliant Character Image Prompt for specific characters visible in a scene
 * Strictly complies with:
 * - NO dialogue
 * - NO story narration
 * - Only physical reference specs
 * - Only characters appearing in that specific scene
 */
export function generateCharacterImagePromptForScene(
  sceneOrChars: SceneItem | string[] | CharacterItem[],
  characterBible: CharacterItem[],
  aspectRatio: string = '9:16'
): string {
  const sceneCharacters = Array.isArray(sceneOrChars)
    ? sceneOrChars
    : (sceneOrChars?.characters || []);

  const charactersInScene = characterBible.filter((c) =>
    sceneCharacters.some(
      (ref) =>
        (typeof ref === 'object' && ref !== null && (ref as any).id === c.id) ||
        ref === c.id ||
        String(ref).toLowerCase() === c.id.toLowerCase() ||
        String(ref).toLowerCase() === c.name.toLowerCase() ||
        (c.originalName && String(ref).toLowerCase() === c.originalName.toLowerCase()) ||
        (c.original_name && String(ref).toLowerCase() === c.original_name.toLowerCase())
    )
  );

  const activeChars = charactersInScene.length > 0 ? charactersInScene : characterBible;
  const charDescs = activeChars.map((char) => getCharacterFullDescription(char)).join('; ');

  return `Full-body character reference sheet of ${charDescs}, 3D animated film render, soft studio rim lighting, high quality subsurface scattering, crisp details, clean neutral studio background, ${aspectRatio} vertical composition. NO DIALOGUE.`;
}

function getCharacterFullDescription(c: CharacterItem): string {
  const name = c.name || 'Character';
  const type = c.type || 'character';
  const desc = c.promptDescription || c.description || c.head || c.texture || '';
  const cleanDesc = desc.replace(/[\u1000-\u109F]+/g, '').trim();
  if (cleanDesc.toLowerCase().includes(name.toLowerCase())) {
    return cleanDesc;
  }
  return `${name}, a ${type.toLowerCase()} character, ${cleanDesc}`;
}

export function transformVideoPrompt(
  originalPrompt: string,
  oldChar: CharacterItem,
  newProfile: ReplacementMappingItem['replacementProfile'],
  options: ReplacementOptions
): string {
  if (!originalPrompt) return originalPrompt;

  const originalName = oldChar.originalName || oldChar.original_name || oldChar.name;
  const replacementName = newProfile.name || 'Character';

  // 1. Split into lines to isolate sections
  const lines = originalPrompt.split('\n');
  let currentSection = '';
  const transformedLines = lines.map((line) => {
    const trimmed = line.trim();
    // Check if line is a section header
    if (
      trimmed === 'STYLE' ||
      trimmed === 'ACTION' ||
      trimmed === 'DIALOGUE' ||
      trimmed === 'ACTION CONTINUATION' ||
      trimmed === 'CHARACTER EXPRESSION' ||
      trimmed === 'CAMERA ANGLES' ||
      trimmed === 'ASPECT RATIO'
    ) {
      currentSection = trimmed;
      return line;
    }

    // Dialogue Section: replace character speaker name but preserve dialogue Myanmar text
    if (currentSection === 'DIALOGUE') {
      let updatedLine = replaceCharacterName(line, oldChar.name, replacementName);
      updatedLine = replaceCharacterName(updatedLine, originalName, replacementName);
      return updatedLine;
    }

    // Descriptive sections (STYLE, ACTION, CAMERA, etc.): MUST be pure English and describe current character only
    let processed = line;

    // A. Perform Name Substitution
    processed = replaceCharacterName(processed, oldChar.name, replacementName);
    processed = replaceCharacterName(processed, originalName, replacementName);

    // B. Keep head check
    if (!options.keep_head) {
      // Find old fruit keywords and clean them
      const fruitKeyword = extractFruitKeyword(originalName, oldChar.type || '');
      const listToClean = FRUIT_KEYWORDS_MAP[fruitKeyword] || [fruitKeyword];
      
      // Specifically target "anthropomorphic [fruit] character", "[fruit] head", etc.
      for (const keyword of listToClean) {
        const regexHead = new RegExp(`\\b${escapeRegex(keyword)}\\s*(head|peel|peel head|citrus head|textured head|skin|fruit)?\\b`, 'gi');
        processed = processed.replace(regexHead, '');
      }

      // If the prompt contains the replacement name, integrate their new head/species details
      if (processed.includes(replacementName) && newProfile.head) {
        const pattern = new RegExp(`\\b${escapeRegex(replacementName)}\\b`, 'g');
        processed = processed.replace(pattern, `${replacementName}, who is a ${newProfile.fruit_type || 'character'} with a ${newProfile.head}`);
      }
    }

    // C. Clothing Check
    if (!options.keep_clothing && newProfile.clothing) {
      const pattern = new RegExp(`\\b${escapeRegex(replacementName)}\\b`, 'g');
      processed = processed.replace(pattern, `${replacementName} dressed in ${newProfile.clothing}`);
    }

    // D. Body Check
    if (!options.keep_body && newProfile.body) {
      const pattern = new RegExp(`\\b${escapeRegex(replacementName)}\\b`, 'g');
      processed = processed.replace(pattern, `${replacementName} with a ${newProfile.body}`);
    }

    // E. Eliminate internal processing leakages
    processed = processed.replace(/\btransformed from\s+.*?\s+to\s+.*?\b/gi, '');
    processed = processed.replace(/\bformerly\s+.*?\b/gi, '');
    processed = processed.replace(/\boriginal\s+.*?\b/gi, '');
    processed = processed.replace(/\breplaced\b/gi, '');
    processed = processed.replace(/\bcharacter id\s*\d*\b/gi, '');

    // F. Strip Myanmar non-dialogue characters
    processed = processed.replace(/[\u1000-\u109F]/g, '');

    // Clean up spacing and punctuation glitches
    processed = processed.replace(/\s+/g, ' ');
    processed = processed.replace(/,\s*,/g, ',');
    processed = processed.replace(/,\s*\./g, '.');

    return processed;
  });

  return transformedLines.join('\n');
}

export function regenerateVideoPromptForScene(
  scene: SceneItem,
  charactersInScene: CharacterItem[],
  projectMeta: ProjectMetadata,
  options: ReplacementOptions,
  oldChar?: CharacterItem,
  replacementProfile?: ReplacementMappingItem['replacementProfile']
): string {
  const activeChars = charactersInScene.length > 0 ? charactersInScene : [];

  // Compile detailed character descriptions to integrate naturally in ACTION
  const characterAppearances = activeChars.map((c) => {
    return getCharacterFullDescription(c);
  }).join('; ');

  const styleText = projectMeta.visual_style || 'Pixar-quality 3D animation, expressive cartoon eyes, realistic skin/fur texture, cinematic realism, 8K, Unreal Engine quality, vibrant colors, no text, no watermark.';

  // Build the clean ACTION section
  let actionText = scene.action || 'The characters interact in the scene.';
  
  // Clean Myanmar text from ACTION description
  actionText = actionText.replace(/[\u1000-\u109F]/g, '').trim();
  
  // Ensure the characters' appearance is woven into the ACTION section
  const combinedActionText = `${actionText}. Characters present in this shot: ${characterAppearances}. The environment is vivid and detailed, matching the narrative atmosphere.`;

  // Build the DIALOGUE section
  const dialogueItems = scene.dialogue && scene.dialogue.length > 0 ? scene.dialogue : [];
  let dialogueBlock = '';
  if (dialogueItems.length > 0) {
    dialogueBlock = dialogueItems
      .map((d) => {
        const spk = activeChars.find(
          (c) => c.name.toLowerCase() === d.speaker.toLowerCase() || (c.originalName && c.originalName.toLowerCase() === d.speaker.toLowerCase())
        );
        const speakerName = spk ? spk.name : d.speaker;
        // Strip Myanmar letters from speaker name, but preserve dialogue verbatim!
        const cleanSpeaker = speakerName.replace(/[\u1000-\u109F]/g, '').trim();
        return `${cleanSpeaker}:\n"${d.myanmar || d.original || ''}"`;
      })
      .join('\n\n');
  } else {
    dialogueBlock = `${activeChars[0]?.name || 'Character'}:\n"[Myanmar dialogue]"`;
  }

  const primaryCharName = (activeChars[0]?.name || 'Character').replace(/[\u1000-\u109F]/g, '').trim();
  const aspectRatioVal = projectMeta.aspect_ratio || '9:16';
  const cameraText = (scene.camera || 'Wide establishing shot → medium shot → close-up → slow cinematic push-in.').replace(/[\u1000-\u109F]/g, '').trim();

  return `STYLE

${styleText}

ACTION

${combinedActionText}

DIALOGUE

${dialogueBlock}

ACTION CONTINUATION

${primaryCharName} continues the action smoothly, maintaining natural body movement and consistent expression.

CHARACTER EXPRESSION

${primaryCharName}:
Focused, expressive, emotionally resonant and matching the scene context.

CAMERA ANGLES

${cameraText}

ASPECT RATIO

${aspectRatioVal}`;
}

/**
 * Convenience helper to regenerate a scene's video prompt with current characters and aspect ratio
 */
export function regenerateSceneVideoPrompt(
  scene: SceneItem,
  characters: CharacterItem[],
  visualStyle: string = '3D Animated Film',
  aspectRatio: string = '9:16'
): string {
  const charsInScene = characters.filter((c) =>
    (scene.characters || []).some(
      (ref) =>
        ref === c.id ||
        ref.toLowerCase() === c.id.toLowerCase() ||
        ref.toLowerCase() === c.name.toLowerCase() ||
        (c.originalName && ref.toLowerCase() === c.originalName.toLowerCase()) ||
        (c.original_name && ref.toLowerCase() === c.original_name.toLowerCase())
    )
  );

  return regenerateVideoPromptForScene(
    scene,
    charsInScene.length > 0 ? charsInScene : characters,
    {
      title: '',
      visual_style: visualStyle,
      aspect_ratio: (aspectRatio === 'Original' ? '9:16' : aspectRatio) as any,
      master_style_prompt: '',
      negative_prompt: '',
    },
    {
      keep_head: true,
      keep_clothing: true,
      keep_body: true,
    }
  );
}

/**
 * Applies a list of character replacements to project data deterministically.
 * Preserves originalProject for [Reset Replacements].
 */
export function applyCharacterReplacements(
  project: ProjectData,
  replacements: Array<{
    characterId?: string;
    originalName?: string;
    replacementProfile: ReplacementMappingItem['replacementProfile'];
    options: ReplacementOptions;
  }>
): {
  updatedProject: ProjectData;
  summary: ReplacementSummary;
} {
  // Ensure project data is normalized (characters have stable IDs, scenes reference stable IDs)
  const normalizedProject = normalizeProjectData(project);

  // Ensure we keep a pristine copy of the original project for resetting
  const originalSnapshot = normalizedProject.originalProject
    ? normalizedProject.originalProject
    : {
        characters: JSON.parse(JSON.stringify(normalizedProject.characters)),
        scenes: JSON.parse(JSON.stringify(normalizedProject.scenes)),
        project: JSON.parse(JSON.stringify(normalizedProject.project)),
      };

  let currentCharacters: CharacterItem[] = JSON.parse(
    JSON.stringify(normalizedProject.characters)
  );
  let currentScenes: SceneItem[] = JSON.parse(
    JSON.stringify(normalizedProject.scenes)
  );

  const existingMappings: CharacterMappingsMap = {
    ...(normalizedProject.characterMappings || {}),
  };

  const affectedSceneNumbersSet = new Set<number>();
  let videoPromptsUpdatedCount = 0;
  let characterImagePromptsUpdatedCount = 0;
  const summaryDetails: ReplacementSummary['details'] = [];

  let updatedStoryAnalysis = normalizedProject.storyAnalysis
    ? JSON.parse(JSON.stringify(normalizedProject.storyAnalysis))
    : undefined;
  let updatedThumbnail = normalizedProject.thumbnail
    ? JSON.parse(JSON.stringify(normalizedProject.thumbnail))
    : undefined;
  let updatedThumbnailConcepts = normalizedProject.thumbnailConcepts
    ? JSON.parse(JSON.stringify(normalizedProject.thumbnailConcepts))
    : undefined;

  for (const rep of replacements) {
    const { characterId, originalName, replacementProfile, options } = rep;
    const replacementName = replacementProfile?.name?.trim();

    if (!replacementName) {
      continue;
    }

    // Find the character by stable ID or name
    const charIndex = currentCharacters.findIndex((c) => {
      if (characterId && c.id === characterId) return true;
      if (originalName) {
        if (c.id === originalName) return true;
        if (c.name.toLowerCase() === originalName.toLowerCase()) return true;
        if (c.originalName && c.originalName.toLowerCase() === originalName.toLowerCase()) return true;
        if (c.original_name && c.original_name.toLowerCase() === originalName.toLowerCase()) return true;
      }
      return false;
    });

    if (charIndex === -1) {
      continue;
    }

    const oldChar = currentCharacters[charIndex];
    const stableId = oldChar.id;
    const origName = oldChar.originalName || oldChar.original_name || oldChar.name;

    // STEP 1: Update Character Bible
    const updatedChar: CharacterItem = {
      ...oldChar,
      id: stableId, // NEVER CHANGE STABLE ID!
      name: replacementName,
      originalName: origName,
      original_name: origName,
      type: !options.keep_head
        ? replacementProfile.fruit_type || `Anthropomorphic ${replacementName} character`
        : oldChar.type,
      head: !options.keep_head
        ? replacementProfile.head || `${replacementName} head`
        : oldChar.head,
      texture: !options.keep_head
        ? replacementProfile.texture || `Natural ${replacementName} skin texture`
        : oldChar.texture,
      stem: !options.keep_head
        ? replacementProfile.stem !== undefined
          ? replacementProfile.stem
          : oldChar.stem
        : oldChar.stem,
      clothing: options.keep_clothing
        ? oldChar.clothing
        : replacementProfile.clothing || oldChar.clothing,
      body: options.keep_body
        ? oldChar.body
        : replacementProfile.body || oldChar.body,
      personality: oldChar.personality, // preserved automatically
      face: oldChar.face, // preserve facial style
      description: replacementProfile.promptDescription || replacementProfile.head || `A ${replacementProfile.fruit_type || 'character'} named ${replacementName}.`,
      promptDescription: replacementProfile.promptDescription || replacementProfile.head || `A ${replacementProfile.fruit_type || 'character'} named ${replacementName}.`,
    };

    currentCharacters[charIndex] = updatedChar;

    const thisCharAffectedScenes: number[] = [];

    // STEP 2 & 3: Find every scene containing this character by stable ID
    currentScenes = currentScenes.map((scene) => {
      // Check if character appears in this scene
      const charAppearsInScene = isCharacterInScene(oldChar, scene);

      if (!charAppearsInScene) {
        return scene;
      }

      thisCharAffectedScenes.push(scene.scene_number);
      affectedSceneNumbersSet.add(scene.scene_number);

      // Ensure scene.characters contains the stable character ID
      const updatedSceneCharacters = scene.characters.map((ref) => {
        if (
          ref === stableId ||
          ref.toLowerCase() === oldChar.name.toLowerCase() ||
          ref.toLowerCase() === origName.toLowerCase()
        ) {
          return stableId;
        }
        return ref;
      });
      if (!updatedSceneCharacters.includes(stableId)) {
        updatedSceneCharacters.push(stableId);
      }

      // STEP 6: Update dialogue speaker labels only (preserve Myanmar text verbatim)
      const updatedDialogue: DialogueItem[] = scene.dialogue
        ? scene.dialogue.map((d) => {
            const spkLower = d.speaker.toLowerCase();
            if (
              spkLower === oldChar.name.toLowerCase() ||
              spkLower === origName.toLowerCase() ||
              spkLower === stableId.toLowerCase()
            ) {
              return {
                ...d,
                speaker: replacementName,
              };
            }
            return d;
          })
        : [];

      // Update scene actions automatically: replace character name without destroying the action
      let updatedAction = replaceCharacterName(scene.action, oldChar.name, replacementName);
      updatedAction = replaceCharacterName(updatedAction, origName, replacementName);

      // Update camera text if it references the character name
      let updatedCamera = replaceCharacterName(scene.camera, oldChar.name, replacementName);
      updatedCamera = replaceCharacterName(updatedCamera, origName, replacementName);

      // STEP 4: Update Video Prompt Automatically
      let updatedVideoPrompt = transformVideoPrompt(
        scene.video_prompt,
        oldChar,
        replacementProfile,
        options
      );
      videoPromptsUpdatedCount++;

      // STEP 5: Update Character Image Prompt Automatically
      let updatedImagePrompt = generateCharacterImagePromptForScene(
        updatedSceneCharacters,
        currentCharacters,
        project.project.aspect_ratio || '9:16'
      );
      characterImagePromptsUpdatedCount++;

      return {
        ...scene,
        characters: updatedSceneCharacters,
        action: updatedAction,
        camera: updatedCamera,
        dialogue: updatedDialogue,
        video_prompt: updatedVideoPrompt,
        character_image_prompt: updatedImagePrompt,
      };
    });

    // Update storyAnalysis and thumbnail if already generated
    if (updatedStoryAnalysis) {
      updatedStoryAnalysis = {
        ...updatedStoryAnalysis,
        summary: replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.summary, oldChar.name, replacementName), origName, replacementName),
        beginning: replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.beginning, oldChar.name, replacementName), origName, replacementName),
        conflict: replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.conflict, oldChar.name, replacementName), origName, replacementName),
        development: replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.development, oldChar.name, replacementName), origName, replacementName),
        climax: replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.climax, oldChar.name, replacementName), origName, replacementName),
        ending: replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.ending, oldChar.name, replacementName), origName, replacementName),
        visualMoment: updatedStoryAnalysis.visualMoment
          ? replaceCharacterName(replaceCharacterName(updatedStoryAnalysis.visualMoment, oldChar.name, replacementName), origName, replacementName)
          : undefined,
      };
    }

    if (updatedThumbnail) {
      const updatedThumbPrompt = transformVideoPrompt(
        updatedThumbnail.prompt,
        oldChar,
        replacementProfile,
        options
      );
      const updatedThumbConcept = replaceCharacterName(
        replaceCharacterName(updatedThumbnail.concept, oldChar.name, replacementName),
        origName,
        replacementName
      );

      updatedThumbnail = {
        ...updatedThumbnail,
        prompt: updatedThumbPrompt,
        concept: updatedThumbConcept,
      };
    }

    if (updatedThumbnailConcepts) {
      updatedThumbnailConcepts = updatedThumbnailConcepts.map((tc: any) => ({
        ...tc,
        mainCharacters: tc.mainCharacters.map((cName: string) => {
          if (
            cName === stableId ||
            cName.toLowerCase() === oldChar.name.toLowerCase() ||
            cName.toLowerCase() === origName.toLowerCase()
          ) {
            return replacementName;
          }
          return cName;
        }),
        conceptDescription: replaceCharacterName(
          replaceCharacterName(tc.conceptDescription, oldChar.name, replacementName),
          origName,
          replacementName
        ),
        prompt: transformVideoPrompt(tc.prompt, oldChar, replacementProfile, options),
      }));
    }

    const mappingRecord: ReplacementMappingItem = {
      characterId: stableId,
      originalName: origName,
      replacementName,
      replacementProfile,
      options,
      applied: true,
      appliedAt: Date.now(),
    };

    existingMappings[stableId] = mappingRecord;
    existingMappings[origName] = mappingRecord;

    summaryDetails.push({
      characterId: stableId,
      originalName: origName,
      replacementName,
      affectedScenes: thisCharAffectedScenes,
    });

    console.log(`[CharacterReplacement]
Original ID: ${stableId}
Original: ${origName}
Replacement: ${replacementName}
Affected scenes: ${thisCharAffectedScenes.join(', ') || 'None'}
Updated video prompts: ${thisCharAffectedScenes.length}
Updated character image prompts: ${thisCharAffectedScenes.length}`);
  }

  const updatedProject: ProjectData = {
    ...normalizedProject,
    updatedAt: Date.now(),
    characters: currentCharacters,
    scenes: currentScenes,
    originalProject: originalSnapshot,
    characterMappings: existingMappings,
    storyAnalysis: updatedStoryAnalysis,
    thumbnail: updatedThumbnail,
    thumbnailConcepts: updatedThumbnailConcepts,
  };

  const summary: ReplacementSummary = {
    charactersReplacedCount: summaryDetails.length,
    videoPromptsUpdatedCount,
    characterImagePromptsUpdatedCount,
    affectedSceneNumbers: Array.from(affectedSceneNumbersSet).sort((a, b) => a - b),
    details: summaryDetails,
  };

  return {
    updatedProject,
    summary,
  };
}

/**
 * Restores original characters, scenes, and prompts from originalProject snapshot
 */
export function resetProjectReplacements(project: ProjectData): ProjectData {
  if (!project.originalProject) {
    return project;
  }

  const restoredProject: ProjectData = {
    ...project,
    updatedAt: Date.now(),
    characters: JSON.parse(JSON.stringify(project.originalProject.characters)),
    scenes: JSON.parse(JSON.stringify(project.originalProject.scenes)),
    project: JSON.parse(JSON.stringify(project.originalProject.project)),
    storyAnalysis: project.originalProject.storyAnalysis ? JSON.parse(JSON.stringify(project.originalProject.storyAnalysis)) : project.storyAnalysis,
    thumbnail: project.originalProject.thumbnail ? JSON.parse(JSON.stringify(project.originalProject.thumbnail)) : project.thumbnail,
    thumbnailConcepts: project.originalProject.thumbnailConcepts ? JSON.parse(JSON.stringify(project.originalProject.thumbnailConcepts)) : project.thumbnailConcepts,
    characterMappings: {},
  };

  return normalizeProjectData(restoredProject);
}
