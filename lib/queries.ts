import type { Notification } from '@/lib/database.types';
import type { PostgrestResponse } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type WikiPageRow = {
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
};

export type WikiTemplateOption = {
  key: string;
  label: string;
  description: string;
  content: string;
  category: string;
};

export const wikiTemplates: WikiTemplateOption[] = [
  {
    key: 'Policy',
    label: 'Policy article',
    description: 'Create a clear policy page with purpose, scope, and actions.',
    content: '# Policy overview\n\n## Purpose\n\nExplain why this policy exists.\n\n## Scope\n\nDescribe which teams or roles are covered.\n\n## Guidelines\n\n- Rule one\n- Rule two\n- Rule three\n\n## Review cadence\n\nHow often this policy will be reviewed.',
    category: 'Policy',
  },
  {
    key: 'How-to',
    label: 'How-to guide',
    description: 'Step-by-step playbook for onboarding, tools, or workflows.',
    content: '# How to use this feature\n\n## Overview\n\nDescribe the goal and outcome.\n\n## Steps\n\n1. Step one\n2. Step two\n3. Step three\n\n## Best practices\n\n- Keep it simple\n- Check completion\n- Share with your team',
    category: 'Guide',
  },
  {
    key: 'Release note',
    label: 'Release note',
    description: 'Announce important updates, product changes, or launch notes.',
    content: '# Release note\n\n## What changed\n\n- New feature A\n- Updated workflow B\n- Fixed issue C\n\n## Impact\n\nDescribe who is affected and what to expect.\n\n## Next steps\n\n- Review the release notes\n- Share with the team',
    category: 'Release',
  },
  {
    key: 'FAQ',
    label: 'FAQ',
    description: 'Create an FAQ page with common questions and clear answers.',
    content: '# FAQ\n\n## Question one\n\nAnswer one.\n\n## Question two\n\nAnswer two.\n\n## Question three\n\nAnswer three.',
    category: 'FAQ',
  },
  {
    key: 'Executive summary',
    label: 'Executive summary',
    description: 'Write a concise, high-impact summary for leadership and stakeholders.',
    content: '# Executive summary\n\n## Overview\n\nSummarize the initiative and its importance.\n\n## Key outcomes\n\n- Outcome one\n- Outcome two\n\n## Risks and mitigations\n\n- Risk one + mitigation\n- Risk two + mitigation\n\n## Recommended next actions\n\n- Action one\n- Action two',
    category: 'Executive',
  },
];

export async function fetchWikiPages(): Promise<PostgrestResponse<WikiPageRow>> {
  const response = await supabase.from('wiki_pages').select('*').order('updated_at', { ascending: false });
  return response as PostgrestResponse<WikiPageRow>;
}

export async function fetchFeaturedWikiPages(): Promise<PostgrestResponse<WikiPageRow>> {
  const response = await supabase
    .from('wiki_pages')
    .select('*')
    .eq('is_published', true)
    .eq('category', 'Executive')
    .order('updated_at', { ascending: false })
    .limit(6);
  return response as PostgrestResponse<WikiPageRow>;
}

export async function searchWikiPages(query: string): Promise<PostgrestResponse<WikiPageRow>> {
  const normalized = query.trim();
  if (!normalized) return fetchWikiPages();
  const response = await supabase
    .from('wiki_pages')
    .select('*')
    .or(`title.ilike.%${normalized}%,content.ilike.%${normalized}%`)
    .order('updated_at', { ascending: false });
  return response as PostgrestResponse<WikiPageRow>;
}

export async function createWikiPage(payload: {
  slug: string;
  title: string;
  content: string;
  category?: string;
  is_published: boolean;
  author_id: string;
}): Promise<PostgrestResponse<WikiPageRow>> {
  const response = await supabase
    .from('wiki_pages')
    .insert([
      {
        slug: payload.slug,
        title: payload.title,
        content: payload.content,
        category: payload.category || 'general',
        is_published: payload.is_published,
        author_id: payload.author_id,
      },
    ])
    .select();

  return response as PostgrestResponse<WikiPageRow>;
}

export async function updateWikiPage(id: string, payload: {
  slug: string;
  title: string;
  content: string;
  category?: string;
  is_published: boolean;
  last_edited_by?: string;
}) {
  return supabase.from('wiki_pages').update({
    slug: payload.slug,
    title: payload.title,
    content: payload.content,
    category: payload.category || 'general',
    is_published: payload.is_published,
    last_edited_by: payload.last_edited_by ?? null,
    updated_at: new Date().toISOString(),
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
  (data ?? []).forEach((page) => {
    const category = page.category?.trim() || 'General';
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
