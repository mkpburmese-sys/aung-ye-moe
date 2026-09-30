import React, { useState } from 'react';
import { Copy, Check, Download, FileText, Code, FileCode, Sparkles, ChevronDown } from 'lucide-react';
import { ProjectData } from '../types';
import {
  copyToClipboard,
  downloadFile,
  exportScenePromptsBundle,
  generateMarkdownExport,
  generatePlainTextExport,
} from '../utils/exportUtils';
import { DriveSyncStatusType } from '../services/googleDriveService';
import { DriveSyncStatus } from './DriveSyncStatus';

interface GlobalActionsBarProps {
  project: ProjectData;
  driveSyncState?: DriveSyncStatusType;
  isDriveConnected?: boolean;
}

export const GlobalActionsBar: React.FC<GlobalActionsBarProps> = ({
  project,
  driveSyncState,
  isDriveConnected,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyAllVideoPrompts = async () => {
    const text = project.scenes
      .map(
        (s) =>
          `SCENE ${String(s.scene_number).padStart(2, '0')}:\n${s.video_prompt}`
      )
      .join('\n\n--------------------\n\n');
    await copyToClipboard(text);
    showToast('Copied all video prompts');
    setShowExportMenu(false);
  };

  const handleCopyAllImagePrompts = async () => {
    const text = project.scenes
      .map(
        (s) =>
          `SCENE ${String(s.scene_number).padStart(2, '0')} — CHARACTER IMAGE PROMPT:\n${s.character_image_prompt}`
      )
      .join('\n\n--------------------\n\n');
    await copyToClipboard(text);
    showToast('Copied all character image prompts');
    setShowExportMenu(false);
  };

  const handleCopyEverything = async () => {
    const text = generatePlainTextExport(project);
    await copyToClipboard(text);
    showToast('Copied everything');
    setShowExportMenu(false);
  };

  const handleExportTxt = () => {
    const text = generatePlainTextExport(project);
    const filename = `${project.project.title.replace(/\s+/g, '_')}_prompts.txt`;
    downloadFile(text, filename, 'text/plain;charset=utf-8');
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    const md = generateMarkdownExport(project);
    const filename = `${project.project.title.replace(/\s+/g, '_')}_prompts.md`;
    downloadFile(md, filename, 'text/markdown;charset=utf-8');
    setShowExportMenu(false);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const filename = `${project.project.title.replace(/\s+/g, '_')}_data.json`;
    downloadFile(jsonStr, filename, 'application/json;charset=utf-8');
    setShowExportMenu(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
      {toastMessage && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-fadeIn z-50">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minimalist Project Summary */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {project.project.title}
          </h4>
          {driveSyncState && (
            <DriveSyncStatus
              syncState={driveSyncState}
              isConnected={isDriveConnected ?? true}
              compact
            />
          )}
        </div>
        <p className="text-xs text-zinc-400 font-medium">
          {project.scenes.length} Scenes · {project.characters.length} Characters · <span className="font-mono text-amber-400">{project.project.aspect_ratio}</span>
        </p>
      </div>

      {/* Export Action Controls */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto relative">
        <button
          type="button"
          onClick={() => {
            const filename = exportScenePromptsBundle(project, 'txt');
            showToast(`Exported ${filename}`);
          }}
          className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          title="Directly download all scene prompts as a text file"
        >
          <Download className="w-4 h-4" />
          <span>Export All Prompts (.txt)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="px-2.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Additional export formats (JSON, Markdown, Copy)"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {showExportMenu && (
          <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-fadeIn">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
              Download Files
            </div>
            <button
              type="button"
              onClick={handleExportTxt}
              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Text (.txt)</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download JSON (.json)</span>
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-orange-400" />
              <span>Download Markdown (.md)</span>
            </button>

            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-900 pt-2">
              Copy Options
            </div>
            <button
              type="button"
              onClick={handleCopyAllVideoPrompts}
              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Copy All Video Prompts</span>
            </button>
            <button
              type="button"
              onClick={handleCopyAllImagePrompts}
              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-orange-400" />
              <span>Copy All Image Prompts</span>
            </button>
            <button
              type="button"
              onClick={handleCopyEverything}
              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:text-white hover:bg-zinc-900 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Copy Everything to Clipboard</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
