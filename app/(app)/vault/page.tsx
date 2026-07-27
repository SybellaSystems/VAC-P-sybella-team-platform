'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Lock, Clock as Unlock, Eye, EyeOff, Copy, Check, Plus, Search, ShieldAlert } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import type { CredentialVault, CredentialAccessRequest } from '@/lib/database.types';

type AccessRequestWithCredential = CredentialAccessRequest & { credential?: { name: string } };

type CategoryOption = {
  id: string;
  name: string;
};

type TeamOption = {
  id: string;
  name: string;
};

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'hosting', name: 'Hosting' },
  { id: 'code', name: 'Code' },
  { id: 'finance', name: 'Finance' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'internal', name: 'Internal' },
  { id: 'hr', name: 'HR & People' },
  { id: 'design', name: 'Design' },
];

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function normalizeRole(role: string = ''): string {
  const r = role.toLowerCase().trim();
  if (r === 'developers') return 'developer';
  if (r === 'managers') return 'manager';
  if (r === 'designers') return 'designer';
  if (r === 'qas') return 'qa';
  if (r === 'saless') return 'sales';
  if (r === 'hrs') return 'hr';
  return r;
}

// Web Crypto Helper
async function getCryptoKey(secretKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey.padEnd(32, '0').slice(0, 32)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('sybella_vault_salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptSecret(cipherText: string): Promise<string> {
  const masterKey = process.env.NEXT_PUBLIC_VAULT_KEY || 'sybella_default_vault_secret_key_32b';
  const key = await getCryptoKey(masterKey);
  const combined = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

export default function VaultPage() {
  const { profile } = useAuth();

  const [credentials, setCredentials] = useState<CredentialVault[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithCredential[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  
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
    team_id: 'all',
  });

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [credsRes, requestsRes, categoriesRes, teamsRes, userTeamsRes] = await Promise.all([
        supabase.from('credential_vault').select('*').order('created_at', { ascending: false }),
        supabase.from('credential_access_requests').select('*, credential:credential_vault(name)').eq('user_id', profile?.id || '').order('requested_at', { ascending: false }),
        supabase.from('credential_categories').select('id, name'),
        supabase.from('teams').select('id, name'),
        supabase.from('team_members').select('team_id').eq('user_id', profile?.id || ''),
      ]);

      if (credsRes.data) setCredentials(credsRes.data);
      if (requestsRes.data) setAccessRequests(requestsRes.data);
      
      if (categoriesRes.data && categoriesRes.data.length > 0) {
        const cleanCategories = categoriesRes.data
          .filter((cat) => !isUUID(cat.name))
          .map((cat) => ({
            id: cat.id,
            name: cat.name || cat.id,
          }));
        setCategories(cleanCategories.length > 0 ? cleanCategories : DEFAULT_CATEGORIES);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
      
      if (teamsRes.data) setTeams(teamsRes.data);
      if (userTeamsRes.data) setUserTeamIds(userTeamsRes.data.map((tm: any) => tm.team_id));
    } catch (error) {
      console.error('Error fetching vault data:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  function getCategoryName(categoryId: string | null | undefined): string {
    if (!categoryId) return 'General';
    const found = categories.find((c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase());
    if (found) return found.name;
    const defaultFound = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
    if (defaultFound) return defaultFound.name;
    return isUUID(categoryId) ? 'General' : categoryId;
  }

  // Check if current user is authorized to decrypt & reveal the secret
  function canDecryptCredential(cred: any): boolean {
    if (!profile) return false;
    const userRole = normalizeRole(profile.role);
    
    // Management & Admin can reveal any secret
    if (['admin', 'director', 'manager', 'legal_counsel', 'security_officer'].includes(userRole)) {
      return true;
    }

    // Team Gating
    if (cred.team_id && cred.team_id !== 'all' && !userTeamIds.includes(cred.team_id)) {
      return false;
    }

    // Explicit Approved Requests
    const hasApprovedRequest = accessRequests.some(
      (r) => r.credential_id === cred.id && r.status === 'approved' && new Date(r.expires_at || '') > new Date()
    );
    if (hasApprovedRequest) return true;

    // Category / Role check
    const categoryName = getCategoryName(cred.category_id).toLowerCase();
    const credRequiredRole = normalizeRole(cred.required_role || 'all');

    if (userRole === 'developer') {
      return categoryName.includes('code') || categoryName.includes('host') || categoryName.includes('general') || credRequiredRole === 'developer' || credRequiredRole === 'all';
    }

    if (userRole === 'qa') {
      return categoryName.includes('code') || categoryName.includes('host') || categoryName.includes('general') || credRequiredRole === 'qa' || credRequiredRole === 'developer' || credRequiredRole === 'all';
    }

    if (userRole === 'designer') {
      return categoryName.includes('design') || categoryName.includes('marketing') || categoryName.includes('general') || credRequiredRole === 'designer' || credRequiredRole === 'all';
    }

    if (userRole === 'sales') {
      return categoryName.includes('marketing') || categoryName.includes('internal') || categoryName.includes('general') || credRequiredRole === 'sales' || credRequiredRole === 'all';
    }

    if (userRole === 'hr') {
      return categoryName.includes('hr') || categoryName.includes('people') || categoryName.includes('internal') || categoryName.includes('general') || credRequiredRole === 'hr' || credRequiredRole === 'all';
    }

    if (cred.access_level === 'public') return true;
    return credRequiredRole === 'all' || credRequiredRole === userRole;
  }

  async function togglePasswordVisibility(cred: any) {
    if (!canDecryptCredential(cred)) {
      toast.error('Role Restricted: You do not have permission to reveal this secret key');
      return;
    }

    const credId = cred.id;
    const encryptedValue = cred.password_encrypted;

    if (visiblePasswords[credId]) {
      setVisiblePasswords((prev) => ({ ...prev, [credId]: false }));
      return;
    }

    if (decryptedPasswords[credId]) {
      setVisiblePasswords((prev) => ({ ...prev, [credId]: true }));
      return;
    }

    try {
      let rawPassword = '';
      try {
        const response = await fetch('/api/vault/decrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encryptedData: encryptedValue }),
        });

        if (response.ok) {
          const data = await response.json();
          rawPassword = data.rawPassword;
        }
      } catch {
        // Fallback
      }

      if (!rawPassword) {
        rawPassword = await decryptSecret(encryptedValue);
      }

      setDecryptedPasswords((prev) => ({ ...prev, [credId]: rawPassword }));
      setVisiblePasswords((prev) => ({ ...prev, [credId]: true }));
    } catch (err) {
      console.error('Decryption error:', err);
      toast.error('Decryption failed or access denied');
    }
  }

  function copyToClipboard(text: string, id: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }

  const filteredCredentials = credentials.filter((cred) => {
    const query = searchQuery.toLowerCase();
    const credName = (cred.name || '').toLowerCase();
    const platformName = (cred.platform_name || '').toLowerCase();

    const matchesSearch = credName.includes(query) || platformName.includes(query);
    if (activeTab === 'all') return matchesSearch;

    return matchesSearch && (cred.category_id === activeTab || getCategoryName(cred.category_id).toLowerCase() === activeTab.toLowerCase());
  });

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
            <p className="text-slate-600">Role & Team gated credential management</p>
          </div>
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

        {/* Categories Tab Bar */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid gap-4">
              {filteredCredentials.map((cred) => {
                const canDecrypt = canDecryptCredential(cred);
                const assignedTeam = teams.find((t) => t.id === (cred as any).team_id);
                const categoryLabel = getCategoryName(cred.category_id);

                return (
                  <Card key={cred.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${canDecrypt ? 'bg-blue-100' : 'bg-amber-50'}`}>
                            {canDecrypt ? (
                              <Unlock className="h-6 w-6 text-blue-600" />
                            ) : (
                              <Lock className="h-6 w-6 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{cred.name || 'Untitled Key'}</h3>
                            <p className="text-slate-600">{cred.platform_name || 'N/A'}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline">{categoryLabel}</Badge>
                              <Badge variant="secondary">{cred.required_role || 'all'}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canDecrypt}
                            onClick={() => togglePasswordVisibility(cred)}
                            title={canDecrypt ? "Toggle Secret Visibility" : "Role Restricted"}
                          >
                            {visiblePasswords[cred.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : canDecrypt ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <ShieldAlert className="h-4 w-4 text-amber-600" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canDecrypt}
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
                      </div>

                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-500 text-xs">Username / Access Key</Label>
                            <p className="font-mono text-sm">{cred.username || '—'}</p>
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