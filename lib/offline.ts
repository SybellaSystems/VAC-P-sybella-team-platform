import { supabase } from '@/lib/supabase';
import type { Project, Task } from '@/lib/database.types';

export type OfflineActionType =
  | 'createProject'
  | 'updateProject'
  | 'updateTask'
  | 'createMessage'
  | 'createCampaign'
  | 'createCalendarItem'
  | 'createAsset';

export type OfflineAction = {
  id: string;
  type: OfflineActionType;
  payload: Record<string, any>;
  createdAt: string;
};

const QUEUE_KEY = 'vacp:offline-queue';
const CACHE_PREFIX = 'vacp:cache:';

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isBrowser = () => typeof window !== 'undefined';

export function getOfflineQueue(): OfflineAction[] {
  if (!isBrowser()) return [];
  try {
    const value = window.localStorage.getItem(QUEUE_KEY);
    return value ? (JSON.parse(value) as OfflineAction[]) : [];
  } catch (error) {
    console.error('Unable to read offline queue', error);
    return [];
  }
}

export function setOfflineQueue(actions: OfflineAction[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('Unable to save offline queue', error);
  }
}

export function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'createdAt'>) {
  const next: OfflineAction = {
    ...action,
    id: buildId(),
    createdAt: new Date().toISOString(),
  };
  const queue = getOfflineQueue();
  queue.push(next);
  setOfflineQueue(queue);
  return next;
}

export function clearOfflineQueue() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(QUEUE_KEY);
}

export function addOfflineCache<T>(key: string, data: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch (error) {
    console.error('Unable to save offline cache', error);
  }
}

export function getOfflineCache<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const value = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error('Unable to load offline cache', error);
    return null;
  }
}

export async function processOfflineAction(action: OfflineAction) {
  if (!supabase) throw new Error('Supabase client is not available');

  switch (action.type) {
    case 'createProject': {
      const { name, description, customer_id, start_date, end_date, status, priority, budget, spent, progress, created_by } = action.payload;
      return await supabase.from('projects').insert([{ name, description, customer_id, start_date, end_date, status, priority, budget, spent, progress, created_by }]);
    }
    case 'updateProject': {
      const { id, fields } = action.payload;
      return await supabase.from('projects').update(fields).eq('id', id);
    }
    case 'updateTask': {
      const { id, fields } = action.payload;
      return await supabase.from('tasks').update(fields).eq('id', id);
    }
    case 'createMessage': {
      const { channel_id, sender_id, content, message_type, parent_id } = action.payload;
      return await supabase.from('messages').insert([{ channel_id, sender_id, content, message_type, parent_id }]);
    }
    case 'createCampaign': {
      const { name, description, status, owner_id, start_date, end_date, budget, leads_target } = action.payload;
      return await supabase.from('marketing_campaigns').insert([{ name, description, status, owner_id, start_date, end_date, budget, leads_target }]);
    }
    case 'createCalendarItem': {
      const { campaign_id, title, scheduled_date, content_type, owner_id, notes } = action.payload;
      return await supabase.from('content_calendar_items').insert([{ campaign_id, title, scheduled_date, content_type, owner_id, notes }]);
    }
    case 'createAsset': {
      const { title, file_name, file_type, file_size, uploaded_by } = action.payload;
      return await supabase.from('marketing_assets').insert([{ title, file_name, file_type, file_size, uploaded_by }]);
    }
    default:
      throw new Error(`Unknown offline action type ${action.type}`);
  }
}

export async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  for (const action of queue) {
    try {
      const response = await processOfflineAction(action);
      if (response.error) {
        failed += 1;
        errors.push(response.error.message);
        console.error('Failed offline action', action, response.error);
      } else {
        synced += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push(String(error));
      console.error('Failed offline action', action, error);
    }
  }

  if (synced > 0 && failed === 0) {
    clearOfflineQueue();
  } else if (synced > 0) {
    setOfflineQueue(queue.filter((action) => !errors.some((err) => err.includes(action.id))));
  }

  return { synced, failed, errors };
}
