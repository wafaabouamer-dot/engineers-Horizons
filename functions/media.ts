import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function isStaff(request: Request, env: Record<string, any>): Promise<boolean> {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return false;
    const url = env.AUTH_JWKS_URL as string;
    let jwks = keySets.get(url);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(url));
      keySets.set(url, jwks);
    }
    const { payload } = await jwtVerify(token, jwks, { issuer: env.AUTH_ISSUER as string });
    if (!payload.sub) return false;
    const sql = neon(env.DATABASE_URL);
    const [, rows] = (await sql.transaction([
      sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: payload.sub, role: 'authenticated' })}, true)`,
      sql`select (public.is_site_admin() or public.is_trainer()) as ok`,
    ])) as unknown as [unknown, { ok: boolean }[]];
    return rows[0]?.ok === true;
  } catch {
    return false;
  }
}

function extOf(type: string): string {
  const t = type.toLowerCase();
  if (t === 'image/jpeg') return 'jpg';
  if (t === 'image/png') return 'png';
  if (t === 'image/webp') return 'webp';
  if (t === 'image/gif') return 'gif';
  if (t === 'image/svg+xml') return 'svg';
  if (t === 'video/mp4') return 'mp4';
  if (t === 'video/webm') return 'webm';
  if (t === 'video/quicktime' || t === 'video/mov') return 'mov';
  if (t.startsWith('image/')) return 'img';
  if (t.startsWith('video/')) return 'vid';
  return 'bin';
}

function contentTypeOf(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  return 'application/octet-stream';
}

const MAX_BYTES = 95 * 1024 * 1024;

export default {
  async fetch(request: Request, env: Record<string, any>) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/_fn\/media/, '') || '/';

    if (request.method === 'POST' && path === '/upload') {
      if (!(await isStaff(request, env))) {
        return Response.json({ error: 'sign in first' }, { status: 401 });
      }
      const size = Number(request.headers.get('content-length') ?? 0);
      if (!size || size > MAX_BYTES) {
        return Response.json({ error: 'That file is too big (max 95 MB).' }, { status: 413 });
      }
      const type = request.headers.get('content-type') ?? 'application/octet-stream';
      if (!/^(image|video)\//.test(type)) {
        return Response.json({ error: 'Send an image or video file.' }, { status: 415 });
      }
      try {
        const key = `${Date.now()}-${crypto.randomUUID()}.${extOf(type)}`;
        await env.SITE_MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
        return Response.json({ key, url: `/_fn/media/${key}` });
      } catch (e) {
        console.error('[media] upload failed', e);
        return Response.json({ error: 'could not save the file, try again' }, { status: 503 });
      }
    }

    if (request.method === 'GET' && path.length > 1) {
      const key = decodeURIComponent(path.slice(1));
      if (key.includes('/') || key.includes('..')) return new Response('Not found', { status: 404 });
      try {
        const stored = await env.SITE_MEDIA.get(key);
        if (!stored) return new Response('Not found', { status: 404 });
        const body = stored.body ?? stored;
        return new Response(body as BodyInit, {
          headers: {
            'content-type': stored.httpMetadata?.contentType ?? contentTypeOf(key),
            'x-content-type-options': 'nosniff',
            'cache-control': 'public, max-age=3153600, immutable',
            'content-security-policy': 'sandbox',
          },
        });
      } catch (e) {
        console.error('[media] read failed', e);
        return new Response('Not found', { status: 404 });
      }
    }

    if (request.method === 'DELETE' && path.length > 1) {
      if (!(await isStaff(request, env))) {
        return Response.json({ error: 'sign in first' }, { status: 401 });
      }
      const key = decodeURIComponent(path.slice(1));
      try {
        await env.SITE_MEDIA.delete(key);
        return Response.json({ ok: true });
      } catch (e) {
        console.error('[media] delete failed', e);
        return Response.json({ error: 'could not delete' }, { status: 503 });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
