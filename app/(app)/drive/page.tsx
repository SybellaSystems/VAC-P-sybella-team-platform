'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@sybellasystems/ui';
import { ExternalLink, FilePlus2, Folder, FolderPlus, MessageSquare, MoveRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Department = { id: string; name: string };
type DriveFolder = { id: string; department_id: string; parent_id: string | null; name: string; created_by: string; created_at: string };
type DriveDocument = { id: string; folder_id: string; title: string; author_id: string; drive_url: string; preview_url: string | null; mime_type: string; modified_at: string };
type Comment = { id: string; document_id: string; author_id: string; body: string; created_at: string };
type FolderRow = Record<string, unknown> & { id: string; name: string; type: string };
type DocumentRow = Record<string, unknown> & { id: string; title: string; by: string; modified: string; type: string };

export default function DrivePage() {
  const { profile } = useAuth();
  const canManageFolders = profile?.role === 'admin' || profile?.role === 'director';
  const canWrite = profile?.role !== 'partner';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [documents, setDocuments] = useState<DriveDocument[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DriveDocument | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: '', parent_id: '' });
  const [fileForm, setFileForm] = useState({ title: '', drive_url: '', preview_url: '', mime_type: '' });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError('');
    const [departmentResult, folderResult, documentResult, profileResult] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('drive_folders').select('*').order('name'),
      supabase.from('drive_documents').select('*').order('modified_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ]);
    const issue = departmentResult.error || folderResult.error || documentResult.error || profileResult.error;
    if (issue) {
      console.error('Unable to load department documents:', issue.message);
      setError(issue.message);
    } else {
      const nextDepartments = (departmentResult.data || []) as Department[];
      const nextFolders = (folderResult.data || []) as DriveFolder[];
      setDepartments(nextDepartments);
      setFolders(nextFolders);
      setDocuments((documentResult.data || []) as DriveDocument[]);
      setProfiles(Object.fromEntries((profileResult.data || []).map((member) => [member.id, member.full_name])));
      setSelectedDepartmentId((current) => current && nextDepartments.some((item) => item.id === current) ? current : nextDepartments[0]?.id || '');
      setSelectedFolderId((current) => current && nextFolders.some((folder) => folder.id === current) ? current : '');
    }
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) || null;
  const childFolders = useMemo(() => folders.filter((folder) =>
    folder.department_id === selectedDepartmentId && folder.parent_id === (selectedFolderId || null)
  ), [folders, selectedDepartmentId, selectedFolderId]);
  const folderDocuments = useMemo(() => documents.filter((document) => document.folder_id === selectedFolderId), [documents, selectedFolderId]);

  const breadcrumbs = useMemo(() => {
    const chain: DriveFolder[] = [];
    let current = selectedFolder;
    while (current) {
      chain.unshift(current);
      current = folders.find((folder) => folder.id === current?.parent_id) || null;
    }
    return chain;
  }, [folders, selectedFolder]);

  const folderRows: FolderRow[] = childFolders.map((folder) => ({ id: folder.id, name: folder.name, type: 'Folder' }));
  const documentRows: DocumentRow[] = folderDocuments.map((document) => ({
    id: document.id,
    title: document.title,
    by: profiles[document.author_id] || 'Team member',
    modified: new Date(document.modified_at).toLocaleDateString(),
    type: document.mime_type || 'File',
  }));
  const folderColumns: DataTableColumn<FolderRow>[] = [
    { key: 'name', header: 'Folder', sortable: true, render: (_value, row) => <span className="inline-flex items-center gap-2"><Folder size={15} className="text-amber-600" />{row.name}</span> },
    { key: 'type', header: 'Type', width: '120px' },
  ];
  const documentColumns: DataTableColumn<DocumentRow>[] = [
    { key: 'title', header: 'File title', sortable: true },
    { key: 'by', header: 'By', sortable: true },
    { key: 'type', header: 'Type', sortable: true },
    { key: 'modified', header: 'Modified', sortable: true },
  ];

  const loadComments = async (document: DriveDocument) => {
    setSelectedDocument(document);
    const { data, error: commentError } = await supabase.from('drive_document_comments').select('*')
      .eq('document_id', document.id).order('created_at', { ascending: true });
    if (commentError) {
      console.error('Unable to load document comments:', commentError.message);
      setError(commentError.message);
      setComments([]);
    } else {
      setComments((data || []) as Comment[]);
    }
  };

  const addFolder = async () => {
    if (!selectedDepartmentId || !folderForm.name.trim() || !profile) return;
    const { error: insertError } = await supabase.from('drive_folders').insert({
      department_id: selectedDepartmentId,
      parent_id: folderForm.parent_id || null,
      name: folderForm.name.trim(),
      created_by: profile.id,
    });
    if (insertError) {
      console.error('Unable to create folder:', insertError.message);
      setError(insertError.message);
    } else {
      setFolderForm({ name: '', parent_id: '' });
      setShowFolderForm(false);
      await loadData();
    }
  };

  const addDocument = async () => {
    if (!selectedFolderId || !fileForm.title.trim() || !fileForm.drive_url.trim() || !profile) return;
    const { error: insertError } = await supabase.from('drive_documents').insert({
      folder_id: selectedFolderId,
      title: fileForm.title.trim(),
      author_id: profile.id,
      drive_url: fileForm.drive_url.trim(),
      preview_url: fileForm.preview_url.trim() || null,
      mime_type: fileForm.mime_type.trim(),
    });
    if (insertError) {
      console.error('Unable to add file reference:', insertError.message);
      setError(insertError.message);
    } else {
      setFileForm({ title: '', drive_url: '', preview_url: '', mime_type: '' });
      setShowFileForm(false);
      await loadData();
    }
  };

  const addComment = async () => {
    if (!selectedDocument || !profile || !commentText.trim() || commentText.length > 280) return;
    const { error: insertError } = await supabase.from('drive_document_comments').insert({
      document_id: selectedDocument.id,
      author_id: profile.id,
      body: commentText.trim(),
    });
    if (insertError) {
      console.error('Unable to save document comment:', insertError.message);
      setError(insertError.message);
    } else {
      setCommentText('');
      await loadComments(selectedDocument);
    }
  };

  if (loading) return <div><TopBar title="Department folders" subtitle="Loading documents" /><SybellaLoadingState text="Loading department folders" /></div>;

  return (
    <div>
      <TopBar title="Department folders" subtitle="Department → folder → subfolder → file" />
      <main className="space-y-5 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <section className="rounded-xl border bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="min-w-52 text-xs font-medium text-slate-600">Department
              <select value={selectedDepartmentId} onChange={(event) => { setSelectedDepartmentId(event.target.value); setSelectedFolderId(''); setSelectedDocument(null); }} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm">
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {canManageFolders && <button type="button" onClick={() => { setFolderForm({ name: '', parent_id: selectedFolderId }); setShowFolderForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm hover:bg-slate-50"><FolderPlus size={16} /> New folder</button>}
              {canWrite && selectedFolderId && <button type="button" onClick={() => setShowFileForm(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800"><FilePlus2 size={16} /> Add file link</button>}
            </div>
          </div>
          <nav aria-label="Folder breadcrumb" className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <button type="button" onClick={() => { setSelectedFolderId(''); setSelectedDocument(null); }} className="font-medium text-blue-700 hover:underline">{selectedDepartment?.name || 'Department'}</button>
            {breadcrumbs.map((folder) => <span key={folder.id} className="inline-flex items-center gap-2"><MoveRight size={13} className="text-slate-400" /><button type="button" onClick={() => { setSelectedFolderId(folder.id); setSelectedDocument(null); }} className={folder.id === selectedFolderId ? 'font-medium text-slate-900' : 'hover:text-blue-700'}>{folder.name}</button></span>)}
          </nav>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="space-y-5">
            {childFolders.length > 0 && <div className="overflow-hidden rounded-xl border bg-white">
              <div className="border-b p-4"><h2 className="font-semibold text-slate-900">Folders</h2></div>
              <DataTable columns={folderColumns} data={folderRows} searchable={false} sortable bordered size="sm" ariaLabel="Department folders" emptyMessage="No subfolders." onRowClick={(row) => { setSelectedFolderId(row.id); setSelectedDocument(null); }} />
            </div>}
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="border-b p-4"><h2 className="font-semibold text-slate-900">Files</h2><p className="text-xs text-slate-500">{folderDocuments.length} file references</p></div>
              {selectedFolderId ? (
                <DataTable columns={documentColumns} data={documentRows} searchable searchPlaceholder="Search files" sortable bordered size="sm" ariaLabel="Files in selected folder" emptyMessage="No files in this folder." onRowClick={(row) => { const document = folderDocuments.find((item) => item.id === row.id); if (document) void loadComments(document); }} />
              ) : <p className="p-8 text-center text-sm text-slate-500">Choose a folder to view its files.</p>}
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border bg-white">
            {selectedDocument ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                  <div><p className="text-xs text-slate-500">{selectedDepartment?.name}{breadcrumbs.map((folder) => ` / ${folder.name}`).join('')}</p><h2 className="mt-1 font-semibold text-slate-900">{selectedDocument.title}</h2><p className="mt-1 text-xs text-slate-500">By {profiles[selectedDocument.author_id] || 'Team member'}</p></div>
                  <a href={selectedDocument.drive_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">Open source <ExternalLink size={13} /></a>
                </div>
                <div className="border-b bg-slate-50 p-3">
                  {selectedDocument.preview_url ? <iframe title={`Preview: ${selectedDocument.title}`} src={selectedDocument.preview_url} loading="lazy" referrerPolicy="no-referrer" className="h-64 w-full rounded border bg-white sm:h-80" /> : <div className="flex h-48 items-center justify-center rounded border bg-white p-6 text-center text-sm text-slate-500">Preview is not available for this link. Open the source in a new tab.</div>}
                </div>
                <div className="p-4">
                  <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><MessageSquare size={15} /> Comments</h3>
                  <div className="max-h-44 space-y-3 overflow-y-auto">
                    {comments.map((comment) => <div key={comment.id} className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-700">{comment.body}</p><p className="mt-1 text-[11px] text-slate-500">{profiles[comment.author_id] || 'Team member'} · {new Date(comment.created_at).toLocaleString()}</p></div>)}
                    {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
                  </div>
                  {canWrite && <div className="mt-3 space-y-2"><label className="sr-only" htmlFor="document-comment">Add a comment</label><textarea id="document-comment" maxLength={280} value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={2} placeholder="Add a comment (max 280 characters)" className="w-full rounded-md border border-input p-3 text-sm" /><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{commentText.length}/280</span><button type="button" disabled={!commentText.trim()} onClick={() => void addComment()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Comment</button></div></div>}
                  <button type="button" onClick={() => { window.localStorage.setItem('vacp-daily-proof', JSON.stringify({ url: selectedDocument.drive_url, title: selectedDocument.title })); window.location.href = '/daily-progress'; }} className="mt-3 text-xs font-medium text-blue-700 hover:underline">Use as proof in today&apos;s KPI report</button>
                </div>
              </>
            ) : <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center"><FilePlus2 size={32} className="mb-3 text-slate-300" /><h2 className="font-medium text-slate-800">Select a file</h2><p className="mt-1 text-sm text-slate-500">Preview, source link, and document comments appear here.</p></div>}
          </section>
        </section>
      </main>

      {(showFolderForm || showFileForm) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <section role="dialog" aria-modal="true" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">{showFolderForm ? 'Create a folder' : 'Add a file reference'}</h2>
          {showFolderForm ? <>
            <label className="block text-xs font-medium text-slate-600">Folder name<input value={folderForm.name} onChange={(event) => setFolderForm({ ...folderForm, name: event.target.value })} maxLength={160} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-600">Parent folder<select value={folderForm.parent_id} onChange={(event) => setFolderForm({ ...folderForm, parent_id: event.target.value })} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Department root</option>{folders.filter((folder) => folder.department_id === selectedDepartmentId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
          </> : <>
            <label className="block text-xs font-medium text-slate-600">File title<input value={fileForm.title} onChange={(event) => setFileForm({ ...fileForm, title: event.target.value })} maxLength={240} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-600">Source link<input type="url" required value={fileForm.drive_url} onChange={(event) => setFileForm({ ...fileForm, drive_url: event.target.value })} placeholder="https://" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-600">Preview URL (optional)<input type="url" value={fileForm.preview_url} onChange={(event) => setFileForm({ ...fileForm, preview_url: event.target.value })} placeholder="https://" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="block text-xs font-medium text-slate-600">File type<input value={fileForm.mime_type} onChange={(event) => setFileForm({ ...fileForm, mime_type: event.target.value })} placeholder="PDF, Google Doc, Image" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
          </>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setShowFolderForm(false); setShowFileForm(false); }} className="h-10 rounded-lg border px-4 text-sm">Cancel</button><button type="button" onClick={() => void (showFolderForm ? addFolder() : addDocument())} className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Save</button></div>
        </section>
      </div>}
    </div>
  );
}
