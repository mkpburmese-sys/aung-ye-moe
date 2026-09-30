import { ProjectData } from '../types';

export function generateMarkdownExport(project: ProjectData): string {
  let md = `# MKP VidPrompts Master — Project Export
**Title:** ${project.project.title}  
**Aspect Ratio:** ${project.project.aspect_ratio}  
**Visual Style:** ${project.project.visual_style}  
**Source Video:** ${project.videoFileName || 'N/A'} (${project.videoDuration ? project.videoDuration + 's' : 'N/A'}, ${project.videoResolution || 'N/A'})  
**Export Date:** ${new Date().toLocaleString()}  

---

## 🎨 MASTER VISUAL STYLE PROMPT
\`\`\`text
${project.project.master_style_prompt}
\`\`\`

## 🚫 GLOBAL NEGATIVE PROMPT
\`\`\`text
${project.project.negative_prompt}
\`\`\`

---

## 📖 CHARACTER BIBLE & MASTER REFERENCES
`;

  project.characters.forEach((char, index) => {
    md += `
### Character ${index + 1}: ${char.name} ${char.name !== char.original_name ? `(Originally: ${char.original_name})` : ''}
- **Type:** ${char.type}
- **Head & Appearance:** ${char.head}
- **Texture:** ${char.texture}
${char.stem ? `- **Stem / Leaf:** ${char.stem}\n` : ''}- **Eyes & Face:** ${char.face}
- **Body Proportions:** ${char.body}
- **Clothing & Accessories:** ${char.clothing}
- **Personality:** ${char.personality}
- **Description:** ${char.description}
`;
  });

  md += `\n---\n\n## 🎬 SCENE-BY-SCENE BREAKDOWN\n`;

  project.scenes.forEach((scene) => {
    md += `
### SCENE ${String(scene.scene_number).padStart(2, '0')}
- **Duration:** ${scene.duration}
- **Location:** ${scene.location}
- **Time:** ${scene.time}
- **Characters in Scene:** ${scene.characters.join(', ')}
- **Action:** ${scene.action}
- **Emotion:** ${scene.emotion}
- **Body Language:** ${scene.body_language}
- **Camera:** ${scene.camera}
- **Environment:** ${scene.environment}
- **Props:** ${scene.props?.join(', ') || 'None'}
- **Lighting:** ${scene.lighting}
- **Sound & Music:** ${scene.sound}
- **Transition:** ${scene.transition}

#### 💬 Dialogue
`;
    if (scene.dialogue && scene.dialogue.length > 0) {
      scene.dialogue.forEach((d) => {
        md += `- **${d.speaker}** (${d.type}): "${d.original}"  
  *Myanmar:* "${d.myanmar}"\n`;
      });
    } else {
      md += `*No dialogue recorded for this scene.*\n`;
    }

    md += `
#### 🎬 AI VIDEO GENERATION PROMPT
\`\`\`text
${scene.video_prompt}
\`\`\`

#### 🖼 CHARACTER IMAGE PROMPT (No Dialogue / Reference Only)
\`\`\`text
${scene.character_image_prompt}
\`\`\`

---
`;
  });

  if (project.storyAnalysis || project.selectedStoryTitle || project.thumbnail) {
    md += `\n---\n\n## 📖 STORY & THUMBNAIL STUDIO\n\n`;

    if (project.selectedStoryTitle) {
      md += `### 🏷 SELECTED STORY TITLE\n**${project.selectedStoryTitle}**\n\n`;
    }

    if (project.storyTitles && project.storyTitles.length > 0) {
      md += `#### 💡 All Suggested Titles:\n`;
      project.storyTitles.forEach((t, i) => {
        md += `${i + 1}. ${t}\n`;
      });
      md += `\n`;
    }

    if (project.storyAnalysis) {
      md += `### 📝 STORY SUMMARY (Myanmar)\n${project.storyAnalysis.summary}\n\n`;
      md += `#### 🏛 STORY STRUCTURE\n`;
      md += `- **Beginning:** ${project.storyAnalysis.beginning}\n`;
      md += `- **Conflict / Problem:** ${project.storyAnalysis.conflict}\n`;
      md += `- **Development:** ${project.storyAnalysis.development}\n`;
      md += `- **Climax:** ${project.storyAnalysis.climax}\n`;
      md += `- **Ending / Resolution:** ${project.storyAnalysis.ending}\n`;
      md += `- **Theme:** ${project.storyAnalysis.theme}\n`;
      md += `- **Emotional Tone:** ${project.storyAnalysis.emotionalTone}\n\n`;
    }

    if (project.thumbnail) {
      md += `### 🖼 THUMBNAIL STUDIO\n`;
      md += `- **Ratio:** ${project.thumbnail.ratio}\n`;
      md += `- **Style:** ${project.thumbnail.style}\n`;
      md += `- **Overlay Text:** "${project.thumbnail.text}" (${project.thumbnail.textPosition})\n\n`;

      if (project.thumbnail.concept) {
        md += `#### Thumbnail Concept:\n${project.thumbnail.concept}\n\n`;
      }

      if (project.thumbnail.prompt) {
        md += `#### Thumbnail Generation Prompt (English):\n\`\`\`text\n${project.thumbnail.prompt}\n\`\`\`\n\n`;
      }

      if (project.thumbnail.negativePrompt) {
        md += `#### Thumbnail Negative Prompt:\n\`\`\`text\n${project.thumbnail.negativePrompt}\n\`\`\`\n\n`;
      }
    }
  }

  return md;
}

export function generatePlainTextExport(project: ProjectData): string {
  let txt = `==================================================
MKP VIDPROMPTS MASTER — SCENE & CHARACTER PROMPT EXPORT
Title: ${project.project.title}
Aspect Ratio: ${project.project.aspect_ratio}
Visual Style: ${project.project.visual_style}
==================================================

MASTER VISUAL STYLE PROMPT:
${project.project.master_style_prompt}

GLOBAL NEGATIVE PROMPT:
${project.project.negative_prompt}

==================================================
CHARACTER BIBLE
==================================================
`;

  project.characters.forEach((char, idx) => {
    const isReplaced = char.original_name && char.original_name !== char.name;
    txt += `
Character ${idx + 1}: ${char.name}${isReplaced ? ` (Replaced from original: ${char.original_name})` : ''}
Type: ${char.type}
Head & Appearance: ${char.head}
Texture: ${char.texture}
Stem/Leaf: ${char.stem || 'N/A'}
Face: ${char.face}
Body: ${char.body}
Clothing: ${char.clothing}
Personality: ${char.personality}
${char.description ? `Description: ${char.description}\n` : ''}`;
  });

  txt += `
==================================================
SCENE PROMPTS & BREAKDOWN (${project.scenes.length} Scenes)
==================================================
`;

  project.scenes.forEach((scene) => {
    if (scene.full_scene_prompt) {
      txt += `
--------------------------------------------------
${scene.full_scene_prompt}
`;
      return;
    }

    txt += `
--------------------------------------------------
SCENE ${String(scene.scene_number).padStart(2, '0')}
Time / Duration: ${scene.time || scene.duration || '00:00 – 00:08'}
Location: ${scene.location || 'N/A'}
Characters in Scene: ${scene.characters && scene.characters.length > 0 ? scene.characters.join(', ') : 'None'}
Action: ${scene.action || 'N/A'}
Emotion: ${scene.emotion || 'N/A'}
Camera: ${scene.camera || 'N/A'}
Environment: ${scene.environment || 'N/A'}
Lighting: ${scene.lighting || 'N/A'}
Sound: ${scene.sound || 'N/A'}
Transition: ${scene.transition || 'N/A'}

Dialogue:
`;
    scene.dialogue.forEach((d) => {
      txt += `  ${d.speaker}: "${d.myanmar}" (Original: "${d.original}")\n`;
    });

    txt += `
[ AI VIDEO GENERATION PROMPT ]
${scene.video_prompt}

[ CHARACTER IMAGE PROMPT ]
${scene.character_image_prompt}
`;
  });

  if (project.storyAnalysis || project.selectedStoryTitle || project.thumbnail) {
    txt += `
==================================================
STORY & THUMBNAIL STUDIO
==================================================
`;
    if (project.selectedStoryTitle) {
      txt += `SELECTED STORY TITLE: ${project.selectedStoryTitle}\n\n`;
    }

    if (project.storyTitles && project.storyTitles.length > 0) {
      txt += `SUGGESTED TITLES:\n`;
      project.storyTitles.forEach((t, i) => {
        txt += `  ${i + 1}. ${t}\n`;
      });
      txt += `\n`;
    }

    if (project.storyAnalysis) {
      txt += `STORY SUMMARY (Myanmar):\n${project.storyAnalysis.summary}\n\n`;
      txt += `STORY STRUCTURE:\n`;
      txt += `  Beginning: ${project.storyAnalysis.beginning}\n`;
      txt += `  Conflict: ${project.storyAnalysis.conflict}\n`;
      txt += `  Development: ${project.storyAnalysis.development}\n`;
      txt += `  Climax: ${project.storyAnalysis.climax}\n`;
      txt += `  Ending: ${project.storyAnalysis.ending}\n`;
      txt += `  Theme: ${project.storyAnalysis.theme}\n`;
      txt += `  Emotional Tone: ${project.storyAnalysis.emotionalTone}\n\n`;
    }

    if (project.thumbnail) {
      txt += `THUMBNAIL CONCEPT:\n${project.thumbnail.concept}\n\n`;
      txt += `[ THUMBNAIL GENERATION PROMPT ]\n${project.thumbnail.prompt}\n\n`;
      txt += `[ THUMBNAIL NEGATIVE PROMPT ]\n${project.thumbnail.negativePrompt}\n\n`;
    }
  }

  return txt;
}

export function exportScenePromptsBundle(
  project: ProjectData,
  format: 'txt' | 'json' | 'md' = 'txt'
): string {
  const safeTitle = (project.project?.title || 'video_prompts')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'video_prompts';

  const filename = `${safeTitle}-bundle.${format}`;

  if (format === 'json') {
    const jsonStr = JSON.stringify(project, null, 2);
    downloadFile(jsonStr, filename, 'application/json;charset=utf-8');
    return filename;
  }

  if (format === 'md') {
    const md = generateMarkdownExport(project);
    downloadFile(md, filename, 'text/markdown;charset=utf-8');
    return filename;
  }

  const text = generatePlainTextExport(project);
  downloadFile(text, filename, 'text/plain;charset=utf-8');
  return filename;
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve(true);
  } catch (e) {
    return Promise.resolve(false);
  }
}
