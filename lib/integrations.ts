import { supabase } from '@/lib/supabase';
import type { ProjectIntegration } from '@/lib/database.types';

export async function fetchProjectIntegrations(projectId: string) {
  return supabase.from('project_integrations').select('*').eq('project_id', projectId);
}

export async function createProjectIntegration(payload: {
  project_id: string;
  platform: string;
  endpoint: string;
  auth_type: ProjectIntegration['auth_type'];
  credentials?: ProjectIntegration['credentials'];
  metadata?: Record<string, any>;
  created_by?: string | null;
}) {
  return supabase.from('project_integrations').insert([
    {
      project_id: payload.project_id,
      platform: payload.platform,
      endpoint: payload.endpoint,
      auth_type: payload.auth_type,
      credentials: payload.credentials || {},
      metadata: payload.metadata || {},
      created_by: payload.created_by || null,
    },
  ]).select('*');
}

export async function fetchExternalIntegrationData(integration: ProjectIntegration) {
  if (!integration.endpoint) {
    throw new Error('Integration endpoint is required.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const creds = integration.credentials || {};
  if (integration.auth_type === 'apikey' && creds.apiKey) {
    headers.Authorization = `Bearer ${creds.apiKey}`;
  }

  if (integration.auth_type === 'bearer' && creds.bearerToken) {
    headers.Authorization = `Bearer ${creds.bearerToken}`;
  }

  if (integration.auth_type === 'basic' && creds.username && creds.password) {
    headers.Authorization = `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`;
  }

  const response = await fetch(integration.endpoint, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to fetch remote integration data: ${response.status} ${errorText}`);
  }

  return response.json();
}
