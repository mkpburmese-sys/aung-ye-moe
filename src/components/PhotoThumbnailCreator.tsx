import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  Type,
  Layers,
  Download,
  Copy,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  ArrowLeft,
  Sun,
  Contrast as ContrastIcon,
  Palette,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Flame,
  Radio,
  Tag,
  Smile,
  Move,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Split,
  FileImage,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ProjectData,
  PhotoThumbnailData,
  TextLayerItem,
  BadgeItem,
  EmojiElementItem,
  ImageLayerItem,
} from '../types';
import { fontRegistry } from '../utils/fontRegistry';
import { Language, translations } from '../utils/i18n';
import { DriveSyncStatusType } from '../services/googleDriveService';
import { DriveSyncStatus } from './DriveSyncStatus';

interface PhotoThumbnailCreatorProps {
  project?: ProjectData | null;
  onSaveProject: (project: ProjectData) => Promise<void>;
  onBack?: () => void;
  language: Language;
  driveSyncState?: DriveSyncStatusType;
  isDriveConnected?: boolean;
  apiKey?: string;
}

const PRESET_BADGES = [
  { id: 'badge_new', text: 'NEW', type: 'NEW' as const, color: '#FFFFFF', bgColor: '#EF4444' },
  { id: 'badge_hot', text: 'HOT 🔥', type: 'HOT' as const, color: '#000000', bgColor: '#F59E0B' },
  { id: 'badge_live', text: '● LIVE', type: 'LIVE' as const, color: '#FFFFFF', bgColor: '#DC2626' },
  { id: 'badge_part1', text: 'PART 1', type: 'PART 1' as const, color: '#FACC15', bgColor: '#18181B' },
];

const POPULAR_EMOJIS = ['🔥', '😱', '💥', '⚡', '🎬', '🚀', '👑', '💯', '⚠️', '🔴', '🎯', '🍿'];

const BURMESE_FONTS = [
  { id: 'Pyidaungsu', label: 'Pyidaungsu (ပြည်ထောင်စု)' },
  { id: 'Padauk', label: 'Padauk (ပိတောက်)' },
  { id: 'Noto Sans Myanmar', label: 'Noto Sans Myanmar' },
  { id: 'Myanmar Text', label: 'Myanmar Text' },
];

const ENGLISH_FONTS = [
  { id: 'Impact', label: 'Impact (Heavy Thumbnail)' },
  { id: 'Montserrat', label: 'Montserrat (Bold Clean)' },
  { id: 'Bebas Neue', label: 'Bebas Neue (Condensed)' },
  { id: 'Inter', label: 'Inter (Modern Sans)' },
  { id: 'Oswald', label: 'Oswald (Tall Headline)' },
];

const TEXT_COLOR_PALETTE = [
  '#FFFFFF',
  '#FACC15', // Gold / Yellow
  '#FB923C', // Orange
  '#EF4444', // Red
  '#4ADE80', // Lime
  '#38BDF8', // Cyan
  '#C084FC', // Purple
  '#000000', // Black
];

const SAMPLE_PHOTO = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280&q=80';

const getShadowRgba = (hexColor: string, opacity: number = 0.85): string => {
  if (!hexColor) return `rgba(0, 0, 0, ${opacity})`;
  if (hexColor.startsWith('rgba') || hexColor.startsWith('rgb')) return hexColor;
  let cleanHex = hexColor.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const PhotoThumbnailCreator: React.FC<PhotoThumbnailCreatorProps> = ({
  project,
  onSaveProject,
  onBack,
  language,
  driveSyncState,
  isDriveConnected,
  apiKey,
}) => {
  const t = translations[language];

  // Canvas Ratio State: 16:9 (YouTube), 9:16 (Shorts/TikTok), 4:5 (Social Feed)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '4:5'>(
    project?.photoThumbnailData?.aspectRatio || '16:9'
  );

  // Photo State (Background & Multiple Image Layers)
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    project?.photoThumbnailData?.backgroundImage || project?.photoThumbnailData?.photoUrl || null
  );
  const [photoFileName, setPhotoFileName] = useState<string>(
    project?.photoThumbnailData?.photoFileName || ''
  );
  const [imageLayers, setImageLayers] = useState<ImageLayerItem[]>(
    project?.photoThumbnailData?.imageLayers || []
  );
  const [selectedImageLayerId, setSelectedImageLayerId] = useState<string | null>(null);
  const [processingOverlayBgId, setProcessingOverlayBgId] = useState<string | null>(null);
  const [draggingImageLayerId, setDraggingImageLayerId] = useState<string | null>(null);
  const [resizingImageLayerId, setResizingImageLayerId] = useState<string | null>(null);
  const [resizeImageStart, setResizeImageStart] = useState<{
    x: number;
    y: number;
    initialWidthPercent: number;
  } | null>(null);

  const overlayFileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo Adjustments
  const [brightness, setBrightness] = useState<number>(
    project?.photoThumbnailData?.brightness ?? 100
  );
  const [contrast, setContrast] = useState<number>(
    project?.photoThumbnailData?.contrast ?? 100
  );
  const [saturation, setSaturation] = useState<number>(
    project?.photoThumbnailData?.saturation ?? 100
  );
  const [blur, setBlur] = useState<number>(
    project?.photoThumbnailData?.blur ?? 0
  );
  const [bgRemoved, setBgRemoved] = useState<boolean>(
    project?.photoThumbnailData?.bgRemoved ?? false
  );
  const [isProcessingBgRemoval, setIsProcessingBgRemoval] = useState<boolean>(false);

  // Safe Zone Guide Overlay Toggle
  const [safeZoneGuide, setSafeZoneGuide] = useState<boolean>(
    project?.photoThumbnailData?.safeZoneGuide ?? false
  );
  const isSafeZoneOn = safeZoneGuide;

  // Multi-Layer Text Studio
  const [textLayers, setTextLayers] = useState<TextLayerItem[]>(
    project?.photoThumbnailData?.textLayers && project.photoThumbnailData.textLayers.length > 0
      ? project.photoThumbnailData.textLayers
      : [
          {
            id: 'layer_1',
            text: '',
            fontFamily: 'Pyidaungsu',
            fontSize: 48,
            fontWeight: 'bold',
            textColor: '#FACC15',
            textAlign: 'center',
            xPercent: 50,
            yPercent: 78,
            widthPercent: 85,
            stroke: false,
            strokeColor: '#000000',
            strokeWidth: 0,
            shadow: false,
            shadowColor: '#000000',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 0.85,
            glow: false,
            glowColor: '#FACC15',
            glowBlur: 0,
            backgroundBox: false,
            boxColor: '#000000',
            boxOpacity: 0.75,
            boxPadding: 0,
            boxRounded: 0,
          },
        ]
  );
  const [activeLayerId, setActiveLayerId] = useState<string>(textLayers[0]?.id || 'layer_1');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Badges
  const [badges, setBadges] = useState<BadgeItem[]>(
    project?.photoThumbnailData?.badges || []
  );

  // Emojis / Stamps
  const [emojis, setEmojis] = useState<EmojiElementItem[]>(
    project?.photoThumbnailData?.emojis || []
  );

  // UI Active Sidebar Tab
  const [activeSidebarTab, setActiveSidebarTab] = useState<'photo' | 'typography' | 'badges'>('photo');

  // Accordion State for space-efficient mobile view
  const [photoAccordion, setPhotoAccordion] = useState<'bg' | 'overlays' | 'adjustments'>('bg');
  const [textAccordion, setTextAccordion] = useState<'typography' | 'text_effects'>('typography');
  const [badgesAccordion, setBadgesAccordion] = useState<'badges' | 'emojis'>('badges');

  // Custom Font Upload state
  const [customFonts, setCustomFonts] = useState<{ id: string; label: string }[]>([]);
  const fontFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadCustomFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fontName = file.name.replace(/\.[^/.]+$/, "");
      const fontId = fontName.toLowerCase().replace(/\s+/g, '-');
      
      const customFont = new FontFace(fontId, arrayBuffer);
      await customFont.load();
      document.fonts.add(customFont);

      setCustomFonts((prev) => {
        if (prev.some((f) => f.id === fontId)) return prev;
        return [...prev, { id: fontId, label: fontName }];
      });

      updateActiveLayer({ fontFamily: fontId });
      setToastMessage(`Custom font "${fontName}" loaded successfully!`);
    } catch (err) {
      console.error('Failed to load custom font:', err);
      setToastMessage('Failed to load custom font file. Please use a valid .ttf, .otf, .woff, or .woff2 file.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // AI Enhancement state
  const [isAiEnhancing, setIsAiEnhancing] = useState<boolean>(false);
  const [isAiEnhanced, setIsAiEnhanced] = useState<boolean>(false);
  const [aiEnhanceReasoning, setAiEnhanceReasoning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleEnhanceWithAI = async () => {
    setIsAiEnhancing(true);
    setAiEnhanceReasoning(null);
    try {
      const headlineText = textLayers
        .map((l) => l.text)
        .filter((t) => t && t.trim().length > 0)
        .join(' | ');

      const effectiveApiKey = apiKey?.trim() || localStorage.getItem('mkp_gemini_api_key')?.trim() || '';

      const res = await fetch('/api/enhance-thumbnail-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveApiKey ? { 'x-gemini-api-key': effectiveApiKey } : {}),
        },
        body: JSON.stringify({
          headlineText,
          textLayers,
          aspectRatio,
          hasBackgroundImage: !!photoUrl,
          photoFileName,
          imageOverlaysCount: imageLayers.length,
          language,
          apiKey: effectiveApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI enhancement request failed. Please check your API key or quota.');
      }

      if (data.enhancedTextLayers && Array.isArray(data.enhancedTextLayers) && data.enhancedTextLayers.length > 0) {
        setTextLayers((prev) => {
          return data.enhancedTextLayers.map((enh: any, idx: number) => {
            const existing = prev[idx] || prev[0];
            return {
              id: existing?.id || `layer_${idx + 1}`,
              text: enh.text || existing?.text || 'TOP VIRAL DESIGN',
              textColor: enh.textColor || enh.color || '#FACC15',
              color: enh.textColor || enh.color || '#FACC15',
              fontSize: Number(enh.fontSize) || 56,
              fontWeight: enh.fontWeight || '900',
              fontFamily: enh.fontFamily || 'Montserrat',
              textAlign: enh.textAlign || 'center',
              xPercent: enh.xPercent !== undefined ? Number(enh.xPercent) : 50,
              yPercent: enh.yPercent !== undefined ? Number(enh.yPercent) : 25,
              widthPercent: enh.widthPercent !== undefined ? Number(enh.widthPercent) : (existing?.widthPercent ?? 85),
              stroke: !!enh.stroke,
              strokeWidth: enh.stroke ? Number(enh.strokeWidth) || 6 : 0,
              strokeColor: enh.strokeColor || '#000000',
              shadow: !!enh.shadow,
              shadowBlur: enh.shadow ? Number(enh.shadowBlur) || 14 : 0,
              shadowOffsetX: Number(enh.shadowOffsetX) || 0,
              shadowOffsetY: Number(enh.shadowOffsetY) || 4,
              shadowOpacity: enh.shadowOpacity !== undefined ? Number(enh.shadowOpacity) : 0.9,
              shadowColor: enh.shadowColor || '#000000',
              glow: !!enh.glow,
              glowBlur: enh.glow ? Number(enh.glowBlur) || 16 : 0,
              glowColor: enh.glowColor || '#FACC15',
              backgroundBox: !!enh.backgroundBox,
              boxColor: enh.boxColor || '#000000',
              boxOpacity: enh.boxOpacity !== undefined ? Number(enh.boxOpacity) : 0.75,
              boxPadding: enh.backgroundBox ? Number(enh.boxPadding) || 10 : 0,
              boxRounded: enh.backgroundBox ? Number(enh.boxRounded) || 8 : 0,
            };
          });
        });
      }

      if (data.photoAdjustments) {
        if (data.photoAdjustments.brightness) setBrightness(data.photoAdjustments.brightness);
        if (data.photoAdjustments.contrast) setContrast(data.photoAdjustments.contrast);
        if (data.photoAdjustments.saturation) setSaturation(data.photoAdjustments.saturation);
      }

      if (data.aiReasoning) {
        setAiEnhanceReasoning(data.aiReasoning);
      }

      setIsAiEnhanced(true);
      setToastMessage('✨ AI Thumbnail Enhancement applied successfully!');
    } catch (err: any) {
      console.error('AI Enhance error:', err);
      setToastMessage(err.message || 'AI Enhancement failed. Please check your Gemini API key in settings.');
    } finally {
      setIsAiEnhancing(false);
    }
  };

  const handleRegenerateAI = () => {
    handleEnhanceWithAI();
  };

  // Dragging & Resizing Text and Image Layers on Canvas
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [resizingLayerId, setResizingLayerId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; initialFontSize: number } | null>(null);
  const [resizingWidthLayerId, setResizingWidthLayerId] = useState<string | null>(null);
  const [resizeWidthStart, setResizeWidthStart] = useState<{ x: number; initialWidth: number } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Global Mouse & Touch Move Handlers for Real-time Canvas Dragging & Resizing
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingLayerId && !draggingImageLayerId && !resizingLayerId && !resizingImageLayerId && !resizingWidthLayerId) return;
      if (!canvasContainerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (clientX === undefined || clientY === undefined) return;

      const rect = canvasContainerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      if (draggingLayerId) {
        const xPercent = Math.max(5, Math.min(95, Math.round(((clientX - rect.left) / rect.width) * 100)));
        const yPercent = Math.max(5, Math.min(95, Math.round(((clientY - rect.top) / rect.height) * 100)));
        setTextLayers((prev) =>
          prev.map((l) => (l.id === draggingLayerId ? { ...l, xPercent, yPercent } : l))
        );
      } else if (draggingImageLayerId) {
        const xPercent = Math.max(5, Math.min(95, Math.round(((clientX - rect.left) / rect.width) * 100)));
        const yPercent = Math.max(5, Math.min(95, Math.round(((clientY - rect.top) / rect.height) * 100)));
        setImageLayers((prev) =>
          prev.map((l) => (l.id === draggingImageLayerId ? { ...l, xPercent, yPercent } : l))
        );
      } else if (resizingLayerId && resizeStart) {
        const delta = (clientX - resizeStart.x) + (clientY - resizeStart.y);
        const newFontSize = Math.max(16, Math.min(130, Math.round(resizeStart.initialFontSize + delta * 0.35)));
        setTextLayers((prev) =>
          prev.map((l) => (l.id === resizingLayerId ? { ...l, fontSize: newFontSize } : l))
        );
      } else if (resizingWidthLayerId && resizeWidthStart) {
        const deltaX = clientX - resizeWidthStart.x;
        const deltaPercent = (deltaX / rect.width) * 100 * 1.5;
        const newWidth = Math.max(20, Math.min(100, Math.round(resizeWidthStart.initialWidth + deltaPercent)));
        setTextLayers((prev) =>
          prev.map((l) => (l.id === resizingWidthLayerId ? { ...l, widthPercent: newWidth } : l))
        );
      } else if (resizingImageLayerId && resizeImageStart) {
        const deltaX = clientX - resizeImageStart.x;
        const deltaPercent = (deltaX / rect.width) * 100 * 1.5;
        const newWidth = Math.max(10, Math.min(90, Math.round(resizeImageStart.initialWidthPercent + deltaPercent)));
        setImageLayers((prev) =>
          prev.map((l) => (l.id === resizingImageLayerId ? { ...l, widthPercent: newWidth } : l))
        );
      }
    };

    const handlePointerUp = () => {
      setDraggingLayerId(null);
      setDraggingImageLayerId(null);
      setResizingLayerId(null);
      setResizeStart(null);
      setResizingWidthLayerId(null);
      setResizeWidthStart(null);
      setResizingImageLayerId(null);
      setResizeImageStart(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggingLayerId, draggingImageLayerId, resizingLayerId, resizeStart, resizingWidthLayerId, resizeWidthStart, resizingImageLayerId, resizeImageStart]);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  // Drag & Drop for Background Photo
  const [dragOverPhoto, setDragOverPhoto] = useState<boolean>(false);

  // Active Text Layer Helper
  const activeLayer = textLayers.find((l) => l.id === activeLayerId) || textLayers[0];

  const updateActiveLayer = (updatedProps: Partial<TextLayerItem>) => {
    if (!activeLayer) return;
    setTextLayers((prev) =>
      prev.map((layer) => (layer.id === activeLayer.id ? { ...layer, ...updatedProps } : layer))
    );
  };

  const handleAddTextLayer = () => {
    const newId = `layer_${Date.now()}`;
    const newLayer: TextLayerItem = {
      id: newId,
      text: language === 'mm' ? 'စာသား အသစ်' : 'NEW TEXT',
      fontFamily: 'Montserrat',
      fontSize: 48,
      fontWeight: '900',
      textColor: '#FFFFFF',
      textAlign: 'center',
      xPercent: 50,
      yPercent: 50,
      stroke: true,
      strokeColor: '#000000',
      strokeWidth: 4,
      shadow: true,
      shadowColor: '#000000',
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowOpacity: 0.85,
      glow: false,
      glowColor: '#FACC15',
      glowBlur: 0,
      backgroundBox: false,
      boxColor: '#000000',
      boxOpacity: 0.75,
      boxPadding: 0,
      boxRounded: 0,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newId);
    setSelectedLayerId(newId);
    setSelectedImageLayerId(null);
    setActiveSidebarTab('typography');
    setTextAccordion('typography');
  };

  const handleDeleteTextLayer = (id: string) => {
    if (textLayers.length <= 1) return;
    setTextLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) {
      const remaining = textLayers.filter((l) => l.id !== id);
      setActiveLayerId(remaining[0]?.id || 'layer_1');
    }
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  // Image Layer Handlers
  const handleAddOverlayFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const newLayer: ImageLayerItem = {
        id: `img_overlay_${Date.now()}`,
        name: file.name,
        src,
        xPercent: 50,
        yPercent: 50,
        widthPercent: 30,
        opacity: 1,
        borderEnabled: false,
        borderWidth: 0,
        borderColor: '#FFFFFF',
        borderRadius: 8,
        shadowEnabled: true,
        shadowBlur: 12,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        shadowColor: '#000000',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: false,
      };
      setImageLayers((prev) => [...prev, newLayer]);
      setSelectedImageLayerId(newLayer.id);
      setSelectedLayerId(null);
      setActiveSidebarTab('photo');
      setPhotoAccordion('overlays');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImageLayer = (id: string) => {
    setImageLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedImageLayerId === id) {
      setSelectedImageLayerId(null);
    }
  };

  const handleUpdateImageLayer = (id: string, updates: Partial<ImageLayerItem>) => {
    setImageLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleRemoveOverlayBg = async (layerId: string) => {
    const layer = imageLayers.find((l) => l.id === layerId);
    if (!layer || !layer.src) return;

    setProcessingOverlayBgId(layerId);
    try {
      const originalSrc = layer.originalSrc || layer.src;
      const newSrc = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(originalSrc);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          const corners = [
            { r: data[0], g: data[1], b: data[2] },
            { r: data[(canvas.width - 1) * 4], g: data[(canvas.width - 1) * 4 + 1], b: data[(canvas.width - 1) * 4 + 2] },
            { r: data[((canvas.height - 1) * canvas.width) * 4], g: data[((canvas.height - 1) * canvas.width) * 4 + 1], b: data[((canvas.height - 1) * canvas.width) * 4 + 2] },
            { r: data[(canvas.height * canvas.width - 1) * 4], g: data[(canvas.height * canvas.width - 1) * 4 + 1], b: data[(canvas.height * canvas.width - 1) * 4 + 2] },
          ];
          const bgR = Math.round((corners[0].r + corners[1].r + corners[2].r + corners[3].r) / 4);
          const bgG = Math.round((corners[0].g + corners[1].g + corners[2].g + corners[3].g) / 4);
          const bgB = Math.round((corners[0].b + corners[1].b + corners[2].b + corners[3].b) / 4);

          const threshold = 48;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
            const isWhiteish = r > 235 && g > 235 && b > 235;
            const isBlackish = r < 20 && g < 20 && b < 20 && bgR < 30 && bgG < 30 && bgB < 30;

            if (dist < threshold || isWhiteish || isBlackish) {
              data[i + 3] = 0;
            } else if (dist < threshold + 20) {
              data[i + 3] = Math.round(((dist - threshold) / 20) * 255);
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(originalSrc);
        img.src = originalSrc;
      });

      handleUpdateImageLayer(layerId, {
        originalSrc,
        src: newSrc,
        bgRemoved: true,
      });
    } catch (e) {
      console.error('Failed to remove overlay background:', e);
    } finally {
      setProcessingOverlayBgId(null);
    }
  };

  const handleUndoOverlayBg = (layerId: string) => {
    const layer = imageLayers.find((l) => l.id === layerId);
    if (!layer || !layer.originalSrc) return;
    handleUpdateImageLayer(layerId, {
      src: layer.originalSrc,
      bgRemoved: false,
    });
  };

  // Badges and Emojis Handlers
  const handleToggleBadge = (badge: (typeof PRESET_BADGES)[0]) => {
    const existing = badges.find((b) => b.type === badge.type);
    if (existing) {
      setBadges((prev) => prev.filter((b) => b.type !== badge.type));
    } else {
      const newBadge: BadgeItem = {
        id: `badge_${Date.now()}`,
        type: badge.type,
        text: badge.text,
        position: 'top-left',
        color: badge.color,
        bgColor: badge.bgColor,
        enabled: true,
      };
      setBadges((prev) => [...prev, newBadge]);
    }
  };

  const handleAddEmoji = (emojiChar: string) => {
    const newEmoji: EmojiElementItem = {
      id: `emoji_${Date.now()}`,
      emoji: emojiChar,
      xPercent: 50,
      yPercent: 40,
      size: 56,
    };
    setEmojis((prev) => [...prev, newEmoji]);
  };

  // Upload handler for background photo
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoUrl(e.target?.result as string);
      setPhotoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Reset Adjustments
  const handleResetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
  };

  // AI Background Removal mock
  const handleToggleBgRemoval = () => {
    if (bgRemoved) {
      setBgRemoved(false);
      return;
    }
    setIsProcessingBgRemoval(true);
    setTimeout(() => {
      setIsProcessingBgRemoval(false);
      setBgRemoved(true);
    }, 1200);
  };

  // Save Project State
  const saveStateToProject = useCallback(async () => {
    if (!project) return;
    const photoThumbnailData: PhotoThumbnailData = {
      aspectRatio,
      photoUrl: photoUrl || '',
      backgroundImage: photoUrl || '',
      photoFileName,
      imageLayers,
      brightness,
      contrast,
      saturation,
      blur,
      bgRemoved,
      safeZoneGuide,
      textLayers,
      badges,
      emojis,
    };

    const updated: ProjectData = {
      ...project,
      photoThumbnailData,
    };
    await onSaveProject(updated);
  }, [
    project,
    aspectRatio,
    photoUrl,
    photoFileName,
    imageLayers,
    brightness,
    contrast,
    saturation,
    blur,
    bgRemoved,
    safeZoneGuide,
    textLayers,
    badges,
    emojis,
    onSaveProject,
  ]);

  // High-Resolution Export
  const renderToCanvas = async (scaleMultiplier: number = 2): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    let width = 1280;
    let height = 720;

    if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '4:5') {
      width = 1080;
      height = 1350;
    }

    canvas.width = width * scaleMultiplier;
    canvas.height = height * scaleMultiplier;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    ctx.scale(scaleMultiplier, scaleMultiplier);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Render Background Photo
    if (photoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        img.src = photoUrl;
      });

      ctx.save();
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let renderW = width;
      let renderH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > canvasAspect) {
        renderH = height;
        renderW = height * imgAspect;
        offsetX = (width - renderW) / 2;
      } else {
        renderW = width;
        renderH = width / imgAspect;
        offsetY = (height - renderH) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
      ctx.restore();
    }

    // Render Image Overlays
    for (const overlay of imageLayers) {
      if (!overlay.src) continue;
      const ovImg = new Image();
      ovImg.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        ovImg.onload = resolve;
        ovImg.onerror = resolve;
        ovImg.src = overlay.src;
      });

      ctx.save();
      const ovW = (width * overlay.widthPercent) / 100;
      const ovH = ovW * (ovImg.height / ovImg.width);
      const ovX = (width * overlay.xPercent) / 100 - ovW / 2;
      const ovY = (height * overlay.yPercent) / 100 - ovH / 2;

      const filters: string[] = [];
      if (overlay.brightness !== undefined && overlay.brightness !== 100) filters.push(`brightness(${overlay.brightness}%)`);
      if (overlay.contrast !== undefined && overlay.contrast !== 100) filters.push(`contrast(${overlay.contrast}%)`);
      if (overlay.saturation !== undefined && overlay.saturation !== 100) filters.push(`saturate(${overlay.saturation}%)`);
      if (overlay.grayscale) filters.push('grayscale(100%)');
      if (filters.length > 0) ctx.filter = filters.join(' ');

      if (overlay.shadowEnabled && (overlay.shadowBlur ?? 0) > 0) {
        ctx.shadowColor = overlay.shadowColor || '#000000';
        ctx.shadowBlur = (overlay.shadowBlur ?? 10) * scaleMultiplier;
        ctx.shadowOffsetX = (overlay.shadowOffsetX ?? 0) * scaleMultiplier;
        ctx.shadowOffsetY = (overlay.shadowOffsetY ?? 4) * scaleMultiplier;
      }

      ctx.globalAlpha = overlay.opacity ?? 1;
      ctx.drawImage(ovImg, ovX, ovY, ovW, ovH);

      if (overlay.borderEnabled && (overlay.borderWidth ?? 0) > 0) {
        ctx.strokeStyle = overlay.borderColor || '#FFFFFF';
        ctx.lineWidth = (overlay.borderWidth ?? 3) * scaleMultiplier;
        ctx.strokeRect(ovX, ovY, ovW, ovH);
      }

      ctx.restore();
    }

    // Render Badges
    for (const badge of badges.filter((b) => b.enabled)) {
      ctx.save();
      ctx.font = 'bold 24px Montserrat, sans-serif';
      ctx.fillStyle = badge.bgColor;
      let bx = 24;
      let by = 24;
      if (badge.position === 'top-right') bx = width - 140;
      if (badge.position === 'bottom-left') by = height - 60;
      if (badge.position === 'bottom-right') {
        bx = width - 140;
        by = height - 60;
      }
      ctx.fillRect(bx, by, 110, 36);
      ctx.fillStyle = badge.color;
      ctx.fillText(badge.text, bx + 12, by + 26);
      ctx.restore();
    }

    // Render Text Layers
    for (const layer of textLayers.filter((l) => l.text && l.text.trim().length > 0)) {
      ctx.save();
      const fontSize = layer.fontSize * 1.6;
      ctx.font = `${layer.fontWeight || 'bold'} ${fontSize}px "${layer.fontFamily}", sans-serif`;
      ctx.textAlign = (layer.textAlign as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';

      const tx = (width * layer.xPercent) / 100;
      const ty = (height * layer.yPercent) / 100;

      if (layer.backgroundBox && (layer.boxOpacity ?? 0) > 0) {
        const metrics = ctx.measureText(layer.text);
        const padding = (layer.boxPadding || 10) * 1.5;
        const boxW = metrics.width + padding * 2;
        const boxH = fontSize * 1.3 + padding * 2;
        ctx.fillStyle = getShadowRgba(layer.boxColor || '#000000', layer.boxOpacity ?? 0.8);
        ctx.fillRect(tx - boxW / 2, ty - boxH / 2, boxW, boxH);
      }

      if (layer.shadow && (layer.shadowBlur ?? 0) > 0) {
        ctx.shadowColor = getShadowRgba(layer.shadowColor || '#000000', layer.shadowOpacity ?? 0.85);
        ctx.shadowBlur = (layer.shadowBlur || 10) * scaleMultiplier;
        ctx.shadowOffsetX = (layer.shadowOffsetX ?? 0) * scaleMultiplier;
        ctx.shadowOffsetY = (layer.shadowOffsetY ?? 4) * scaleMultiplier;
      }

      if (layer.stroke && (layer.strokeWidth ?? 0) > 0) {
        ctx.lineWidth = (layer.strokeWidth || 4) * 2;
        ctx.strokeStyle = layer.strokeColor || '#000000';
        ctx.strokeText(layer.text, tx, ty);
      }

      ctx.fillStyle = layer.textColor || layer.color || '#FACC15';
      ctx.fillText(layer.text, tx, ty);
      ctx.restore();
    }

    // Render Emojis
    for (const em of emojis) {
      ctx.save();
      ctx.font = `${em.size * 1.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ex = (width * em.xPercent) / 100;
      const ey = (height * em.yPercent) / 100;
      ctx.fillText(em.emoji, ex, ey);
      ctx.restore();
    }

    return canvas;
  };

  // High-Resolution Download
  const handleDownloadThumbnail = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderToCanvas(2);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      const safeTitle = (project?.project?.title || 'thumbnail')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
      a.href = dataUrl;
      a.download = `${safeTitle}_${aspectRatio.replace(':', 'x')}_thumb.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedOverlay = imageLayers.find((l) => l.id === selectedImageLayerId);

  return (
    <div className="max-w-7xl mx-auto py-2 sm:py-6 px-2 sm:px-6 space-y-4 sm:space-y-6 animate-fadeIn relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 shadow-2xl animate-slideUp flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-bold text-white">Notification</p>
            <p className="text-[11px] text-zinc-300 leading-relaxed">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 text-xs p-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* Streamlined Top Header Bar */}
      <div className="flex items-center justify-between pb-2.5 sm:pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
              Thumbnail Studio
            </h1>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas Live Preview (Sticky on mobile & desktop), Right Controls Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LIVE STICKY CANVAS PREVIEW (7 cols)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-2 sm:space-y-3 sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 lg:static lg:bg-transparent lg:pb-0">
          {/* Canvas Controls Header: Ratio & Safe Zone Selector */}
          <div className="flex items-center justify-between gap-1.5 p-1 sm:p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl sm:rounded-2xl">
            {/* Canvas Ratio Selector */}
            <div className="flex items-center gap-1 flex-nowrap">
              {(['16:9', '9:16', '4:5'] as const).map((r) => {
                const isSelected = aspectRatio === r;
                const label = r === '16:9' ? '16:9' : r === '9:16' ? '9:16' : '4:5';
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'bg-zinc-950/70 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Safe Zone Toggle */}
            <button
              type="button"
              onClick={() => setSafeZoneGuide((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                safeZoneGuide
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle YouTube / TikTok safe area overlays"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{safeZoneGuide ? 'Safe ON' : 'Safe OFF'}</span>
            </button>
          </div>

          {/* Interactive Live Canvas Box */}
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedLayerId(null);
                setSelectedImageLayerId(null);
              }
            }}
            className="relative bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-2 sm:p-4 select-none min-h-[190px] sm:min-h-[460px] max-h-[35vh] sm:max-h-none"
          >
            {/* The Visual Container matching selected Aspect Ratio */}
            <div
              ref={canvasContainerRef}
              onClick={() => {
                setSelectedLayerId(null);
                setSelectedImageLayerId(null);
              }}
              className={`relative overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-300 border border-zinc-800/80 mx-auto ${
                aspectRatio === '16:9'
                  ? 'w-full aspect-[16/9] max-h-[220px] sm:max-h-[440px]'
                  : aspectRatio === '9:16'
                  ? 'h-[210px] sm:h-[480px] aspect-[9/16]'
                  : 'h-[210px] sm:h-[460px] aspect-[4/5]'
              }`}
              style={{
                backgroundColor: '#09090b',
              }}
            >
              {/* Photo Background Layer with Live Filters */}
              {photoUrl ? (
                <div
                  className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-150"
                  style={{
                    backgroundImage: `url(${photoUrl})`,
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                    opacity: bgRemoved ? 0.92 : 1,
                  }}
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer p-4 text-center hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center text-zinc-400">
                    <Upload className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Click or drop photo here</p>
                    <p className="text-[10px] sm:text-xs text-zinc-500">JPG, PNG, or WebP</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoUrl(SAMPLE_PHOTO);
                      setPhotoFileName('sample_travel.jpg');
                    }}
                    className="mt-0.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
                  >
                    Try Sample Photo
                  </button>
                </div>
              )}

              {/* Multi-Layer Image Overlays */}
              {imageLayers.map((layer) => {
                const isSelected = layer.id === selectedImageLayerId && !isExporting;
                const overlayFilters = [
                  layer.shadowEnabled && (layer.shadowBlur ?? 0) > 0
                    ? `drop-shadow(${layer.shadowOffsetX ?? 0}px ${layer.shadowOffsetY ?? 4}px ${layer.shadowBlur ?? 10}px ${layer.shadowColor || '#000000'})`
                    : null,
                  layer.brightness !== undefined && layer.brightness !== 100 ? `brightness(${layer.brightness}%)` : null,
                  layer.contrast !== undefined && layer.contrast !== 100 ? `contrast(${layer.contrast}%)` : null,
                  layer.saturation !== undefined && layer.saturation !== 100 ? `saturate(${layer.saturation}%)` : null,
                  layer.grayscale ? 'grayscale(100%)' : null,
                ]
                  .filter(Boolean)
                  .join(' ') || 'none';

                return (
                  <div
                    key={layer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageLayerId(layer.id);
                      setSelectedLayerId(null);
                      setActiveSidebarTab('photo');
                      setPhotoAccordion('overlays');
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedImageLayerId(layer.id);
                      setSelectedLayerId(null);
                      setActiveSidebarTab('photo');
                      setPhotoAccordion('overlays');
                      setDraggingImageLayerId(layer.id);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setSelectedImageLayerId(layer.id);
                      setSelectedLayerId(null);
                      setActiveSidebarTab('photo');
                      setPhotoAccordion('overlays');
                      setDraggingImageLayerId(layer.id);
                    }}
                    className={`absolute z-20 transition-transform select-none ${
                      isSelected
                        ? 'ring-2 ring-amber-400 rounded-xl cursor-move'
                        : 'cursor-pointer hover:ring-1 hover:ring-zinc-400/50'
                    }`}
                    style={{
                      left: `${layer.xPercent}%`,
                      top: `${layer.yPercent}%`,
                      width: `${layer.widthPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      touchAction: 'none',
                      opacity: layer.opacity ?? 1,
                      filter: overlayFilters,
                    }}
                  >
                    <img
                      src={layer.src}
                      alt={layer.name || 'Overlay'}
                      className="w-full h-auto object-contain pointer-events-none select-none"
                      style={{
                        borderRadius: `${layer.borderRadius ?? 0}px`,
                        border:
                          layer.borderEnabled && (layer.borderWidth ?? 0) > 0
                            ? `${layer.borderWidth}px solid ${layer.borderColor || '#FFFFFF'}`
                            : 'none',
                      }}
                      draggable={false}
                    />

                    {/* Quick-Delete '✕' Handle for Active Image Overlay */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteImageLayer(layer.id);
                          setSelectedImageLayerId(null);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white border-2 border-zinc-950 rounded-full shadow-xl flex items-center justify-center cursor-pointer z-50 transition-all hover:scale-110 group pointer-events-auto"
                        title="Delete image overlay"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    )}

                    {/* Corner Resize Handle for Image Overlay */}
                    {isSelected && (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizingImageLayerId(layer.id);
                          setResizeImageStart({
                            x: e.clientX,
                            y: e.clientY,
                            initialWidthPercent: layer.widthPercent,
                          });
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizingImageLayerId(layer.id);
                          setResizeImageStart({
                            x: e.touches[0].clientX,
                            y: e.touches[0].clientY,
                            initialWidthPercent: layer.widthPercent,
                          });
                        }}
                        className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-amber-400 hover:bg-amber-300 border-2 border-zinc-950 rounded-full shadow-xl cursor-nwse-resize z-40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 group pointer-events-auto"
                        title="Drag corner to scale image size"
                      >
                        <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[9px] font-mono text-amber-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                          {layer.widthPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Badges Overlays */}
              {badges
                .filter((b) => b.enabled)
                .map((badge) => {
                  let posClass = 'top-2.5 left-2.5';
                  if (badge.position === 'top-right') posClass = 'top-2.5 right-2.5';
                  if (badge.position === 'bottom-left') posClass = 'bottom-2.5 left-2.5';
                  if (badge.position === 'bottom-right') posClass = 'bottom-2.5 right-2.5';

                  return (
                    <div
                      key={badge.id}
                      className={`absolute ${posClass} z-20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-xl pointer-events-none flex items-center gap-1`}
                      style={{
                        backgroundColor: badge.bgColor,
                        color: badge.color,
                      }}
                    >
                      <span>{badge.text}</span>
                    </div>
                  );
                })}

              {/* Text Layers Rendered */}
              {textLayers
                .filter((layer) => layer.text && layer.text.trim().length > 0)
                .map((layer) => {
                  const isSelected = layer.id === selectedLayerId && !isExporting;
                  return (
                    <div
                      key={layer.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                        setSelectedImageLayerId(null);
                        setActiveLayerId(layer.id);
                        setActiveSidebarTab('typography');
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                        setSelectedImageLayerId(null);
                        setActiveLayerId(layer.id);
                        setActiveSidebarTab('typography');
                        setDraggingLayerId(layer.id);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                        setSelectedImageLayerId(null);
                        setActiveLayerId(layer.id);
                        setActiveSidebarTab('typography');
                        setDraggingLayerId(layer.id);
                      }}
                      className={`absolute z-30 cursor-move transition-transform select-none ${
                        isSelected ? 'border border-white/80 shadow-sm rounded-lg p-1 sm:p-1.5' : 'cursor-pointer hover:border hover:border-white/40 rounded-lg p-1'
                      }`}
                      style={{
                        left: `${layer.xPercent}%`,
                        top: `${layer.yPercent}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 'auto',
                        display: 'inline-block',
                        maxWidth: '96%',
                        touchAction: 'none',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor:
                            layer.backgroundBox && (layer.boxOpacity ?? 0) > 0
                              ? `rgba(${parseInt((layer.boxColor || '#000000').slice(1, 3), 16) || 0}, ${
                                  parseInt((layer.boxColor || '#000000').slice(3, 5), 16) || 0
                                }, ${parseInt((layer.boxColor || '#000000').slice(5, 7), 16) || 0}, ${layer.boxOpacity ?? 0.8})`
                              : 'transparent',
                          padding: layer.backgroundBox && (layer.boxPadding ?? 0) > 0 ? `${layer.boxPadding}px` : '0px',
                          borderRadius: layer.backgroundBox && (layer.boxRounded ?? 0) > 0 ? `${layer.boxRounded}px` : '0px',
                        }}
                      >
                        <h2
                          style={{
                            fontFamily: `"${layer.fontFamily}", sans-serif`,
                            fontSize: `${Math.max(16, layer.fontSize * 0.7)}px`,
                            fontWeight: layer.fontWeight,
                            color: layer.textColor || layer.color || '#FACC15',
                            textAlign: layer.textAlign,
                            WebkitTextStroke:
                              layer.stroke && (layer.strokeWidth ?? 0) > 0
                                ? `${Math.max(1, (layer.strokeWidth ?? 0) * 0.7)}px ${layer.strokeColor || '#000000'}`
                                : '0px transparent',
                            textShadow: [
                              layer.shadow && (layer.shadowBlur ?? 0) > 0
                                ? `${layer.shadowOffsetX ?? 0}px ${layer.shadowOffsetY ?? 0}px ${layer.shadowBlur ?? 0}px ${getShadowRgba(
                                    layer.shadowColor || '#000000',
                                    layer.shadowOpacity ?? 0.85
                                  )}`
                                : null,
                              layer.glow && (layer.glowBlur ?? 0) > 0
                                ? `0 0 ${layer.glowBlur}px ${layer.glowColor || 'rgba(250, 204, 21, 0.8)'}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'none',
                            paintOrder: 'normal',
                            filter: 'none',
                            lineHeight: 1.18,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {layer.text}
                        </h2>
                      </div>

                      {/* Quick-Delete '✕' Handle for Active Text Layer (Facebook Style) */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteTextLayer(layer.id);
                            setSelectedLayerId(null);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="absolute -top-2 -left-2 sm:-top-2.5 sm:-left-2.5 w-4 h-4 bg-white/90 text-zinc-800 rounded-full flex items-center justify-center text-[10px] shadow cursor-pointer z-50 hover:bg-white active:scale-95 transition-all"
                          title="Delete text layer"
                        >
                          <X className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>
                      )}

                      {/* Corner Resize Dot for Text Layer (Facebook Style) */}
                      {isSelected && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingLayerId(layer.id);
                            setResizeStart({
                              x: e.clientX,
                              y: e.clientY,
                              initialFontSize: layer.fontSize,
                            });
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingLayerId(layer.id);
                            setResizeStart({
                              x: e.touches[0].clientX,
                              y: e.touches[0].clientY,
                              initialFontSize: layer.fontSize,
                            });
                          }}
                          className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white rounded-full shadow-md border border-black/20 cursor-nwse-resize z-40 flex items-center justify-center transition-transform hover:scale-125 active:scale-95"
                          title="Drag corner to scale text size"
                        />
                      )}
                    </div>
                  );
                })}

              {/* Emojis Elements */}
              {emojis.map((em) => (
                <div
                  key={em.id}
                  className="absolute z-25 cursor-move"
                  style={{
                    left: `${em.xPercent}%`,
                    top: `${em.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${em.size * 0.7}px`,
                  }}
                >
                  <span>{em.emoji}</span>
                </div>
              ))}

              {/* Safe Zone Visual Overlays */}
              {isSafeZoneOn && (
                <div className="absolute inset-0 pointer-events-none z-40">
                  {aspectRatio === '16:9' ? (
                    <>
                      {/* YouTube Bottom Right Timestamp Safe Box */}
                      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-red-500/20 border border-dashed border-red-400 text-red-300 text-[9px] font-mono flex items-center gap-1 shadow-md">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        <span>Timestamp Zone</span>
                      </div>
                      <div className="absolute inset-2 border border-dashed border-indigo-400/30 rounded-lg" />
                    </>
                  ) : aspectRatio === '9:16' ? (
                    <>
                      <div className="absolute bottom-2 inset-x-2 h-14 rounded bg-red-500/15 border border-dashed border-red-400 flex items-center justify-center text-red-200 text-[9px] font-mono">
                        Caption & Profile Safe Zone
                      </div>
                      <div className="absolute right-2 top-10 bottom-16 w-10 rounded bg-red-500/15 border border-dashed border-red-400 flex flex-col items-center justify-center text-red-200 text-[8px] font-mono text-center p-0.5">
                        Icons
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-2 border border-dashed border-indigo-400/40 rounded-lg" />
                  )}
                </div>
              )}

              {/* Active AI Analyzing & Enhancement Loading Overlay */}
              {isAiEnhancing && (
                <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center animate-fadeIn">
                  <div className="relative mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-amber-400 animate-spin flex items-center justify-center p-0.5 shadow-2xl">
                      <div className="w-full h-full bg-zinc-950 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white mb-0.5">
                    AI is optimizing thumbnail design...
                  </h3>
                  <p className="text-[10px] text-zinc-400 max-w-xs leading-tight">
                    Optimizing contrast, safe zones, strokes, and typography for peak CTR
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Reasoning Insight Banner */}
          {aiEnhanceReasoning && isAiEnhanced && (
            <div className="p-2 sm:p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-start gap-2 text-xs text-purple-200/90 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold text-purple-300 block text-[11px]">AI Design Applied:</span>
                <p className="text-[10px] text-zinc-300 leading-snug">{aiEnhanceReasoning}</p>
              </div>
            </div>
          )}

          {/* Ultra-Compact Action Buttons Bar Directly Below Sticky Preview */}
          <div className="p-1.5 sm:p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl sm:rounded-2xl shadow-lg">
            <div className="flex items-center justify-between gap-2">
              {/* Left Action: AI Enhance */}
              {!isAiEnhanced ? (
                <button
                  type="button"
                  onClick={handleEnhanceWithAI}
                  disabled={isAiEnhancing}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
                  <span>{isAiEnhancing ? 'Refining...' : 'Enhance'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegenerateAI}
                  disabled={isAiEnhancing}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 font-bold text-xs sm:text-sm transition-all border border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 shrink-0 ${isAiEnhancing ? 'animate-spin' : ''}`} />
                  <span>{isAiEnhancing ? 'Refining...' : 'Regenerate'}</span>
                </button>
              )}

              {/* Right Action: Download */}
              <button
                type="button"
                onClick={handleDownloadThumbnail}
                disabled={isExporting || isAiEnhancing}
                className="flex-1 px-3 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-zinc-950 font-extrabold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>{isExporting ? 'Exporting...' : 'Download'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: COMPACT ACCORDION CONTROLS (5 cols)         */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-2xl">
          {/* Top Sub-Tabs: Photo | Text | Badges */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl sm:rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveSidebarTab('photo')}
              className={`flex-1 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'photo'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidebarTab('typography')}
              className={`flex-1 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'typography'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text ({textLayers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSidebarTab('badges')}
              className={`flex-1 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'badges'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Badges</span>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <input
            type="file"
            ref={overlayFileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleAddOverlayFile(e.target.files[0]);
              }
            }}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          {/* --------------------------------------------------- */}
          {/* TAB 1: PHOTO ACCORDIONS                             */}
          {/* --------------------------------------------------- */}
          {activeSidebarTab === 'photo' && (
            <div className="space-y-2.5 animate-fadeIn">
              {/* Accordion 1: Background Photo */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => setPhotoAccordion(photoAccordion === 'bg' ? 'adjustments' : 'bg')}
                  className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Background Photo
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {photoUrl && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                        Loaded
                      </span>
                    )}
                    {photoAccordion === 'bg' ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {photoAccordion === 'bg' && (
                  <div className="p-2.5 sm:p-3 pt-0 space-y-2 border-t border-zinc-800/60 animate-fadeIn">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverPhoto(true);
                      }}
                      onDragLeave={() => setDragOverPhoto(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-2.5 sm:p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center space-y-1 h-20 sm:h-24 flex flex-col items-center justify-center ${
                        dragOverPhoto
                          ? 'border-amber-400 bg-amber-500/10'
                          : 'border-zinc-700 hover:border-amber-500/60 bg-zinc-950/60 hover:bg-zinc-950'
                      }`}
                    >
                      <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-white block truncate max-w-[220px]">
                        {photoFileName || (photoUrl ? 'Replace Photo' : 'Upload Background Image')}
                      </span>
                      <p className="text-[10px] text-zinc-400">JPG, PNG, WebP</p>
                    </div>

                    {photoUrl && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoUrl(null);
                            setPhotoFileName('');
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Remove BG
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleBgRemoval}
                          disabled={isProcessingBgRemoval}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isProcessingBgRemoval ? 'Removing...' : bgRemoved ? 'BG Removed' : 'AI BG Remove'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 2: Background Adjustments */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => setPhotoAccordion(photoAccordion === 'adjustments' ? 'bg' : 'adjustments')}
                  className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Background Adjustments
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {photoAccordion === 'adjustments' ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {photoAccordion === 'adjustments' && (
                  <div className="p-2.5 sm:p-3 pt-0 space-y-2 border-t border-zinc-800/60 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="text-[11px] text-zinc-400">Color Grading</span>
                      <button
                        type="button"
                        onClick={handleResetAdjustments}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Brightness */}
                    <div className="space-y-0.5 py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Sun className="w-3 h-3 text-zinc-500" />
                          <span>Brightness</span>
                        </span>
                        <span className="font-mono text-zinc-300 font-bold">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-0.5 py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <ContrastIcon className="w-3 h-3 text-zinc-500" />
                          <span>Contrast</span>
                        </span>
                        <span className="font-mono text-zinc-300 font-bold">{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-0.5 py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Palette className="w-3 h-3 text-zinc-500" />
                          <span>Saturation</span>
                        </span>
                        <span className="font-mono text-zinc-300 font-bold">{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Blur Slider */}
                    <div className="space-y-0.5 py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-zinc-500" />
                          <span>Blur Strength</span>
                        </span>
                        <span className="font-mono text-zinc-300 font-bold">{blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={blur}
                        onChange={(e) => setBlur(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Image Overlays */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => setPhotoAccordion(photoAccordion === 'overlays' ? 'bg' : 'overlays')}
                  className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Image Overlays
                    </span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                      {imageLayers.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {photoAccordion === 'overlays' ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {photoAccordion === 'overlays' && (
                  <div className="p-2.5 sm:p-3 pt-0 space-y-2.5 border-t border-zinc-800/60 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">Layer stickers, logos, & graphics</span>
                      <button
                        type="button"
                        onClick={() => overlayFileInputRef.current?.click()}
                        className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Overlay</span>
                      </button>
                    </div>

                    {imageLayers.length > 0 ? (
                      <div className="space-y-2.5 pt-1">
                        {imageLayers.map((overlay, idx) => {
                          const isSelected = overlay.id === selectedImageLayerId;
                          return (
                            <div
                              key={overlay.id}
                              onClick={() => setSelectedImageLayerId(overlay.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                                isSelected
                                  ? 'bg-amber-500/10 border-amber-500/80 ring-1 ring-amber-500/40'
                                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={overlay.src}
                                    alt={overlay.name}
                                    className="w-7 h-7 rounded object-contain bg-zinc-900 border border-zinc-800 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-zinc-200 truncate block">
                                      {overlay.name || `Overlay ${idx + 1}`}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      Size: {overlay.widthPercent}%
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteImageLayer(overlay.id);
                                  }}
                                  className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                                  title="Delete overlay"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Complete Image Overlay Adjustments Panel */}
                              {isSelected && (
                                <div className="space-y-2.5 pt-2 border-t border-zinc-800/80 animate-fadeIn">
                                  {/* AI Background Removal / Erase for Overlay */}
                                  <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800/90">
                                    <div className="flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="text-[11px] font-semibold text-zinc-200">
                                        Background Removal
                                      </span>
                                    </div>
                                    {overlay.bgRemoved ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                          Clean PNG
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUndoOverlayBg(overlay.id);
                                          }}
                                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
                                        >
                                          Undo
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveOverlayBg(overlay.id);
                                        }}
                                        disabled={processingOverlayBgId === overlay.id}
                                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                      >
                                        <Sparkles className={`w-3 h-3 text-amber-300 ${processingOverlayBgId === overlay.id ? 'animate-spin' : ''}`} />
                                        <span>{processingOverlayBgId === overlay.id ? 'Removing...' : 'AI Erase BG'}</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Scale / Size & Opacity */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                        <span>Size / Width</span>
                                        <span className="font-mono text-zinc-200 font-bold">{overlay.widthPercent}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="10"
                                        max="90"
                                        value={overlay.widthPercent}
                                        onChange={(e) =>
                                          handleUpdateImageLayer(overlay.id, { widthPercent: Number(e.target.value) })
                                        }
                                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                      />
                                    </div>

                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                        <span>Opacity</span>
                                        <span className="font-mono text-zinc-200 font-bold">
                                          {Math.round((overlay.opacity ?? 1) * 100)}%
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.05"
                                        value={overlay.opacity ?? 1}
                                        onChange={(e) =>
                                          handleUpdateImageLayer(overlay.id, { opacity: Number(e.target.value) })
                                        }
                                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Border / Stroke */}
                                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/90 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="checkbox"
                                          id={`overlay-border-${overlay.id}`}
                                          checked={!!overlay.borderEnabled}
                                          onChange={(e) =>
                                            handleUpdateImageLayer(overlay.id, {
                                              borderEnabled: e.target.checked,
                                              borderWidth: e.target.checked && (!overlay.borderWidth || overlay.borderWidth <= 0) ? 3 : overlay.borderWidth,
                                              borderRadius: overlay.borderRadius ?? 8,
                                            })
                                          }
                                          className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                                        />
                                        <label
                                          htmlFor={`overlay-border-${overlay.id}`}
                                          className="cursor-pointer text-[11px] text-zinc-200 font-semibold select-none"
                                        >
                                          Border / Stroke
                                        </label>
                                      </div>
                                      {overlay.borderEnabled && (
                                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                                          {overlay.borderWidth || 3}px
                                        </span>
                                      )}
                                    </div>

                                    {overlay.borderEnabled && (
                                      <div className="space-y-1.5 pt-1 border-t border-zinc-800/60 animate-fadeIn">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-0.5">
                                            <span className="text-[10px] text-zinc-400">Width</span>
                                            <input
                                              type="range"
                                              min="1"
                                              max="15"
                                              value={overlay.borderWidth || 3}
                                              onChange={(e) =>
                                                handleUpdateImageLayer(overlay.id, { borderWidth: Number(e.target.value) })
                                              }
                                              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                            />
                                          </div>
                                          <div className="space-y-0.5">
                                            <span className="text-[10px] text-zinc-400 block">Color</span>
                                            <div className="flex items-center gap-1.5">
                                              <input
                                                type="color"
                                                value={overlay.borderColor || '#FFFFFF'}
                                                onChange={(e) =>
                                                  handleUpdateImageLayer(overlay.id, { borderColor: e.target.value })
                                                }
                                                className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                                              />
                                              <span className="font-mono text-[10px] text-zinc-300 uppercase">
                                                {overlay.borderColor || '#FFFFFF'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                            <span>Corner Radius</span>
                                            <span className="font-mono text-zinc-200">{overlay.borderRadius ?? 0}px</span>
                                          </div>
                                          <input
                                            type="range"
                                            min="0"
                                            max="40"
                                            value={overlay.borderRadius ?? 0}
                                            onChange={(e) =>
                                              handleUpdateImageLayer(overlay.id, { borderRadius: Number(e.target.value) })
                                            }
                                            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Shadow / Glow */}
                                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/90 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="checkbox"
                                          id={`overlay-shadow-${overlay.id}`}
                                          checked={!!overlay.shadowEnabled}
                                          onChange={(e) =>
                                            handleUpdateImageLayer(overlay.id, {
                                              shadowEnabled: e.target.checked,
                                              shadowBlur: e.target.checked && (!overlay.shadowBlur || overlay.shadowBlur <= 0) ? 12 : overlay.shadowBlur,
                                              shadowOffsetY: overlay.shadowOffsetY ?? 4,
                                            })
                                          }
                                          className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                                        />
                                        <label
                                          htmlFor={`overlay-shadow-${overlay.id}`}
                                          className="cursor-pointer text-[11px] text-zinc-200 font-semibold select-none"
                                        >
                                          Drop Shadow / Glow
                                        </label>
                                      </div>
                                      {overlay.shadowEnabled && (
                                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                                          {overlay.shadowBlur || 12}px Blur
                                        </span>
                                      )}
                                    </div>

                                    {overlay.shadowEnabled && (
                                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60 animate-fadeIn">
                                        <div className="space-y-0.5">
                                          <span className="text-[10px] text-zinc-400">Softness</span>
                                          <input
                                            type="range"
                                            min="0"
                                            max="30"
                                            value={overlay.shadowBlur || 12}
                                            onChange={(e) =>
                                              handleUpdateImageLayer(overlay.id, { shadowBlur: Number(e.target.value) })
                                            }
                                            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                          />
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[10px] text-zinc-400 block">Color</span>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="color"
                                              value={overlay.shadowColor || '#000000'}
                                              onChange={(e) =>
                                                handleUpdateImageLayer(overlay.id, { shadowColor: e.target.value })
                                              }
                                              className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                                            />
                                            <span className="font-mono text-[10px] text-zinc-300 uppercase">
                                              {overlay.shadowColor || '#000000'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Image Adjustments (Brightness, Contrast, Saturation, Grayscale) */}
                                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800/90 space-y-1.5">
                                    <span className="text-[11px] text-zinc-300 font-semibold block">
                                      Image Visual Grading
                                    </span>
                                    <div className="space-y-1">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-0.5">
                                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                            <span>Brightness</span>
                                            <span className="font-mono text-zinc-200">{overlay.brightness ?? 100}%</span>
                                          </div>
                                          <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            value={overlay.brightness ?? 100}
                                            onChange={(e) =>
                                              handleUpdateImageLayer(overlay.id, { brightness: Number(e.target.value) })
                                            }
                                            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                          />
                                        </div>

                                        <div className="space-y-0.5">
                                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                            <span>Contrast</span>
                                            <span className="font-mono text-zinc-200">{overlay.contrast ?? 100}%</span>
                                          </div>
                                          <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            value={overlay.contrast ?? 100}
                                            onChange={(e) =>
                                              handleUpdateImageLayer(overlay.id, { contrast: Number(e.target.value) })
                                            }
                                            className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-1">
                                        <label
                                          htmlFor={`overlay-gray-${overlay.id}`}
                                          className="cursor-pointer text-[10px] text-zinc-400 select-none"
                                        >
                                          B&W / Grayscale
                                        </label>
                                        <input
                                          type="checkbox"
                                          id={`overlay-gray-${overlay.id}`}
                                          checked={!!overlay.grayscale}
                                          onChange={(e) =>
                                            handleUpdateImageLayer(overlay.id, { grayscale: e.target.checked })
                                          }
                                          className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 text-center py-2">No overlay graphics added yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------- */}
          {/* TAB 2: TEXT ACCORDIONS                              */}
          {/* --------------------------------------------------- */}
          {activeSidebarTab === 'typography' && (
            <div className="space-y-2.5 animate-fadeIn">
              {/* Layer Selection Chips + Add Layer Button */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap">
                  {textLayers.map((layer, idx) => {
                    const isSelected = layer.id === activeLayerId;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => {
                          setActiveLayerId(layer.id);
                          setSelectedLayerId(layer.id);
                          setSelectedImageLayerId(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950 shadow-md'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>Layer {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleAddTextLayer}
                  className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              {/* Accordion 1: Typography & Color */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => setTextAccordion(textAccordion === 'typography' ? 'text_effects' : 'typography')}
                  className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Typography & Color
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {textAccordion === 'typography' ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {textAccordion === 'typography' && (
                  <div className="p-2.5 sm:p-3 pt-0 space-y-2.5 border-t border-zinc-800/60 animate-fadeIn">
                    {/* Text Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-300">Headline Text</span>
                        {textLayers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTextLayer(activeLayer.id)}
                            className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                      <textarea
                        value={activeLayer.text}
                        onChange={(e) => updateActiveLayer({ text: e.target.value })}
                        placeholder="Enter headline in Myanmar or English..."
                        rows={2}
                        className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-xs sm:text-sm text-zinc-100 outline-none leading-relaxed resize-none"
                      />
                    </div>

                    {/* Font Selector */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-300">Font Family</span>
                        <button
                          type="button"
                          onClick={() => fontFileInputRef.current?.click()}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Upload Custom Font (+)</span>
                        </button>
                        <input
                          ref={fontFileInputRef}
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          onChange={handleUploadCustomFont}
                          className="hidden"
                        />
                      </div>
                      <select
                        value={activeLayer.fontFamily}
                        onChange={(e) => updateActiveLayer({ fontFamily: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-200 focus:border-amber-500 outline-none cursor-pointer"
                      >
                        {customFonts.length > 0 && (
                          <optgroup label="Custom Fonts">
                            {customFonts.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Burmese Fonts">
                          {BURMESE_FONTS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="English Fonts">
                          {ENGLISH_FONTS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-zinc-300">Text Alignment</span>
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ textAlign: 'left' })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            activeLayer.textAlign === 'left' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span>Left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ textAlign: 'center' })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            activeLayer.textAlign === 'center' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span>Center</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveLayer({ textAlign: 'right' })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            activeLayer.textAlign === 'right' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                          <span>Right</span>
                        </button>
                      </div>
                    </div>

                    {/* Font Size & Weight */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Size</span>
                          <span className="font-mono text-zinc-200">{activeLayer.fontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="120"
                          value={activeLayer.fontSize}
                          onChange={(e) => updateActiveLayer({ fontSize: Number(e.target.value) })}
                          className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[11px] text-zinc-400 block">Weight</span>
                        <div className="grid grid-cols-3 gap-1">
                          {(['normal', 'bold', '900'] as const).map((w) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => updateActiveLayer({ fontWeight: w })}
                              className={`py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                activeLayer.fontWeight === w
                                  ? 'bg-amber-500 text-zinc-950'
                                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                              }`}
                            >
                              {w === '900' ? 'Black' : w === 'bold' ? 'Bold' : 'Reg'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Text Color Palette */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-zinc-300">Text Color</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {TEXT_COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateActiveLayer({ textColor: c })}
                            className={`w-6 h-6 rounded-lg border-2 transition-all cursor-pointer ${
                              activeLayer.textColor === c
                                ? 'border-white scale-110 shadow-md'
                                : 'border-zinc-800 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={activeLayer.textColor}
                          onChange={(e) => updateActiveLayer({ textColor: e.target.value })}
                          className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-none"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: ✨ TEXT EFFECTS */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => setTextAccordion(textAccordion === 'text_effects' ? 'typography' : 'text_effects')}
                  className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      ✨ TEXT EFFECTS
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {textAccordion === 'text_effects' ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {textAccordion === 'text_effects' && (
                  <div className="p-2.5 sm:p-3 pt-0 space-y-2.5 border-t border-zinc-800/60 animate-fadeIn">
                    {/* 1. Outline / Stroke Toggle */}
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="strokeToggle"
                            checked={!!activeLayer.stroke}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              updateActiveLayer({
                                stroke: isChecked,
                                strokeWidth: isChecked && (!activeLayer.strokeWidth || activeLayer.strokeWidth <= 0) ? 3 : activeLayer.strokeWidth,
                              });
                            }}
                            className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <label htmlFor="strokeToggle" className="cursor-pointer text-xs text-zinc-200 font-semibold select-none">
                            Text Outline (Stroke)
                          </label>
                        </div>
                        {activeLayer.stroke && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {activeLayer.strokeWidth || 3}px
                          </span>
                        )}
                      </div>

                      {activeLayer.stroke && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 animate-fadeIn">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-400">Thickness</span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={activeLayer.strokeWidth || 3}
                              onChange={(e) => updateActiveLayer({ strokeWidth: Number(e.target.value) })}
                              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-400 block">Color</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={activeLayer.strokeColor || '#000000'}
                                onChange={(e) => updateActiveLayer({ strokeColor: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                              />
                              <span className="font-mono text-[10px] text-zinc-400 uppercase">
                                {activeLayer.strokeColor || '#000000'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Drop Shadow Toggle */}
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="shadowToggle"
                            checked={!!activeLayer.shadow}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              updateActiveLayer({
                                shadow: isChecked,
                                shadowBlur: isChecked && (!activeLayer.shadowBlur || activeLayer.shadowBlur <= 0) ? 10 : activeLayer.shadowBlur,
                                shadowOffsetY: isChecked && (activeLayer.shadowOffsetY === undefined || activeLayer.shadowOffsetY === 0) ? 4 : activeLayer.shadowOffsetY,
                              });
                            }}
                            className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <label htmlFor="shadowToggle" className="cursor-pointer text-xs text-zinc-200 font-semibold select-none">
                            Drop Shadow
                          </label>
                        </div>
                        {activeLayer.shadow && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {activeLayer.shadowBlur ?? 10}px Blur
                          </span>
                        )}
                      </div>

                      {activeLayer.shadow && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 animate-fadeIn">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-400">Blur Softness</span>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              value={activeLayer.shadowBlur ?? 10}
                              onChange={(e) => updateActiveLayer({ shadowBlur: Number(e.target.value) })}
                              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-400 block">Shadow Color</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={activeLayer.shadowColor && activeLayer.shadowColor.startsWith('#') ? activeLayer.shadowColor : '#000000'}
                                onChange={(e) => updateActiveLayer({ shadowColor: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                              />
                              <span className="font-mono text-[10px] text-zinc-400 uppercase">
                                {activeLayer.shadowColor || '#000000'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Neon Glow Toggle */}
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="glowToggle"
                            checked={!!activeLayer.glow}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              updateActiveLayer({
                                glow: isChecked,
                                glowBlur: isChecked && (!activeLayer.glowBlur || activeLayer.glowBlur <= 0) ? 16 : activeLayer.glowBlur,
                              });
                            }}
                            className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <label htmlFor="glowToggle" className="cursor-pointer text-xs text-zinc-200 font-semibold select-none">
                            Neon Glow
                          </label>
                        </div>
                        {activeLayer.glow && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {activeLayer.glowBlur || 16}px
                          </span>
                        )}
                      </div>

                      {activeLayer.glow && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 animate-fadeIn">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-400">Glow Intensity</span>
                            <input
                              type="range"
                              min="4"
                              max="40"
                              value={activeLayer.glowBlur || 16}
                              onChange={(e) => updateActiveLayer({ glowBlur: Number(e.target.value) })}
                              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-400 block">Color</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={activeLayer.glowColor || '#FACC15'}
                                onChange={(e) => updateActiveLayer({ glowColor: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                              />
                              <span className="font-mono text-[10px] text-zinc-400 uppercase">
                                {activeLayer.glowColor || '#FACC15'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Background (Text Background) */}
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="boxToggle"
                            checked={!!activeLayer.backgroundBox}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              updateActiveLayer({
                                backgroundBox: isChecked,
                                boxPadding: isChecked && (!activeLayer.boxPadding || activeLayer.boxPadding <= 0) ? 10 : activeLayer.boxPadding,
                                boxRounded: isChecked && (!activeLayer.boxRounded || activeLayer.boxRounded <= 0) ? 8 : activeLayer.boxRounded,
                              });
                            }}
                            className="accent-amber-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <label htmlFor="boxToggle" className="cursor-pointer text-xs text-zinc-200 font-semibold select-none">
                            Background
                          </label>
                        </div>
                        {activeLayer.backgroundBox && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {Math.round((activeLayer.boxOpacity ?? 0.8) * 100)}%
                          </span>
                        )}
                      </div>

                      {activeLayer.backgroundBox && (
                        <div className="space-y-2 pt-1 border-t border-zinc-800/80 animate-fadeIn">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-zinc-400">Opacity</span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={activeLayer.boxOpacity ?? 0.8}
                                onChange={(e) => updateActiveLayer({ boxOpacity: Number(e.target.value) })}
                                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-zinc-400 block">Color</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="color"
                                  value={activeLayer.boxColor || '#000000'}
                                  onChange={(e) => updateActiveLayer({ boxColor: e.target.value })}
                                  className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent"
                                />
                                <span className="font-mono text-[10px] text-zinc-400 uppercase">
                                  {activeLayer.boxColor || '#000000'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span>Padding</span>
                                <span className="font-mono text-zinc-200">{activeLayer.boxPadding ?? 8}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="30"
                                value={activeLayer.boxPadding ?? 8}
                                onChange={(e) => updateActiveLayer({ boxPadding: Number(e.target.value) })}
                                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span>Corner Radius</span>
                                <span className="font-mono text-zinc-200">{activeLayer.boxRounded ?? 8}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="30"
                                value={activeLayer.boxRounded ?? 8}
                                onChange={(e) => updateActiveLayer({ boxRounded: Number(e.target.value) })}
                                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------- */}
          {/* TAB 3: BADGES ACCORDIONS                            */}
          {/* --------------------------------------------------- */}
          {activeSidebarTab === 'badges' && (
            <div className="space-y-2.5 animate-fadeIn">
              {/* Badges Quick Toggles */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60 p-2.5 sm:p-3 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Quick Badges & Tags
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_BADGES.map((b) => {
                    const isEnabled = badges.find((existing) => existing.type === b.type && existing.enabled);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleToggleBadge(b)}
                        className={`p-2 rounded-xl border text-xs font-black tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                          isEnabled
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: b.bgColor, color: b.color }}>
                          {b.text}
                        </span>
                        <span className="text-[10px] text-zinc-500">{isEnabled ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emoji Stamps Library */}
              <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950/60 p-2.5 sm:p-3 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Accent Emojis & Stamps
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleAddEmoji(emoji)}
                      className="h-8 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-base transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {emojis.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEmojis([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer pt-0.5"
                  >
                    Clear All Emojis ({emojis.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
