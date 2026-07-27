'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, Key, Lock, Clock as Unlock, Eye, EyeOff, Copy, Check, Clock, CircleAlert as AlertCircle, Plus, Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import type { CredentialVault, CredentialCategory, CredentialAccessRequest, Profile } from '@/lib/database.types';

type AccessRequestWithCredential = CredentialAccessRequest & { credential?: { name: string } };

export default function VaultPage() {
  const { profile } = useAuth();

  const [credentials, setCredentials] = useState<CredentialVault[]>([]);
  const [categories, setCategories] = useState<CredentialCategory[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<CredentialVault | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [newCred, setNewCred] = useState<{
    name: string;
    category_id: string;
    platform_name: string;
    username: string;
    password: string;
    description: string;
    access_level: 'public' | 'restricted' | 'admin_only';
    required_role: string;
  }>({
    name: '',
    category_id: '',
    platform_name: '',
    username: '',
    password: '',
    description: '',
    access_level: 'restricted',
    required_role: 'all',
  });
  const [requestReason, setRequestReason] = useState('');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [credsRes, catsRes, requestsRes] = await Promise.all([
        supabase.from('credential_vault').select('*').order('created_at', { ascending: false }),
        supabase.from('credential_categories').select('*').order('name'),
        supabase.from('credential_access_requests').select('*, credential:credential_vault(name)').eq('user_id', profile?.id).order('requested_at', { ascending: false }),
      ]);

      if (credsRes.data) setCredentials(credsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (requestsRes.data) setAccessRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCredential() {
    if (!profile || profile.role !== 'admin') {
      toast.error('Only admins can add credentials');
      return;
    }

    try {
      const { error } = await supabase.from('credential_vault').insert({
        ...newCred,
        password_encrypted: btoa(newCred.password), // Basic encoding (in production, use proper encryption)
        created_by: profile.id,
      });

      if (error) throw error;

      toast.success('Credential added successfully');
      setShowAddDialog(false);
      setNewCred({
        name: '',
        category_id: '',
        platform_name: '',
        username: '',
        password: '',
        description: '',
        access_level: 'restricted',
        required_role: 'all',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding credential:', error);
      toast.error('Failed to add credential');
    }
  }

  async function handleRequestAccess() {
    if (!selectedCredential || !profile) return;

    try {
      const { error } = await supabase.from('credential_access_requests').insert({
        credential_id: selectedCredential.id,
        user_id: profile.id,
        reason: requestReason,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Access request submitted');
      setShowRequestDialog(false);
      setRequestReason('');
      setSelectedCredential(null);
      fetchData();
    } catch (error) {
      console.error('Error requesting access:', error);
      toast.error('Failed to submit request');
    }
  }

  async function handleApproveRequest(requestId: string) {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('credential_access_requests')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Access approved');
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from('credential_access_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Access rejected');
      fetchData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }

  function canViewCredential(cred: CredentialVault): boolean {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (cred.access_level === 'public') return true;
    if (cred.access_level === 'restricted' && (cred.required_role === 'all' || cred.required_role === profile.role)) return true;

    // Check if user has approved access request
    const approvedRequest = accessRequests.find(
      r => r.credential_id === cred.id && r.status === 'approved' && new Date(r.expires_at || '') > new Date()
    );
    return !!approvedRequest;
  }

  function hasApprovedAccess(credId: string): boolean {
    const request = accessRequests.find(
      r => r.credential_id === credId && r.status === 'approved' && new Date(r.expires_at || '') > new Date()
    );
    return !!request;
  }

  function hasPendingRequest(credId: string): boolean {
    return accessRequests.some(r => r.credential_id === credId && r.status === 'pending');
  }

  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.platform_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && cred.category_id === activeTab;
  });

  const pendingRequests = accessRequests.filter(r => r.status === 'pending');
  const isAdmin = profile?.role === 'admin';
  const isDirector = profile?.role === 'director';

  if (loading) {
    return (
      <div>
        <TopBar title="Credential Vault" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Credential Vault" subtitle="Secure storage for platform credentials and access management" />
      <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Credential Vault</h1>
          <p className="text-slate-600">Secure storage for platform credentials and access management</p>
        </div>
        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Credential</DialogTitle>
                <DialogDescription>Add a new credential to the secure vault</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newCred.name} onChange={e => setNewCred({ ...newCred, name: e.target.value })} placeholder="e.g., AWS Production" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newCred.category_id} onValueChange={v => setNewCred({ ...newCred, category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Platform</Label>
                  <Input value={newCred.platform_name} onChange={e => setNewCred({ ...newCred, platform_name: e.target.value })} placeholder="e.g., AWS, GitHub, Stripe" />
                </div>
                <div>
                  <Label>Username/Email</Label>
                  <Input value={newCred.username} onChange={e => setNewCred({ ...newCred, username: e.target.value })} placeholder="Login username or email" />
                </div>
                <div>
                  <Label>Password/API Key</Label>
                  <Input type="password" value={newCred.password} onChange={e => setNewCred({ ...newCred, password: e.target.value })} placeholder="Enter password or API key" />
                </div>
                <div>
                  <Label>Access Level</Label>
                  <Select value={newCred.access_level} onValueChange={(v) => setNewCred({ ...newCred, access_level: v as 'public' | 'restricted' | 'admin_only' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - All authenticated users</SelectItem>
                      <SelectItem value="restricted">Restricted - By role</SelectItem>
                      <SelectItem value="admin_only">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCred.access_level === 'restricted' && (
                  <div>
                    <Label>Required Role</Label>
                    <Select value={newCred.required_role} onValueChange={v => setNewCred({ ...newCred, required_role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea value={newCred.description} onChange={e => setNewCred({ ...newCred, description: e.target.value })} placeholder="Notes about this credential" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddCredential}>Add Credential</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Approvals for Admins/Directors */}
      {(isAdmin || isDirector) && pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Access Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.slice(0, 5).map(request => (
              <div key={request.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{request.credential?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-500">Reason: {request.reason || 'No reason provided'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
                  <Button size="sm" onClick={() => handleApproveRequest(request.id)}>Approve</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredCredentials.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No credentials found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCredentials.map(cred => {
                const canView = canViewCredential(cred);
                const hasAccess = hasApprovedAccess(cred.id);
                const hasPending = hasPendingRequest(cred.id);
                const category = categories.find(c => c.id === cred.category_id);

                return (
                  <Card key={cred.id} className={!canView ? 'opacity-75' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${canView ? 'bg-blue-100' : 'bg-slate-100'}`}>
                            {canView ? <Unlock className="h-6 w-6 text-blue-600" /> : <Lock className="h-6 w-6 text-slate-400" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{cred.name}</h3>
                            <p className="text-slate-600">{cred.platform_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{category?.name || 'Uncategorized'}</Badge>
                              <Badge variant={cred.access_level === 'public' ? 'default' : cred.access_level === 'admin_only' ? 'destructive' : 'secondary'}>
                                {cred.access_level.replace('_', ' ')}
                              </Badge>
                              {hasAccess && <Badge className="bg-green-100 text-green-800">Access Granted</Badge>}
                              {hasPending && <Badge className="bg-amber-100 text-amber-800">Request Pending</Badge>}
                            </div>
                          </div>
                        </div>

                        {canView ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVisiblePasswords({ ...visiblePasswords, [cred.id]: !visiblePasswords[cred.id] })}
                            >
                              {visiblePasswords[cred.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(
                                visiblePasswords[cred.id] ? atob(cred.password_encrypted) : cred.username,
                                cred.id
                              )}
                            >
                              {copiedId === cred.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        ) : !hasPending ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCredential(cred);
                              setShowRequestDialog(true);
                            }}
                          >
                            Request Access
                          </Button>
                        ) : null}
                      </div>

                      {canView && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-slate-500 text-xs">Username</Label>
                              <p className="font-mono text-sm">{cred.username}</p>
                            </div>
                            <div>
                              <Label className="text-slate-500 text-xs">Password/API Key</Label>
                              <p className="font-mono text-sm">
                                {visiblePasswords[cred.id] ? atob(cred.password_encrypted) : '••••••••••••'}
                              </p>
                            </div>
                          </div>
                          {cred.description && (
                            <div className="mt-2">
                              <Label className="text-slate-500 text-xs">Notes</Label>
                              <p className="text-sm text-slate-600">{cred.description}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request Access Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Access</DialogTitle>
            <DialogDescription>
              Request access to view credentials for {selectedCredential?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Access</Label>
              <Textarea
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder="Explain why you need access to this credential..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestAccess}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
