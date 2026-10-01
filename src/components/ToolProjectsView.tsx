import React from 'react';
import { Plus, FolderOpen, Trash2, ArrowRight, Video, Mic, Image as ImageIcon, BookOpen, Clock, Calendar } from 'lucide-react';
import { ProjectData } from '../types';
import { Language, translations } from '../utils/i18n';
import { isProjectEmpty } from '../utils/projectValidation';
import { CreationCard } from './CreationCard';
import { PageHeader } from './PageHeader';

interface ToolProjectsViewProps {
  toolType: 'video-prompts' | 'text-to-voice' | 'thumbnail' | 'story-prompts';
  toolTitle: string;
  toolDescription: string;
  projects: ProjectData[];
  onOpenProject: (project: ProjectData) => void;
  onCreateNew: () => void;
  onDeleteProject: (projectId: string, e: React.MouseEvent) => void;
  language: Language;
  onBackToHome: () => void;
}

export const ToolProjectsView: React.FC<ToolProjectsViewProps> = ({
  toolType,
  toolTitle,
  toolDescription,
  projects,
  onOpenProject,
  onCreateNew,
  onDeleteProject,
  language,
  onBackToHome,
}) => {
  const t = translations[language];

  // Filter projects strictly by projectType and exclude empty projects
  const filteredProjects = projects.filter((p) => {
    if (isProjectEmpty(p)) {
      return false;
    }
    if (!p.projectType) {
      // Default legacy projects go to video-prompts
      return toolType === 'video-prompts';
    }
    return p.projectType === toolType;
  });

  const getToolIcon = () => {
    switch (toolType) {
      case 'video-prompts':
        return Video;
      case 'text-to-voice':
        return Mic;
      case 'thumbnail':
        return ImageIcon;
      case 'story-prompts':
        return BookOpen;
      default:
        return FolderOpen;
    }
  };

  const Icon = getToolIcon();

  const getCardDetails = () => {
    if (toolType === 'thumbnail') {
      return {
        title: 'New Thumbnail',
        subtitle: 'Photo-Only Thumbnail Creator & Typography Studio',
      };
    } else {
      return {
        title: 'New Story',
        subtitle: 'Turn your story into AI video prompts',
      };
    }
  };

  const cardDetails = getCardDetails();

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* 1. Clean Top Navigation Bar Title with Circular Back Arrow */}
      <PageHeader title={toolTitle} onBack={onBackToHome} />

      {/* 2. Primary Action Card - Immediately positioned right below top navigation */}
      <CreationCard
        title={cardDetails.title}
        subtitle={cardDetails.subtitle}
        onClick={onCreateNew}
      />

      {/* 3. Recent Projects Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>{t.recentProjects}</span>
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-850 text-zinc-400 font-mono">
            {filteredProjects.length}
          </span>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 sm:p-10 text-center space-y-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-500 mx-auto">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-300">{t.noProjectsYet}</h3>
              <p className="text-xs text-zinc-500">
                {language === 'mm'
                  ? 'ပရောဂျက်အသစ်စတင်ရန် အပေါ်ရှိကတ်ကို နှိပ်ပါ။'
                  : 'Tap the card above to get started with your first project.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredProjects.map((proj) => {
              const sceneCount = proj.scenes?.length || 0;
              const charCount = proj.characters?.length || 0;
              const ratio = proj.project?.aspect_ratio || '9:16';
              const updatedDate = new Date(proj.updatedAt || proj.createdAt || Date.now()).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              // Check if project has an image/thumbnail reference
              const previewImg =
                proj.photoThumbnailData?.photoUrl ||
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
                    {/* Project Header with Thumbnail & Title */}
                    <div className="flex items-start gap-3">
                      {previewImg ? (
                        <img
                          src={previewImg}
                          alt={proj.project?.title || 'Project'}
                          className="w-12 h-12 rounded-xl object-cover border border-zinc-700/50 bg-zinc-950 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {proj.project?.title || (toolType === 'thumbnail' ? 'Untitled Thumbnail' : 'Untitled Project')}
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

                        {/* Metadata row */}
                        <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                          {toolType === 'thumbnail' ? (
                            proj.photoThumbnailData?.aspectRatio || '16:9 Landscape'
                          ) : proj.projectType === 'text-to-voice' ? (
                            proj.textVoiceData?.selectedVoice ? proj.textVoiceData.selectedVoice.replace('_', ' ').toUpperCase() : 'VOICE'
                          ) : (
                            `${sceneCount} Scenes · ${charCount} Characters · ${ratio}`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Date & Open */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 font-medium">
                      Updated {updatedDate}
                    </span>
                    <span className="font-bold text-amber-400 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all inline-flex items-center gap-1">
                      {t.open || 'Open'} <ArrowRight className="w-3 h-3" />
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

