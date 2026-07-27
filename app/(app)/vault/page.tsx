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
import { Shield, Key, Lock, Clock as Unlock, Eye, EyeOff, Copy, Check, CircleAlert as AlertCircle, Plus, Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import type { CredentialVault, CredentialCategory, CredentialAccessRequest } from '@/lib/database.types';

type AccessRequestWithCredential = CredentialAccessRequest & { credential?: { name: string } };

// Sybella Default Categories structured for internal systems
const SYBELLA_CATEGORIES = [
  { id: 'hosting', name: 'Hosting (Vercel, Render, Cloudflare)' },
  { id: 'code', name: 'Code (GitHub, GitLab)' },
  { id: 'finance', name: 'Finance (Bank, Mobile Money)' },
  { id: 'marketing', name: 'Marketing (Facebook, LinkedIn, Google)' },
  { id: 'internal', name: 'Internal (Email, Admin Accounts)' },
];

export default function VaultPage() {
  const { profile } = useAuth();

  const [credentials, setCredentials] = useState<CredentialVault[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<CredentialVault | null>(null);
  
  // Store raw decrypted passwords in state when revealed
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newCred, setNewCred] = useState({
    name: '',
    category_id: 'hosting',
    platform_name: '',
    username: '',
    password: '',
    description: '',
    access_level: 'restricted' as 'public' | 'restricted' | 'admin_only',
    required_role: 'developer',
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
      const [credsRes, requestsRes] = await Promise.all([
        supabase.from('credential_vault').select('*').order('created_at', { ascending: false }),
        supabase.from('credential_access_requests').select('*, credential:credential_vault(name)').eq('user_id', profile?.id).order('requested_at', { ascending: false }),
      ]);

      if (credsRes.data) setCredentials(credsRes.data);
      if (requestsRes.data) setAccessRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  // Request decryption from backend serverless endpoint
  async function togglePasswordVisibility(credId: string, encryptedValue: string) {
    if (visiblePasswords[credId]) {
      setVisiblePasswords({ ...visiblePasswords, [credId]: false });
      return;
    }

    if (decryptedPasswords[credId]) {
      setVisiblePasswords({ ...visiblePasswords, [credId]: true });
      return;
    }

    try {
      const response = await fetch('/api/vault/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedData: encryptedValue }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to decrypt');

      setDecryptedPasswords((prev) => ({ ...prev, [credId]: data.rawPassword }));
      setVisiblePasswords((prev) => ({ ...prev, [credId]: true }));
    } catch (err) {
      toast.error('Decryption failed or access denied');
    }
  }

  async function handleAddCredential() {
    if (!profile || profile.role !== 'admin') {
      toast.error('Only System Admins can create credentials');
      return;
    }

    try {
      // Encrypt prior to sending to storage
      const encRes = await fetch('/api/vault/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newCred.password }),
      });
      const encData = await encRes.json();

      const { error } = await supabase.from('credential_vault').insert({
        name: newCred.name,
        category_id: newCred.category_id,
        platform_name: newCred.platform_name,
        username: newCred.username,
        password_encrypted: encData.encryptedData,
        description: newCred.description,
        access_level: newCred.access_level,
        required_role: newCred.required_role,
        created_by: profile.id,
      });

      if (error) throw error;

      toast.success('Credential secured and saved');
      setShowAddDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error adding credential:', error);
      toast.error('Failed to save credential');
    }
  }

  function canViewCredential(cred: CredentialVault): boolean {
    if (!profile) return false;
    if (profile.role === 'admin' || profile.role === 'security_officer') return true;
    if (profile.role === 'employee') return false; // Employees explicitly denied by policy
    
    // Sybella Role Policy Mapping
    if (profile.role === 'developer' && cred.category_id !== 'code' && cred.category_id !== 'hosting') return false;
    if (profile.role === 'finance' && cred.category_id !== 'finance') return false;

    if (cred.access_level === 'public') return true;
    if (cred.access_level === 'restricted' && (cred.required_role === 'all' || cred.required_role === profile.role)) return true;

    return accessRequests.some(
      (r) => r.credential_id === cred.id && r.status === 'approved' && new Date(r.expires_at || '') > new Date()
    );
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }

  const filteredCredentials = credentials.filter((cred) => {
    const matchesSearch =
      cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.platform_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && cred.category_id === activeTab;
  });

  const pendingRequests = accessRequests.filter((r) => r.status === 'pending');
  const isAdmin = profile?.role === 'admin';

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
      <TopBar title="Sybella Vault" subtitle="Encrypted organization credentials and secrets" />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Keyring</h1>
            <p className="text-slate-600">Role-gated credential management</p>
          </div>
          {isAdmin && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Credential
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Credential</DialogTitle>
                  <DialogDescription>Store AES-256 encrypted access key</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Credential Title</Label>
                    <Input
                      value={newCred.name}
                      onChange={(e) => setNewCred({ ...newCred, name: e.target.value })}
                      placeholder="e.g., Production Database"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newCred.category_id}
                      onValueChange={(v) => setNewCred({ ...newCred, category_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYBELLA_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Platform Name</Label>
                    <Input
                      value={newCred.platform_name}
                      onChange={(e) => setNewCred({ ...newCred, platform_name: e.target.value })}
                      placeholder="e.g., Vercel, Supabase, MTN MoMo API"
                    />
                  </div>
                  <div>
                    <Label>Identifier / Username</Label>
                    <Input
                      value={newCred.username}
                      onChange={(e) => setNewCred({ ...newCred, username: e.target.value })}
                      placeholder="Username, Email, or API Client ID"
                    />
                  </div>
                  <div>
                    <Label>Raw Secret / Password</Label>
                    <Input
                      type="password"
                      value={newCred.password}
                      onChange={(e) => setNewCred({ ...newCred, password: e.target.value })}
                      placeholder="Encrypted automatically on submission"
                    />
                  </div>
                  <div>
                    <Label>Target Role Access Level</Label>
                    <Select
                      value={newCred.required_role}
                      onValueChange={(v) => setNewCred({ ...newCred, required_role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Authorized Roles</SelectItem>
                        <SelectItem value="developer">Developer Only</SelectItem>
                        <SelectItem value="finance">Finance Only</SelectItem>
                        <SelectItem value="security_officer">Security Officer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCredential}>Encrypt & Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search keys by platform or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {SYBELLA_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.id.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid gap-4">
              {filteredCredentials.map((cred) => {
                const canView = canViewCredential(cred);
                return (
                  <Card key={cred.id} className={!canView ? 'opacity-60' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${canView ? 'bg-blue-100' : 'bg-slate-100'}`}>
                            {canView ? (
                              <Unlock className="h-6 w-6 text-blue-600" />
                            ) : (
                              <Lock className="h-6 w-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{cred.name}</h3>
                            <p className="text-slate-600">{cred.platform_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{cred.category_id}</Badge>
                              <Badge variant="secondary">{cred.required_role}</Badge>
                            </div>
                          </div>
                        </div>

                        {canView && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePasswordVisibility(cred.id, cred.password_encrypted)}
                            >
                              {visiblePasswords[cred.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  decryptedPasswords[cred.id] || cred.username,
                                  cred.id
                                )
                              }
                            >
                              {copiedId === cred.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </div>

                      {canView && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-slate-500 text-xs">Username / Access Key</Label>
                              <p className="font-mono text-sm">{cred.username}</p>
                            </div>
                            <div>
                              <Label className="text-slate-500 text-xs">Password / Secret</Label>
                              <p className="font-mono text-sm">
                                {visiblePasswords[cred.id]
                                  ? decryptedPasswords[cred.id]
                                  : '••••••••••••••••'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}