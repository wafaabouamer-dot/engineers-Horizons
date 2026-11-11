import { useMemo } from 'react';
import { backendRequest, callFunction, selectRows, useRows } from './data';

export type L = { ar: string; en: string };
export const pick = (lang: string, v: L | null | undefined, fallback = '') =>
  !v ? fallback : lang === 'ar' ? v.ar || v.en || fallback : v.en || v.ar || fallback;

export type Settings = Record<string, L>;
export type Category = { id: string; name_ar: string; name_en: string; sort_order: number };
export type Trainer = {
  id: number; slug: string; name_ar: string; name_en: string; title_ar: string | null; title_en: string | null;
  bio_ar: string | null; bio_en: string | null; qualifications_ar: string | null; qualifications_en: string | null;
  photo_url: string | null; video_url: string | null; initials: string; published: boolean; sort_order: number;
  account_email?: string | null;
};
export type Course = {
  id: number; slug: string; category: string | null; trainer_id: number | null; hours: number; price: number;
  capacity: number | null; level_ar: string | null; level_en: string | null; title_ar: string; title_en: string;
  summary_ar: string | null; summary_en: string | null; description_ar: string | null; description_en: string | null;
  audience_ar: string | null; audience_en: string | null; requirements_ar: string | null; requirements_en: string | null;
  method: string; outcomes: { ar: string; en: string }[]; cover_url: string | null; video_url: string | null;
  start_date: string | null; end_date: string | null; registration_open: boolean; published: boolean; featured: boolean;
  trainers?: Trainer | null;
};
export type Post = {
  id: number; kind: string; slug: string; date: string; title_ar: string; title_en: string;
  excerpt_ar: string | null; excerpt_en: string | null; content_ar: string | null; content_en: string | null;
  author: string | null; cover_url: string | null; video_url: string | null; published: boolean;
};
export type EventItem = {
  id: number; kind: string; slug: string; title_ar: string; title_en: string; summary_ar: string | null;
  summary_en: string | null; description_ar: string | null; description_en: string | null; speaker: string | null;
  location: string | null; starts_at: string | null; capacity: number | null; cover_url: string | null;
  video_url: string | null; registration_open: boolean; published: boolean;
};

export type Lesson = {
  id: number; course_id: number; title_ar: string; title_en: string; summary_ar: string | null;
  summary_en: string | null; video_url: string | null; material_url: string | null; duration_min: number | null;
  sort_order: number; published: boolean;
};
export type Quiz = {
  id: number; course_id: number; lesson_id: number | null; title_ar: string; title_en: string;
  description_ar: string | null; description_en: string | null; sort_order: number; published: boolean;
};
export type Question = {
  id: number; quiz_id: number; text_ar: string; text_en: string;
  options: { ar: string; en: string }[]; correct_index: number; points: number; sort_order: number;
};
export type Attempt = {
  id: number; quiz_id: number; user_id: string; user_name: string | null; user_email: string | null;
  answers: number[]; score: number; total: number; created_at: string;
};

export function useSettings() {
  const { rows, error, loading, reload } = useRows<{ key: string; value_ar: string | null; value_en: string | null }>(
    'site_settings?select=*',
  );
  const key = JSON.stringify(rows ?? []);
  // Stable identity: rebuild only when the rows change, so editors don't loop.
  const stable: Settings = useMemo(() => {
    const m: Settings = {};
    for (const r of (JSON.parse(key) as { key: string; value_ar: string | null; value_en: string | null }[])) m[r.key] = { ar: r.value_ar ?? '', en: r.value_en ?? '' };
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { settings: stable, error, loading, reload };
}

export const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]+/g, '').replace(/-+/g, '-') || `x-${Date.now()}`;

export function ytEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export function isVideo(url: string | null | undefined) {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || !!videoEmbed(url);
}

/** A Google Drive share link as an embeddable preview URL, or null. */
export function driveEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) ??
    url.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/) ??
    url.match(/drive\.google\.com[^?]*[?&]id=([A-Za-z0-9_-]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
}

/** A video link (YouTube, Drive or file) as an embeddable URL, or null. */
export function videoEmbed(url: string | null | undefined): string | null {
  return ytEmbed(url) ?? driveEmbed(url);
}

/** A user-entered link that is safe to put in an <a href>: only http(s) or the site's own files. Anything else (javascript:, data:, …) is refused. */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('/_fn/')) return t;
  return null;
}

const MAX_UPLOAD_MB = 95;

/** Send an image or video from the device to the site's storage. Answers the URL to save in the row. */
export async function uploadMedia(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error('الملف كبير. الحد 95MB.');
  }
  if (!/^(image|video)\//.test(file.type)) {
    throw new Error('ارسل صورة او فيديو فقط.');
  }
  const res = await callFunction('media/upload', {
    method: 'POST',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!data.url) throw new Error(data.error || 'تعذر الرفع.');
  return data.url;
}

export async function saveSettings(map: Record<string, { ar: string; en: string }>) {
  const rows = Object.entries(map).map(([key, v]) => ({ key, value_ar: v.ar, value_en: v.en }));
  const res = await backendRequest('site_settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error('save failed');
}

export async function upsertRow(table: string, row: Record<string, unknown>, id?: number | string) {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === '') clean[k] = null;
    else clean[k] = v;
  }
  const returnsRepresentation = table !== 'trainers';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    Prefer: returnsRepresentation ? 'return=representation' : 'return=minimal',
  };
  let res;
  if (id === undefined || id === null) {
    res = await backendRequest(table, { method: 'POST', headers, body: JSON.stringify(clean) });
  } else {
    const key = typeof id === 'number' ? `id=eq.${id}` : `key=eq.${encodeURIComponent(String(id))}`;
    res = await backendRequest(`${table}?${key}`, { method: 'PATCH', headers, body: JSON.stringify(clean) });
  }
  return returnsRepresentation ? res.json() : undefined;
}

/**
 * Save a trainer or team member. Public fields go to `trainers`; the login
 * email goes to `trainer_access`, which only admins (and that trainer) may
 * read — visitors of the site never see it. Answers the trainer id.
 */
export async function upsertTrainer(row: Record<string, unknown>, id?: number | string): Promise<number> {
  const { account_email, ...rest } = row;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === '') clean[k] = null;
    else clean[k] = v;
  }
  let trainerId: number;
  if (id === undefined || id === null) {
    const res = await backendRequest('trainers', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(clean),
    });
    const created = (await res.json()) as { id?: number } | { id?: number }[];
    trainerId = Number(Array.isArray(created) ? created[0]?.id : created?.id);
    if (!trainerId) throw new Error('save failed');
  } else {
    await backendRequest(`trainers?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(clean),
    });
    trainerId = Number(id);
  }
  const email = typeof account_email === 'string' ? account_email.trim() : '';
  if (email) {
    await backendRequest('trainer_access', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ trainer_id: trainerId, account_email: email }),
    });
  } else {
    await backendRequest(`trainer_access?trainer_id=eq.${trainerId}`, { method: 'DELETE' });
  }
  return trainerId;
}

export async function deleteRow(table: string, id: number | string, byKey = false) {
  const q = byKey ? `key=eq.${encodeURIComponent(String(id))}` : `id=eq.${id}`;
  await backendRequest(`${table}?${q}`, { method: 'DELETE' });
}

export async function loadTable<T>(table: string, order = 'created_at', asc = false): Promise<T[]> {
  return selectRows<T>(`${table}?select=*&order=${order}.${asc ? 'asc' : 'desc'}`);
}

export function fileToDataUrl(file: File, maxMb = 2.5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxMb * 1024 * 1024) {
      reject(new Error(`الملف كبير (${(file.size / 1048576).toFixed(1)}MB). الحد ${maxMb}MB — صغّر الصورة أو ضع رابطًا.`));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('تعذر قراءة الملف'));
    r.readAsDataURL(file);
  });
}
