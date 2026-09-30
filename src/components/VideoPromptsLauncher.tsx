import React from 'react';
import { ArrowLeft, Trash2, ArrowRight, Video, Calendar, Film } from 'lucide-react';
import { ProjectData } from '../types';
import { Language, translations } from '../utils/i18n';
import { CreationCard } from './CreationCard';
import { PageHeader } from './PageHeader';

interface VideoPromptsLauncherProps {
  projects: ProjectData[];
  onOpenProject: (project: ProjectData) => void;
  onCreateNew: () => void;
  onViewSample: () => void;
  onDeleteProject: (projectId: string, e: React.MouseEvent) => void;
  onBackToDashboard: () => void;
  language: Language;
}

export const VideoPromptsLauncher: React.FC<VideoPromptsLauncherProps> = ({
  projects,
  onOpenProject,
  onCreateNew,
  onViewSample,
  onDeleteProject,
  onBackToDashboard,
  language,
}) => {
  const t = translations[language];

  // Strictly filter only projects created by video-prompts (or legacy default)
  const videoProjects = projects.filter((p) => {
    if (!p.projectType) return true;
    return p.projectType === 'video-prompts';
  });

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* 1. TOP AREA: Page Header with Circular Back Button */}
      <PageHeader
        title={language === 'mm' ? 'ဗီဒီယို Analyzer' : 'Video Analyzer'}
        onBack={onBackToDashboard}
      />

      {/* 2. ACTION BUTTONS: Large creation card */}
      <div className="space-y-4">
        <CreationCard
          title="New Video"
          subtitle="Upload a video and generate AI prompts"
          onClick={onCreateNew}
        />
        <div className="flex justify-center">
          <button
            onClick={onViewSample}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 font-bold rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            View Sample Demo
          </button>
        </div>
      </div>

      {/* 3. RECENT PROJECTS SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Recent Projects
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-850 text-zinc-400 font-mono">
            {videoProjects.length}
          </span>
        </div>

        {/* 4. RECENT PROJECT CARDS / 5. EMPTY STATE */}
        {videoProjects.length === 0 ? (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 sm:p-10 text-center space-y-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-500 mx-auto">
              <Film className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-300">No projects yet.</p>
              <p className="text-xs text-zinc-500">Create your first video prompts project or view the sample.</p>
            </div>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Create New
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {videoProjects.map((proj) => {
              const sceneCount = proj.scenes?.length || 0;
              const charCount = proj.characters?.length || 0;
              const ratio = proj.project?.aspect_ratio || '9:16';
              const dateStr = new Date(proj.updatedAt || proj.createdAt || Date.now()).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              // Check if project has an image/thumbnail reference or character avatar
              const previewImg =
                proj.thumbnail?.imageUrl ||
                proj.characters?.find((c) => c.reference_image_url)?.reference_image_url ||
                null;

              return (
                <div
                  key={proj.id}
                  onClick={() => onOpenProject(proj)}
                  className="group bg-zinc-900/90 hover:bg-zinc-850/95 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  <div className="space-y-2.5">
                    {/* Project Thumbnail & Title Header */}
                    <div className="flex items-start gap-3">
                      {previewImg ? (
                        <img
                          src={previewImg}
                          alt={proj.project?.title || 'Project'}
                          className="w-12 h-12 rounded-xl object-cover border border-zinc-700/50 bg-zinc-950 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <Video className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {proj.project?.title || 'Untitled Project'}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onDeleteProject(proj.id, e);
                            }}
                            className="p-1 -mr-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors shrink-0"
                            title={t.deleteProject || 'Delete project'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Metadata: 3 Scenes · 2 Characters · 9:16 */}
                        <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                          {sceneCount} Scenes · {charCount} Characters · {ratio}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Updated Date & Open → */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 font-medium">
                      Updated {dateStr}
                    </span>
                    <span className="font-bold text-amber-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all inline-flex items-center gap-1">
                      Open →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
