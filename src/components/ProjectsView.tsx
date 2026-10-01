import React, { useState } from 'react';
import { FolderOpen, PlusCircle, Trash2, Calendar, Film, ArrowRight, MoreVertical, Edit2 } from 'lucide-react';
import { ProjectData } from '../types';
import { Language, translations } from '../utils/i18n';
import { isProjectEmpty } from '../utils/projectValidation';

interface ProjectsViewProps {
  currentProject: ProjectData | null;
  savedProjects: ProjectData[];
  language?: Language;
  onLoadProject: (project: ProjectData) => void;
  onDeleteProject: (projectId: string) => void;
  onStartNewProject: () => void;
  onRenameProject?: (projectId: string, newTitle: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  currentProject,
  savedProjects,
  language = 'mm',
  onLoadProject,
  onDeleteProject,
  onStartNewProject,
  onRenameProject,
}) => {
  const t = translations[language];
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Sort saved projects by updated/created descending (most recent first) and exclude empty projects
  const sortedProjects = [...savedProjects]
    .filter((p) => !isProjectEmpty(p))
    .sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || 0;
      const timeB = b.updatedAt || b.createdAt || 0;
      return timeB - timeA;
    });

  const handleStartRename = (proj: ProjectData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(proj.id);
    setEditTitleText(proj.project.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (projectId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitleText.trim() && onRenameProject) {
      onRenameProject(projectId, editTitleText.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.projectsTitle}
          </h2>
        </div>

        <button
          onClick={onStartNewProject}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.newProjectButton}</span>
        </button>
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          {t.recentProjects} ({sortedProjects.length})
        </h3>

        {sortedProjects.length === 0 ? (
          <div className="p-10 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3">
            <Film className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-sm font-semibold text-zinc-300">
              {t.noSavedProjects}
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {t.noSavedProjectsDesc}
            </p>
            <button
              onClick={onStartNewProject}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.newProjectButton}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedProjects.map((proj) => {
              const isCurrent = currentProject?.id === proj.id;
              const dateStr = new Date(proj.updatedAt || proj.createdAt).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
              );
              const isEditing = editingId === proj.id;

              return (
                <div
                  key={proj.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-zinc-900 border transition-all space-y-3 relative ${
                    isCurrent
                      ? 'border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveRename(proj.id, e)} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitleText}
                            onChange={(e) => setEditTitleText(e.target.value)}
                            className="w-full px-2.5 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs font-semibold"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-amber-500 text-zinc-950 font-bold rounded-lg text-xs"
                          >
                            Save
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm sm:text-base truncate">
                            {proj.project.title}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Overflow menu / actions */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDeleteProject(proj.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata info */}
                  <div className="text-xs text-zinc-400 flex items-center gap-2 sm:gap-3 pt-1 border-t border-zinc-800/60 flex-wrap">
                    <span>{proj.scenes.length} Scenes</span>
                    <span>·</span>
                    <span>{proj.characters.length} Characters</span>
                    <span>·</span>
                    <span className="text-amber-400 font-mono">{proj.project.aspect_ratio}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                      {proj.videoFileName || 'Video Analysis'}
                    </span>
                    <button
                      onClick={() => onLoadProject(proj)}
                      className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>{t.openProject}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
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
