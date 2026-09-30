import { ProjectData } from '../types';

export const APP_DRIVE_FOLDER_NAME = 'MKP VidPrompts Master Projects';
const MANIFEST_FILE_NAME = 'projects_manifest.json';
const LOCAL_CACHE_KEY = 'mkp_drive_projects_cache';
const LOCAL_LAST_ACTIVE_ID_KEY = 'mkp_vidprompts_last_active_project_id';

// In-memory cache to prevent redundant Drive folder lookups
let cachedFolderId: string | null = null;
const cachedFileIds = new Map<string, string>(); // projectId -> driveFileId
let cachedManifestFileId: string | null = null;

export interface DriveSyncStatusType {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'not_connected';
  lastSyncedAt: Date | null;
  message?: string;
}

/**
 * Remove undefined values recursively before JSON stringifying
 */
export const sanitizeForDrive = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map((i) => sanitizeForDrive(i));
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      return obj;
    }
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        clean[key] = sanitizeForDrive(obj[key]);
      }
    }
    return clean;
  }
  return obj;
};

/**
 * Get or create the dedicated app folder in Google Drive
 */
export const getOrCreateAppFolder = async (accessToken: string): Promise<string> => {
  if (cachedFolderId) return cachedFolderId;

  try {
    // Search for existing folder
    const query = encodeURIComponent(
      `name = '${APP_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      throw new Error(`Failed to search Google Drive folders: ${err}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      cachedFolderId = searchData.files[0].id;
      return cachedFolderId!;
    }

    // Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: APP_DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Auto-sync folder for MKP VidPrompts Master projects',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create Google Drive folder: ${err}`);
    }

    const createData = await createRes.json();
    cachedFolderId = createData.id;
    return cachedFolderId!;
  } catch (error) {
    console.error('[GoogleDrive] Error getting app folder:', error);
    throw error;
  }
};

/**
 * Save a single project to Google Drive (create or update file)
 */
export const saveProjectToDrive = async (
  accessToken: string,
  project: ProjectData
): Promise<{ fileId: string; modifiedTime?: string }> => {
  const folderId = await getOrCreateAppFolder(accessToken);
  const cleanProject = sanitizeForDrive({
    ...project,
    updatedAt: Date.now(),
  });
  const projectJson = JSON.stringify(cleanProject, null, 2);
  const targetFileName = `project_${project.id}.json`;

  let fileId = cachedFileIds.get(project.id);

  // If not cached, look up file in Drive folder
  if (!fileId) {
    const q = encodeURIComponent(
      `'${folderId}' in parents and name = '${targetFileName}' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        fileId = data.files[0].id;
        cachedFileIds.set(project.id, fileId!);
      }
    }
  }

  if (fileId) {
    // Update existing file
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: projectJson,
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Failed to update project file on Drive: ${err}`);
    }

    const updateData = await updateRes.json();
    return { fileId: updateData.id, modifiedTime: updateData.modifiedTime };
  } else {
    // Create new file using multipart upload
    const boundary = '-------mkp_vidprompts_boundary_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: targetFileName,
      mimeType: 'application/json',
      parents: [folderId],
      description: `Project: ${project.project?.title || project.id}`,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      projectJson +
      closeDelimiter;

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create project file on Drive: ${err}`);
    }

    const createData = await createRes.json();
    cachedFileIds.set(project.id, createData.id);
    return { fileId: createData.id };
  }
};

/**
 * Save / Update the projects manifest in Drive
 */
export const updateDriveManifest = async (
  accessToken: string,
  lastActiveProjectId: string,
  allProjectIds: string[]
): Promise<void> => {
  try {
    const folderId = await getOrCreateAppFolder(accessToken);
    const manifestData = {
      lastActiveProjectId,
      allProjectIds,
      updatedAt: Date.now(),
      appName: 'MKP VidPrompts Master',
    };
    const jsonStr = JSON.stringify(manifestData, null, 2);

    let manifestId = cachedManifestFileId;
    if (!manifestId) {
      const q = encodeURIComponent(
        `'${folderId}' in parents and name = '${MANIFEST_FILE_NAME}' and trashed = false`
      );
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          manifestId = data.files[0].id;
          cachedManifestFileId = manifestId;
        }
      }
    }

    if (manifestId) {
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${manifestId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: jsonStr,
        }
      );
    } else {
      const boundary = '-------mkp_manifest_boundary_' + Date.now();
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: MANIFEST_FILE_NAME,
        mimeType: 'application/json',
        parents: [folderId],
      };

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonStr +
        closeDelimiter;

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );
      if (res.ok) {
        const d = await res.json();
        cachedManifestFileId = d.id;
      }
    }
  } catch (err) {
    console.warn('[GoogleDrive] Non-fatal manifest update error:', err);
  }
};

/**
 * Fetch all projects and last active state from Google Drive
 */
export const fetchProjectsFromDrive = async (
  accessToken: string
): Promise<{ projects: ProjectData[]; lastActiveProjectId: string | null }> => {
  const folderId = await getOrCreateAppFolder(accessToken);

  // List all files in the app folder
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,createdTime)&pageSize=100&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    throw new Error(`Failed to list files from Drive: ${err}`);
  }

  const listData = await listRes.json();
  const files: Array<{ id: string; name: string }> = listData.files || [];

  let lastActiveProjectId: string | null = null;
  const projectFiles: Array<{ id: string; name: string }> = [];

  for (const f of files) {
    if (f.name === MANIFEST_FILE_NAME) {
      cachedManifestFileId = f.id;
      try {
        const manRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (manRes.ok) {
          const manData = await manRes.json();
          if (manData.lastActiveProjectId) {
            lastActiveProjectId = manData.lastActiveProjectId;
          }
        }
      } catch (e) {
        console.warn('Error reading manifest file:', e);
      }
    } else if (f.name.startsWith('project_') && f.name.endsWith('.json')) {
      projectFiles.push(f);
    }
  }

  // Fetch all project files in parallel
  const fetchedProjects: ProjectData[] = [];
  await Promise.all(
    projectFiles.map(async (file) => {
      try {
        const contentRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (contentRes.ok) {
          const proj: ProjectData = await contentRes.json();
          if (proj && proj.id) {
            cachedFileIds.set(proj.id, file.id);
            fetchedProjects.push(proj);
          }
        }
      } catch (e) {
        console.warn(`Error reading project file ${file.name}:`, e);
      }
    })
  );

  // Sort by updatedAt descending
  fetchedProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (!lastActiveProjectId && fetchedProjects.length > 0) {
    lastActiveProjectId = fetchedProjects[0].id;
  }

  return { projects: fetchedProjects, lastActiveProjectId };
};

/**
 * Delete a project file from Google Drive
 */
export const deleteProjectFromDrive = async (
  accessToken: string,
  projectId: string
): Promise<void> => {
  const folderId = await getOrCreateAppFolder(accessToken);
  let fileId = cachedFileIds.get(projectId);

  if (!fileId) {
    const q = encodeURIComponent(
      `'${folderId}' in parents and name = 'project_${projectId}.json' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        fileId = data.files[0].id;
      }
    }
  }

  if (fileId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    cachedFileIds.delete(projectId);
  }
};

/**
 * Smart Local Caching Layer
 */
export const saveProjectsToLocalCache = (
  projects: ProjectData[],
  lastActiveProjectId?: string
) => {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(projects));
    if (lastActiveProjectId) {
      localStorage.setItem(LOCAL_LAST_ACTIVE_ID_KEY, lastActiveProjectId);
    }
  } catch (err) {
    console.warn('[Cache] Failed to save projects to localStorage:', err);
  }
};

export const loadProjectsFromLocalCache = (): {
  projects: ProjectData[];
  lastActiveProjectId: string | null;
} => {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    const lastActiveProjectId = localStorage.getItem(LOCAL_LAST_ACTIVE_ID_KEY);
    if (raw) {
      const projects = JSON.parse(raw);
      if (Array.isArray(projects)) {
        return { projects, lastActiveProjectId };
      }
    }
  } catch (err) {
    console.warn('[Cache] Failed to load projects from localStorage:', err);
  }
  return { projects: [], lastActiveProjectId: null };
};
