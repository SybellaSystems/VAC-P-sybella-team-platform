'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookOpen, Plus, Search, FileText, CreditCard as Edit, Eye } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import { canEditWiki } from '@/lib/rbac';

interface WikiPageRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  is_published: boolean;
  author_id: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function WikiPage() {
  const { profile } = useAuth();

  const [pages, setPages] = useState<WikiPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<WikiPageRow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [newPage, setNewPage] = useState({
    title: '',
    content: '',
    category: 'general',
  });

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages((data as WikiPageRow[]) || []);
    } catch (error) {
      console.error('Error fetching wiki pages:', error);
      toast.error('Failed to load wiki pages');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePage() {
    if (!profile) return;

    try {
      const slug = newPage.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { error } = await supabase.from('wiki_pages').insert({
        title: newPage.title,
        slug,
        content: newPage.content,
        category: newPage.category,
        is_published: true,
        author_id: profile.id,
      });

      if (error) throw error;

      toast.success('Wiki page created');
      setShowCreateDialog(false);
      setNewPage({ title: '', content: '', category: 'general' });
      fetchPages();
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error('Failed to create page');
    }
  }

  async function handleUpdatePage() {
    if (!selectedPage) return;

    try {
      const { error } = await supabase
        .from('wiki_pages')
        .update({
          title: newPage.title,
          content: newPage.content,
          category: newPage.category,
          last_edited_by: profile?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPage.id);

      if (error) throw error;

      toast.success('Wiki page updated');
      setShowEditDialog(false);
      fetchPages();
    } catch (error) {
      console.error('Error updating page:', error);
      toast.error('Failed to update page');
    }
  }

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canEdit = canEditWiki(profile?.role);

  if (loading) {
    return (
      <div>
        <TopBar title="Wiki" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Wiki" subtitle="Company knowledge base and documentation" />
      <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wiki</h1>
          <p className="text-slate-600">Company knowledge base and documentation</p>
        </div>
        {canEdit && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Wiki Page</DialogTitle>
                <DialogDescription>Add new documentation to the knowledge base</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={newPage.title} onChange={e => setNewPage({ ...newPage, title: e.target.value })} placeholder="Page title" />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={newPage.category} onChange={e => setNewPage({ ...newPage, category: e.target.value })} placeholder="e.g. general, policy, guide" />
                </div>
                <div>
                  <label className="text-sm font-medium">Content (Markdown supported)</label>
                  <Textarea value={newPage.content} onChange={e => setNewPage({ ...newPage, content: e.target.value })} placeholder="Write your content here..." rows={12} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePage}>Create Page</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search wiki..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPages.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">No wiki pages found</p>
            </CardContent>
          </Card>
        ) : (
          filteredPages.map(page => (
            <Card key={page.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPage(page)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  {page.category && (
                    <Badge variant="secondary">{page.category}</Badge>
                  )}
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPage(page);
                      setNewPage({ title: page.title, content: page.content, category: page.category || 'general' });
                      setShowEditDialog(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-lg">{page.title}</CardTitle>
                <CardDescription>Updated {new Date(page.updated_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Eye className="h-3 w-3" />
                  <span>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Wiki Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={newPage.title} onChange={e => setNewPage({ ...newPage, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input value={newPage.category} onChange={e => setNewPage({ ...newPage, category: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea value={newPage.content} onChange={e => setNewPage({ ...newPage, content: e.target.value })} rows={12} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdatePage}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!selectedPage && !showEditDialog} onOpenChange={() => setSelectedPage(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPage?.title}</DialogTitle>
            {selectedPage?.category && <DialogDescription>{selectedPage.category}</DialogDescription>}
          </DialogHeader>
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap text-sm">{selectedPage?.content}</pre>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
