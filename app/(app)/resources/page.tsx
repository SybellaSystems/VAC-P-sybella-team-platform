'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Folder,
  FolderPlus,
  FilePlus2,
  ChevronRight,
  ChevronDown,
  Layers3,
  Plus,
  Link2,
  Building2,
} from 'lucide-react';

import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isAdminProfile } from '@/lib/rbac';

type Department = {
  id: string;
  name: string;
};

type Platform = {
  id: string;
  name: string;
  purpose: string;
  description: string;
  login_url: string;
  created_by: string;
  created_at: string;
};

type PlatformDepartment = {
  platform_id: string;
  department_id: string;
};

type DriveFolder = {
  id: string;
  department_id: string;
  parent_id: string | null;
  name: string;
  created_by: string;
  created_at: string;
};

type DriveDocument = {
  id: string;
  folder_id: string;
  title: string;
  author_id: string;
  drive_url: string;
  mime_type: string;
  modified_at: string;
};

const input =
  'mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const button =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-50';

export default function ResourcesPage() {
  const { profile } = useAuth();

  const isDirector = isAdminProfile(profile);

  const [tab, setTab] = useState<'platforms' | 'drive'>('platforms');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [links, setLinks] = useState<PlatformDepartment[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [documents, setDocuments] = useState<DriveDocument[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const [folderId, setFolderId] = useState('');

  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<
    '' | 'platform' | 'folder' | 'file'
  >('');

  const [platformForm, setPlatformForm] = useState({
    name: '',
    purpose: '',
    description: '',
    login_url: '',
  });

  const [folderName, setFolderName] = useState('');

  const [fileForm, setFileForm] = useState({
    title: '',
    drive_url: '',
    mime_type: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Load all resources
  const load = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    setError('');

    const results = await Promise.all([
      supabase.from('departments').select('id,name').order('name'),

      supabase.from('platforms').select('*').order('name'),

      supabase
        .from('platform_departments')
        .select('platform_id,department_id'),

      supabase.from('drive_folders').select('*').order('name'),

      supabase
        .from('drive_documents')
        .select(
          'id,folder_id,title,author_id,drive_url,mime_type,modified_at'
        )
        .order('modified_at', { ascending: false }),
    ]);

    const issue = results.find((result) => result.error)?.error;

    if (issue) {
      setError(issue.message);
    } else {
      const deps = (results[0].data || []) as Department[];

      setDepartments(deps);
      setPlatforms((results[1].data || []) as Platform[]);
      setLinks((results[2].data || []) as PlatformDepartment[]);
      setFolders((results[3].data || []) as DriveFolder[]);
      setDocuments((results[4].data || []) as DriveDocument[]);

      setDepartmentId((current) =>
        current && deps.some((d) => d.id === current)
          ? current
          : deps.some((d) => d.id === profile.department_id)
            ? profile.department_id!
            : deps[0]?.id || ''
      );
    }

    setLoading(false);
  }, [profile?.id, profile?.department_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const myDepartmentId = profile?.department_id || '';

  const selectedDepartment = departments.find(
    (d) => d.id === departmentId
  );

  const selectedFolder = folders.find(
    (f) => f.id === folderId
  );

  const childFolders = folders.filter(
    (f) =>
      f.department_id === departmentId &&
      f.parent_id === (folderId || null)
  );

  const files = documents.filter(
    (d) => d.folder_id === folderId
  );

  // Folder breadcrumbs
  const breadcrumbs = useMemo(() => {
    const result: DriveFolder[] = [];

    let current = selectedFolder;

    while (current) {
      result.unshift(current);

      current = folders.find(
        (f) => f.id === current?.parent_id
      );
    }

    return result;
  }, [folders, selectedFolder]);

  // Platform search
  const shownPlatforms = platforms.filter((platform) => {
    const departmentNames = links
      .filter((link) => link.platform_id === platform.id)
      .map(
        (link) =>
          departments.find(
            (d) => d.id === link.department_id
          )?.name || ''
      );

    const searchText = [
      platform.name,
      platform.purpose,
      platform.description,
      ...departmentNames,
    ];

    return (
      !search.trim() ||
      searchText.some((value) =>
        value.toLowerCase().includes(search.toLowerCase())
      )
    );
  });

  // Create platform
  const createPlatform = async () => {
    if (
      !profile ||
      !myDepartmentId ||
      !platformForm.name.trim() ||
      !platformForm.purpose.trim() ||
      !platformForm.login_url.trim()
    ) {
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: platformError } = await supabase
      .from('platforms')
      .insert({
        name: platformForm.name.trim(),
        purpose: platformForm.purpose.trim(),
        description: platformForm.description.trim(),
        login_url: platformForm.login_url.trim(),
        created_by: profile.id,
      })
      .select('id')
      .single();

    if (platformError || !data) {
      setError(platformError?.message || 'Could not create platform.');
    } else {
      const { error: linkError } = await supabase
        .from('platform_departments')
        .insert({
          platform_id: data.id,
          department_id: myDepartmentId,
        });

      if (linkError) {
        setError(
          `Platform created, but department association failed: ${linkError.message}`
        );
      } else {
        setNotice('Platform added successfully.');

        setPlatformForm({
          name: '',
          purpose: '',
          description: '',
          login_url: '',
        });

        setModal('');
        await load();
      }
    }

    setSaving(false);
  };

  // Associate an existing platform with my department
  const linkToMyDepartment = async (platformId: string) => {
    if (!myDepartmentId) return;

    const { error: linkError } = await supabase
      .from('platform_departments')
      .upsert(
        {
          platform_id: platformId,
          department_id: myDepartmentId,
        },
        {
          onConflict: 'platform_id,department_id',
          ignoreDuplicates: true,
        }
      );

    if (linkError) {
      setError(linkError.message);
    } else {
      setNotice('Platform linked to your department.');
      await load();
    }
  };

  // Create folder or subfolder
  const createFolder = async () => {
    if (!profile || !departmentId || !folderName.trim()) return;

    setSaving(true);
    setError('');

    const { error: folderError } = await supabase
      .from('drive_folders')
      .insert({
        department_id: departmentId,
        parent_id: folderId || null,
        name: folderName.trim(),
        created_by: profile.id,
      });

    if (folderError) {
      setError(folderError.message);
    } else {
      setFolderName('');
      setModal('');
      setNotice('Folder created successfully.');
      await load();
    }

    setSaving(false);
  };

  // Register Google Drive file link
  const addFile = async () => {
    if (
      !profile ||
      !folderId ||
      !fileForm.title.trim() ||
      !fileForm.drive_url.trim()
    ) {
      return;
    }

    setSaving(true);
    setError('');

    const { error: fileError } = await supabase
      .from('drive_documents')
      .insert({
        folder_id: folderId,
        title: fileForm.title.trim(),
        author_id: profile.id,
        drive_url: fileForm.drive_url.trim(),
        mime_type: fileForm.mime_type.trim(),
      });

    if (fileError) {
      setError(fileError.message);
    } else {
      setFileForm({
        title: '',
        drive_url: '',
        mime_type: '',
      });

      setModal('');
      setNotice('File link added successfully.');

      await load();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <TopBar
          title="Platforms & shared drive"
          subtitle="Loading company resources"
        />

        <SybellaLoadingState text="Loading company resources" />
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Platforms & shared drive"
        subtitle="Company tools and shared Google Drive filing structure"
      />

      <main className="space-y-5 p-4 sm:p-6">

        {/* Notifications */}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Company resources
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Find the platforms we use and where shared files are stored.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border bg-white p-1">

            <button
              onClick={() => setTab('platforms')}
              className={`${button} ${
                tab === 'platforms'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600'
              }`}
            >
              <Layers3 size={16} />
              Platforms
            </button>

            <button
              onClick={() => setTab('drive')}
              className={`${button} ${
                tab === 'drive'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600'
              }`}
            >
              <Folder size={16} />
              Drive structure
            </button>

          </div>
        </div>

        {/* PLATFORM DIRECTORY */}
        {tab === 'platforms' && (

          <section className="space-y-4">

            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">

              <label className="min-w-64 flex-1 text-xs font-medium text-slate-600">
                Search platforms

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={input}
                  placeholder="Zoho, GitHub, deployment, department..."
                />
              </label>

              <button
                onClick={() => setModal('platform')}
                className={`${button} bg-blue-700 text-white`}
              >
                <Plus size={16} />
                Add platform
              </button>

            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {shownPlatforms.map((platform) => {

                const departmentLinks = links.filter(
                  (link) => link.platform_id === platform.id
                );

                const departmentNames = departmentLinks
                  .map(
                    (link) =>
                      departments.find(
                        (d) => d.id === link.department_id
                      )?.name
                  )
                  .filter(Boolean) as string[];

                const usedHere = departmentLinks.some(
                  (link) => link.department_id === myDepartmentId
                );

                return (
                  <article
                    key={platform.id}
                    className="flex min-h-48 flex-col rounded-xl border bg-white p-5"
                  >

                    <div className="flex items-start justify-between">

                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Link2 size={19} />
                      </span>

                      <a
                        href={platform.login_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700"
                      >
                        Login
                        <ExternalLink size={13} />
                      </a>

                    </div>

                    <h2 className="mt-4 font-semibold text-slate-900">
                      {platform.name}
                    </h2>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {platform.purpose}
                    </p>

                    {platform.description && (
                      <p className="mt-2 text-sm text-slate-500">
                        {platform.description}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4">

                      {departmentNames.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600"
                        >
                          {name}
                        </span>
                      ))}

                    </div>

                    {!usedHere && myDepartmentId && (
                      <button
                        onClick={() => void linkToMyDepartment(platform.id)}
                        className="mt-3 self-start text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Also used by my department
                      </button>
                    )}

                  </article>
                );
              })}

              {!shownPlatforms.length && (
                <p className="col-span-full rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">
                  No platforms found. Add a platform used by your department.
                </p>
              )}

            </div>

          </section>
        )}

        {/* GOOGLE DRIVE STRUCTURE */}
        {tab === 'drive' && (

          <section className="space-y-4">

            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">

              <label className="min-w-56 flex-1 text-xs font-medium text-slate-600">
                Department

                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setFolderId('');
                  }}
                  className={input}
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>

              </label>

              <div className="flex flex-wrap gap-2">

                {isDirector && (
                  <button
                    onClick={() => setModal('folder')}
                    className={`${button} border`}
                  >
                    <FolderPlus size={16} />
                    New folder / subfolder
                  </button>
                )}

                {folderId && (
                  <button
                    onClick={() => setModal('file')}
                    className={`${button} bg-blue-700 text-white`}
                  >
                    <FilePlus2 size={16} />
                    Add file link
                  </button>
                )}

                <button
                  onClick={() => void load()}
                  className={`${button} border`}
                >
                  Refresh
                </button>

              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(240px,.7fr)_minmax(0,1.5fr)]">

              {/* Folder tree */}
              <aside className="rounded-xl border bg-white p-4">

                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <Building2 size={16} />
                  Folder structure
                </h2>

                <button
                  onClick={() => setFolderId('')}
                  className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-sm ${
                    !folderId
                      ? 'bg-blue-50 font-semibold text-blue-800'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {selectedDepartment?.name || 'Department root'}
                </button>

                <FolderTreeView
                  folders={folders.filter(
                    (f) => f.department_id === departmentId
                  )}
                  parentId={null}
                  selectedId={folderId}
                  onSelect={setFolderId}
                />

              </aside>

              {/* Folder contents */}
              <section className="rounded-xl border bg-white">

                <div className="border-b p-4">

                  <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">

                    <button onClick={() => setFolderId('')}>
                      {selectedDepartment?.name || 'Department'}
                    </button>

                    {breadcrumbs.map((folder) => (
                      <span
                        key={folder.id}
                        className="inline-flex items-center gap-1"
                      >
                        <ChevronRight size={12} />

                        <button
                          onClick={() => setFolderId(folder.id)}
                        >
                          {folder.name}
                        </button>
                      </span>
                    ))}

                  </div>

                  <h2 className="mt-2 font-semibold">
                    {selectedFolder?.name || 'Department root'}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {childFolders.length} subfolders · {files.length} files
                  </p>

                </div>

                <div className="divide-y">

                  {childFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setFolderId(folder.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <Folder
                        size={16}
                        className="text-amber-600"
                      />

                      <span className="flex-1 text-sm">
                        {folder.name}
                      </span>

                      <ChevronRight size={14} />
                    </button>
                  ))}

                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >

                      <FilePlus2
                        size={16}
                        className="text-blue-600"
                      />

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-medium">
                          {file.title}
                        </p>

                        <p className="text-xs text-slate-500">
                          {file.mime_type || 'File'} ·{' '}
                          {new Date(file.modified_at).toLocaleDateString()}
                        </p>

                      </div>

                      <a
                        href={file.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                      >
                        Open
                        <ExternalLink size={12} />
                      </a>

                    </div>
                  ))}

                  {!childFolders.length && !files.length && (
                    <p className="p-10 text-center text-sm text-slate-500">
                      This location is empty.{' '}
                      {isDirector
                        ? 'Create a folder or subfolder.'
                        : 'Ask a director to create a folder, then add file links.'}
                    </p>
                  )}

                </div>

              </section>

            </div>

          </section>
        )}

        {/* MODALS */}
        {modal && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

            <section
              role="dialog"
              aria-modal="true"
              className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl"
            >

              <h2 className="text-lg font-semibold">
                {modal === 'platform'
                  ? 'Add a platform'
                  : modal === 'folder'
                    ? 'Create a folder or subfolder'
                    : 'Add a file link'}
              </h2>

              {modal === 'platform' && (
                <>

                  <label className="block text-xs font-medium">
                    Platform name

                    <input
                      className={input}
                      value={platformForm.name}
                      onChange={(e) =>
                        setPlatformForm({
                          ...platformForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Zoho CRM"
                    />
                  </label>

                  <label className="block text-xs font-medium">
                    Purpose

                    <input
                      className={input}
                      value={platformForm.purpose}
                      onChange={(e) =>
                        setPlatformForm({
                          ...platformForm,
                          purpose: e.target.value,
                        })
                      }
                      placeholder="Customer relationship management"
                    />
                  </label>

                  <label className="block text-xs font-medium">
                    Description (optional)

                    <textarea
                      className="mt-1 w-full rounded-lg border p-3 text-sm"
                      rows={3}
                      value={platformForm.description}
                      onChange={(e) =>
                        setPlatformForm({
                          ...platformForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="block text-xs font-medium">
                    Login URL

                    <input
                      type="url"
                      className={input}
                      value={platformForm.login_url}
                      onChange={(e) =>
                        setPlatformForm({
                          ...platformForm,
                          login_url: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </label>

                  <p className="text-xs text-slate-500">
                    New platforms are initially associated with your own
                    department. Other departments can link the same platform
                    to themselves.
                  </p>

                </>
              )}

              {modal === 'folder' && (
                <>

                  <label className="block text-xs font-medium">
                    Folder name

                    <input
                      className={input}
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="e.g. Sales Proposals"
                    />
                  </label>

                  <p className="text-xs text-slate-500">
                    Parent:{' '}
                    {selectedFolder?.name ||
                      `${selectedDepartment?.name || 'Department'} root`}
                  </p>

                </>
              )}

              {modal === 'file' && (
                <>

                  <label className="block text-xs font-medium">
                    File title

                    <input
                      className={input}
                      value={fileForm.title}
                      onChange={(e) =>
                        setFileForm({
                          ...fileForm,
                          title: e.target.value,
                        })
                      }
                      placeholder="Quarterly sales report"
                    />
                  </label>

                  <label className="block text-xs font-medium">
                    Google Drive link

                    <input
                      type="url"
                      className={input}
                      value={fileForm.drive_url}
                      onChange={(e) =>
                        setFileForm({
                          ...fileForm,
                          drive_url: e.target.value,
                        })
                      }
                      placeholder="https://drive.google.com/..."
                    />
                  </label>

                  <label className="block text-xs font-medium">
                    File type (optional)

                    <input
                      className={input}
                      value={fileForm.mime_type}
                      onChange={(e) =>
                        setFileForm({
                          ...fileForm,
                          mime_type: e.target.value,
                        })
                      }
                      placeholder="Google Doc, PDF, Spreadsheet"
                    />
                  </label>

                </>
              )}

              <div className="flex justify-end gap-2">

                <button
                  onClick={() => setModal('')}
                  className={`${button} border`}
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  onClick={() => {
                    if (modal === 'platform') {
                      void createPlatform();
                    } else if (modal === 'folder') {
                      void createFolder();
                    } else {
                      void addFile();
                    }
                  }}
                  className={`${button} bg-blue-700 text-white`}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>

              </div>

            </section>

          </div>
        )}

      </main>
    </div>
  );
}

// Recursive folder tree
function FolderTreeView({
  folders,
  parentId,
  selectedId,
  onSelect,
  depth = 0,
}: {
  folders: DriveFolder[];
  parentId: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const children = folders.filter(
    (folder) => folder.parent_id === parentId
  );

  return (
    <div>
      {children.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          folders={folders}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </div>
  );
}

function FolderTreeNode({
  folder,
  folders,
  selectedId,
  onSelect,
  depth,
}: {
  folder: DriveFolder;
  folders: DriveFolder[];
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const hasChildren = folders.some(
    (f) => f.parent_id === folder.id
  );

  return (
    <div>

      <div
        className={`flex items-center rounded-lg ${
          selectedId === folder.id
            ? 'bg-blue-50'
            : 'hover:bg-slate-50'
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >

        <button
          onClick={() => setExpanded((value) => !value)}
          className="p-1 text-slate-400"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )
          ) : (
            <span className="inline-block w-[13px]" />
          )}
        </button>

        <button
          onClick={() => onSelect(folder.id)}
          className={`flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-sm ${
            selectedId === folder.id
              ? 'font-semibold text-blue-800'
              : 'text-slate-700'
          }`}
        >
          <Folder
            size={14}
            className="shrink-0 text-amber-600"
          />

          <span className="truncate">{folder.name}</span>
        </button>

      </div>

      {expanded && hasChildren && (
        <FolderTreeView
          folders={folders}
          parentId={folder.id}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}

    </div>
  );
}