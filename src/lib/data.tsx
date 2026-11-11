/** THE DATA LAYER. */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * The body a PostgREST-style backend sends with a refusal. Every field is
 * optional on purpose: a proxy, a cold start or a gateway can answer with
 * something else entirely, and this layer must not crash trying to read it.
 */
export interface BackendErrorBody {
  /** Postgres SQLSTATE. "42501" is permission denied, "42P01" is no such table. */
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
  /** A server function's own `{ error }` sentence, written for the person. */
  error?: string;
}

/** Everything the two sentences below are built from. */
export interface BackendErrorInit {
  status: number;
  resource: string;
  userMessage: string;
  technical: string;
  sqlstate?: string | undefined;
}

/**
 * A backend failure, kept as a failure.
 *
 * Two sentences on purpose. `userMessage` is for whoever is looking at the
 * page; `technical` is for whoever is building the app, and it is the half the
 * old code destroyed.
 */
export class BackendError extends Error {
  /** HTTP status, or 0 when the request never got an answer at all. */
  readonly status: number;
  /** Postgres SQLSTATE, when the backend sent one. */
  readonly sqlstate: string | undefined;
  /** What we were asking for, so a page with several loads says which failed. */
  readonly resource: string;
  /** One plain sentence for the person looking at the page. */
  readonly userMessage: string;
  /** What the server actually said. */
  readonly technical: string;

  constructor(init: BackendErrorInit) {
    // Pages show `message`, so it is the person's sentence only; the technical
    // one stays on `technical` and goes to the console (`said`).
    super(init.userMessage);
    this.name = 'BackendError';
    this.status = init.status;
    this.sqlstate = init.sqlstate;
    this.resource = init.resource;
    this.userMessage = init.userMessage;
    this.technical = init.technical;
  }
}

/** Spanish when the page is (`<html lang>`), as the kit's other words; English otherwise. */
const pageWords = (en: string, es: string): string =>
  typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es') ? es : en;

/** The sentence the visitor reads. A failed change says what was not saved, not what was not loaded. */
function userSentence(status: number, body: BackendErrorBody | undefined, change = false, method = 'GET'): string {
  // P0001 is the app's own `raise exception '...'`, written for the person: say it.
  if (body?.code === 'P0001' && body.message?.trim()) return body.message.trim();
  if (/\bjwt\b[^.]*\bexpired\b|token has expired/i.test(body?.message ?? '')) {
    return 'Your sign-in has expired. Sign in again to continue.';
  }
  if (change) {
    if (body?.code === '42501' || status === 403) return 'This app is not allowed to make that change, so it was not saved.';
    if (status === 401) return 'You need to sign in before you can do this.';
    if (status === 429) return 'The server asked us to slow down. Try again in a moment.';
    if (status === 0 || status >= 500) return 'The server did not answer properly, so this may not have been saved.';
    // 23503: a row other rows still point to (a dog with a booking) refuses to go, and "could not be saved" told
    // the person nothing (dev browser test 2026-10-23).
    if (body?.code === '23503') {
      return method === 'DELETE'
        ? pageWords(
            'This is still linked to other entries, so it was not removed.',
            'Esto todavía está vinculado a otros registros, así que no se eliminó.',
          )
        : pageWords(
            'Something this points to is no longer there, so it was not saved.',
            'Algo a lo que esto se refiere ya no existe, así que no se guardó.',
          );
    }
    if (body?.code === '23505') {
      return pageWords('This already exists, so it was not added again.', 'Esto ya existe, así que no se agregó de nuevo.');
    }
    if (method === 'DELETE') return pageWords('This could not be removed.', 'No se pudo eliminar.');
    return 'This could not be saved.';
  }
  switch (body?.code) {
    case '42501':
      return 'This app is not allowed to read that data, so nothing could be loaded. The list is not empty, the request was refused.';
    case '42P01':
      return 'This app asked for something that is not in its database, so nothing could be loaded.';
    default:
      break;
  }
  if (status === 0) return 'We could not reach the server, so nothing could be loaded.';
  if (status === 401) return 'You need to sign in before this can be loaded.';
  if (status === 403)
    return 'This app is not allowed to read that data, so nothing could be loaded.';
  if (status === 404) return 'This app asked the server for something it does not have.';
  if (status === 429) return 'The server asked us to slow down. Try again in a moment.';
  if (status >= 500) return 'The server had a problem answering, so nothing could be loaded.';
  return 'We could not load this.';
}

/** The line for whoever is building the app: what the server said, verbatim. */
function technicalSentence(
  status: number,
  body: BackendErrorBody | undefined,
  resource: string,
  readBack = false,
): string {
  const said = body?.message?.trim() || body?.error?.trim();
  const parts = [`${resource} answered HTTP ${status || 'no response'}`];
  if (said) parts.push(said);
  if (body?.code) parts.push(`SQLSTATE ${body.code}`);
  if (body?.hint) parts.push(`hint: ${body.hint}`);
  // The usual cause: this caller may add the row but not read it, and the
  // read-back is part of the same statement, so nothing was saved.
  if (readBack && body?.code === '42501') {
    parts.push('the request asked for the new row back (Prefer: return=representation), which needs a policy letting this caller read it; drop that header or add the policy');
  }
  return `${parts.join(', ')}.`;
}

/** Read the error body without ever letting the reading of it throw. */
async function errorBody(res: Response): Promise<BackendErrorBody | undefined> {
  const text = await res.text().catch(() => '');
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const body: BackendErrorBody = {};
      for (const key of ['code', 'message', 'hint', 'error'] as const) {
        const value = record[key];
        if (typeof value === 'string') body[key] = value;
      }
      if (typeof record.details === 'string' || record.details === null) body.details = record.details;
      return body;
    }
  } catch {
    // Not JSON. The text is still the most useful thing we have.
  }
  return { message: text.slice(0, 400) };
}

/** Where the browser data API lives in this build, or undefined if nobody wired it. */
export function dataApiBaseUrl(): string | undefined {
  const url: unknown = import.meta.env.VITE_NEON_DATA_API_URL ?? import.meta.env.VITE_DATA_API_URL;
  if (typeof url !== 'string' || !url.trim()) return undefined;
  return url.trim();
}

export interface BackendRequestInit extends Omit<RequestInit, 'headers'> {
  /** The signed-in user's JWT. Optional once readSignedInTokenFrom is set: the
   *  call then carries the signed-in user's current token, and goes as a
   *  visitor only when nobody is signed in. */
  token?: string | undefined;
  headers?: Record<string, string> | undefined;
}

/** This app's sign-in service, or undefined if nobody wired it. */
function authBaseUrl(): string | undefined {
  const url: unknown = import.meta.env.VITE_NEON_AUTH_URL;
  if (typeof url !== 'string' || !url.trim()) return undefined;
  return url.trim().replace(/\/+$/, '');
}

/**
 * WHERE THIS APP SIGNS PEOPLE IN: the address for the sign-in client in
 * src/lib/auth.ts, `createClient({ auth: { url: authAddress(), ... } })`.
 *
 * When the platform set `VITE_NEON_AUTH_PATH`, it is this page's own address
 * plus that path (`https://<this site>/_auth`), so the signed-in session
 * belongs to this site alone and no other page can read it. The client needs a
 * full address, so it is built here, in the browser. Otherwise, and in the test
 * browser on localhost or 127.0.0.1 (nothing there answers that path), it is
 * the sign-in service's own address, `VITE_NEON_AUTH_URL`, as before.
 */
export function authAddress(): string {
  const direct = authBaseUrl() ?? '';
  const path: unknown = import.meta.env.VITE_NEON_AUTH_PATH;
  if (typeof path !== 'string' || !/^\/[A-Za-z0-9_-]+$/.test(path.trim())) return direct;
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return direct;
  const host = location.hostname;
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]') {
    return direct;
  }
  const own = `${location.origin}${path.trim()}`;
  retrySignInOnceWhenRefused(own);
  return own;
}

/** The longest a refused sign-in waits before its one more try. */
const SIGN_IN_RETRY_MAX_S = 10;
const SIGN_IN_RETRY_MARK = Symbol.for('wb.signInRetry');
/** Until when this site's `/_auth` said a session check would be refused (its x-retry-after). */
let sessionRefusedUntil = 0;

/** The seconds a 429 says to wait (`x-retry-after`, else `Retry-After`), or undefined. */
function toldToWaitS(answer: Response): number | undefined {
  const told = Number(answer.headers.get('x-retry-after') ?? answer.headers.get('retry-after'));
  return Number.isFinite(told) && told > 0 ? told : undefined;
}

/**
 * A SIGN-UP OR SIGN-IN THAT IS REFUSED FOR A MOMENT: the site's own `/_auth`
 * answers 429 with `x-retry-after` (or `Retry-After`) seconds when this
 * visitor, or other visitors behind the same address, just made several
 * attempts. The visitor should wait a moment and get in, not see an error, so
 * those two calls (POST `/_auth/sign-up/...` and `/_auth/sign-in/...`) wait the
 * time given and go once more. A refusal that lasts longer than ten seconds
 * (the email-code paths count per minute) would refuse the retry too, so it is
 * shown at once; so are a second refusal and every other answer. A refused
 * session check is not retried here: its wait is noted for the session check's
 * own retries (`askUntilAnswered`). The sign-in client calls the global
 * `fetch`, so this is the one place the call can be seen and repeated;
 * installed once, and only when sign-in is on this site's own address.
 */
function retrySignInOnceWhenRefused(authUrl: string): void {
  const current = globalThis.fetch;
  if (typeof current !== 'function') return;
  if ((current as unknown as Record<symbol, unknown>)[SIGN_IN_RETRY_MARK]) return;
  const prefix = new URL(authUrl);
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : undefined;
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    let signIn = false;
    let sessionCheck = false;
    try {
      const url = new URL(request ? request.url : String(input), prefix);
      const own = url.origin === prefix.origin;
      signIn = own && method === 'POST' && /^\/_auth\/(?:sign-in|sign-up)(?:\/|$)/.test(url.pathname);
      sessionCheck = own && method === 'GET' && url.pathname === '/_auth/get-session';
    } catch {
      // Not an address: not ours.
    }
    if (!signIn && !sessionCheck) return current(input, init);
    // A Request's body can be sent once; keep a copy for the second try.
    const again = signIn && request ? request.clone() : undefined;
    const first = await current(input, init);
    if (first.status !== 429) return first;
    const seconds = toldToWaitS(first);
    if (sessionCheck) {
      sessionRefusedUntil = Date.now() + (seconds ?? 0) * 1000;
      return first;
    }
    if (seconds !== undefined && seconds > SIGN_IN_RETRY_MAX_S) return first;
    await new Promise((resolve) => setTimeout(resolve, (seconds ?? SIGN_IN_RETRY_MAX_S) * 1000));
    return current(again ?? input, init);
  };
  (wrapped as unknown as Record<symbol, unknown>)[SIGN_IN_RETRY_MARK] = true;
  globalThis.fetch = wrapped;
}

/** When a JWT stops working, or undefined when it is not one. */
function expiresAtMs(token: string): number | undefined {
  try {
    const part = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4))) as { exp?: unknown };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/** The parts of the sign-in client this file uses: `client.auth` from @neondatabase/neon-js. */
export interface SignInClient {
  getSession: () => Promise<{ data?: unknown; error?: unknown }>;
  $store: { listen: (signal: '$sessionSignal', listener: () => void) => void };
}

/** What the sign-in service said about this browser. */
type SessionAnswer =
  | { kind: 'signed-in'; token: string | undefined; user: unknown }
  | { kind: 'signed-out' }
  | { kind: 'unknown'; status: number; said: string };

let signIn: SignInClient | (() => Promise<string | null | undefined>) | undefined;
/** Counts the sign-ins and sign-outs this page's client has made. */
let signInChanges = 0;
/** Lists on screen, told when the person signed in changes. */
const signInListeners = new Set<() => void>();
const hearSignInChanges = (listener: () => void) => {
  signInListeners.add(listener);
  return () => void signInListeners.delete(listener);
};
const countSignInChanges = () => signInChanges;

/** A number that changes with every sign-in and sign-out on this page: an effect keyed on it runs
 * again for the new person (`OwnerGate`, in `components/ui/sign-in.tsx`). */
export function useSignInChanges(): number {
  return useSyncExternalStore(hearSignInChanges, countSignInChanges, countSignInChanges);
}
/** "Nobody is signed in", kept until then unless someone signs in on this page. */
let nobodyUntil = 0;
/** `signInChanges` when the last clear answer (signed in or nobody) was asked for. */
let answeredAtChange = 0;
/** Whether the last clear answer was a signed-in person. */
let lastSignedIn = false;
/**
 * Whether the person could be signed in: the last clear answer was a signed-in
 * person, or this page has signed someone in or out since that answer.
 */
const maybeSignedIn = () => lastSignedIn || answeredAtChange !== signInChanges;

/** A signed-out page asks the sign-in service again after this long, or after a sign-in. */
const NOBODY_MS = 60_000;
/** The waits before asking again when a check is refused: about 15 seconds in all. */
const RETRY_WAITS_MS = [500, 1000, 2000, 4000, 8000];
/** How long a refused check keeps waiting when the site said how long it refuses (x-retry-after). */
const CHECK_PATIENCE_MS = 45_000;

/**
 * WHERE THE SIGNED-IN USER COMES FROM. Call once, where the login client is
 * made (src/lib/auth.ts), with the client's `auth`:
 *
 *   readSignedInTokenFrom(client.auth);
 *
 * Every call then carries the signed-in user's current token (a token lasts 15
 * minutes; the client renews it), whether it passes one or not. Signed out,
 * calls go as a visitor, and the page asks the sign-in service again only after
 * a minute or a sign-in on the page: the service refuses (429) a network that
 * asks every few seconds, such as a party's phones on one Wi-Fi. A refused
 * check is never read as "signed out" for someone who was signed in, or who
 * just signed in on this page.
 *
 * An older app passes a reader instead,
 * `async () => (await client.auth.getSession()).data?.session?.token`; it
 * still works, asking on every call.
 */
export function readSignedInTokenFrom(
  source: SignInClient | (() => Promise<string | null | undefined>),
): void {
  signIn = source;
  nobodyUntil = 0;
  lastSignedIn = false;
  if (isSignInClient(source)) {
    source.$store.listen('$sessionSignal', () => {
      signInChanges += 1;
      visitorRefusedUntil = 0;
      signInListeners.forEach((listener) => listener());
    });
  }
  // After `listen`, which hears the current value at once: that is not a sign-in.
  answeredAtChange = signInChanges;
}

function isSignInClient(source: NonNullable<typeof signIn>): source is SignInClient {
  // `client.auth` is a function-shaped proxy, so look for its method, not its type.
  return typeof (source as Partial<SignInClient>).getSession === 'function';
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The one-time code a Google sign-in brings back in the page's address. */
const VERIFIER_PARAM = 'neon_auth_session_verifier';

function addressHasVerifier(): boolean {
  try {
    return Boolean(new URLSearchParams(location.search).get(VERIFIER_PARAM));
  } catch {
    return false;
  }
}

function dropVerifier(): void {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has(VERIFIER_PARAM)) return;
    url.searchParams.delete(VERIFIER_PARAM);
    history.replaceState(history.state, '', url.href);
  } catch {
    // No address to change.
  }
}

/** A refusal that can pass if asked again: no connection, a timeout, 429 or a 5xx. */
const mayPassLater = (status: number) => status === 0 || status === 408 || status === 429 || status >= 500;

/**
 * One question to the sign-in service.
 *
 * BACK FROM GOOGLE the address carries a one-time code that the sign-in client
 * sends with this question, and removes only once it signs the person in. A
 * code the service refuses (400: used, expired, or a first Google approval
 * that took too long) would be sent again by every retry, Try again and
 * reload, so the page could never get past "could not check". So once a
 * question that carried it gets any answer but one that can pass (no
 * connection, 429, a 5xx), the code leaves the address; if it was refused,
 * the question is asked once more without it, and that answer (usually
 * nobody, so the page shows its sign-in buttons) is the truth.
 */
async function askSession(source: NonNullable<typeof signIn>, codeDropped = false): Promise<SessionAnswer> {
  const sentCode = !codeDropped && isSignInClient(source) && addressHasVerifier();
  const answer = await askOnce(source);
  if (!sentCode || (answer.kind === 'unknown' && mayPassLater(answer.status))) return answer;
  dropVerifier();
  if (answer.kind !== 'unknown') return answer;
  console.warn(
    `[data] the sign-in service refused the one-time code a Google sign-in brought back (${
      answer.status ? `HTTP ${answer.status}` : 'no status'
    }: ${answer.said}); it was taken out of the address, so the person can sign in again.`,
  );
  return askSession(source, true);
}

async function askOnce(source: NonNullable<typeof signIn>): Promise<SessionAnswer> {
  try {
    if (!isSignInClient(source)) {
      const token = await source();
      return token ? { kind: 'signed-in', token, user: undefined } : { kind: 'signed-out' };
    }
    const { data, error } = await source.getSession();
    if (error) return refusedCheck(error);
    const found = data as { session?: { token?: unknown } | null; user?: unknown } | null | undefined;
    if (!found?.session || !found.user) return { kind: 'signed-out' };
    const token = typeof found.session.token === 'string' && found.session.token ? found.session.token : undefined;
    return { kind: 'signed-in', token, user: found.user };
  } catch (cause) {
    return refusedCheck(cause);
  }
}

/** A failed check: only the service saying "not signed in" (401) means signed out. */
function refusedCheck(cause: unknown): SessionAnswer {
  const failure = (cause ?? {}) as { status?: unknown; message?: unknown };
  if (failure.status === 401) return { kind: 'signed-out' };
  return {
    kind: 'unknown',
    status: typeof failure.status === 'number' ? failure.status : 0,
    said: typeof failure.message === 'string' ? failure.message : String(cause),
  };
}

/**
 * Who is signed in. A refused check (429, a 5xx, no connection) is not "signed
 * out": while it could be someone signed in (`patient`, the last clear answer
 * was a signed-in person, or this page signed someone in or out since) it is
 * asked again, about 15 seconds in all, or as long as the site's `/_auth` said
 * it refuses, up to about 45; a page that has only seen a visitor goes on as one.
 */
async function whoIsSignedIn(patient: boolean): Promise<SessionAnswer> {
  const source = signIn;
  if (!source) return { kind: 'signed-out' };
  const nobodyKept = () => answeredAtChange === signInChanges && Date.now() < nobodyUntil;
  if (nobodyKept()) {
    // The client announces a sign-in 10 ms after it answers; a call made right
    // after `await signIn...` waits past that before going as a visitor.
    await pause(20);
    if (nobodyKept()) return { kind: 'signed-out' };
  }
  // Calls that need an answer together share one check, so a page that polls
  // while the service refuses does not start a retry loop per call.
  if (patient) patientWaiting = true;
  checking ??= askUntilAnswered(source).finally(() => {
    checking = undefined;
    patientWaiting = false;
  });
  return checking;
}

let checking: Promise<SessionAnswer> | undefined;
let patientWaiting = false;

async function askUntilAnswered(source: NonNullable<typeof signIn>): Promise<SessionAnswer> {
  const startedAt = Date.now();
  for (let attempt = 0; ; attempt += 1) {
    const change = signInChanges;
    const answer = await askSession(source);
    if (answer.kind === 'signed-in') {
      lastSignedIn = true;
      answeredAtChange = change;
      nobodyUntil = 0;
      visitorRefusedUntil = 0;
      return answer;
    }
    if (answer.kind === 'signed-out') {
      lastSignedIn = false;
      answeredAtChange = change;
      // Only the client hears sign-ins; an older app's reader asks every time.
      if (isSignInClient(source)) nobodyUntil = Date.now() + NOBODY_MS;
      return answer;
    }
    const step = RETRY_WAITS_MS[attempt];
    if (step === undefined || !(patientWaiting || maybeSignedIn())) return answer;
    // The site's own `/_auth` said how long it refuses (x-retry-after): asking
    // sooner is only refused again, so wait that long, if it fits. A signed-in
    // page reopened during a refusal then loads on its own instead of needing
    // Try again; a refusal longer than that is said at once.
    const told = sessionRefusedUntil - Date.now();
    if (told > step) {
      if (Date.now() - startedAt + told > CHECK_PATIENCE_MS) return answer;
      await pause(told);
    } else {
      await pause(step);
    }
  }
}

/** The sentence and the evidence for a sign-in check that never got an answer. */
function uncheckedSignIn(answer: { status: number; said: string }, userMessage: string): BackendError {
  return said(new BackendError({
    status: answer.status,
    resource: 'the sign-in service',
    userMessage,
    technical: `the session check answered ${
      answer.status ? `HTTP ${answer.status}` : 'no response'
    } (${answer.said}) and its retries got no answer; this is not "signed out".`,
  }));
}

/**
 * WHO IS SIGNED IN, for the page's own state: the user (`data.user` of
 * getSession), or null when nobody is. Use it on page load, and wherever the
 * page checks again, instead of reading getSession() yourself:
 *
 *   signedInUser<User>().then(setUser, (failure: BackendError) => setSignInError(failure));
 *
 * A refused check is not "signed out" (see readSignedInTokenFrom): it is asked
 * again for about 15 seconds (or waits out a refusal the site timed, up to
 * about 45), and null comes only from the service saying nobody is signed in.
 * If it still cannot tell, this throws a BackendError: show its message with a
 * Try again, never the signed-out page.
 * Needs readSignedInTokenFrom(client.auth).
 */
export async function signedInUser<User = unknown>(): Promise<User | null> {
  if (!signIn || !isSignInClient(signIn)) {
    throw said(new BackendError({
      status: 0,
      resource: 'the sign-in service',
      userMessage: 'This app could not check who is signed in.',
      technical:
        'signedInUser() needs the sign-in client: call readSignedInTokenFrom(client.auth) where the client is made (src/lib/auth.ts).',
    }));
  }
  const answer = await whoIsSignedIn(true);
  if (answer.kind === 'signed-in') return answer.user as User;
  if (answer.kind === 'signed-out') return null;
  throw uncheckedSignIn(answer, 'We could not check whether you are signed in. Try again in a moment.');
}

/**
 * The token a call without one carries: the signed-in user's, else a visitor's.
 * Someone who was signed in, or just signed in on this page, is never sent as a
 * visitor because a check failed: the database would refuse the save, and the
 * person would read "not allowed" (dev browser test 2026-10-12).
 */
async function callerToken(change: boolean): Promise<string | undefined> {
  const answer = await whoIsSignedIn(false);
  if (answer.kind === 'signed-in' && answer.token) return answer.token;
  if (answer.kind === 'unknown' && maybeSignedIn()) {
    throw uncheckedSignIn(
      answer,
      change
        ? 'We could not check that you are signed in, so this was not saved. Try again in a moment.'
        : 'We could not check that you are signed in, so nothing could be loaded. Try again in a moment.',
    );
  }
  return visitorToken();
}

/** The caller's token, or the session's current one when it is about to expire. */
async function currentToken(token: string): Promise<string> {
  const expires = expiresAtMs(token);
  if (expires === undefined || expires - 60_000 > Date.now()) return token;
  const answer = await whoIsSignedIn(false);
  return (answer.kind === 'signed-in' && answer.token) || token;
}

let visitor: { token: string; expiresAtMs: number } | undefined;
let visitorAsked: Promise<string | undefined> | undefined;
let visitorRefusedUntil = 0;
const VISITOR_REFUSAL_MS = 60_000;

/**
 * The token a visitor WITHOUT an account sends. The data API refuses a request
 * that carries no token at all ("missing authentication credentials"), so a
 * signed-out page asks the sign-in service for an anonymous token; row-level
 * security policies written `to anonymous` decide what it may read or write.
 * Kept until a minute before it expires; lists that load together share one ask.
 * A failed ask is kept for a minute, so polling cannot prolong a refusal.
 */
function visitorToken(): Promise<string | undefined> {
  const base = authBaseUrl();
  if (!base) return Promise.resolve(undefined);
  if (visitor && visitor.expiresAtMs - 60_000 > Date.now()) return Promise.resolve(visitor.token);
  if (Date.now() < visitorRefusedUntil) return Promise.resolve(undefined);
  if (!visitorAsked) {
    visitorAsked = askForVisitorToken(base).finally(() => {
      visitorAsked = undefined;
    });
  }
  return visitorAsked;
}

async function askForVisitorToken(base: string): Promise<string | undefined> {
  try {
    // At most 10 s: a request to the sign-in service that never answers would
    // keep every list on its loading text. Older iPhones (before iOS 16) have no
    // AbortSignal.timeout, and there the request goes without one.
    const res = await fetch(`${base}/token/anonymous`, {
      headers: { accept: 'application/json' },
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10_000) : undefined,
    });
    if (res.ok) {
      const token: unknown = ((await res.json()) as { token?: unknown }).token;
      if (typeof token === 'string' && token) {
        visitor = { token, expiresAtMs: expiresAtMs(token) ?? Date.now() + 5 * 60_000 };
        visitorRefusedUntil = 0;
        return token;
      }
    }
  } catch {
    // The request then goes without a token and its refusal is shown as usual.
  }
  visitorRefusedUntil = Date.now() + VISITOR_REFUSAL_MS;
  return undefined;
}

/** Logs the technical sentence once, for whoever builds the app. */
function said(error: BackendError): BackendError {
  console.error(`[data] ${error.technical}`);
  return error;
}

/** One call to the data API (a table, a view, `rpc/...`), with the failure kept. */
export async function backendRequest(
  path: string,
  init: BackendRequestInit = {},
): Promise<Response> {
  const relative = path.replace(/^\/+/, '');
  // The site's own server is not in the database. Sent there, `/_fn/...` comes
  // back as a missing table, and an app that reads that as "not a member"
  // charges people for nothing (dev browser test 2026-10-04).
  if (/^_fn(\/|$)/.test(relative)) {
    throw said(new BackendError({
      status: 0,
      resource: path,
      userMessage: 'This app asked for something in the wrong place, so nothing could be loaded.',
      technical: `${path} is this site's own server function, not a database table: call it with callFunction('${relative.replace(/^_fn\/?/, '')}'). backendRequest, selectRows and useRows only address the data API.`,
    }));
  }
  const base = dataApiBaseUrl();
  if (!base) {
    throw said(new BackendError({
      status: 0,
      resource: path,
      userMessage: 'This app is not connected to its database yet, so nothing could be loaded.',
      technical:
        'VITE_NEON_DATA_API_URL is not set in this build, so there is no address to call. Enable browser data access for this project and rebuild.',
    }));
  }
  return send(`${base.replace(/\/+$/, '')}/${relative}`, init);
}

/**
 * One call to this site's own server function (`functions/<name>.ts`), at
 * `/_fn/<name>/...` on the page's own address: `callFunction('api/bookings',
 * { method: 'POST', body: JSON.stringify(booking) })`. It carries the
 * signed-in user's current token, or the visitor token when nobody is signed
 * in (asked once and reused until a minute before it expires: the sign-in
 * service refuses a network that asks every few seconds). A refusal throws
 * BackendError, and a function's own `{ error }` sentence is what the person
 * reads.
 */
export async function callFunction(path: string, init: BackendRequestInit = {}): Promise<Response> {
  const name = path.replace(/^\/+/, '').replace(/^_fn\//, '');
  return send(`/_fn/${name}`, init, true);
}

async function send(url: string, init: BackendRequestInit, ownWords = false): Promise<Response> {
  const { token, headers, ...rest } = init;
  const method = (rest.method ?? 'GET').toUpperCase();
  const change = !['GET', 'HEAD'].includes(method);
  const readBack = Object.entries(headers ?? {}).some(
    ([name, value]) => name.toLowerCase() === 'prefer' && /return=representation/i.test(value),
  );
  // An empty token (a session still loading) counts as none.
  const bearer = token ? await currentToken(token) : await callerToken(change);
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        accept: 'application/json',
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        ...(headers ?? {}),
      },
    });
  } catch (cause) {
    const failure = new BackendError({
      status: 0,
      resource: url,
      userMessage: userSentence(0, undefined, change, method),
      technical: `the request to ${url} did not complete (${
        cause instanceof Error ? cause.message : 'network error'
      }).`,
    });
    // A read this page abandoned for a newer one is not a failure to report.
    throw rest.signal?.aborted ? failure : said(failure);
  }
  if (!res.ok) {
    const body = await errorBody(res);
    const failure = new BackendError({
      status: res.status,
      resource: url,
      sqlstate: body?.code,
      userMessage: (ownWords && body?.error?.trim()) || userSentence(res.status, body, change, method),
      technical: technicalSentence(res.status, body, url, readBack),
    });
    throw rest.signal?.aborted ? failure : said(failure);
  }
  return res;
}

/** How a wrong-shaped 200 is described, without dumping a page of JSON. */
function describeShape(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).slice(0, 5);
    return `an object with keys [${keys.join(', ')}]`;
  }
  return typeof value;
}

/** Rows from a table or view: `selectRows<Note>('notes?select=*')`. */
export async function selectRows<T>(path: string, init: BackendRequestInit = {}): Promise<T[]> {
  const res = await backendRequest(path, init);
  const payload: unknown = await res.json().catch(() => undefined);
  if (!Array.isArray(payload)) {
    throw said(new BackendError({
      status: res.status,
      resource: path,
      userMessage: 'We could not read the answer from the server.',
      technical: `${path} answered HTTP ${res.status} but the body was ${describeShape(
        payload,
      )} instead of a list of rows.`,
    }));
  }
  return payload as T[];
}

/** Anything that reaches a catch block, as the error this layer promises. */
export function asBackendError(cause: unknown, resource = 'the server'): BackendError {
  if (cause instanceof BackendError) return cause;
  return new BackendError({
    status: 0,
    resource,
    // What to do about it, not only that it failed (QA bots, 2026-10-25: the bare line read as a dead end).
    userMessage: "This didn't load. Check your connection and try again.",
    technical: cause instanceof Error ? cause.message : String(cause),
  });
}

export interface RowsState<T> {
  rows: T[] | undefined;
  error: BackendError | undefined;
  loading: boolean;
  reload: () => void;
}

/** Load rows into a component, keeping the three states apart: loading, failed, and loaded-and-genuinely-empty. */
export function useRows<T>(
  path: string | undefined,
  options: { token?: string | undefined } = {},
): RowsState<T> {
  const [attempt, setAttempt] = useState(0);
  const token = options.token;
  // Who is signed in is part of a list's identity: another person's rows never stay on screen.
  const who = useSyncExternalStore(hearSignInChanges, countSignInChanges, countSignInChanges);
  const [result, setResult] = useState<{
    path: string | undefined;
    token: string | undefined;
    who: number;
    rows: T[] | undefined;
    error: BackendError | undefined;
    loading: boolean;
  }>({ path, token, who, rows: undefined, error: undefined, loading: Boolean(path) });

  useEffect(() => {
    if (!path) {
      setResult({ path, token, who, rows: undefined, error: undefined, loading: false });
      return;
    }
    let live = true;
    const controller = new AbortController();
    setResult((current) => ({
      path, token, who,
      rows: current.path === path && current.token === token && current.who === who ? current.rows : undefined,
      error: undefined, loading: true,
    }));
    selectRows<T>(path, { ...(token ? { token } : {}), signal: controller.signal }).then(
      (loaded) => {
        if (!live) return;
        setResult({ path, token, who, rows: loaded, error: undefined, loading: false });
      },
      (cause: unknown) => {
        if (!live) return;
        // Already said in the console where it failed (`said`).
        const failure = asBackendError(cause, path);
        setResult({ path, token, who, rows: undefined, error: failure, loading: false });
      },
    );
    return () => {
      live = false;
      controller.abort();
    };
  }, [path, token, who, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  // Hide a previous identity's result in the render before the new effect runs.
  const current = Boolean(path) && result.path === path && result.token === token && result.who === who;
  return {
    rows: current ? result.rows : undefined,
    error: current ? result.error : undefined,
    loading: Boolean(path) && (!current || result.loading),
    reload,
  };
}

/** The error, on the page. */
export function BackendErrorNotice({
  error,
  onRetry,
}: {
  error: BackendError | undefined;
  onRetry?: (() => void) | undefined;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      data-backend-error={String(error.status)}
      style={{
        border: '1px solid rgba(220, 38, 38, 0.45)',
        background: 'rgba(220, 38, 38, 0.08)',
        borderRadius: 10,
        padding: '0.75rem 0.9rem',
        margin: '0.75rem 0',
        font: '400 0.9rem/1.45 system-ui, sans-serif',
      }}
    >
      <strong style={{ display: 'block' }}>{error.userMessage}</strong>
      {/* Technical details only in dev/preview builds, never for visitors of the published site. */}
      {typeof import.meta !== 'undefined' && import.meta.env?.DEV ? (
      <details style={{ marginTop: '0.4rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.82rem', opacity: 0.85 }}>
          Technical details
        </summary>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', overflowWrap: 'anywhere' }}>
          {error.technical}
        </p>
      </details>
      ) : null}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '0.55rem',
            border: '1px solid currentColor',
            borderRadius: 9999,
            padding: '0.375rem 0.875rem',
            background: 'transparent',
            color: 'inherit',
            font: '500 0.875rem/1.25 system-ui, sans-serif',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
