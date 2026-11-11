import { neon } from '@neondatabase/serverless';

const HOURLY_CAP = 30;
const MAX_BODY_BYTES = 20 * 1024;
const MAX = { name: 100, email: 254, message: 5000, phone: 40, city: 100, university: 200, major: 200, skills: 2000, experience: 2000, department: 200, motivation: 2000, specialty: 200, bio: 2000, full_name: 200 };

const str = (v: unknown, n: number): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.slice(0, n);
};
const okEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

const ROUTES: Record<string, { table: string; subject: string; fields: Record<string, number>; emailField: string }> = {
  '/contact': { table: 'contact_messages', subject: 'رسالة تواصل جديدة — أكاديمية آفاق', fields: { name: MAX.name, email: MAX.email, message: MAX.message }, emailField: 'email' },
  '/volunteer': {
    table: 'volunteer_applications', subject: 'طلب تطوع جديد — أكاديمية آفاق',
    fields: { full_name: MAX.full_name, email: MAX.email, phone: MAX.phone, city: MAX.city, university: MAX.university, major: MAX.major, skills: MAX.skills, experience: MAX.experience, department: MAX.department, motivation: MAX.motivation },
    emailField: 'email',
  },
  '/trainer': {
    table: 'trainer_requests', subject: 'طلب انضمام مدرب جديد — أكاديمية آفاق',
    fields: { full_name: MAX.full_name, email: MAX.email, phone: MAX.phone, specialty: MAX.specialty, bio: MAX.bio },
    emailField: 'email',
  },
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function mailOwner(env: Record<string, any>, origin: string, route: (typeof ROUTES)[string], row: Record<string, string>) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.OWNER_EMAIL) return;
  const lines = Object.entries(row)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#555">${esc(k)}</td><td style="padding:6px 10px"><b>${esc(v).replace(/\n/g, '<br>')}</b></td></tr>`)
    .join('');
  const hour = new Date().toISOString().slice(0, 13);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': `${origin}:${route.table}:${row[route.emailField]}:${hour}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [env.OWNER_EMAIL],
      subject: route.subject,
      html: `<div dir="auto" style="font-family:sans-serif"><h2>${esc(route.subject)}</h2><table>${lines}</table></div>`,
      ...(row[route.emailField] ? { reply_to: row[route.emailField] } : {}),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

export default {
  async fetch(request: Request, env: Record<string, any>) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/_fn\/forms/, '') || '/';
    const route = ROUTES[path];
    if (request.method !== 'POST' || !route) return new Response('Not found', { status: 404 });

    let raw = '';
    try {
      raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'too large' }, { status: 413 });
    } catch {
      return Response.json({ error: 'bad request' }, { status: 400 });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return Response.json({ error: 'bad request' }, { status: 400 });
    }
    // Honeypot: bots fill it, people never see it. Drop silently.
    if (typeof body.website === 'string' && body.website.trim() !== '') return Response.json({ ok: true });

    const row: Record<string, string> = {};
    for (const [k, n] of Object.entries(route.fields)) row[k] = str(body[k], n);
    if (!row[route.emailField] || !okEmail(row[route.emailField]!)) {
      return Response.json({ error: 'bad request' }, { status: 400 });
    }
    if (route.table === 'contact_messages' && !row.message) {
      return Response.json({ error: 'bad request' }, { status: 400 });
    }
    if ((route.table === 'volunteer_applications' || route.table === 'trainer_requests') && !row.full_name) {
      return Response.json({ error: 'bad request' }, { status: 400 });
    }

    try {
      const sql = neon(env.DATABASE_URL);
      if (route.table === 'contact_messages') {
        const c = (await sql`select count(*)::int as c from public.contact_messages where created_at > now() - interval '1 hour'`) as { c: number }[];
        if ((c[0]?.c ?? 0) >= HOURLY_CAP) return Response.json({ error: 'too busy, try later' }, { status: 429 });
        await sql`insert into public.contact_messages (name, email, message) values (${row.name}, ${row.email}, ${row.message})`;
      } else if (route.table === 'volunteer_applications') {
        const c = (await sql`select count(*)::int as c from public.volunteer_applications where created_at > now() - interval '1 hour'`) as { c: number }[];
        if ((c[0]?.c ?? 0) >= HOURLY_CAP) return Response.json({ error: 'too busy, try later' }, { status: 429 });
        await sql`insert into public.volunteer_applications (full_name, email, phone, city, university, major, skills, experience, department, motivation) values (${row.full_name}, ${row.email}, ${row.phone}, ${row.city}, ${row.university}, ${row.major}, ${row.skills}, ${row.experience}, ${row.department}, ${row.motivation})`;
      } else {
        const c = (await sql`select count(*)::int as c from public.trainer_requests where created_at > now() - interval '1 hour'`) as { c: number }[];
        if ((c[0]?.c ?? 0) >= HOURLY_CAP) return Response.json({ error: 'too busy, try later' }, { status: 429 });
        await sql`insert into public.trainer_requests (full_name, email, phone, specialty, bio) values (${row.full_name}, ${row.email}, ${row.phone}, ${row.specialty}, ${row.bio})`;
      }
      // The message is saved above; the email is a copy for the owner.
      // It waits for the email setup and never fails the save.
      try {
        await mailOwner(env, url.host, route, row);
      } catch (e) {
        console.error('[forms] owner email failed', e);
      }
      return Response.json({ ok: true });
    } catch (e) {
      console.error('[forms] failed', e);
      return Response.json({ error: 'could not send, try again' }, { status: 503 });
    }
  },
};
