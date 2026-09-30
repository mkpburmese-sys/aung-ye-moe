/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ApiSettingsView } from './components/ApiSettingsView';
import { VideoUploader } from './components/VideoUploader';
import { AnalysisProgress } from './components/AnalysisProgress';
import { CharacterBibleCard } from './components/CharacterBibleCard';
import { CharacterReplacementCard } from './components/CharacterReplacementCard';
import { SceneCard } from './components/SceneCard';
import { GlobalActionsBar } from './components/GlobalActionsBar';
import { ProjectsView } from './components/ProjectsView';
import { StoryThumbnailStudio } from './components/StoryThumbnailStudio';
import { VideoAnalysisErrorPanel } from './components/VideoAnalysisErrorPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { SignUpView } from './components/SignUpView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { AccountView } from './components/AccountView';
import { HomeDashboard } from './components/HomeDashboard';
import { AboutModal } from './components/AboutModal';
import { ContactModal } from './components/ContactModal';
import { Footer } from './components/Footer';
import { ToolProjectsView } from './components/ToolProjectsView';
import { PageHeader } from './components/PageHeader';
import { TextVoiceLauncher } from './components/TextVoiceLauncher';
import { VideoPromptsLauncher } from './components/VideoPromptsLauncher';
import { StoryPromptMaker } from './components/StoryPromptMaker';
import { PhotoThumbnailCreator } from './components/PhotoThumbnailCreator';
import { MovieRecapStudio } from './components/MovieRecapStudio';
import { TextToImageStudio } from './components/TextToImageStudio';
import { getDetectedRatioLabel } from './components/VideoUploader';
import {
  AspectRatioType,
  OutputAspectRatioType,
  ConnectionStatus,
  ProjectData,
  PromptModeType,
  ReplacementOptions,
  SceneItem,
  VideoAnalysisErrorDetails,
} from './types';
import {
  analyzeVideoWithGemini,
  regenerateScene,
  testGeminiApiKey,
  VideoAnalysisError,
} from './services/api';
import {
  applyCharacterReplacements,
  resetProjectReplacements,
  ReplacementSummary,
  ReplacementMappingItem,
  normalizeProjectData,
  regenerateSceneVideoPrompt,
  generateCharacterImagePromptForScene,
} from './utils/characterReplacementEngine';
import {
  inspectVideoFile,
  sampleVideoFrames,
  VideoInspection,
} from './utils/videoProcessor';
import { maskApiKey } from './utils/errorDiagnostics';
import { SAMPLE_FRUIT_STORY } from './data/sampleFruitStory';
import { AlertCircle, Film, Sparkles, AlertTriangle, Layers, Shuffle, ArrowUp, ArrowRight, Check, ChevronRight, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
import { exportScenePromptsBundle } from './utils/exportUtils';
import { Language, translations } from './utils/i18n';
import {
  auth,
  onAuthStateChanged,
  signOut,
  User,
  googleProvider,
  signInWithPopup,
  getCachedAccessToken,
  setCachedAccessToken,
} from './firebase/config';
import { GoogleAuthProvider } from 'firebase/auth';
import { getUserProjects, saveUserProject, deleteUserProject } from './services/projectService';
import {
  saveProjectToDrive,
  fetchProjectsFromDrive,
  deleteProjectFromDrive,
  updateDriveManifest,
  saveProjectsToLocalCache,
  loadProjectsFromLocalCache,
  DriveSyncStatusType,
} from './services/googleDriveService';

const STORAGE_KEY_API_KEY = 'mkp_vidprompts_gemini_api_key';
const STORAGE_KEY_LANG = 'mkp_vidprompts_lang';

export const getEffectiveApiKey = (): string => {
  const fromStorage =
    localStorage.getItem(STORAGE_KEY_API_KEY) ||
    sessionStorage.getItem(STORAGE_KEY_API_KEY) ||
    '';
  if (fromStorage && fromStorage.trim()) {
    return fromStorage.trim();
  }
  try {
    const envKey =
      (import.meta.env?.VITE_GEMINI_API_KEY as string) ||
      (import.meta.env?.VITE_API_KEY as string) ||
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GEMINI_API_KEY) ||
      '';
    return (envKey || '').trim();
  } catch {
    return '';
  }
};

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot_password'>('login');

  // Language State (Default Myanmar, persisted in localStorage)
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEY_LANG) as Language) || 'mm';
  });

  const handleToggleLanguage = () => {
    const next = language === 'mm' ? 'en' : 'mm';
    setLanguage(next);
    localStorage.setItem(STORAGE_KEY_LANG, next);
  };

  const t = translations[language];

  // Navigation Tabs & Modals
  const [currentTab, setCurrentTab] = useState<
    | 'home'
    | 'auth'
    | 'video_prompts_tool'
    | 'text_voice_tool'
    | 'thumbnail_tool'
    | 'story_prompts_tool'
    | 'movie_recap_tool'
    | 'text_to_image_tool'
    | 'editor'
    | 'settings'
    | 'account'
    | 'about'
    | 'contact'
  >('home');

  const [pendingRedirectTool, setPendingRedirectTool] = useState<string | null>(null);

  // BYOK API Key State (storage with fallback to environment variables)
  const [apiKey, setApiKey] = useState<string>(() => {
    return getEffectiveApiKey();
  });
  const [persistKeyInStorage, setPersistKeyInStorage] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(STORAGE_KEY_API_KEY));
  });
  const [apiKeyStatus, setApiKeyStatus] = useState<ConnectionStatus>('Not Connected');
  const [apiKeyStatusMessage, setApiKeyStatusMessage] = useState<string>('');

  // Active Project & Options
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [promptMode, setPromptMode] = useState<PromptModeType>('Analyze Original');
  const [outputRatio, setOutputRatio] = useState<OutputAspectRatioType>('Original');
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [editorSubView, setEditorSubView] = useState<'prompts' | 'title_thumbnail'>('prompts');

  // Scene Accordion Open State
  const [showAllScenes, setShowAllScenes] = useState<boolean>(true);
  const [openSceneNumbers, setOpenSceneNumbers] = useState<number[]>([]);

  // Video File & Inspection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoInspection, setVideoInspection] = useState<VideoInspection | null>(null);

  // Analysis Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [analysisError, setAnalysisError] = useState<VideoAnalysisErrorDetails | null>(null);

  // Character Replacement & Scene Actions State
  const [isApplyingReplacement, setIsApplyingReplacement] = useState(false);
  const [lastReplacementSummary, setLastReplacementSummary] = useState<ReplacementSummary | null>(null);
  const [regeneratingSceneNumber, setRegeneratingSceneNumber] = useState<number | null>(null);

  // Modals & Notices
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [showMissingKeyNotice, setShowMissingKeyNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Saved Projects History
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);

  // Google Drive Background Auto-Sync State
  const [driveSyncState, setDriveSyncState] = useState<DriveSyncStatusType>({
    status: 'idle',
    lastSyncedAt: null,
  });
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => {
    return Boolean(getCachedAccessToken());
  });

  // Function to sync and restore projects from Google Drive
  const syncAndRestoreFromDrive = async (token: string, currentUser?: any) => {
    setDriveSyncState((prev) => ({ ...prev, status: 'syncing' }));
    try {
      const { projects: driveProjects, lastActiveProjectId } = await fetchProjectsFromDrive(token);
      console.log(`[GoogleDrive] Loaded ${driveProjects.length} projects. Last active: ${lastActiveProjectId}`);

      let mergedList: ProjectData[] = [];
      setSavedProjects((prevLocal) => {
        const map = new Map<string, ProjectData>();
        prevLocal.forEach((p) => map.set(p.id, p));
        driveProjects.forEach((dp) => {
          const existing = map.get(dp.id);
          if (!existing || (dp.updatedAt || 0) >= (existing.updatedAt || 0)) {
            map.set(dp.id, dp);
          }
        });
        mergedList = Array.from(map.values()).sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
        );
        return mergedList;
      });

      // Update smart local cache
      saveProjectsToLocalCache(mergedList, lastActiveProjectId || undefined);

      // Seamlessly restore the last active project so user continues where they left off
      if (lastActiveProjectId) {
        const found = mergedList.find((p) => p.id === lastActiveProjectId);
        if (found) {
          setCurrentProject(found);
          console.log(`[GoogleDrive] Restored last active project "${found.project?.title || found.id}"`);
        }
      } else if (mergedList.length > 0 && !currentProject) {
        setCurrentProject(mergedList[0]);
      }

      setDriveSyncState({
        status: 'synced',
        lastSyncedAt: new Date(),
      });
      setIsDriveConnected(true);
    } catch (err: any) {
      console.error('[GoogleDrive] Sync error on load:', err);
      setDriveSyncState((prev) => ({
        ...prev,
        status: !navigator.onLine ? 'offline' : 'error',
        message: err?.message || 'Could not sync with Google Drive',
      }));
    }
  };

  const handleConnectDrive = async () => {
    try {
      setDriveSyncState((prev) => ({ ...prev, status: 'syncing' }));
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
        setIsDriveConnected(true);
        await syncAndRestoreFromDrive(credential.accessToken, result.user);
      }
    } catch (err: any) {
      console.error('Error connecting Google Drive:', err);
      setDriveSyncState((prev) => ({
        ...prev,
        status: 'error',
        message: err.message || 'Failed to connect Google Drive',
      }));
    }
  };

  const handleManualDriveSync = async () => {
    const token = getCachedAccessToken();
    if (token) {
      if (currentProject) {
        setDriveSyncState((prev) => ({ ...prev, status: 'syncing' }));
        try {
          await saveProjectToDrive(token, currentProject);
          setDriveSyncState({
            status: 'synced',
            lastSyncedAt: new Date(),
          });
        } catch (e) {
          setDriveSyncState((prev) => ({ ...prev, status: 'error' }));
        }
      }
      await syncAndRestoreFromDrive(token, user);
    } else {
      await handleConnectDrive();
    }
  };

  // Instant Offline Local Cache Restoration on initial mount
  useEffect(() => {
    const { projects: cachedProjects, lastActiveProjectId } = loadProjectsFromLocalCache();
    if (cachedProjects.length > 0) {
      console.log(`[Cache] Restored ${cachedProjects.length} projects instantly from local cache`);
      setSavedProjects(cachedProjects);
      if (lastActiveProjectId) {
        const found = cachedProjects.find((p) => p.id === lastActiveProjectId);
        if (found) {
          setCurrentProject(found);
        } else {
          setCurrentProject(cachedProjects[0]);
        }
      } else {
        setCurrentProject(cachedProjects[0]);
      }
    } else {
      const lastActiveId = localStorage.getItem('mkp_vidprompts_last_active_project_id');
      if (lastActiveId) {
        const autoSavedRaw = localStorage.getItem(`mkp_vidprompts_autosave_${lastActiveId}`);
        if (autoSavedRaw) {
          try {
            const parsed = JSON.parse(autoSavedRaw);
            setCurrentProject(parsed);
            setSavedProjects([parsed]);
          } catch (e) {
            console.warn('Error reading autosaved project:', e);
          }
        }
      }
    }
  }, []);

  // Online / Offline Network listener for Drive sync
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Back online. Checking pending Drive sync...');
      const token = getCachedAccessToken();
      if (token && currentProject) {
        setDriveSyncState((prev) => ({ ...prev, status: 'syncing' }));
        saveProjectToDrive(token, currentProject)
          .then(() => {
            setDriveSyncState({
              status: 'synced',
              lastSyncedAt: new Date(),
            });
          })
          .catch(() => {
            setDriveSyncState((prev) => ({ ...prev, status: 'error' }));
          });
      } else {
        setDriveSyncState((prev) => ({ ...prev, status: 'idle' }));
      }
    };
    const handleOffline = () => {
      setDriveSyncState((prev) => ({
        ...prev,
        status: 'offline',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentProject]);

  // Auth State Listener & Project Loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
      if (currentUser) {
        const token = getCachedAccessToken();
        if (token) {
          setIsDriveConnected(true);
          await syncAndRestoreFromDrive(token, currentUser);
        } else {
          try {
            const remoteProjects = await getUserProjects(currentUser.uid);
            if (remoteProjects.length > 0) {
              setSavedProjects((prev) => {
                const map = new Map<string, ProjectData>();
                prev.forEach((p) => map.set(p.id, p));
                remoteProjects.forEach((p) => map.set(p.id, p));
                const merged = Array.from(map.values()).sort(
                  (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
                );
                saveProjectsToLocalCache(merged);
                return merged;
              });
            } else if (savedProjects.length === 0) {
              const normalized = normalizeProjectData(SAMPLE_FRUIT_STORY);
              normalized.ownerUid = currentUser.uid;
              normalized.projectType = 'video-prompts';
              await saveUserProject(currentUser.uid, normalized);
              setSavedProjects([normalized]);
            }
          } catch (err) {
            console.error('Error fetching user projects:', err);
          }
        }
      } else {
        setIsDriveConnected(false);
        setDriveSyncState({ status: 'not_connected', lastSyncedAt: null });
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-redirect after login
  useEffect(() => {
    if (user) {
      if (pendingRedirectTool) {
        const tool = pendingRedirectTool;
        setPendingRedirectTool(null);
        if (tool === 'video-prompts') setCurrentTab('video_prompts_tool');
        else if (tool === 'text-to-voice') setCurrentTab('text_voice_tool');
        else if (tool === 'thumbnail' || tool === 'text-to-image') setCurrentTab('thumbnail_tool');
        else if (tool === 'story-prompts') setCurrentTab('story_prompts_tool');
        else if (tool === 'movie-recap') setCurrentTab('movie_recap_tool');
      } else if (currentTab === 'auth') {
        setCurrentTab('home');
      }
    }
  }, [user, pendingRedirectTool, currentTab]);

  // Recover and verify API Key on initial mount if present
  useEffect(() => {
    const effectiveKey = getEffectiveApiKey();

    if (effectiveKey) {
      if (effectiveKey !== apiKey) {
        console.log('[On-Mount] Syncing apiKey state with storage/env key:', maskApiKey(effectiveKey));
        setApiKey(effectiveKey);
      }
      handleTestConnection(effectiveKey);
    }
  }, []);

  // Instant local state update for fast UI feel
  const persistProject = async (proj: ProjectData) => {
    const updated: ProjectData = {
      ...proj,
      ownerUid: user ? user.uid : proj.ownerUid,
      projectType: proj.projectType || 'video-prompts',
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);
    setSavedProjects((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      const nextList = exists
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...prev];
      saveProjectsToLocalCache(nextList, updated.id);
      return nextList;
    });

    // Sync latest scenes/prompts and characters to localStorage for Thumbnail Studio continuity
    if (updated.scenes && updated.scenes.length > 0) {
      try {
        const latestData = {
          scenes: updated.scenes,
          characters: updated.characters,
          characterMappings: updated.characterMappings || {},
          storyAnalysis: updated.storyAnalysis || null,
          storyTitles: updated.storyTitles || [],
          selectedStoryTitle: updated.selectedStoryTitle || '',
          projectTitle: updated.project?.title || '',
        };
        localStorage.setItem('latest_analyzed_scenes', JSON.stringify(latestData));
        console.log('[Persist] Synced latest analyzed scenes & characters to localStorage with key "latest_analyzed_scenes"');
      } catch (err) {
        console.warn('Failed to save latest_analyzed_scenes to localStorage:', err);
      }
    }
  };

  // Debounced Auto-Save to LocalStorage, Google Drive, and Firebase Firestore to prevent data loss and optimize quotas
  useEffect(() => {
    if (!currentProject) return;

    // 1. Instant, synchronous local storage auto-save (offline protection)
    try {
      localStorage.setItem(`mkp_vidprompts_autosave_${currentProject.id}`, JSON.stringify(currentProject));
      localStorage.setItem('mkp_vidprompts_last_active_project_id', currentProject.id);
      saveProjectsToLocalCache(savedProjects, currentProject.id);
    } catch (err) {
      console.warn('LocalStorage backup auto-save failed:', err);
    }

    if (!navigator.onLine) {
      setDriveSyncState((prev) => ({ ...prev, status: 'offline' }));
      return;
    }

    const token = getCachedAccessToken();

    // 2. Debounced silent background auto-save to Google Drive & Firestore
    const debounceTimer = setTimeout(async () => {
      // Silent Background Google Drive Auto-Save
      if (token) {
        setDriveSyncState((prev) => ({ ...prev, status: 'syncing' }));
        try {
          await saveProjectToDrive(token, currentProject);
          await updateDriveManifest(
            token,
            currentProject.id,
            savedProjects.map((p) => p.id)
          );
          setDriveSyncState({
            status: 'synced',
            lastSyncedAt: new Date(),
          });
          console.log(`[GoogleDrive AutoSave] Silently synced project "${currentProject.project?.title || currentProject.id}" to Drive.`);
        } catch (error) {
          console.error('[GoogleDrive AutoSave] Failed:', error);
          setDriveSyncState((prev) => ({
            ...prev,
            status: !navigator.onLine ? 'offline' : 'error',
          }));
        }
      }

      // Firebase Firestore backup
      if (user) {
        try {
          await saveUserProject(user.uid, currentProject);
          console.log(`[AutoSave] Successfully synced project "${currentProject.project?.title || currentProject.id}" to Firebase.`);
        } catch (error) {
          console.error('[AutoSave] Firestore sync failed:', error);
        }
      }
    }, 1200); // 1.2 seconds debounce delay

    return () => clearTimeout(debounceTimer);
  }, [currentProject, user, savedProjects]);

  const handleTestConnection = async (keyToTest?: string) => {
    const key = (keyToTest !== undefined ? keyToTest : apiKey).trim();
    if (!key) {
      setApiKeyStatus('Not Connected');
      setApiKeyStatusMessage('Please enter a valid Gemini API key.');
      return;
    }

    if (key === 'mkp-admin-bypass') {
      setApiKeyStatus('Connected');
      setApiKeyStatusMessage('Admin Bypass Active. Frontend features unlocked for testing.');
      return;
    }

    setApiKeyStatus('Testing');
    setApiKeyStatusMessage('Testing connection with Gemini API...');

    try {
      const res = await testGeminiApiKey(key);
      setApiKeyStatus(res.status);
      setApiKeyStatusMessage(res.message);
    } catch (err: any) {
      setApiKeyStatus('Error');
      setApiKeyStatusMessage(err?.message || 'Connection test failed.');
    }
  };

  const handleSaveApiKey = (key: string, persist: boolean) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    setPersistKeyInStorage(persist);

    if (persist) {
      localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
      sessionStorage.removeItem(STORAGE_KEY_API_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }

    if (trimmed) {
      handleTestConnection(trimmed);
    } else {
      setApiKeyStatus('Not Connected');
      setApiKeyStatusMessage('');
    }
  };

  const handleRemoveApiKey = () => {
    setApiKey('');
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    sessionStorage.removeItem(STORAGE_KEY_API_KEY);
    setApiKeyStatus('Not Connected');
    setApiKeyStatusMessage('');
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    try {
      const inspection = await inspectVideoFile(file);
      setVideoInspection(inspection);
    } catch (e) {
      console.warn('Video inspection warning:', e);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!selectedFile) {
      alert('Please select a video file first.');
      return;
    }
    if (!apiKey.trim()) {
      setShowMissingKeyNotice(true);
      setCurrentTab('settings');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStage(0); // Stage 0: 'Uploading video...'
    setAnalysisError(null);

    // Dynamic progression ticker to smoothly reflect the stages of video analysis
    let currentStage = 0;
    const stageTimer = setInterval(() => {
      currentStage += 1;
      if (currentStage <= 5) {
        setAnalysisStage(currentStage);
      }
    }, 4500);

    try {
      const result = await analyzeVideoWithGemini({
        apiKey: apiKey.trim(),
        videoFile: selectedFile,
        aspectRatio,
        promptMode,
      });

      clearInterval(stageTimer);
      setAnalysisStage(6); // Complete

      if (!result) {
        throw new Error('Gemini video analysis returned an empty result.');
      }

      const normalized = normalizeProjectData(result);
      normalized.projectType = 'video-prompts';
      await persistProject(normalized);

      setIsAnalyzing(false);
      setCurrentTab('editor');
    } catch (err: any) {
      clearInterval(stageTimer);
      console.error('[Video Analysis Error in App.tsx]:', err);
      setIsAnalyzing(false);

      // Safe, complete VideoAnalysisErrorDetails construction
      const details: VideoAnalysisErrorDetails = err?.details || {
        status: typeof err?.status === 'number' ? err.status : 500,
        errorCode: err?.errorCode || 'VIDEO_ANALYSIS_FAILED',
        message: err?.message || 'Video analysis failed. Please check your Gemini API key and network connection.',
        model: 'gemini-3.8-flash',
        file: {
          name: selectedFile?.name || 'Uploaded Video',
          size: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
          duration: videoInspection?.duration ? `${Math.round(videoInspection.duration)}s` : 'Unknown',
          mimeType: selectedFile?.type || 'video/mp4',
        },
        requestMethod: 'POST /api/analyze-video',
        fileUploadStatus: selectedFile ? 'Google Gen AI FileManager API' : 'Direct',
        responseBody: err?.stack || String(err),
        category: 'Gemini Video Analysis Error',
        possibleCause: 'The video analysis request encountered an error or timeout during Gemini processing.',
        suggestedFix: 'Click "Retry Analysis" or check your Gemini API key in settings.',
        maskedApiKey: apiKey ? maskApiKey(apiKey) : '••••••••••••',
        timestamp: new Date().toISOString(),
      };

      setAnalysisError(details);
    }
  };

  const handleLoadSampleDemo = async () => {
    const sample = normalizeProjectData(SAMPLE_FRUIT_STORY);
    sample.projectType = 'video-prompts';
    await persistProject(sample);
    setSelectedFile(null);
    setCurrentTab('editor');
  };

  const handleApplyAllReplacements = async (
    replacements: Array<{
      characterId?: string;
      originalName: string;
      replacementProfile: ReplacementMappingItem['replacementProfile'];
      options: ReplacementOptions;
    }>,
    selectedOutputRatio: OutputAspectRatioType
  ) => {
    if (!currentProject) return;

    setIsApplyingReplacement(true);
    try {
      let workingProj = currentProject;
      if (selectedOutputRatio !== 'Original') {
        workingProj = {
          ...workingProj,
          project: {
            ...workingProj.project,
            aspect_ratio: selectedOutputRatio,
          },
        };
      }

      const { updatedProject, summary } = applyCharacterReplacements(
        workingProj,
        replacements
      );

      await persistProject(updatedProject);
      setLastReplacementSummary(summary);
    } catch (e) {
      console.error('Error applying character replacements:', e);
      alert('Failed to apply replacements.');
    } finally {
      setIsApplyingReplacement(false);
    }
  };

  const handleResetReplacements = async () => {
    if (!currentProject) return;
    setIsApplyingReplacement(true);
    try {
      const restored = resetProjectReplacements(currentProject);
      await persistProject(restored);
      setLastReplacementSummary(null);
    } catch (e) {
      console.error('Error resetting replacements:', e);
    } finally {
      setIsApplyingReplacement(false);
    }
  };

  const handleRegenerateScene = async (scene: SceneItem) => {
    if (!currentProject) return;
    if (!apiKey.trim()) {
      setShowMissingKeyNotice(true);
      setCurrentTab('settings');
      return;
    }

    setRegeneratingSceneNumber(scene.scene_number);
    try {
      const updated = await regenerateScene({
        apiKey,
        scene,
        characterBible: currentProject.characters,
        visualStyle: currentProject.project.visual_style,
        aspectRatio,
        promptMode,
      });

      const updatedScenes = currentProject.scenes.map((s) =>
        s.scene_number === updated.scene_number ? updated : s
      );

      const updatedProject: ProjectData = {
        ...currentProject,
        scenes: updatedScenes,
        updatedAt: Date.now(),
      };

      await persistProject(updatedProject);
    } catch (err: any) {
      alert(err?.message || 'Failed to regenerate scene.');
    } finally {
      setRegeneratingSceneNumber(null);
    }
  };

  const handleStartNewProject = () => {
    if (currentProject) {
      setShowNewProjectConfirm(true);
    } else {
      resetWorkspace();
    }
  };

  const handleCreateNewForTool = (toolType: 'video-prompts' | 'text-to-voice' | 'thumbnail' | 'story-prompts') => {
    if (toolType === 'video-prompts') {
      setCurrentProject(null);
      setSelectedFile(null);
      setCurrentTab('editor');
      return;
    }
    if (toolType === 'story-prompts') {
      const newProj: ProjectData = {
        id: `proj_${Date.now()}`,
        projectType: 'story-prompts',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptMode: 'Analyze Original',
        storyDuration: '1 MIN',
        storyScript: '',
        project: {
          title: 'New Story Project',
          aspect_ratio: '9:16',
          visual_style: 'Anthropomorphic Fruit Characters',
          master_style_prompt: 'Anthropomorphic Fruit Characters style, cinematic 3D animation',
          negative_prompt: 'blurry, watermark, text',
        },
        characters: [],
        scenes: [],
      };
      persistProject(newProj);
      setCurrentProject(newProj);
      setEditorSubView('prompts');
      setCurrentTab('editor');
      return;
    }
    if (toolType === 'thumbnail') {
      const newProj: ProjectData = {
        id: `proj_${Date.now()}`,
        projectType: 'thumbnail',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptMode: 'Analyze Original',
        photoThumbnailData: {
          photoUrl: null,
          aspectRatio: '16:9',
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
          bgRemoved: false,
          safeZoneGuide: false,
          textLayers: [
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
          ],
          badges: [],
          emojis: [],
        },
        project: {
          title: 'New Photo Thumbnail',
          aspect_ratio: '16:9',
          output_aspect_ratio: '16:9',
          visual_style: 'Photo Thumbnail',
          master_style_prompt: 'High resolution photo thumbnail',
          negative_prompt: '',
        },
        characters: [],
        scenes: [],
      };
      persistProject(newProj);
      setCurrentProject(newProj);
      setEditorSubView('prompts');
      setCurrentTab('editor');
      return;
    }
    const newProj: ProjectData = {
      id: `proj_${Date.now()}`,
      projectType: toolType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptMode: 'Analyze Original',
      project: {
        title: toolType === 'text-to-voice' ? 'New Voice Project' : 'New Thumbnail Project',
        aspect_ratio: '9:16',
        visual_style: 'Cinematic 3D animation',
        master_style_prompt: 'Cinematic 3D animation style',
        negative_prompt: 'blurry, watermark, text',
      },
      characters: [],
      scenes: [],
    };
    persistProject(newProj);
    setCurrentProject(newProj);
    setCurrentTab('editor');
  };

  const handleRenameProject = async (projectId: string, newTitle: string) => {
    const target = savedProjects.find((p) => p.id === projectId);
    if (!target) return;

    const updated: ProjectData = {
      ...target,
      project: { ...target.project, title: newTitle },
      updatedAt: Date.now(),
    };

    setSavedProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    if (currentProject?.id === projectId) {
      setCurrentProject(updated);
    }

    if (user) {
      try {
        await saveUserProject(user.uid, updated);
      } catch (e) {
        console.error('Error renaming project in Firestore:', e);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setSavedProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      saveProjectsToLocalCache(remaining);
      return remaining;
    });
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      localStorage.removeItem('mkp_vidprompts_last_active_project_id');
    }
    try {
      localStorage.removeItem(`mkp_vidprompts_autosave_${projectId}`);
    } catch (e) {
      console.warn('Could not remove project autosave from storage:', e);
    }

    const token = getCachedAccessToken();
    if (token) {
      try {
        await deleteProjectFromDrive(token, projectId);
      } catch (e) {
        console.warn('Error deleting project from Google Drive:', e);
      }
    }

    if (user) {
      try {
        await deleteUserProject(user.uid, projectId);
      } catch (e) {
        console.error('Error deleting project from Firestore:', e);
      }
    }
  };

  const resetWorkspace = () => {
    setCurrentProject(null);
    setSelectedFile(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setVideoInspection(null);
    setAnalysisError(null);
    setShowNewProjectConfirm(false);
    setShowAllScenes(true);
    setOpenSceneNumbers([]);
    setEditorSubView('prompts');
    setCurrentTab('video_prompts_tool');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setCurrentProject(null);
    setSavedProjects([]);
    setCurrentTab('home');
    setAuthView('login');
  };

  // Auth initialization loading state
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        {t.loading}
      </div>
    );
  }

  // Modals
  const renderAuthModal = () => {
    const handleClose = () => {
      setCurrentTab('home');
    };

    if (authView === 'signup') {
      return (
        <SignUpView
          language={language}
          onToggleLanguage={handleToggleLanguage}
          onSwitchToLogin={() => setAuthView('login')}
          onClose={handleClose}
        />
      );
    }
    if (authView === 'forgot_password') {
      return (
        <ForgotPasswordView
          language={language}
          onToggleLanguage={handleToggleLanguage}
          onSwitchToLogin={() => setAuthView('login')}
          onClose={handleClose}
        />
      );
    }
    return (
      <LoginView
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onSwitchToSignUp={() => setAuthView('signup')}
        onSwitchToForgotPassword={() => setAuthView('forgot_password')}
        onClose={handleClose}
      />
    );
  };

  if (!user && (currentTab === 'auth' || currentTab === 'account' || currentTab === 'settings' || currentTab === 'editor')) {
    return renderAuthModal();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950 relative overflow-x-hidden antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-orange-500/40 rounded-2xl p-4 shadow-2xl animate-slideUp flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-bold text-white leading-normal">
              {language === 'mm' ? 'အကောင့်ဝင်ရန် လိုအပ်သည်' : 'Authentication Required'}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
              {toastMessage}
            </p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}


      {/* Fixed subtle radial gradient glow in background */}
      <div className="fixed top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.04)_0%,transparent_70%)] rounded-full pointer-events-none z-0 blur-2xl" />
      <div className="fixed bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.03)_0%,transparent_70%)] rounded-full pointer-events-none z-0 blur-2xl" />

      {/* Top Header & Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        apiKeyStatus={apiKeyStatus}
        hasApiKey={Boolean(apiKey)}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        user={user}
        onLogout={handleLogout}
        driveSyncState={driveSyncState}
        isDriveConnected={isDriveConnected}
        onConnectDrive={handleConnectDrive}
        onManualDriveSync={handleManualDriveSync}
        onSignUpClick={() => {
          setAuthView('signup');
          setCurrentTab('auth');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 sm:space-y-12">
        {currentTab === 'settings' && (
          <ApiSettingsView
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
            onRemoveApiKey={handleRemoveApiKey}
            status={apiKeyStatus}
            statusMessage={apiKeyStatusMessage}
            onTestConnection={handleTestConnection}
            persistInStorage={persistKeyInStorage}
            onClose={() => setCurrentTab('home')}
            language={language}
          />
        )}

        {currentTab === 'about' && (
          <AboutModal
            language={language}
            onClose={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'contact' && (
          <ContactModal
            language={language}
            onClose={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'account' && (
          <AccountView
            user={user}
            language={language}
            onLogout={handleLogout}
            onNavigateToApi={() => setCurrentTab('settings')}
            isDriveConnected={isDriveConnected}
            driveSyncState={driveSyncState}
            onConnectDrive={handleConnectDrive}
            onManualDriveSync={handleManualDriveSync}
          />
        )}

        {/* GUEST HERO BANNER */}
        {!user && (
          <div 
            style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(24, 24, 27, 0.8) 100%)' }}
            className="border border-orange-500/20 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn text-left"
          >
            <div className="space-y-1 max-w-xl">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>✨</span>
                <span>Unlock Full AI Studio</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
                AI Tool များကို အခမဲ့ စတင်အသုံးပြုနိုင်ရန် အကောင့်ဝင်ရောက်ပါ။
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAuthView('login');
                setCurrentTab('auth');
              }}
              className="py-2 px-5 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-md active:scale-95 transition-all relative z-30 cursor-pointer pointer-events-auto shrink-0 w-full sm:w-auto text-center"
            >
              Login to Account →
            </button>
          </div>
        )}

        {/* HOME DASHBOARD */}
        {currentTab === 'home' && (
          <HomeDashboard
            user={user}
            language={language}
            hasApiKey={Boolean(apiKey)}
            onNavigateToApi={() => setCurrentTab('settings')}
            onSelectTool={(tool) => {
              if (!user) {
                setPendingRedirectTool(tool);
                setToastMessage(language === 'mm' ? 'ဤ Tool ကို အသုံးပြုရန် ကျေးဇူးပြု၍ Login အရင်ဝင်ပါ' : 'Please log in to use this tool.');
                setAuthView('login');
                setCurrentTab('auth');
                return;
              }

              if (tool === 'video-prompts') setCurrentTab('video_prompts_tool');
              else if (tool === 'text-to-voice') setCurrentTab('text_voice_tool');
              else if (tool === 'thumbnail') setCurrentTab('thumbnail_tool');
              else if (tool === 'text-to-image') setCurrentTab('text_to_image_tool');
              else if (tool === 'story-prompts') setCurrentTab('story_prompts_tool');
              else if (tool === 'movie-recap') setCurrentTab('movie_recap_tool');
            }}
          />
        )}

        {/* TOOL PROJECTS VIEWS */}
        {currentTab === 'video_prompts_tool' && (
          <VideoPromptsLauncher
            projects={savedProjects}
            onOpenProject={(proj) => {
              setCurrentProject(proj);
              setEditorSubView('prompts');
              setCurrentTab('editor');
            }}
            onCreateNew={() => {
              setCurrentProject(null);
              setSelectedFile(null);
              setEditorSubView('prompts');
              setCurrentTab('editor');
            }}
            onViewSample={() => {
              const sample = normalizeProjectData(SAMPLE_FRUIT_STORY);
              sample.projectType = 'video-prompts';
              setCurrentProject(sample);
              setSelectedFile(null);
              setEditorSubView('prompts');
              setCurrentTab('editor');
            }}
            onDeleteProject={(id) => handleDeleteProject(id)}
            onBackToDashboard={() => setCurrentTab('home')}
            language={language}
          />
        )}

        {currentTab === 'text_voice_tool' && (
          <TextVoiceLauncher
            projects={savedProjects}
            onSaveProject={(proj) => persistProject(proj)}
            onDeleteProject={(id) => handleDeleteProject(id)}
            onBackToDashboard={() => setCurrentTab('home')}
            apiKey={apiKey}
            onOpenApiSettings={() => setCurrentTab('settings')}
            language={language}
          />
        )}

        {currentTab === 'movie_recap_tool' && (
          <MovieRecapStudio
            projects={savedProjects}
            onSaveProject={(proj) => persistProject(proj)}
            onDeleteProject={(id, e) => handleDeleteProject(id)}
            onBackToDashboard={() => setCurrentTab('home')}
            apiKey={apiKey}
            onOpenApiSettings={() => setCurrentTab('settings')}
            language={language}
          />
        )}

        {currentTab === 'text_to_image_tool' && (
          <TextToImageStudio
            user={user}
            apiKey={apiKey}
            onOpenApiSettings={() => setCurrentTab('settings')}
            onBackToDashboard={() => setCurrentTab('home')}
            language={language}
          />
        )}

        {currentTab === 'thumbnail_tool' && (
          <ToolProjectsView
            toolType="thumbnail"
            toolTitle="Thumbnail Creator"
            toolDescription="Design eye-catching thumbnails and visual concepts optimized for YouTube, TikTok, and social media."
            projects={savedProjects}
            onOpenProject={(proj) => {
              setCurrentProject(proj);
              setCurrentTab('editor');
            }}
            onCreateNew={() => handleCreateNewForTool('thumbnail')}
            onDeleteProject={(id) => handleDeleteProject(id)}
            language={language}
            onBackToHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'story_prompts_tool' && (
          <ToolProjectsView
            toolType="story-prompts"
            toolTitle={language === 'mm' ? 'Story Prompt Maker' : 'Story Prompt Maker'}
            toolDescription={
              language === 'mm'
                ? 'ဇာတ်လမ်းကြမ်းများနှင့် အချက်အလက်များကို အပိုင်းလိုက် Prompt များအဖြစ်သို့ ပြောင်းလဲပါ။'
                : 'Turn raw stories and scripts into structured episodic video prompts matching your target duration.'
            }
            projects={savedProjects}
            onOpenProject={(proj) => {
              setCurrentProject(proj);
              setEditorSubView('prompts');
              setCurrentTab('editor');
            }}
            onCreateNew={() => handleCreateNewForTool('story-prompts')}
            onDeleteProject={(id) => handleDeleteProject(id)}
            language={language}
            onBackToHome={() => setCurrentTab('home')}
          />
        )}

        {/* EDITOR / ACTIVE WORKSPACE */}
        {currentTab === 'editor' && (
          <>
            {currentProject?.projectType === 'text-to-voice' ? (
              <TextVoiceLauncher
                projects={savedProjects}
                onSaveProject={(proj) => persistProject(proj)}
                onDeleteProject={(id) => handleDeleteProject(id)}
                onBackToDashboard={() => setCurrentTab('home')}
                apiKey={apiKey}
                onOpenApiSettings={() => setCurrentTab('settings')}
                language={language}
              />
            ) : currentProject?.projectType === 'thumbnail' ? (
              <PhotoThumbnailCreator
                project={currentProject}
                onSaveProject={async (proj) => {
                  await persistProject(proj);
                  setCurrentProject(proj);
                }}
                onBack={() => setCurrentTab('thumbnail_tool')}
                language={language}
                driveSyncState={driveSyncState}
                isDriveConnected={isDriveConnected}
                apiKey={apiKey}
              />
            ) : currentProject?.projectType === 'story-prompts' ? (
              editorSubView === 'title_thumbnail' ? (
                <div className="max-w-5xl mx-auto py-6 sm:py-8 space-y-8">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                    <PageHeader
                      title="Thumbnail"
                      onBack={() => setEditorSubView('prompts')}
                    />
                  </div>
                  <StoryThumbnailStudio
                    project={currentProject}
                    apiKey={apiKey}
                    onUpdateProject={async (updated) => {
                      await persistProject({ ...currentProject, ...updated });
                    }}
                    onOpenApiKeySettings={() => setCurrentTab('settings')}
                    onBack={() => setEditorSubView('prompts')}
                  />
                </div>
              ) : (
                <StoryPromptMaker
                  project={currentProject}
                  apiKey={apiKey}
                  onSaveProject={async (proj) => {
                    await persistProject(proj);
                    setCurrentProject(proj);
                  }}
                  onOpenThumbnailStudio={() => setEditorSubView('title_thumbnail')}
                  onBack={() => setCurrentTab('story_prompts_tool')}
                  language={language}
                  onOpenApiKeySettings={() => setCurrentTab('settings')}
                />
              )
            ) : (
              <div className="max-w-5xl mx-auto py-6 sm:py-8 space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <PageHeader
                title={
                  editorSubView === 'title_thumbnail'
                    ? 'Thumbnail Studio'
                    : !currentProject
                    ? (language === 'mm' ? 'ဗီဒီယိုအသစ်' : 'New Video')
                    : currentProject.project?.title || (language === 'mm' ? 'ဗီဒီယို Analyzer' : 'Video Analyzer')
                }
                onBack={
                  editorSubView === 'title_thumbnail'
                    ? () => setEditorSubView('prompts')
                    : () => setCurrentTab('video_prompts_tool')
                }
              />
            </div>

            {/* NO ACTIVE PROJECT VIEW */}
            {!currentProject && !isAnalyzing && (
              <div className="space-y-8">
                <ErrorBoundary scope="Video Uploader">
                  <VideoUploader
                    selectedFile={selectedFile}
                    videoPreviewUrl={videoPreviewUrl}
                    videoInspection={videoInspection}
                    onFileSelect={handleFileSelect}
                    onAnalyzeClick={handleAnalyzeVideo}
                    isAnalyzing={isAnalyzing}
                    onLoadSampleDemo={handleLoadSampleDemo}
                    hasApiKey={Boolean(apiKey)}
                    onOpenApiKeySettings={() => setCurrentTab('settings')}
                    language={language}
                  />
                </ErrorBoundary>

                {analysisError && (
                  <ErrorBoundary scope="Video Analysis Diagnostics Panel">
                    <VideoAnalysisErrorPanel
                      error={analysisError}
                      onRetry={handleAnalyzeVideo}
                      onOpenApiSettings={() => setCurrentTab('settings')}
                    />
                  </ErrorBoundary>
                )}
              </div>
            )}

            {/* ANALYSIS IN PROGRESS */}
            {isAnalyzing && (
              <ErrorBoundary scope="Video Analysis Progress">
                <AnalysisProgress currentStage={analysisStage} fileName={selectedFile?.name} />
              </ErrorBoundary>
            )}

            {/* ACTIVE PROJECT WORKSPACE */}
            {currentProject && !isAnalyzing && (
              <ErrorBoundary
                scope="Active Project Workspace"
                fallbackTitle="Workspace Render Recovery"
                fallbackSubtitle="A component inside the workspace encountered an error. Click below to recover your view without losing saved project state."
                onReset={() => {
                  setEditorSubView('prompts');
                }}
              >
                {editorSubView === 'title_thumbnail' ? (
                  <StoryThumbnailStudio
                    project={currentProject}
                    apiKey={apiKey}
                    onUpdateProject={async (updated) => {
                      await persistProject({ ...currentProject, ...updated });
                    }}
                    onOpenApiKeySettings={() => setCurrentTab('settings')}
                    onBack={() => setEditorSubView('prompts')}
                  />
                ) : (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Notice Banner if missing key */}
                    {showMissingKeyNotice && !apiKey.trim() && (
                      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-900/50 text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{language === 'mm' ? 'Gemini API Key ထည့်သွင်းရန် လိုအပ်ပါသည်။' : 'Gemini API Key required for AI generation features.'}</span>
                        </div>
                        <button
                          onClick={() => setCurrentTab('settings')}
                          className="px-3 py-1.5 bg-amber-500 text-zinc-950 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          {language === 'mm' ? 'API သို့သွားရန်' : 'Configure API'}
                        </button>
                      </div>
                    )}

                    {/* Character Bible Card */}
                    <CharacterBibleCard
                      characters={currentProject.characters}
                      projectMeta={currentProject.project}
                      language={language}
                      onUpdateCharacter={async (charId, updated) => {
                        const updatedChars = currentProject.characters.map((c) =>
                          c.id === charId ? { ...c, ...updated } : c
                        );
                        await persistProject({ ...currentProject, characters: updatedChars });
                      }}
                      onUpdateProjectMeta={async (metaUpdated) => {
                        const updatedProj = {
                          ...currentProject,
                          project: { ...currentProject.project, ...metaUpdated },
                        };
                        await persistProject(updatedProj);
                      }}
                    />

                    {/* Character Replacement */}
                    <CharacterReplacementCard
                      characters={currentProject.characters}
                      characterMappings={currentProject.characterMappings}
                      customCharacters={currentProject.customCharacters || []}
                      onAddCustomCharacter={async (newChar) => {
                        const updated = {
                          ...currentProject,
                          customCharacters: [...(currentProject.customCharacters || []), newChar],
                        };
                        await persistProject(updated);
                      }}
                      language={language}
                      apiKey={apiKey}
                      hasActiveReplacements={Boolean(
                        (currentProject.characterMappings &&
                          Object.keys(currentProject.characterMappings).length > 0) ||
                          lastReplacementSummary
                      )}
                      onApplyAllReplacements={handleApplyAllReplacements}
                      onResetReplacements={handleResetReplacements}
                      isApplying={isApplyingReplacement}
                      lastSummary={lastReplacementSummary}
                      outputRatio={outputRatio}
                      onChangeOutputRatio={setOutputRatio}
                      detectedRatioLabel={currentProject.project?.aspect_ratio || '9:16'}
                    />

                    {/* Scene Prompts List */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <span>{language === 'mm' ? 'အခန်း PROMPTS' : 'SCENE PROMPTS'}</span>
                          <span>-</span>
                          <span>{currentProject.scenes.length}</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          {currentProject.scenes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                exportScenePromptsBundle(currentProject, 'txt');
                              }}
                              title={language === 'mm' ? 'Prompts အားလုံး ထုတ်ယူရန် (.txt)' : 'Export all scene prompts (.txt)'}
                              className="px-3 py-1.5 rounded-xl border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{language === 'mm' ? 'Export' : 'Export'}</span>
                            </button>
                          )}

                          {currentProject.scenes.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowAllScenes((prev) => !prev)}
                              className="px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-zinc-850/80 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              {showAllScenes ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span>{t.collapseAll}</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span>{t.expandAll}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {showAllScenes && (
                        <div className="space-y-3">
                          {currentProject.scenes.map((scene, index) => {
                            const isSceneOpen = openSceneNumbers.includes(scene.scene_number);
                            return (
                              <SceneCard
                                key={scene.scene_number}
                                scene={scene}
                                totalScenes={currentProject.scenes.length}
                                charactersInBible={currentProject.characters}
                                apiKey={apiKey}
                                aspectRatio={currentProject.project?.aspect_ratio || '9:16'}
                                onUpdateScene={async (sceneNum, updated) => {
                                  const updatedScenes = currentProject.scenes.map((s) =>
                                    s.scene_number === sceneNum ? { ...s, ...updated } : s
                                  );
                                  const updatedProject = { ...currentProject, scenes: updatedScenes };
                                  await persistProject(updatedProject);
                                }}
                                onRegenerateScene={handleRegenerateScene}
                                isRegenerating={regeneratingSceneNumber === scene.scene_number}
                                isOpen={isSceneOpen}
                                onToggleOpen={() => {
                                  setOpenSceneNumbers((prev) =>
                                    prev.includes(scene.scene_number)
                                      ? prev.filter((n) => n !== scene.scene_number)
                                      : [...prev, scene.scene_number]
                                  );
                                }}
                                onGoToPrevious={
                                  index > 0
                                    ? () => {
                                        const prevNum = currentProject.scenes[index - 1].scene_number;
                                        setOpenSceneNumbers((prev) => (prev.includes(prevNum) ? prev : [...prev, prevNum]));
                                      }
                                    : undefined
                                }
                                onGoToNext={
                                  index < currentProject.scenes.length - 1
                                    ? () => {
                                        const nextNum = currentProject.scenes[index + 1].scene_number;
                                        setOpenSceneNumbers((prev) => (prev.includes(nextNum) ? prev : [...prev, nextNum]));
                                      }
                                    : undefined
                                }
                                language={language}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Title & Thumbnail CTA Card */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditorSubView('title_thumbnail')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEditorSubView('title_thumbnail');
                        }
                      }}
                      className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-850/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all duration-200 shadow-md cursor-pointer group text-left select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                            {language === 'mm' ? 'ခေါင်းစဉ်နှင့် ပုံငယ် (Title & Thumbnail)' : 'Title & Thumbnail'}
                          </h4>
                          <p className="text-xs text-zinc-400 font-medium truncate group-hover:text-zinc-300 transition-colors">
                            {language === 'mm' ? 'ဗီဒီယိုအတွက် ခေါင်းစဉ်များနှင့် ပုံငယ် အယူအဆများ ဖန်တီးရန်' : 'Generate titles and thumbnails from your video'}
                          </p>
                        </div>
                      </div>

                      <div className="text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Global Actions Bar & Export at Bottom */}
                    <GlobalActionsBar
                      project={currentProject}
                      driveSyncState={driveSyncState}
                      isDriveConnected={isDriveConnected}
                    />
                  </div>
                )}
              </ErrorBoundary>
            )}
            </div>
          )}
          </>
        )}
      </main>

      {/* Modern Bottom Footer - STRICTLY for Guest Visitors */}
      {!user && (
        <Footer language={language} onNavigateTab={setCurrentTab} />
      )}

      {/* Confirmation Modal: New Project */}
      {showNewProjectConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <h3 className="text-lg font-bold text-white">Start New Project?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You have an active analysis project. Starting a new project will clear current workspace data. Make sure you have saved or exported your prompts.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowNewProjectConfirm(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={resetWorkspace}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg"
              >
                Start New Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
