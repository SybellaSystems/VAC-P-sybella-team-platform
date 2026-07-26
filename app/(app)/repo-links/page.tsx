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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link2, Plus, Search, ExternalLink, FileText, Github, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

type RepoLinkRecord = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  created_by: string | null;
  created_at: string;
};

export default function RepoLinksPage() {
  const { profile } = useAuth();

  const [links, setLinks] = useState<RepoLinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newLink, setNewLink] = useState({
    title: '',
    description: '',
    url: '',
    category: 'document',
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('repo_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
      toast.error('Failed to load links');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLink() {
    if (!profile) return;

    try {
      const { error } = await supabase.from('repo_links').insert({
        title: newLink.title,
        description: newLink.description,
        url: newLink.url,
        category: newLink.category,
        created_by: profile.id,
      });

      if (error) throw error;

      toast.success('Link added successfully');
      setShowAddDialog(false);
      setNewLink({ title: '', description: '', url: '', category: 'document' });
      fetchLinks();
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Failed to add link');
    }
  }

  const filteredLinks = links.filter(link =>
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'repository': return <Github className="h-5 w-5" />;
      case 'drive': return <FolderOpen className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'repository': return 'bg-purple-100 text-purple-800';
      case 'drive': return 'bg-blue-100 text-blue-800';
      case 'design': return 'bg-pink-100 text-pink-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Repository Links</h1>
          <p className="text-slate-600">External documents, repositories, and resources</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Link</DialogTitle>
              <DialogDescription>Add a link to an external resource</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={newLink.title} onChange={e => setNewLink({ ...newLink, title: e.target.value })} placeholder="Link title" />
              </div>
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input value={newLink.url} onChange={e => setNewLink({ ...newLink, url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newLink.category} onValueChange={v => setNewLink({ ...newLink, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="repository">Repository</SelectItem>
                    <SelectItem value="drive">Google Drive</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={newLink.description} onChange={e => setNewLink({ ...newLink, description: e.target.value })} placeholder="Brief description" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddLink}>Add Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search links..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLinks.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Link2 className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">No links found</p>
            </CardContent>
          </Card>
        ) : (
          filteredLinks.map(link => (
            <Card key={link.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-slate-100">
                    {getCategoryIcon(link.category)}
                  </div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <CardTitle className="text-lg">{link.title}</CardTitle>
                <CardDescription>{link.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge className={getCategoryColor(link.category)}>{link.category}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
