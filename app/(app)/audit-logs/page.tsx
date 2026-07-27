'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollText, Search, Filter, User, Activity, Database, Shield } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { AuditLog, Profile } from '@/lib/database.types';

export default function AuditLogsPage() {
  const { profile } = useAuth();

  const [logs, setLogs] = useState<(AuditLog & { user?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, user:profiles!audit_logs_user_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    const action = (log.action || '').toLowerCase();
    const entityType = (log.entity_type || '').toLowerCase();
    const fullName = ((log.user as Profile)?.full_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      action.includes(query) ||
      entityType.includes(query) ||
      fullName.includes(query);

    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const uniqueEntities = Array.from(new Set(logs.map(l => l.entity_type).filter(Boolean)));

  const getActionColor = (action: string | null | undefined) => {
    const act = (action || '').toLowerCase();
    if (act.includes('create') || act.includes('add')) return 'bg-green-100 text-green-800';
    if (act.includes('update') || act.includes('edit')) return 'bg-blue-100 text-blue-800';
    if (act.includes('delete') || act.includes('remove')) return 'bg-red-100 text-red-800';
    if (act.includes('login') || act.includes('auth')) return 'bg-purple-100 text-purple-800';
    return 'bg-slate-100 text-slate-800';
  };

  const getEntityIcon = (entity: string | null | undefined) => {
    const ent = (entity || '').toLowerCase();
    if (ent.includes('user') || ent.includes('profile')) return <User className="h-4 w-4" />;
    if (ent.includes('project') || ent.includes('task')) return <Activity className="h-4 w-4" />;
    if (ent.includes('finance') || ent.includes('budget')) return <Database className="h-4 w-4" />;
    if (ent.includes('auth') || ent.includes('credential')) return <Shield className="h-4 w-4" />;
    return <ScrollText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Audit Logs" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Audit Logs" subtitle="System activity and change history" />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueEntities.map(entity => (
                <SelectItem key={entity} value={entity}>{entity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>{filteredLogs.length} entries</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ScrollText className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500">No audit logs found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-white border">
                        {getEntityIcon(log.entity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{(log.user as Profile)?.full_name || 'System'}</span>
                          <Badge className={getActionColor(log.action)}>{log.action || 'unknown'}</Badge>
                          <Badge variant="outline">{log.entity_type || 'general'}</Badge>
                        </div>
                        {log.entity_id && (
                          <p className="text-sm text-slate-500 mt-1">ID: {log.entity_id}</p>
                        )}
                        {log.old_values && Object.keys(log.old_values || {}).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-400 cursor-pointer">View changes</summary>
                            <div className="mt-2 p-2 bg-white rounded border text-xs font-mono">
                              <pre>{JSON.stringify({ old: log.old_values, new: log.new_values }, null, 2)}</pre>
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 text-right">
                        <p>{log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy') : ''}</p>
                        <p>{log.created_at ? format(new Date(log.created_at), 'HH:mm:ss') : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}