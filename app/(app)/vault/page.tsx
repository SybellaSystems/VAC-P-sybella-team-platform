'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import {
  Clock as Unlock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Plus,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import type { CredentialVault } from '@/lib/database.types';

type CategoryOption = {
  id: string;
  name: string;
};

// --- Web Crypto & Base64 Helpers ---

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

// Convert Uint8Array to Base64 safely in chunks to prevent stack overflow
function bytesToBase64(bytes: Uint8Array): string {
  let binString = '';
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binString += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkSize) as unknown as number[]
    );
  }
  return btoa(binString);
}

// Convert Base64 back to Uint8Array safely
function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

async function encryptSecret(plainText: string): Promise<string> {
  const masterKey =
    process.env.NEXT_PUBLIC_VAULT_KEY || 'sybella_default_vault_secret_key_32b';
  const key = await getCryptoKey(masterKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bytesToBase64(combined);
}

async function decryptSecret(cipherText: string): Promise<string> {
  const masterKey =
    process.env.NEXT_PUBLIC_VAULT_KEY || 'sybella_default_vault_secret_key_32b';
  const key = await getCryptoKey(masterKey);
  const combined = base64ToBytes(cipherText);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

// --- Main Component ---

export default function VaultPage() {
  const { user } = useAuth();

  const [credentials, setCredentials] = useState<CredentialVault[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for New Credential
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCred, setNewCred] = useState({
    name: '',
    platform_name: '',
    username: '',
    password: '',
    category_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [credsRes, categoriesRes] = await Promise.all([
        supabase
          .from('credential_vault')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('credential_categories').select('id, name'),
      ]);

      if (credsRes.data) setCredentials(credsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching vault data:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  function getCategoryName(categoryId: string | null | undefined): string {
    if (!categoryId) return 'General';
    const found = categories.find(
      (c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase()
    );
    return found ? found.name : categoryId;
  }

  // Decrypt and reveal secret
  async function togglePasswordVisibility(cred: any) {
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
        // API fallback
      }

      if (!rawPassword) {
        rawPassword = await decryptSecret(encryptedValue);
      }

      setDecryptedPasswords((prev) => ({ ...prev, [credId]: rawPassword }));
      setVisiblePasswords((prev) => ({ ...prev, [credId]: true }));
    } catch (err) {
      console.error('Decryption error:', err);
      toast.error('Decryption failed');
    }
  }

  function copyToClipboard(text: string, id: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }

  // Create new Credential
  async function handleCreateCredential(e: React.FormEvent) {
    e.preventDefault();
    if (!newCred.name || !newCred.password) {
      toast.error('Name and Password/Secret are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const encryptedPassword = await encryptSecret(newCred.password);

      const { data, error } = await supabase
        .from('credential_vault')
        .insert({
          name: newCred.name,
          platform_name: newCred.platform_name || newCred.name,
          username: newCred.username,
          password_encrypted: encryptedPassword,
          category_id: newCred.category_id || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Credential added to Vault');
      setCredentials((prev) => [data, ...prev]);
      setIsDialogOpen(false);
      setNewCred({
        name: '',
        platform_name: '',
        username: '',
        password: '',
        category_id: '',
      });
    } catch (error: any) {
      console.error('Error creating credential:', error);
      toast.error(error.message || 'Failed to save credential');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredCredentials = credentials.filter((cred) => {
    const query = searchQuery.toLowerCase();
    const credName = (cred.name || '').toLowerCase();
    const platformName = (cred.platform_name || '').toLowerCase();

    const matchesSearch = credName.includes(query) || platformName.includes(query);
    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;

    const credCatName = getCategoryName(cred.category_id).toLowerCase();
    return (
      cred.category_id === activeTab ||
      credCatName === activeTab.toLowerCase() ||
      credCatName.includes(activeTab.toLowerCase())
    );
  });

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Keyring</h1>
            <p className="text-slate-600">Credential catalog viewable and editable by all users</p>
          </div>

          {/* Add Credential Button & Modal */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Credential</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCredential} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="name">Key / Title *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. AWS Production Database"
                    value={newCred.name}
                    onChange={(e) => setNewCred({ ...newCred, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="platform">Platform / Service</Label>
                  <Input
                    id="platform"
                    placeholder="e.g. AWS, Stripe, Vercel"
                    value={newCred.platform_name}
                    onChange={(e) => setNewCred({ ...newCred, platform_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newCred.category_id}
                    onValueChange={(val) => setNewCred({ ...newCred, category_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="username">Username / Access Key</Label>
                  <Input
                    id="username"
                    placeholder="admin@sybella.com or AKIA..."
                    value={newCred.username}
                    onChange={(e) => setNewCred({ ...newCred, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password / Secret Key *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={newCred.password}
                    onChange={(e) => setNewCred({ ...newCred, password: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Encrypting & Saving...' : 'Save Credential'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
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
            {filteredCredentials.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
                No credentials found for this category.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCredentials.map((cred) => {
                  const categoryLabel = getCategoryName(cred.category_id);

                  return (
                    <Card key={cred.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-blue-100">
                              <Unlock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{cred.name || 'Untitled Key'}</h3>
                              <p className="text-slate-600">{cred.platform_name || 'N/A'}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline">{categoryLabel}</Badge>
                                {cred.required_role && (
                                  <Badge variant="secondary">{cred.required_role}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePasswordVisibility(cred)}
                              title="Toggle Secret Visibility"
                            >
                              {visiblePasswords[cred.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
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
                              {copiedId === cred.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}