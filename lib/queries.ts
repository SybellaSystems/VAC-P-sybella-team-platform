import type { Notification } from '@/lib/database.types';
import type { PostgrestResponse } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type WikiMetadata = {
  template?: 'Policy' | 'Playbook' | 'Release note' | 'How-to' | 'FAQ' | 'Executive summary';
  category?: string;
  tags?: string[];
  featured?: boolean;
  cover_image?: string;
};

export type WikiPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by_user_id: string | null;
  created_by_auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: WikiMetadata;
};

export type WikiTemplateOption = {
  key: WikiMetadata['template'];
  label: string;
  description: string;
  summary: string;
  content: string;
  category: string;
};

export const wikiTemplates: WikiTemplateOption[] = [
  {
    key: 'Policy',
    label: 'Policy article',
    description: 'Create a clear policy page with purpose, scope, and actions.',
    summary: 'This template is designed for standard operating procedures and team policies.',
    content: '# Policy overview\n\n## Purpose\n\nExplain why this policy exists.\n\n## Scope\n\nDescribe which teams or roles are covered.\n\n## Guidelines\n\n- Rule one\n- Rule two\n- Rule three\n\n## Review cadence\n\nHow often this policy will be reviewed.',
    category: 'Policy',
  },
  {
    key: 'How-to',
    label: 'How-to guide',
    description: 'Step-by-step playbook for onboarding, tools, or workflows.',
    summary: 'A practical how-to guide that helps teams execute processes consistently.',
    content: '# How to use this feature\n\n## Overview\n\nDescribe the goal and outcome.\n\n## Steps\n\n1. Step one\n2. Step two\n3. Step three\n\n## Best practices\n\n- Keep it simple\n- Check completion\n- Share with your team',
    category: 'Guide',
  },
  {
    key: 'Release note',
    label: 'Release note',
    description: 'Announce important updates, product changes, or launch notes.',
    summary: 'A formatted release note for features, bug fixes, and rollout details.',
    content: '# Release note\n\n## What changed\n\n- New feature A\n- Updated workflow B\n- Fixed issue C\n\n## Impact\n\nDescribe who is affected and what to expect.\n\n## Next steps\n\n- Review the release notes\n- Share with the team',
    category: 'Release',
  },
  {
    key: 'FAQ',
    label: 'FAQ',
    description: 'Create an FAQ page with common questions and clear answers.',
    summary: 'A frequently asked questions page built to reduce friction and share knowledge.',
    content: '# FAQ\n\n## Question one\n\nAnswer one.\n\n## Question two\n\nAnswer two.\n\n## Question three\n\nAnswer three.',
    category: 'FAQ',
  },
  {
    key: 'Executive summary',
    label: 'Executive summary',
    description: 'Write a concise, high-impact summary for leadership and stakeholders.',
    summary: 'A quick executive summary with key decisions, risks, and next steps.',
    content: '# Executive summary\n\n## Overview\n\nSummarize the initiative and its importance.\n\n## Key outcomes\n\n- Outcome one\n- Outcome two\n\n## Risks and mitigations\n\n- Risk one + mitigation\n- Risk two + mitigation\n\n## Recommended next actions\n\n- Action one\n- Action two',
    category: 'Executive',
  },
];

export async function fetchWikiPages(): Promise<PostgrestResponse<WikiPage>> {
  const response = await supabase.from('wiki_pages').select('*').order('updated_at', { ascending: false });
  return response as PostgrestResponse<WikiPage>;
}

export async function fetchFeaturedWikiPages(): Promise<PostgrestResponse<WikiPage>> {
  const response = await supabase
    .from('wiki_pages')
    .select('*')
    .contains('metadata', { featured: true })
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(6);
  return response as PostgrestResponse<WikiPage>;
}

export async function searchWikiPages(query: string): Promise<PostgrestResponse<WikiPage>> {
  const normalized = query.trim();
  if (!normalized) return fetchWikiPages();
  const response = await supabase
    .from('wiki_pages')
    .select('*')
    .or(
      `title.ilike.%${normalized}%,summary.ilike.%${normalized}%,content.ilike.%${normalized}%`
    )
    .order('updated_at', { ascending: false });
  return response as PostgrestResponse<WikiPage>;
}

type WikiPageInsertPayload = {
  slug: string;
  title: string;
  summary?: string | null;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_by_auth_user_id: string;
  metadata: WikiMetadata;
};

export async function createWikiPage(payload: {
  slug: string;
  title: string;
  summary?: string | null;
  content: string;
  is_published: boolean;
  created_by_auth_user_id: string;
  metadata?: WikiMetadata;
}): Promise<PostgrestResponse<WikiPage>> {
  const response = await supabase
    .from('wiki_pages')
    .insert([
      {
        slug: payload.slug,
        title: payload.title,
        summary: payload.summary,
        content: payload.content,
        is_published: payload.is_published,
        published_at: payload.is_published ? new Date().toISOString() : null,
        created_by_auth_user_id: payload.created_by_auth_user_id,
        metadata: payload.metadata || {},
      },
    ])
    .select();

  return response as PostgrestResponse<WikiPage>;
}

export async function updateWikiPage(id: string, payload: {
  slug: string;
  title: string;
  summary?: string | null;
  content: string;
  is_published: boolean;
  metadata?: WikiMetadata;
}) {
  return supabase.from('wiki_pages').update({
    slug: payload.slug,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    is_published: payload.is_published,
    published_at: payload.is_published ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    metadata: payload.metadata || {},
  }).eq('id', id);
}

export async function fetchUnreadNotificationCount(userId: string): Promise<PostgrestResponse<Notification>> {
  const response = await supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_read', false);
  return response as PostgrestResponse<Notification>;
}

export async function fetchRecentNotifications(userId: string): Promise<PostgrestResponse<Notification>> {
  const response = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6);
  return response as PostgrestResponse<Notification>;
}

export async function markNotificationRead(notificationId: string): Promise<PostgrestResponse<Notification>> {
  const response = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  return response as PostgrestResponse<Notification>;
}

export async function markAllNotificationsRead(userId: string): Promise<PostgrestResponse<Notification>> {
  const response = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return response as PostgrestResponse<Notification>;
}

export async function createNotification(payload: {
  user_id: string;
  title: string;
  message: string;
  type?: Notification['type'];
  link?: string;
}): Promise<PostgrestResponse<Notification>> {
  const response = await supabase.from('notifications').insert([
    {
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? 'info',
      link: payload.link ?? '',
    },
  ]).select();

  return response as PostgrestResponse<Notification>;
}

export async function fetchWikiTrendingTopics() {
  const { data } = await fetchWikiPages();
  const categories = new Map<string, number>();
  data?.forEach((page) => {
    const category = page.metadata?.category?.trim() || 'General';
    categories.set(category, (categories.get(category) ?? 0) + 1);
  });
  return Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic]) => topic);
}

export async function fetchRecentMessages(channelId: string) {
  return supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(20);
}

export async function fetchProjectWikiConnections(projectId: string) {
  return supabase
    .from('project_feature_links')
    .select('*')
    .eq('project_id', projectId)
    .eq('feature_type', 'wiki_page');
}
