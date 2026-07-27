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
import { Lock, Clock as Unlock, Eye, EyeOff, Copy, Check, Search, ShieldAlert } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import type { CredentialVault } from '@/lib/database.types';

type CategoryOption = {
  id: string;
  name: string;
};

// Normalize role strings (handles variations like 'admins', 'marketers', etc.)
function normalizeRole(role: string = ''): string {
  const r = role.toLowerCase().trim();
  if (r === 'admins') return 'admin';
  if (r === 'ceos') return 'ceo';
  if (r === 'marketers' || r === 'marketing') return 'marketer';
  return r;
}

// Web Crypto Helper for Decryption
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
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [credsRes, categoriesRes] = await Promise.all([
        supabase.from('credential_vault').select('*').order('created_at', { ascending: false }),
        supabase.from('credential_categories').select('id, name'),
      ]);

      if (credsRes.data) {
        setCredentials(credsRes.data);
      }
      
      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error('Error fetching vault data:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  // Helper to format category names safely
  function getCategoryName(categoryId: string | null | undefined): string {
    if (!categoryId) return 'General';
    const found = categories.find(
      (c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase()
    );
    if (found) return found.name;
    return categoryId;
  }

  // Permission check: Eye and Decrypt are strictly available ONLY to admin, ceo, or marketer
  function canOpenEye(): boolean {
    if (!profile || !profile.role) return false;
    const userRole = normalizeRole(profile.role);
    return ['admin', 'ceo', 'marketer'].includes(userRole);
  }

  async function togglePasswordVisibility(cred: any) {
    if (!canOpenEye()) {
      toast.error('Restricted: Secrets can only be revealed by Admin, CEO, or Marketer');
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

  // Filter credentials for display across tabs
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

  const isAuthorizedToReveal = canOpenEye();

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Keyring</h1>
          <p className="text-slate-600">Credential catalog viewable by all users</p>
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
                            <div className={`p-3 rounded-lg ${isAuthorizedToReveal ? 'bg-blue-100' : 'bg-slate-100'}`}>
                              {isAuthorizedToReveal ? (
                                <Unlock className="h-6 w-6 text-blue-600" />
                              ) : (
                                <Lock className="h-6 w-6 text-slate-500" />
                              )}
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
                              disabled={!isAuthorizedToReveal}
                              onClick={() => togglePasswordVisibility(cred)}
                              title={
                                isAuthorizedToReveal
                                  ? 'Toggle Secret Visibility'
                                  : 'Requires Admin, CEO, or Marketer Role'
                              }
                            >
                              {visiblePasswords[cred.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : isAuthorizedToReveal ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!isAuthorizedToReveal}
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}