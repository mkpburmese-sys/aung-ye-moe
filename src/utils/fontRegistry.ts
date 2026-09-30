import { UploadedFont } from '../types';

export const MYANMAR_SAMPLE_PREVIEW_TEXT = 'အမွေပေးတဲ့အဖေ';

// In-memory session registry so uploaded fonts remain available across the entire user session
class FontSessionRegistry {
  private sessionFonts: UploadedFont[] = [];
  private fontFaceMap: Map<string, FontFace> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Check if document.fonts is supported
    if (typeof window !== 'undefined' && 'fonts' in document) {
      // ready
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error notifying font listener:', e);
      }
    });
  }

  public getFonts(): UploadedFont[] {
    return [...this.sessionFonts];
  }

  public getFont(id: string): UploadedFont | undefined {
    return this.sessionFonts.find((f) => f.id === id);
  }

  public isFontLoaded(fontFamily: string): boolean {
    if (typeof document === 'undefined' || !('fonts' in document)) return false;
    return document.fonts.check(`16px "${fontFamily}"`);
  }

  /**
   * Load font file into browser document via FontFace API
   */
  public async registerFontFile(file: File): Promise<UploadedFont> {
    const fileName = file.name;
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

    const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    if (!allowedExtensions.includes(extension)) {
      throw new Error(
        `Unsupported font format "${extension}". Please upload .ttf, .otf, .woff, or .woff2.`
      );
    }

    let format = 'truetype';
    if (extension === '.otf') format = 'opentype';
    else if (extension === '.woff') format = 'woff';
    else if (extension === '.woff2') format = 'woff2';

    // Generate safe clean name and unique family name
    const rawName = fileName.replace(/\.[^/.]+$/, '').trim();
    const cleanName = rawName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'CustomFont';
    const fontId = `font_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const uniqueFontFamily = `MKP_${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();

    // Instantiate FontFace
    const fontFace = new FontFace(uniqueFontFamily, arrayBuffer, {
      style: 'normal',
      weight: '400 700',
    });

    // Load into document.fonts
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    await document.fonts.ready;

    this.fontFaceMap.set(uniqueFontFamily, loadedFace);

    const fontItem: UploadedFont = {
      id: fontId,
      name: cleanName,
      fileName,
      fontFamily: uniqueFontFamily,
      format,
      fileSize: file.size,
      uploadedAt: Date.now(),
    };

    this.sessionFonts.push(fontItem);
    this.notify();

    return fontItem;
  }

  public removeFont(id: string): void {
    const font = this.sessionFonts.find((f) => f.id === id);
    if (font) {
      const face = this.fontFaceMap.get(font.fontFamily);
      if (face && typeof document !== 'undefined' && 'fonts' in document) {
        try {
          document.fonts.delete(face);
        } catch (e) {
          console.warn('Failed to delete FontFace:', e);
        }
      }
      this.fontFaceMap.delete(font.fontFamily);
      this.sessionFonts = this.sessionFonts.filter((f) => f.id !== id);
      this.notify();
    }
  }

  public formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Singleton for session lifetime
export const fontRegistry = new FontSessionRegistry();
