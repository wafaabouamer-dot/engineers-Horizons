import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function caller(request: Request, env: Record<string, any>): Promise<{ id: string } | null> {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const url = env.AUTH_JWKS_URL as string;
    let jwks = keySets.get(url);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(url));
      keySets.set(url, jwks);
    }
    const { payload } = await jwtVerify(token, jwks, { issuer: env.AUTH_ISSUER as string });
    if (!payload.sub) return null;
    return { id: payload.sub };
  } catch {
    return null;
  }
}

async function isStaff(sql: ReturnType<typeof neon>, userId: string, courseId: number): Promise<boolean> {
  const [, rows] = (await sql.transaction([
    sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`,
    sql`select (public.is_site_admin() or public.is_course_trainer(${courseId})) as ok`,
  ])) as unknown as [unknown, { ok: boolean }[]];
  return rows[0]?.ok === true;
}

export default {
  async fetch(request: Request, env: Record<string, any>) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/_fn\/grade/, '') || '/';
    if (request.method !== 'POST' || path !== '/quiz') return new Response('Not found', { status: 404 });

    const me = await caller(request, env);
    if (!me) return Response.json({ error: 'sign in first' }, { status: 401 });

    let body: { quizId?: unknown; answers?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: 'bad request' }, { status: 400 });
    }
    const quizId = Number(body.quizId);
    const answers = Array.isArray(body.answers) ? (body.answers as unknown[]) : null;
    if (!Number.isInteger(quizId) || !answers) return Response.json({ error: 'bad request' }, { status: 400 });

    try {
      const sql = neon(env.DATABASE_URL);
      const quiz = (await sql`select id, course_id from public.quizzes where id = ${quizId}`)[0] as
        | { id: number; course_id: number } | undefined;
      if (!quiz) return Response.json({ error: 'not found' }, { status: 404 });

      const staff = await isStaff(sql, me.id, quiz.course_id);
      const enrolled = (
        (await sql`select 1 from public.enrollments where course_id = ${quiz.course_id} and user_id = ${me.id} and status in ('approved','completed')`) as unknown[]
      ).length > 0;
      if (!staff && !enrolled) return Response.json({ error: 'enrolled students only' }, { status: 403 });

      const qs = (await sql`select id, correct_index, points from public.questions where quiz_id = ${quizId} order by sort_order asc`) as {
        id: number; correct_index: number; points: number;
      }[];
      let score = 0;
      let total = 0;
      const stored: number[] = qs.map((q, i) => {
        total += q.points;
        const a = typeof answers[i] === 'number' ? (answers[i] as number) : -1;
        const ok = a === q.correct_index;
        if (ok) score += q.points;
        return a;
      });

      if (staff && !enrolled) {
        // Staff preview: graded but never stored.
        return Response.json({ score, total, preview: true });
      }

      // Throttle: at most 10 attempts per hour per user+quiz.
      const recent = (await sql`select count(*)::int as c from public.quiz_attempts where quiz_id = ${quizId} and user_id = ${me.id} and created_at > now() - interval '1 hour'`) as { c: number }[];
      if ((recent[0]?.c ?? 0) >= 10) return Response.json({ error: 'too many attempts, try later' }, { status: 429 });

      let who: { name: string | null; email: string | null } = { name: null, email: null };
      try {
        const found = (await sql`select name, email from neon_auth."user" where id::text = ${me.id}`) as {
          name: string | null; email: string | null;
        }[];
        if (found[0]) who = { name: found[0].name, email: found[0].email };
      } catch {
        // Display name/email are best-effort; grading never depends on them.
      }
      await sql`insert into public.quiz_attempts (quiz_id, user_id, user_name, user_email, answers, score, total) values (${quizId}, ${me.id}, ${who.name}, ${who.email}, ${JSON.stringify(stored)}::jsonb, ${score}, ${total})`;
      return Response.json({ score, total });
    } catch (e) {
      console.error('[grade] failed', e);
      return Response.json({ error: 'could not grade, try again' }, { status: 503 });
    }
  },
};
