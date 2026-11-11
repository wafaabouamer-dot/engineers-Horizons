import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Hero } from '@/components/ui/hero';
import { SiteFooter } from '@/components/ui/site-footer';
import { ThemeButton } from '@/components/ui/theme-button';
import { LangSwitch } from '@/components/ui/lang-switch';
import { BackendErrorNotice, useRows } from '@/lib/data';
import { useLang } from '@/lib/lang';
import { usePageMeta } from '@/lib/page-meta';
import { client } from '@/lib/auth';
import { SignInScreen } from '@/components/ui/sign-in';
import { signedInUser, type BackendError } from '@/lib/data';
import { backendRequest, callFunction, selectRows } from '@/lib/data';
import { isVideo, pick, safeHttpUrl, useSettings, videoEmbed, type Attempt, type Category, type Course, type EventItem, type Lesson, type Post, type Question, type Quiz, type Trainer } from '@/lib/site';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, MessageCircle, ShieldCheck } from 'lucide-react';
import { initialTeam, isTeamRow, teamRowToCard, teamSeedToCard, type TeamCardMember } from '@/lib/team';

export type Route =
  | { page: 'home' } | { page: 'courses' } | { page: 'course'; slug: string } | { page: 'register' } | { page: 'quiz'; id: number }
  | { page: 'trainers' } | { page: 'trainer'; slug: string }
  | { page: 'news' } | { page: 'post'; slug: string }
  | { page: 'events' } | { page: 'event'; slug: string }
  | { page: 'about' } | { page: 'contact' } | { page: 'volunteer' } | { page: 'join-trainer' } | { page: 'verify' } | { page: 'faq' }
  | { page: 'login' } | { page: 'account' };

const PUBLIC_TRAINER_FIELDS = 'id,slug,name_ar,name_en,title_ar,title_en,bio_ar,bio_en,qualifications_ar,qualifications_en,photo_url,video_url,initials,published,sort_order';

export const go = (r: Route) => {
  const path =
    r.page === 'home' ? '/' : r.page === 'courses' ? '/courses' : r.page === 'course' ? `/courses/${(r as { slug: string }).slug}` :
    r.page === 'trainers' ? '/trainers' : r.page === 'trainer' ? `/trainers/${(r as { slug: string }).slug}` :
    r.page === 'news' ? '/news' : r.page === 'post' ? `/news/${(r as { slug: string }).slug}` :
    r.page === 'events' ? '/events' : r.page === 'event' ? `/events/${(r as { slug: string }).slug}` :
    r.page === 'quiz' ? `/quiz/${(r as { id: number }).id}` :
    `/${r.page}`;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export function parseRoute(path: string): Route {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return { page: 'home' };
  const seg = p.split('/').filter(Boolean);
  if (seg[0] === 'courses' && seg[1]) return { page: 'course', slug: decodeURIComponent(seg[1]) };
  if (seg[0] === 'courses') return { page: 'courses' };
  if (seg[0] === 'trainers' && seg[1]) return { page: 'trainer', slug: decodeURIComponent(seg[1]) };
  if (seg[0] === 'trainers') return { page: 'trainers' };
  if (seg[0] === 'news' && seg[1]) return { page: 'post', slug: decodeURIComponent(seg[1]) };
  if (seg[0] === 'news') return { page: 'news' };
  if (seg[0] === 'events' && seg[1]) return { page: 'event', slug: decodeURIComponent(seg[1]) };
  if (seg[0] === 'quiz' && seg[1] && /^\d+$/.test(seg[1])) return { page: 'quiz', id: Number(seg[1]) };
  if (seg[0] === 'events') return { page: 'events' };
  const single = ['about', 'contact', 'volunteer', 'join-trainer', 'verify', 'faq', 'login', 'register', 'account', 'admin'] as const;
  if ((single as readonly string[]).includes(seg[0]!)) return { page: seg[0] as Route['page'] };
  return { page: 'home' };
}

export function useRoute(): Route {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const fn = () => setPath(window.location.pathname);
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  if (parseRoute(path).page === 'admin') return { page: 'home' };
  return parseRoute(path);
}

type User = { id: string; email: string; name: string; emailVerified: boolean } | null;

export function useUser() {
  const [user, setUser] = useState<User>(undefined as unknown as User);
  const [err, setErr] = useState<BackendError | null>(null);
  useEffect(() => {
    signedInUser<User>().then(setUser, (e) => setErr(e as BackendError));
  }, []);
  return { user, setUser, err };
}

function Header({ route, user }: { route: Route; user: User }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const { settings } = useSettings();
  const brand = pick(lang, settings.brand_name ? { ar: settings.brand_name.ar, en: settings.brand_name.en } : { ar: 'آفاق', en: 'Afaq' });
  const links: { label: string; r: Route; cur: boolean }[] = [
    { label: ar ? 'الرئيسية' : 'Home', r: { page: 'home' }, cur: route.page === 'home' },
    { label: ar ? 'الدورات' : 'Courses', r: { page: 'courses' }, cur: route.page === 'courses' || route.page === 'course' },
    { label: ar ? 'الفريق والمدربون' : 'Our team', r: { page: 'trainers' }, cur: route.page === 'trainers' || route.page === 'trainer' },
    { label: ar ? 'الأخبار' : 'News', r: { page: 'news' }, cur: route.page === 'news' || route.page === 'post' },
    { label: ar ? 'الفعاليات' : 'Events', r: { page: 'events' }, cur: route.page === 'events' || route.page === 'event' },
    { label: ar ? 'من نحن' : 'About', r: { page: 'about' }, cur: route.page === 'about' },
    { label: ar ? 'تواصل' : 'Contact', r: { page: 'contact' }, cur: route.page === 'contact' },
  ];
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#101b43]/75 text-white backdrop-blur-2xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <button onClick={() => go({ page: 'home' })} className="flex items-center gap-2.5 text-white">
          <img src="/logo.png" alt={brand} className="size-9 rounded-xl bg-white object-cover" />
          <span className="text-lg font-bold">{ar ? 'أكاديمية آفاق' : 'Afaq Academy'}</span>
        </button>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <button key={l.label} onClick={() => go(l.r)}
              className={`rounded-full px-3 py-2 text-sm transition ${l.cur ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'}`}>{l.label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <ThemeButton />
          {user ? (
            <Button variant="glass-light" size="sm" onClick={() => go({ page: 'account' })}>{ar ? 'حسابي' : 'Account'}</Button>
          ) : (
            <Button variant="glass-light" size="sm" onClick={() => go({ page: 'login' })}>{ar ? 'دخول' : 'Sign in'}</Button>
          )}
          <button onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10 lg:hidden" aria-label="menu">☰</button>
        </div>
      </div>
      {open && (
        <nav className="grid gap-1 px-5 pb-4 lg:hidden">
          {links.map((l) => (
            <button key={l.label} onClick={() => { go(l.r); setOpen(false); }}
              className="rounded-xl px-3 py-2.5 text-start text-white hover:bg-white/10">{l.label}</button>
          ))}
          <button onClick={() => { go({ page: 'verify' }); setOpen(false); }} className="rounded-xl px-3 py-2.5 text-start text-white/80">{ar ? 'التحقق من شهادة' : 'Verify certificate'}</button>
          <button onClick={() => { go({ page: 'volunteer' }); setOpen(false); }} className="rounded-xl px-3 py-2.5 text-start text-white/80">{ar ? 'تطوّع معنا' : 'Volunteer'}</button>
          <button onClick={() => { go({ page: 'faq' }); setOpen(false); }} className="rounded-xl px-3 py-2.5 text-start text-white/80">{ar ? 'الأسئلة الشائعة' : 'FAQ'}</button>
            <button onClick={() => { go({ page: 'join-trainer' }); setOpen(false); }} className="rounded-xl px-3 py-2.5 text-start text-white/80">{ar ? 'قدم كمدرب' : 'Apply as trainer'}</button>
        </nav>
      )}
    </header>
  );
}

function Media({ src, video, alt, className }: { src?: string | null; video?: string | null; alt: string; className?: string }) {
  const v = video?.trim() || null;
  const embed = videoEmbed(v);
  if (embed) {
    return (
      <div className={className}>
        <iframe src={embed} title={alt} className="size-full rounded-[inherit]" allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    );
  }
  if (v && isVideo(v)) {
    return <video src={v} controls playsInline preload="metadata" className={className} />;
  }
  return <img src={src || '/images/hero.jpg'} alt={alt} className={className} loading="lazy" />;
}

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-3xl font-bold">{title}</h2>
        {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function InstagramMark({ size = 19 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ABOUT_COPY = {
  ar: 'نحن فريق تقني طموح يجمع شغف البرمجة بروح الابتكار، نؤمن بأن التكنولوجيا هي المفتاح الأقوى لإحداث تأثير حقيقي وتقديم حلول ذكية تسهّل الحياة اليومية.\n\nنركز في عملنا على هندسة وتطوير واجهات رقمية متكاملة تتميز بسلاسة الاستخدام، السرعة، والتصميم العصري، مع توظيف أحدث تقنيات الويب والذكاء الاصطناعي لخلق تجارب مستخدم فريدة وموثوقة.\n\nهدفنا هو تحويل الأفكار المعقدة إلى منتجات رقمية نابضة بالحياة، تلبي تطلعات المستخدمين وترتقي بمعايير الجودة التقنية.',
  en: 'We are an ambitious technology team bringing a passion for programming together with a spirit of innovation. We believe technology is one of the most powerful ways to make a real difference and create smart solutions that make everyday life easier.\n\nWe engineer and develop complete digital interfaces focused on usability, speed, and contemporary design. By drawing on modern web technologies and artificial intelligence, we create distinctive, dependable user experiences.\n\nOur goal is to turn complex ideas into vibrant digital products that meet users’ needs and set a higher bar for technical quality.',
};

const TECH_FIELDS: Category[] = [
  { id: 'software-development', name_ar: 'البرمجة وتطوير الويب', name_en: 'Programming & Web Development', sort_order: 1 },
  { id: 'cloud-security', name_ar: 'الأمن السيبراني والشبكات', name_en: 'Cybersecurity & Networks', sort_order: 2 },
  { id: 'artificial-intelligence', name_ar: 'الذكاء الاصطناعي', name_en: 'Artificial Intelligence', sort_order: 3 },
  { id: 'data-science', name_ar: 'علوم البيانات', name_en: 'Data Science', sort_order: 4 },
  { id: 'computer-engineering', name_ar: 'هندسة الحاسوب والأنظمة المضمنة', name_en: 'Computer & Embedded Systems Engineering', sort_order: 5 },
  { id: 'cloud-computing', name_ar: 'الحوسبة السحابية', name_en: 'Cloud Computing', sort_order: 6 },
];

type InstagramPostKind = 'announcement' | 'event' | 'workshop';
type InstagramPost = { code: string; href: string; kind: InstagramPostKind };

/* A /reel/ (or /tv/) link is a workshop video; a /p/ link is an announcement
   post for the announcements and news sections. Hala pastes the links from
   the dashboard (site content tab); nothing is embedded until she adds one. */
function configuredInstagramPosts(value: string | null | undefined): InstagramPost[] {
  const raw = value === undefined || value === null
    ? []
    : value.trim() ? value.split(/\r?\n/) : [];
  return raw.flatMap((line) => {
    const match = line.trim().match(/^https:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)\/?(?:\?.*)?$/);
    if (!match?.[1] || !match[2]) return [];
    return [{
      code: match[2],
      href: `https://www.instagram.com/${match[1]}/${match[2]}/`,
      kind: match[1] === 'p' ? 'announcement' : 'workshop',
    }];
  });
}

function InstagramPostCard({ post, lang }: { post: InstagramPost; lang: string }) {
  const ar = lang === 'ar';
  const kindLabel = post.kind === 'event'
    ? (ar ? 'فعالية' : 'Event')
    : post.kind === 'workshop' ? (ar ? 'إعلان ورشة' : 'Workshop announcement') : (ar ? 'إعلان من آفاق' : 'Afaq announcement');
  const instagramPath = post.href.match(/instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  const embedUrl = instagramPath
    ? `https://www.instagram.com/${instagramPath[1]}/${instagramPath[2]}/embed/captioned/`
    : null;
  return (
    <article className="workshop-card overflow-hidden rounded-[1.75rem] border bg-card">
      {embedUrl && <div className="instagram-embed">
        <iframe src={embedUrl}
          title={ar ? `${kindLabel} من آفاق` : `${kindLabel} from Afaq`} loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media" />
      </div>}
      <div className="p-5">
        <p className="text-sm font-bold text-[var(--accent-text)]">{kindLabel}</p>
        <a className="workshop-link mt-3 inline-flex min-h-11 items-center gap-2 font-bold" href={post.href} target="_blank" rel="noopener noreferrer">
          <InstagramMark size={17} /> {ar ? 'افتح المنشور الأصلي' : 'View original post'} <ArrowUpRight size={16} />
        </a>
      </div>
    </article>
  );
}

function TeamBioModal({ member, lang, onClose }: { member: TeamCardMember; lang: string; onClose: () => void }) {
  const ar = lang === 'ar';
  const side = ar ? 'ar' : 'en';
  const linkedinHref = safeHttpUrl(member.linkedin) ?? (member.linkedin?.startsWith('www.') ? safeHttpUrl(`https://${member.linkedin}`) : null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="team-modal-veil" role="dialog" aria-modal="true" aria-label={member.name[side]} onClick={onClose}>
      <div className="team-modal" onClick={(event) => event.stopPropagation()}>
        <div className="grid md:grid-cols-[340px_1fr]">
          <div className="team-modal-photo">
            {member.image
              ? <img src={member.image} alt={member.name[side]} />
              : <span className="member-initials">{member.name.ar.slice(0, 2)}</span>}
            <span className="member-role-pill">{ar ? 'عضو في الفريق' : 'Team member'}</span>
          </div>
          <div className="relative p-6 sm:p-8">
            <button type="button" onClick={onClose}
              className="absolute end-5 top-5 grid size-10 place-items-center rounded-full bg-secondary text-lg font-bold"
              aria-label={ar ? 'إغلاق' : 'Close'}>✕</button>
            <h3 className="text-3xl font-extrabold">{member.name[side]}</h3>
            <p className="mt-1 text-lg font-bold text-[var(--brand-text)]">{member.role[side]}</p>
            <p className="mt-4 leading-8 text-muted-foreground">{member.bio[side]}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {linkedinHref && (
                <a href={linkedinHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-5 text-sm font-bold text-[var(--brand-ink)]">
                  <ArrowUpRight size={16} /> LinkedIn
                </a>
              )}
              <span className="team-modal-exp"><span className="size-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />{member.experience[side]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCards({ rows, initialized, lang, limit }: { rows: Trainer[] | null | undefined; initialized: boolean; lang: string; limit?: number }) {
  const ar = lang === 'ar';
  const side = ar ? 'ar' : 'en';
  const [openKey, setOpenKey] = useState<string | null>(null);
  const savedTeam = (rows ?? []).filter((row) => row.published && isTeamRow(row)).map((row) => {
    const saved = teamRowToCard(row);
    const profile = initialTeam.find((member) => `team-${member.slug}` === row.slug);
    return {
      ...saved,
      image: profile && ['hala-affaneh', 'wafa-abu-amer'].includes(profile.slug) ? profile.image : saved.image,
      linkedin: profile?.linkedin ?? saved.linkedin,
    };
  });
  const members: TeamCardMember[] = (savedTeam.length || initialized ? savedTeam : initialTeam.map(teamSeedToCard)).slice(0, limit);
  const reduceMotion = useReducedMotion();
  const openMember = members.find((member) => member.key === openKey) ?? null;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member, index) => {
          const linkedinHref = safeHttpUrl(member.linkedin) ?? (member.linkedin?.startsWith('www.') ? safeHttpUrl(`https://${member.linkedin}`) : null);
          return (
            <motion.article key={member.key}
              className="member-flip"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: .15 }}
              transition={{ duration: .55, delay: reduceMotion ? 0 : (index % 4) * .07 }}>
              <div className="member-flip-inner">
                <button type="button" className="member-face member-face-front"
                  onClick={() => setOpenKey(member.key)}
                  aria-haspopup="dialog"
                  aria-label={ar ? `اعرض نبذة ${member.name.ar} وصورتها` : `Show ${member.name.en}'s photo and bio`}>
                  <div className="member-portrait">
                    {member.image && <img src={member.image} alt={member.name[side]} loading="lazy" />}
                    <span className="member-photo-glow" aria-hidden="true" />
                    <span className="member-role-pill">{ar ? 'عضو في الفريق' : 'Team member'}</span>
                  </div>
                  <div className="member-caption">
                    <span className="member-more flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-lg font-extrabold">{member.name[side]}</span>
                        <span className="mt-1 block line-clamp-2 text-sm font-semibold text-[var(--brand-text)]">{member.role[side]}</span>
                      </span>
                      <span aria-hidden="true" className="shrink-0 rounded-full bg-secondary p-2 text-[var(--brand-text)]">✦</span>
                    </span>
                    <span className="mt-3 block text-xs font-bold text-muted-foreground">{ar ? 'اضغط لعرض النبذة والصورة' : 'Tap for the full bio'}</span>
                  </div>
                </button>
                <div className="member-face member-face-back" onClick={() => setOpenKey(member.key)} role="presentation">
                  <span className="text-xs font-bold uppercase tracking-[.15em] text-lime-200">{ar ? 'نبذة سريعة' : 'A little about'}</span>
                  <h3 className="mt-3 text-xl font-extrabold">{member.name[side]}</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-7 text-white/85">{member.bio[side]}</p>
                  <p className="mt-auto pt-3 text-xs font-bold text-lime-100">{member.experience[side]}</p>
                  {linkedinHref && (
                    <a href={linkedinHref} target="_blank" rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20">
                      <ArrowUpRight size={16} /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
      {openMember && <TeamBioModal member={openMember} lang={lang} onClose={() => setOpenKey(null)} />}
    </>
  );
}

const workshopCards = [
  {
    title: { ar: 'استخدام الذكاء الاصطناعي لإيجاد مصدر دخل حقيقي', en: 'Using AI to build a real source of income' },
    presenters: { ar: 'المهندستان وفاء أبو عامر وهلا عفانة', en: 'Engineers Wafa Abu Amer & Hala Affaneh' },
    image: '/images/workshop-ai.jpg',
    href: 'https://www.instagram.com/reel/DfUrHZQuLM3/',
    alt: { ar: 'صورة من ورشة الذكاء الاصطناعي', en: 'Photo from the AI workshop' },
  },
  {
    title: { ar: 'طريقك للتسجيل للمنح', en: 'Your guide to applying for scholarships' },
    presenters: { ar: 'المهندسة هلا عفانة', en: 'Engineer Hala Affaneh' },
    image: '/images/workshop-scholarships.jpg',
    href: 'https://www.instagram.com/reel/De7NPQYOnqG/',
    alt: { ar: 'صورة من ورشة التسجيل للمنح', en: 'Photo from the scholarships workshop' },
  },
  {
    title: { ar: 'مقدمة في تصميم UX/UI', en: 'Introduction to UX/UI design' },
    presenters: { ar: 'المهندسة شهد الحمامي', en: 'Engineer Shahd Al-Hammami' },
    image: '/images/workshop-uxui.jpg',
    href: 'https://www.instagram.com/reel/DepZZ3puLas/',
    alt: { ar: 'صورة من ورشة UX/UI', en: 'Photo from the UX/UI workshop' },
  },
];

function CountUp({ value }: { value: number }) {
  const { number } = useLang();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || started.current) return;
      started.current = true;
      io.disconnect();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
      const t0 = performance.now();
      const dur = 1500;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        setShown(Math.round((1 - Math.pow(1 - p, 3)) * value));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{number(shown)}</span>;
}

function StatCell({ loading, error, value, label }: { loading: boolean; error: unknown; value: number; label: string }) {
  return (
    <div className="stat-cell">
      <div className="stat-num">{loading ? '…' : error ? '—' : <CountUp value={value} />}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function HomePage({ user }: { user: User }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const side = ar ? 'ar' : 'en';
  const reduceMotion = useReducedMotion();
  const { settings } = useSettings();
  usePageMeta(ar ? 'أكاديمية آفاق | تعلّم وابنِ آفاقك' : 'Afaq Academy');
  const courses = useRows<Course>(`courses?select=*,trainers(${PUBLIC_TRAINER_FIELDS})&published=eq.true&order=start_date.asc`);
  const trainers = useRows<Trainer>(`trainers?select=${PUBLIC_TRAINER_FIELDS}&published=eq.true&order=sort_order.asc`);
  const news = useRows<Post>('posts?select=*&kind=eq.news&published=eq.true&order=date.desc&limit=3');
  const stories = useRows<Post>('posts?select=*&kind=eq.success&published=eq.true&order=date.desc&limit=3');
  const workshops = useRows<EventItem>('events?select=*&kind=eq.workshop&published=eq.true&order=starts_at.asc');
  const events = useRows<EventItem>('events?select=*&kind=eq.event&published=eq.true&order=starts_at.asc');
  const cats = useRows<{ id: string; name_ar: string; name_en: string }>('categories?select=*&order=sort_order.asc');
  const instagramPosts = configuredInstagramPosts(settings.social_posts?.ar);
  const announcements = instagramPosts.filter((post) => post.kind === 'announcement');

  const heroImg = settings.hero_image?.[side] || settings.hero_image?.en || '/images/hero.jpg';
  const heroVideo = settings.hero_video_url?.ar || settings.hero_video_url?.en || '';
  const heroEmbed = videoEmbed(heroVideo);
  const heroIsFile = heroVideo && isVideo(heroVideo) && !heroEmbed;

  const featured = (courses.rows ?? []).filter((c) => c.featured);
  const showCourses = (featured.length ? featured : (courses.rows ?? [])).slice(0, 6);
  const teamCount = trainers.rows?.filter((trainer) => trainer.published && isTeamRow(trainer)).length;
  const workshopCount = Math.max(workshopCards.length, workshops.rows?.length ?? 0, instagramPosts.filter((post) => post.kind === 'workshop').length);
  const eventCount = Math.max(events.rows?.length ?? 0, instagramPosts.filter((post) => post.kind === 'event').length);

  const waDigits = (settings.contact_whatsapp?.[side] || settings.contact_whatsapp?.en || '972595676566').replace(/\D/g, '') || '972595676566';
  const waRaw = (settings.contact_whatsapp?.[side] || '').trim();
  const waLabel = !waRaw || waRaw.replace(/\D/g, '') === '972595676566'
    ? (ar ? 'واتساب ‎+972 59 567 6566' : 'WhatsApp +972 59 567 6566')
    : waRaw;

  return (
    <>
      {heroEmbed || heroIsFile ? (
        <section data-band="" className="relative isolate overflow-hidden bg-neutral-950 text-white">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-28 sm:px-8 md:py-32 lg:grid-cols-2">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: .2 }}
              transition={{ duration: .65, ease: [.22, .72, .24, 1] }}>
              <p className="text-sm font-medium uppercase tracking-widest text-white/70">{pick(lang, settings.hero_kicker)}</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{pick(lang, settings.hero_title, ar ? 'تعلّم مهارات اليوم' : 'Learn today')}</h1>
              <p className="mt-6 max-w-xl text-lg text-white/85">{pick(lang, settings.hero_text)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => go({ page: 'courses' })}>{ar ? 'تصفح الدورات' : 'Browse courses'}</Button>
                <Button size="lg" variant="glass" onClick={() => go(user ? { page: 'account' } : { page: 'register' })}>{ar ? 'سجّل الآن' : 'Join now'}</Button>
              </div>
            </motion.div>
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              {heroEmbed
                ? <iframe src={heroEmbed} title="hero" className="aspect-video w-full" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                : <video src={heroVideo} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />}
            </div>
          </div>
        </section>
      ) : (
        <Hero src={heroImg} alt={ar ? 'أكاديمية آفاق' : 'Afaq'} eyebrow={pick(lang, settings.hero_kicker)}
          title={pick(lang, settings.hero_title, ar ? 'تعلّم مهارات اليوم' : 'Learn today')}
          intro={pick(lang, settings.hero_text)}
          actions={<>
            <Button size="lg" onClick={() => go({ page: 'courses' })}>{ar ? 'تصفح الدورات' : 'Browse courses'}</Button>
            <Button size="lg" variant="glass" onClick={() => go(user ? { page: 'account' } : { page: 'register' })}>{ar ? 'سجّل الآن' : 'Join now'}</Button>
          </>} />
      )}

      <section className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="stats-band -mt-10 grid grid-cols-2 md:grid-cols-4">
          <StatCell loading={courses.loading} error={courses.error}
            value={courses.rows?.length ?? 0}
            label={ar ? 'دورة متاحة وقادمة' : 'Current & upcoming courses'} />
          <StatCell loading={workshops.loading || events.loading} error={workshops.error || events.error}
            value={workshopCount + eventCount}
            label={ar ? 'ورشة وفعالية' : 'Workshops & events'} />
          <StatCell loading={trainers.loading} error={trainers.error}
            value={teamCount || (settings.team_initialized?.ar === 'true' ? 0 : initialTeam.length)}
            label={ar ? 'عضو في الفريق' : 'Team members'} />
          <StatCell loading={cats.loading} error={cats.error}
            value={(cats.rows?.length ?? 0) || TECH_FIELDS.length}
            label={ar ? 'مجال هندسي وتقني' : 'Engineering & tech fields'} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
        <motion.div className="grid items-center gap-10 lg:grid-cols-2"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .2 }}
          transition={{ duration: .65, ease: [.22, .72, .24, 1] }}>
          <div>
            <h2 className="text-3xl font-bold">{pick(lang, settings.about_title, ar ? 'من نحن' : 'About')}</h2>
            <p className="about-copy mt-4 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{pick(lang, settings.about_text) || ABOUT_COPY[lang === 'ar' ? 'ar' : 'en']}</p>
            <Button variant="tinted" className="mt-6" onClick={() => go({ page: 'about' })}>{ar ? 'اقرأ المزيد' : 'Read more'}</Button>
          </div>
          <div className="about-visual overflow-hidden rounded-3xl shadow-xl">
            <Media src={settings.about_image?.[side] || '/images/about.jpg'} video={settings.about_video_url?.ar || settings.about_video_url?.en} alt="about" className="aspect-video w-full object-cover" />
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <SectionHead title={ar ? 'الدورات المتاحة والقادمة' : 'Current & upcoming courses'}
          action={<Button variant="plain" onClick={() => go({ page: 'courses' })}>{ar ? 'كل الدورات ←' : 'All courses →'}</Button>} />
        <BackendErrorNotice error={courses.error} onRetry={courses.reload} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {showCourses.map((c) => (
            <Card key={c.id} media={<Media src={c.cover_url} video={undefined} alt={c.title_ar} className="aspect-[16/10] w-full object-cover" />}>
              <div className="text-xs font-medium text-[var(--brand-text)]">{c.level_ar && lang === 'ar' ? c.level_ar : c.level_en} · {c.hours}{ar ? ' ساعة' : 'h'}</div>
              <h3 className="mt-1 text-xl font-bold">{ar ? c.title_ar : c.title_en}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? c.summary_ar : c.summary_en}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold">{c.registration_open ? (Number(c.price) === 0 ? (ar ? 'مجاني' : 'Free') : c.price) : (ar ? 'قريباً' : 'Coming soon')}</span>
                <Button size="sm" onClick={() => go({ page: 'course', slug: c.slug })}>{ar ? 'التفاصيل' : 'Details'}</Button>
              </div>
            </Card>
          ))}
        </div>
        {!courses.loading && !courses.error && !courses.rows?.length && (
          <p className="mt-10 rounded-3xl bg-secondary/60 p-8 text-center text-muted-foreground">{ar ? 'دورات جديدة بالطريق — تابعي إعلانات آفاق لموعد التسجيل.' : 'New courses are on the way — follow Afaq announcements for registration dates.'}</p>
        )}
      </section>

      <section className="fields-section bg-secondary/60 py-14">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <h2 className="mb-6 text-2xl font-bold">{ar ? 'مجالات هندسية وتقنية' : 'Engineering & technology fields'}</h2>
          <div className="flex flex-wrap gap-3">
            {(cats.rows?.length ? cats.rows : TECH_FIELDS).map((c, index) => (
              <button key={c.id} onClick={() => go({ page: 'courses' })}
                className={`field-chip field-chip-${index % 5} rounded-full bg-card px-5 py-3 font-medium shadow hover:text-[var(--brand-text)]`}>{ar ? c.name_ar : c.name_en}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="team-section relative overflow-hidden py-16 sm:py-20">
        <div className="team-orb team-orb-one" aria-hidden="true" />
        <div className="team-orb team-orb-two" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
          <SectionHead title={ar ? 'تعرّفوا على فريقنا' : 'Meet our team'}
            sub={ar ? 'خبرات ملهمة ومساحات أوسع للتعلّم والتطوّر.' : 'Inspiring experience and more room to learn and grow.'}
            action={<Button variant="plain" onClick={() => go({ page: 'trainers' })}>{ar ? 'الفريق والمدربون ←' : 'Our team →'}</Button>} />
          <TeamCards rows={trainers.rows} initialized={settings.team_initialized?.ar === 'true'} lang={lang} limit={4} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
        <SectionHead title={ar ? 'ورشات من آفاق' : 'Workshops by Afaq'}
          sub={ar ? 'اكتشفوا ورشاتنا وافتحوا المنشورات الأصلية على إنستغرام.' : 'Explore our workshops and open the original Instagram posts.'}
          action={<Button variant="plain" onClick={() => go({ page: 'events' })}>{ar ? 'كل الورش والفعاليات ←' : 'All workshops & events →'}</Button>} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workshopCards.map((workshop) => (
            <article key={workshop.href} className="workshop-card overflow-hidden rounded-[1.75rem] border bg-card">
              <a href={workshop.href} target="_blank" rel="noreferrer" aria-label={ar ? `شاهدي ورشة ${workshop.title.ar} على إنستغرام` : `Watch ${workshop.title.en} on Instagram`}>
                <div className="workshop-cover">
                  <img src={workshop.image} alt={ar ? workshop.alt.ar : workshop.alt.en} loading="lazy" />
                  <span className="workshop-open"><InstagramMark size={19} /><ArrowUpRight size={17} /></span>
                </div>
              </a>
              <div className="p-5">
                <p className="text-sm font-bold text-[var(--accent-text)]">{ar ? 'ورشة عمل' : 'Workshop'}</p>
                <h3 className="mt-2 text-xl font-extrabold leading-snug">{ar ? workshop.title.ar : workshop.title.en}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{ar ? workshop.presenters.ar : workshop.presenters.en}</p>
                <a className="workshop-link mt-5 inline-flex items-center gap-2 font-bold" href={workshop.href} target="_blank" rel="noreferrer">
                  <InstagramMark size={17} /> {ar ? 'شاهدي الورشة على إنستغرام' : 'Watch on Instagram'} <ArrowUpRight size={16} />
                </a>
              </div>
            </article>
          ))}
          {instagramPosts.filter((post) => post.kind === 'workshop').map((post) => <InstagramPostCard key={post.code} post={post} lang={lang} />)}
          {(workshops.rows ?? []).map((workshop) => (
            <Card key={workshop.id} media={<Media src={workshop.cover_url} video={undefined} alt={workshop.title_ar} className="aspect-[16/10] w-full object-cover" />}>
              <p className="text-sm font-bold text-[var(--accent-text)]">{ar ? 'ورشة عمل' : 'Workshop'}</p>
              <h3 className="mt-2 text-xl font-extrabold">{ar ? workshop.title_ar : workshop.title_en}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{ar ? workshop.summary_ar : workshop.summary_en}</p>
              <Button variant="plain" size="sm" className="mt-3 px-0" onClick={() => go({ page: 'event', slug: workshop.slug })}>{ar ? 'التفاصيل' : 'Details'}</Button>
            </Card>
          ))}
        </div>
      </section>

      {(announcements.length > 0 || (news.rows?.length ?? 0) > 0) && (
        <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
          <SectionHead title={ar ? 'إعلانات آفاق' : 'Afaq announcements'}
            sub={ar ? 'آخر الإعلانات والمنشورات مباشرة من إنستغرام.' : 'Our latest announcements, directly from Instagram.'}
            action={<Button variant="plain" onClick={() => go({ page: 'news' })}>{ar ? 'كل الأخبار ←' : 'All news →'}</Button>} />
          <div className="grid gap-6 md:grid-cols-2">
            {announcements.map((post) => <InstagramPostCard key={post.code} post={post} lang={lang} />)}
            {(news.rows ?? []).map((post) => (
              <Card key={post.id} media={<Media src={post.cover_url} video={undefined} alt={post.title_ar} className="aspect-[16/10] w-full object-cover" />}>
                <p className="text-xs text-muted-foreground">{post.date}</p>
                <h3 className="mt-2 text-lg font-bold">{ar ? post.title_ar : post.title_en}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? post.excerpt_ar : post.excerpt_en}</p>
                <Button variant="plain" size="sm" className="mt-2 px-0" onClick={() => go({ page: 'post', slug: post.slug })}>{ar ? 'اقرأ الخبر' : 'Read more'}</Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {((events.rows?.length ?? 0) > 0 || instagramPosts.some((post) => post.kind === 'event')) && (
        <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
          <SectionHead title={ar ? 'فعاليات آفاق' : 'Afaq events'}
            sub={ar ? 'تفاصيل الفعاليات وروابط التسجيل في المنشورات الأصلية.' : 'Event details and registration information are in the original posts.'}
            action={<Button variant="plain" onClick={() => go({ page: 'events' })}>{ar ? 'صفحة الفعاليات ←' : 'All events →'}</Button>} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instagramPosts.filter((post) => post.kind === 'event').map((post) => <InstagramPostCard key={post.code} post={post} lang={lang} />)}
            {(events.rows ?? []).map((event) => (
              <Card key={event.id} media={<Media src={event.cover_url} video={undefined} alt={event.title_ar} className="aspect-[16/10] w-full object-cover" />}>
                <p className="text-sm font-bold text-[var(--accent-text)]">{ar ? 'فعالية' : 'Event'}</p>
                <h3 className="mt-2 text-xl font-extrabold">{ar ? event.title_ar : event.title_en}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{ar ? event.summary_ar : event.summary_en}</p>
                <Button variant="plain" size="sm" className="mt-3 px-0" onClick={() => go({ page: 'event', slug: event.slug })}>{ar ? 'التفاصيل' : 'Details'}</Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(stories.rows?.length ?? 0) > 0 && (
        <section className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
          <SectionHead title={ar ? 'قصص نجاح' : 'Success stories'} />
          <div className="grid gap-6 md:grid-cols-3">
            {(stories.rows ?? []).map((n) => (
              <Card key={n.id} media={<img src={n.cover_url || '/images/about.jpg'} alt={n.title_ar} className="aspect-[16/10] w-full object-cover" />}>
                <h3 className="font-bold">{ar ? n.title_ar : n.title_en}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? n.excerpt_ar : n.excerpt_en}</p>
                <Button variant="plain" size="sm" className="mt-2 px-0" onClick={() => go({ page: 'post', slug: n.slug })}>{ar ? 'اقرأ القصة' : 'Read story'}</Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-l from-[#101b43] via-[#4b34c8] to-[#5b3df0] p-10 text-white shadow-[0_30px_70px_rgb(16_27_67/35%)] md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold">{pick(lang, settings.cta_title, ar ? 'جاهز تبدأ؟' : 'Ready?')}</h2>
            <p className="mt-2 opacity-85">{pick(lang, settings.cta_text)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="glass-light" size="lg" onClick={() => go(user ? { page: 'courses' } : { page: 'register' })}>{ar ? 'سجّل الآن' : 'Join now'}</Button>
            <Button variant="glass" size="lg" onClick={() => go({ page: 'volunteer' })}>{ar ? 'تطوّع معنا' : 'Volunteer'}</Button>
            <a className="social-contact-link" href="https://www.instagram.com/afaq.engineers/" target="_blank" rel="noreferrer" aria-label={ar ? 'تابعونا على إنستغرام' : 'Follow us on Instagram'}>
              <InstagramMark size={19} /><span>{ar ? 'إنستغرام' : 'Instagram'}</span>
            </a>
            <a className="social-contact-link" href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" aria-label={ar ? 'تواصلوا معنا على واتساب' : 'Contact us on WhatsApp'}>
              <MessageCircle size={19} /><span dir="ltr">{waLabel}</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function CoursesPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'الدورات' : 'Courses');
  const courses = useRows<Course>(`courses?select=*,trainers(${PUBLIC_TRAINER_FIELDS})&published=eq.true&order=start_date.asc`);
  const categories = useRows<Category>('categories?select=*&order=sort_order.asc');
  const availableCategories = categories.rows?.length ? categories.rows : TECH_FIELDS;
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const list = useMemo(() => (courses.rows ?? []).filter((c) =>
    (!cat || c.category === cat) &&
    (!q || (c.title_ar + c.title_en + (c.summary_ar ?? '')).toLowerCase().includes(q.toLowerCase()))), [courses.rows, cat, q]);
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'الدورات' : 'Courses'}</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? 'ابحث عن دورة…' : 'Search…'}
          className="h-11 min-w-52 flex-1 rounded-full border bg-card px-4 text-[15px]" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat('')} className={`rounded-full px-4 py-2 text-sm ${!cat ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>{ar ? 'الكل' : 'All'}</button>
          {availableCategories.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-full px-4 py-2 text-sm ${cat === c.id ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>{ar ? c.name_ar : c.name_en}</button>
          ))}
        </div>
      </div>
      <BackendErrorNotice error={courses.error} onRetry={courses.reload} />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Card key={c.id} media={<Media src={c.cover_url} video={undefined} alt={c.title_ar} className="aspect-[16/10] w-full object-cover" />}>
            <div className="text-xs text-[var(--brand-text)]">{c.trainers ? (ar ? c.trainers.name_ar : c.trainers.name_en) : ''}</div>
            <h3 className="mt-1 text-xl font-bold">{ar ? c.title_ar : c.title_en}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? c.summary_ar : c.summary_en}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-bold">{c.registration_open ? (Number(c.price) === 0 ? (ar ? 'مجاني' : 'Free') : c.price) : (ar ? 'قريباً' : 'Coming soon')}</span>
              <Button size="sm" onClick={() => go({ page: 'course', slug: c.slug })}>{ar ? 'التفاصيل والتسجيل' : 'Details'}</Button>
            </div>
          </Card>
        ))}
      </div>
      {!courses.loading && !courses.error && !courses.rows?.length && (
        <p className="mt-10 rounded-3xl bg-secondary/60 p-8 text-center text-muted-foreground">{ar ? 'دورات جديدة بالطريق — تابعي إعلانات آفاق لموعد التسجيل.' : 'New courses are on the way — follow Afaq announcements for registration dates.'}</p>
      )}
      {!courses.loading && !courses.error && (courses.rows?.length ?? 0) > 0 && list.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">{ar ? 'لا توجد دورات مطابقة لبحثك حالياً.' : 'No courses match your search right now.'}</p>
      )}
    </div>
  );
}

function CourseDetail({ slug, user }: { slug: string; user: User }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    selectRows<Course>(`courses?select=*,trainers(${PUBLIC_TRAINER_FIELDS})&slug=eq.${encodeURIComponent(slug)}&limit=1`)
      .then((r) => setCourse(r[0] ?? null)).finally(() => setLoading(false));
  }, [slug]);
  usePageMeta(course ? (ar ? course.title_ar : course.title_en) : '');
  const enroll = async () => {
    if (!user) { go({ page: 'register' }); return; }
    if (!course) return;
    setBusy(true); setMsg('');
    try {
      const res = await backendRequest('enrollments', {
        method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ course_id: course.id, user_email: user.email, user_name: user.name }),
      });
      if (res.ok || res.status === 409) {
        setMsg(ar ? 'تم إرسال طلب التسجيل بنجاح! تجده في حسابك.' : 'Enrolled! See My account.');
        setTick((t) => t + 1);
      }
      else setMsg(ar ? 'تعذر التسجيل. تحقق من دخولك.' : 'Could not enroll.');
    } catch {
      setMsg(ar ? 'تعذر التسجيل. تحقق من دخولك.' : 'Could not enroll.');
    } finally { setBusy(false); }
  };
  const [myEnroll, setMyEnroll] = useState<string | null>(null);
  useEffect(() => {
    if (!user || !course) { setMyEnroll(null); return; }
    selectRows<{ status: string }>(`enrollments?select=status&user_id=eq.${encodeURIComponent(user.id)}&course_id=eq.${course.id}`)
      .then((r) => setMyEnroll(r[0]?.status ?? null)).catch(() => setMyEnroll(null));
  }, [user, course, tick]);
  if (loading) return <p className="px-5 pb-20 pt-28 text-center">…</p>;
  if (!course) return <p className="px-5 pb-20 pt-28 text-center">{ar ? 'الدورة غير موجودة.' : 'Not found.'}</p>;
  const outcomes = Array.isArray(course.outcomes) ? course.outcomes : [];
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <button onClick={() => go({ page: 'courses' })} className="text-sm text-[var(--brand-text)]">→ {ar ? 'كل الدورات' : 'All courses'}</button>
      <div className="mt-4 grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl shadow-xl">
          <Media src={course.cover_url} video={course.video_url} alt={course.title_ar} className="aspect-video w-full object-cover" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">{ar ? course.title_ar : course.title_en}</h1>
          <p className="mt-3 text-muted-foreground">{ar ? course.summary_ar : course.summary_en}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1">{course.hours} {ar ? 'ساعة' : 'hours'}</span>
            <span className="rounded-full bg-secondary px-3 py-1">{ar ? course.level_ar : course.level_en}</span>
            <span className="rounded-full bg-secondary px-3 py-1">{course.method === 'online' ? (ar ? 'إلكتروني' : 'Online') : course.method === 'onsite' ? (ar ? 'حضوري' : 'In person') : (ar ? 'مدمج' : 'Hybrid')}</span>
            <span className="rounded-full bg-secondary px-3 py-1">{Number(course.price) === 0 ? (ar ? 'مجاني' : 'Free') : course.price}</span>
          </div>
          {course.trainers && (
            <button onClick={() => go({ page: 'trainer', slug: course.trainers!.slug })} className="mt-4 flex items-center gap-3 rounded-2xl border p-3 text-start hover:bg-secondary/50">
              <img src={course.trainers.photo_url || '/images/trainer-1.jpg'} alt="" className="size-12 rounded-full object-cover" />
              <span><span className="block font-bold">{ar ? course.trainers.name_ar : course.trainers.name_en}</span>
                <span className="block text-sm text-muted-foreground">{ar ? course.trainers.title_ar : course.trainers.title_en}</span></span>
            </button>
          )}
          <div className="mt-6 flex gap-3">
            {!course.registration_open
              ? <Button size="lg" variant="gray" disabled>{ar ? 'التسجيل قريباً' : 'Registration opening soon'}</Button>
              : myEnroll === 'approved' || myEnroll === 'completed'
                ? <Button size="lg" variant="gray" onClick={() => go({ page: 'account' })}>{ar ? 'مسجل ✓ · دوراتي' : 'Enrolled ✓ · My courses'}</Button>
                : myEnroll === 'pending'
                  ? <Button size="lg" variant="gray" disabled>{ar ? 'طلبك قيد المراجعة' : 'Pending review'}</Button>
                : <Button size="lg" busy={busy} onClick={enroll}>{ar ? 'سجّل في الدورة' : 'Enroll now'}</Button>}
          </div>
          {msg && <p className="mt-3 rounded-2xl bg-secondary p-3 text-sm">{msg}</p>}
          {outcomes.length > 0 && (
            <div className="mt-6"><h3 className="font-bold">{ar ? 'ماذا ستتعلم؟' : 'What you will learn'}</h3>
              <ul className="mt-2 grid gap-2">{outcomes.map((o, i) => <li key={i} className="rounded-xl bg-secondary/70 px-3 py-2 text-sm">✓ {ar ? o.ar : o.en}</li>)}</ul></div>
          )}
        </div>
      </div>
      {(course.description_ar || course.description_en) && (
        <div className="mt-10 max-w-3xl whitespace-pre-line leading-relaxed">{ar ? course.description_ar : course.description_en}</div>
      )}
      {user && course && <CourseLearning course={course} user={user} refreshKey={tick} />}
      {!user && (
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl bg-secondary/60 p-6 md:flex-row md:items-center">
          <p className="font-bold">{ar ? 'سجل الدخول لرؤية المحاضرات والاختبارات.' : 'Sign in to see lessons and quizzes.'}</p>
          <Button onClick={() => go({ page: 'register' })}>{ar ? 'حساب جديد' : 'Create account'}</Button>
        </div>
      )}
    </div>
  );
}

function CourseLearning({ course, user, refreshKey }: { course: Course; user: NonNullable<User>; refreshKey: number }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [enrollState, setEnrollState] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<number[]>([]);
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, { score: number; total: number }>>({});
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    selectRows<{ status: string }>(`enrollments?select=status&user_id=eq.${encodeURIComponent(user.id)}&course_id=eq.${course.id}`)
      .then((r) => setEnrollState(r[0]?.status ?? null)).catch(() => setEnrollState(null));
    (async () => {
      try {
        const a = await (await backendRequest('rpc/is_site_admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
        if (a === true) { setStaff(true); return; }
        const t = await (await backendRequest('rpc/is_course_trainer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ _course: course.id }) })).json();
        if (t === true) setStaff(true);
      } catch { /* student: no staff access */ }
    })();
    selectRows<Lesson>(`lessons?select=*&course_id=eq.${course.id}&order=sort_order.asc`)
      .then(setLessons).catch(() => setLessons([]));
    selectRows<Quiz>(`quizzes?select=*&course_id=eq.${course.id}&order=sort_order.asc`)
      .then(setQuizzes).catch(() => setQuizzes([]));
    selectRows<{ lesson_id: number }>(`lesson_progress?select=lesson_id&user_id=eq.${encodeURIComponent(user.id)}`)
      .then((r) => setDoneIds(r.map((x) => x.lesson_id))).catch(() => {});
    selectRows<Attempt>(`quiz_attempts?select=*&user_id=eq.${encodeURIComponent(user.id)}`)
      .then((r) => {
        const best: Record<number, { score: number; total: number }> = {};
        for (const a of r) {
          if (!best[a.quiz_id] || a.score > best[a.quiz_id]!.score) best[a.quiz_id] = { score: a.score, total: a.total };
        }
        setScores(best);
      }).catch(() => {});
  }, [course.id, user.id, refreshKey]);
  const canWatch = staff || enrollState === 'approved' || enrollState === 'completed';
  const markDone = async (lessonId: number) => {
    setDoneIds((d) => (d.includes(lessonId) ? d : [...d, lessonId]));
    try {
      await backendRequest('lesson_progress', {
        method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: user.id, lesson_id: lessonId, done: true }),
      });
    } catch { /* kept on screen anyway */ }
  };
  if (!canWatch) {
    return (
      <div className="mt-10 rounded-3xl bg-secondary/60 p-6">
        <p className="font-bold">{enrollState === 'rejected' ? (ar ? 'عذرا، طلب تسجيلك مرفوض.' : 'Your enrollment was rejected.') : enrollState === 'pending' ? (ar ? 'طلبك قيد المراجعة — بتفتح لك المحاضرات بعد القبول.' : 'Your request is pending review.') : (ar ? 'المحاضرات والاختبارات للمسجلين في الدورة.' : 'Lessons and quizzes are for enrolled students.')}</p>
        {enrollState === null && <p className="mt-1 text-sm text-muted-foreground">{ar ? 'سجل في الدورة من الأعلى لفتح المحتوى.' : 'Enroll above to unlock the content.'}</p>}
      </div>
    );
  }
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
      <div>
        <h2 className="text-2xl font-bold">{ar ? 'المحاضرات' : 'Lessons'} ({lessons.filter((l) => l.published).length})</h2>
        {lessons.filter((l) => l.published).length === 0 && <p className="mt-3 text-muted-foreground">{ar ? 'لا محاضرات بعد.' : 'No lessons yet.'}</p>}
        <div className="mt-4 grid gap-3">
          {lessons.filter((l) => l.published).map((l, i) => {
            const open = openLesson === l.id;
            const done = doneIds.includes(l.id);
            return (
              <div key={l.id} className="overflow-hidden rounded-2xl border">
                <button onClick={() => setOpenLesson(open ? null : l.id)} className="flex w-full items-center gap-3 p-4 text-start hover:bg-secondary/40">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-green-500 text-white' : 'bg-secondary'}`}>{done ? '✓' : i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{ar ? l.title_ar : l.title_en}</span>
                    <span className="block text-xs text-muted-foreground">{l.duration_min ? `${l.duration_min} ${ar ? 'دقيقة' : 'min'}` : ''}</span></span>
                  <span>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="grid gap-3 border-t p-4">
                    {(ar ? l.summary_ar : l.summary_en) && <p className="text-sm text-muted-foreground">{ar ? l.summary_ar : l.summary_en}</p>}
                    {l.video_url?.trim() && <Media src={null} video={l.video_url} alt={ar ? l.title_ar : l.title_en} className="aspect-video w-full overflow-hidden rounded-xl bg-black object-cover" />}
                    {safeHttpUrl(l.material_url) && <a href={safeHttpUrl(l.material_url)!} target="_blank" rel="noreferrer" className="text-sm font-bold text-[var(--brand-text)]">📎 {ar ? 'ملف المحاضرة' : 'Lesson file'}</a>}
                    {!done && <div><Button size="sm" variant="tinted" onClick={() => markDone(l.id)}>{ar ? 'أنهيت مشاهدتها ✓' : 'Mark as watched'}</Button></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold">{ar ? 'الاختبارات' : 'Quizzes'} ({quizzes.filter((q) => q.published).length})</h2>
        {quizzes.filter((q) => q.published).length === 0 && <p className="mt-3 text-muted-foreground">{ar ? 'لا اختبارات بعد.' : 'No quizzes yet.'}</p>}
        <div className="mt-4 grid gap-3">
          {quizzes.filter((q) => q.published).map((q) => (
            <div key={q.id} className="rounded-2xl border p-4">
              <div className="font-bold">{ar ? q.title_ar : q.title_en}</div>
              <div className="mt-1 text-xs text-muted-foreground">{scores[q.id] ? `${ar ? 'أفضل نتيجة' : 'Best'}: ${scores[q.id]!.score}/${scores[q.id]!.total}` : (ar ? 'لم تحله بعد' : 'Not attempted')}</div>
              <Button size="sm" className="mt-3" onClick={() => go({ page: 'quiz', id: q.id })}>{ar ? 'ابدأ الاختبار' : 'Start quiz'}</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizTake({ id, user }: { id: number; user: User }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [msg, setMsg] = useState('');
  usePageMeta(quiz ? (ar ? quiz.title_ar : quiz.title_en) : '');
  useEffect(() => {
    if (!user) { go({ page: 'register' }); return; }
    selectRows<Quiz>(`quizzes?select=*&id=eq.${id}&limit=1`).then(async (r) => {
      const q = r[0] ?? null;
      setQuiz(q);
      if (!q) return;
      const en = await selectRows<{ status: string }>(`enrollments?select=status&user_id=eq.${encodeURIComponent(user.id)}&course_id=eq.${q.course_id}`).catch(() => []);
      if (!en[0] || (en[0].status !== 'approved' && en[0].status !== 'completed')) {
        try {
          const a = await (await backendRequest('rpc/is_site_admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
          let ok = a === true;
          if (!ok) {
            const tr = await (await backendRequest('rpc/is_course_trainer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ _course: q.course_id }) })).json();
            ok = tr === true;
          }
          if (!ok) { setBlocked(true); return; }
        } catch { setBlocked(true); return; }
      }
      const qs = await selectRows<Question>(`questions?select=*&quiz_id=eq.${q.id}&order=sort_order.asc`).catch(() => []);
      setQuestions(qs);
    }).catch(() => setQuiz(null));
  }, [id, user]);
  if (!user) return null;
  if (quiz === null) return <p className="px-5 pb-20 pt-28 text-center">…</p>;
  if (blocked) return <div className="mx-auto max-w-xl px-5 pb-20 pt-28 text-center"><p className="font-bold">{ar ? 'هذا الاختبار للمسجلين في الدورة.' : 'Enrolled students only.'}</p><Button className="mt-4" onClick={() => go({ page: 'courses' })}>{ar ? 'الدورات' : 'Courses'}</Button></div>;
  const submit = async () => {
    if (Object.keys(answers).length < questions.length) return;
    setBusy(true);
    try {
      const res = await callFunction('grade/quiz', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, answers: questions.map((q) => answers[q.id] ?? -1) }),
      });
      const data = (await res.json()) as { score: number; total: number; preview?: boolean; error?: string };
      if (typeof data.score !== 'number') throw new Error(data.error || 'grade failed');
      setResult({ score: data.score, total: data.total });
      if (data.preview) setMsg(ar ? 'نتيجتك للمعاينة فقط (للمشرفين والمدربين).' : 'Preview score only (staff).');
    } catch {
      setMsg(ar ? 'تعذر التسليم. تحقق من دخولك.' : 'Could not submit.');
    } finally { setBusy(false); }
  };
  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="mx-auto max-w-xl px-5 pb-20 pt-28 text-center">
        <div className="text-6xl">{pct >= 50 ? '🎉' : '💪'}</div>
        <h1 className="mt-3 text-3xl font-bold">{ar ? 'نتيجتك' : 'Your score'}: {result.score}/{result.total}</h1>
        <p className="mt-1 text-muted-foreground">{pct}%</p>
        {msg && <p className="mt-1 text-sm text-muted-foreground">{msg}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="gray" onClick={() => { setResult(null); }}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button>
          <Button onClick={() => go({ page: 'account' })}>{ar ? 'حسابي' : 'My account'}</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-3xl font-bold">{ar ? quiz.title_ar : quiz.title_en}</h1>
      {(ar ? quiz.description_ar : quiz.description_en) && <p className="mt-2 text-muted-foreground">{ar ? quiz.description_ar : quiz.description_en}</p>}
      <div className="mt-6 grid gap-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border p-4">
            <p className="font-bold">{i + 1}. {ar ? q.text_ar : q.text_en} <span className="text-xs font-normal text-muted-foreground">({q.points})</span></p>
            <div className="mt-3 grid gap-2">
              {(q.options ?? []).map((o, oi) => (
                <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${answers[q.id] === oi ? 'border-[var(--brand)] bg-[var(--brand)]/10' : ''}`}>
                  <input type="radio" name={`q${q.id}`} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className="size-4" />
                  {ar ? o.ar : o.en}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button size="lg" busy={busy} disabled={Object.keys(answers).length < questions.length} onClick={submit} className="mt-6 w-full">
        {ar ? `تسليم (${Object.keys(answers).length}/${questions.length})` : `Submit (${Object.keys(answers).length}/${questions.length})`}
      </Button>
    </div>
  );
}

function TrainersPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const { settings } = useSettings();
  usePageMeta(ar ? 'الفريق والمدربون' : 'Our team & trainers');
  const { rows, error, reload } = useRows<Trainer>(`trainers?select=${PUBLIC_TRAINER_FIELDS}&published=eq.true&order=sort_order.asc`);
  const openAdmin = () => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 font-bold text-[var(--accent-text)]">{ar ? 'مجتمع آفاق' : 'Afaq community'}</p>
          <h1 className="text-4xl font-bold">{ar ? 'فريق آفاق' : 'Meet the Afaq team'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gray" onClick={openAdmin}><ShieldCheck size={16} />{ar ? 'وضع المشرف' : 'Admin mode'}</Button>
          <Button variant="tinted" onClick={() => go({ page: 'join-trainer' })}>{ar ? 'قدّم كمدرب' : 'Apply as trainer'}</Button>
        </div>
      </div>
      <p className="mt-4 max-w-2xl leading-8 text-muted-foreground">{ar ? 'تعرّفوا على أعضاء فريق آفاق وخبراتهم وإنجازاتهم.' : 'Meet the Afaq team and explore their experience and work.'}</p>
      <div className="mt-8">
        <TeamCards rows={rows} initialized={settings.team_initialized?.ar === 'true'} lang={lang} />
      </div>
      <BackendErrorNotice error={error} onRetry={reload} />
      {(rows?.some((t) => !isTeamRow(t)) ?? false) && <h2 className="mt-14 text-2xl font-extrabold">{ar ? 'مدربو الدورات' : 'Course trainers'}</h2>}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(rows ?? []).filter((t) => !isTeamRow(t)).map((t) => (
          <Card key={t.id} media={<img src={t.photo_url || '/images/trainer-1.jpg'} alt={t.name_ar} className="aspect-[3/3.4] w-full object-cover" />}>
            <h3 className="font-bold">{ar ? t.name_ar : t.name_en}</h3>
            <p className="text-sm text-[var(--brand-text)]">{ar ? t.title_ar : t.title_en}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? t.bio_ar : t.bio_en}</p>
            <Button variant="plain" size="sm" className="mt-1 px-0" onClick={() => go({ page: 'trainer', slug: t.slug })}>{ar ? 'الصفحة الشخصية' : 'Profile'}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrainerDetail({ slug }: { slug: string }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [t, setT] = useState<Trainer | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    selectRows<Trainer>(`trainers?select=${PUBLIC_TRAINER_FIELDS}&slug=eq.${encodeURIComponent(slug)}&limit=1`).then(async (r) => {
      setT(r[0] ?? null);
      if (r[0]) setCourses(await selectRows<Course>(`courses?select=*&trainer_id=eq.${r[0].id}&published=eq.true`));
    });
  }, [slug]);
  usePageMeta(t ? (ar ? t.name_ar : t.name_en) : '');
  if (!t) return <p className="px-5 pb-20 pt-28 text-center">…</p>;
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <div className="grid gap-10 md:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-3xl shadow-xl">
          <Media src={t.photo_url} video={t.video_url} alt={t.name_ar} className="aspect-[3/3.6] w-full object-cover" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">{ar ? t.name_ar : t.name_en}</h1>
          <p className="mt-1 text-lg text-[var(--brand-text)]">{ar ? t.title_ar : t.title_en}</p>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{ar ? t.bio_ar : t.bio_en}</p>
          {(t.qualifications_ar || t.qualifications_en) && <p className="mt-3 rounded-2xl bg-secondary p-4 text-sm">{ar ? t.qualifications_ar : t.qualifications_en}</p>}
          {courses.length > 0 && (
            <><h3 className="mt-8 text-xl font-bold">{ar ? 'دوراته' : 'Courses'}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {courses.map((c) => <button key={c.id} onClick={() => go({ page: 'course', slug: c.slug })} className="rounded-full bg-secondary px-4 py-2 text-sm hover:text-[var(--brand-text)]">{ar ? c.title_ar : c.title_en}</button>)}
              </div></>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'الأخبار والمدونة' : 'News');
  const { rows } = useRows<Post>('posts?select=*&published=eq.true&order=date.desc');
  const { settings } = useSettings();
  const announcements = configuredInstagramPosts(settings.social_posts?.ar).filter((post) => post.kind === 'announcement');
  const kinds = [
    { id: '', l: ar ? 'الكل' : 'All' }, { id: 'news', l: ar ? 'أخبار' : 'News' },
    { id: 'blog', l: ar ? 'مدونة' : 'Blog' }, { id: 'success', l: ar ? 'قصص نجاح' : 'Success' },
    { id: 'announcement', l: ar ? 'إعلانات' : 'Announcements' },
  ];
  const [k, setK] = useState('');
  const list = (rows ?? []).filter((n) => !k || n.kind === k);
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'الأخبار والمدونة' : 'News & blog'}</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        {kinds.map((x) => <button key={x.id} onClick={() => setK(x.id)} className={`rounded-full px-4 py-2 text-sm ${k === x.id ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>{x.l}</button>)}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {list.map((n) => (
          <Card key={n.id} media={<Media src={n.cover_url} video={undefined} alt={n.title_ar} className="aspect-[16/10] w-full object-cover" />}>
            <div className="text-xs text-muted-foreground">{n.date}</div>
            <h3 className="mt-1 font-bold">{ar ? n.title_ar : n.title_en}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? n.excerpt_ar : n.excerpt_en}</p>
            <Button variant="plain" size="sm" className="mt-1 px-0" onClick={() => go({ page: 'post', slug: n.slug })}>{ar ? 'اقرأ المزيد' : 'Read more'}</Button>
          </Card>
        ))}
        {(!k || k === 'announcement') && announcements.map((post) => <InstagramPostCard key={post.code} post={post} lang={lang} />)}
      </div>
      {!list.length && (!k || k === 'announcement') && !announcements.length && (
        <p className="mt-10 rounded-3xl bg-secondary/60 p-8 text-center text-muted-foreground">{ar ? 'ستظهر أخبارنا وإعلاناتنا هنا قريباً.' : 'Our news and announcements will appear here soon.'}</p>
      )}
    </div>
  );
}

function PostDetail({ slug }: { slug: string }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [n, setN] = useState<Post | null>(null);
  useEffect(() => {
    selectRows<Post>(`posts?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`).then((r) => setN(r[0] ?? null));
  }, [slug]);
  usePageMeta(n ? (ar ? n.title_ar : n.title_en) : '');
  if (!n) return <p className="px-5 pb-20 pt-28 text-center">…</p>;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-28 sm:px-8">
      <div className="overflow-hidden rounded-3xl shadow-xl"><Media src={n.cover_url} video={n.video_url} alt={n.title_ar} className="aspect-video w-full object-cover" /></div>
      <div className="mt-4 text-sm text-muted-foreground">{n.date}{n.author ? ` · ${n.author}` : ''}</div>
      <h1 className="mt-2 text-4xl font-bold">{ar ? n.title_ar : n.title_en}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{ar ? n.excerpt_ar : n.excerpt_en}</p>
      <div className="mt-6 whitespace-pre-line leading-loose">{ar ? n.content_ar : n.content_en}</div>
    </div>
  );
}

function EventsPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'الورشات والفعاليات' : 'Events');
  const { rows } = useRows<EventItem>('events?select=*&published=eq.true&order=starts_at.asc');
  const { settings } = useSettings();
  const promotions = configuredInstagramPosts(settings.social_posts?.ar).filter((post) => post.kind === 'event' || post.kind === 'workshop');
  const [k, setK] = useState('');
  const list = (rows ?? []).filter((e) => !k || e.kind === k);
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'الورشات والفعاليات' : 'Workshops & events'}</h1>
      <div className="mt-5 flex gap-2">
        {[['', ar ? 'الكل' : 'All'], ['workshop', ar ? 'ورشات' : 'Workshops'], ['event', ar ? 'فعاليات' : 'Events']].map(([id, l]) => (
          <button key={id} onClick={() => setK(id)} className={`rounded-full px-4 py-2 text-sm ${k === id ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>{l}</button>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {list.map((e) => (
          <Card key={e.id} media={<Media src={e.cover_url} video={undefined} alt={e.title_ar} className="aspect-[16/10] w-full object-cover" />}>
            <div className="text-xs text-[var(--brand-text)]">{e.starts_at ? new Date(e.starts_at).toLocaleString(ar ? 'ar-PS' : 'en', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
            <h3 className="mt-1 font-bold">{ar ? e.title_ar : e.title_en}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ar ? e.summary_ar : e.summary_en}</p>
            <Button variant="plain" size="sm" className="mt-1 px-0" onClick={() => go({ page: 'event', slug: e.slug })}>{ar ? 'التفاصيل' : 'Details'}</Button>
          </Card>
        ))}
        {(!k || k === 'event') && promotions.filter((post) => post.kind === 'event').map((post) => <InstagramPostCard key={post.code} post={post} lang={lang} />)}
        {(!k || k === 'workshop') && workshopCards.map((workshop) => (
          <InstagramPostCard key={workshop.href} post={{
            code: workshop.href.match(/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/)?.[1] ?? workshop.href,
            href: workshop.href,
            kind: 'workshop',
          }} lang={lang} />
        ))}
        {(!k || k === 'workshop') && promotions.filter((post) => post.kind === 'workshop').map((post) => <InstagramPostCard key={post.code} post={post} lang={lang} />)}
      </div>
      {!list.length && !(k === 'workshop' && workshopCards.length) && !promotions.some((post) => !k || post.kind === k) && (
        <p className="mt-10 rounded-3xl bg-secondary/60 p-8 text-center text-muted-foreground">{ar ? 'نعمل على تجهيز المزيد من الأنشطة. تابعونا للاطلاع على الجديد.' : 'More activities are on the way. Check back for updates.'}</p>
      )}
    </div>
  );
}

function EventDetail({ slug }: { slug: string }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [e, setE] = useState<EventItem | null>(null);
  useEffect(() => {
    selectRows<EventItem>(`events?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`).then((r) => setE(r[0] ?? null));
  }, [slug]);
  usePageMeta(e ? (ar ? e.title_ar : e.title_en) : '');
  if (!e) return <p className="px-5 pb-20 pt-28 text-center">…</p>;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-28 sm:px-8">
      <div className="overflow-hidden rounded-3xl shadow-xl"><Media src={e.cover_url} video={e.video_url} alt={e.title_ar} className="aspect-video w-full object-cover" /></div>
      <h1 className="mt-4 text-4xl font-bold">{ar ? e.title_ar : e.title_en}</h1>
      <p className="mt-2 text-[var(--brand-text)]">{e.starts_at ? new Date(e.starts_at).toLocaleString(ar ? 'ar-PS' : 'en', { dateStyle: 'full', timeStyle: 'short' }) : ''}{e.location ? ` · ${e.location}` : ''}{e.speaker ? ` · ${e.speaker}` : ''}</p>
      <p className="mt-3 text-muted-foreground">{ar ? e.summary_ar : e.summary_en}</p>
      <div className="mt-4 whitespace-pre-line leading-loose">{ar ? e.description_ar : e.description_en}</div>
    </div>
  );
}

function AboutPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const side = ar ? 'ar' : 'en';
  const { settings } = useSettings();
  usePageMeta(ar ? 'من نحن' : 'About');
  const trainers = useRows<Trainer>(`trainers?select=${PUBLIC_TRAINER_FIELDS}&published=eq.true&order=sort_order.asc`);
  const reduceMotion = useReducedMotion();
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{pick(lang, settings.about_title, ar ? 'من نحن' : 'About')}</h1>
      <motion.div className="mt-6 grid items-center gap-10 lg:grid-cols-2"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: .2 }}
        transition={{ duration: .65 }}>
        <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{pick(lang, settings.about_text) || ABOUT_COPY[ar ? 'ar' : 'en']}</p>
        <div className="about-visual overflow-hidden rounded-3xl shadow-xl">
          <Media src={settings.about_image?.[side] || '/images/about.jpg'} video={settings.about_video_url?.ar || settings.about_video_url?.en} alt="about" className="aspect-video w-full object-cover" />
        </div>
      </motion.div>
      <h2 className="mt-16 text-2xl font-bold">{ar ? 'فريقنا' : 'Our team'}</h2>
      <div className="mt-6">
        <TeamCards rows={trainers.rows} initialized={settings.team_initialized?.ar === 'true'} lang={lang} />
      </div>
    </div>
  );
}

function ContactPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'تواصل معنا' : 'Contact');
  const { settings } = useSettings();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') ?? '').trim();
    const email = String(f.get('email') ?? '').trim();
    const message = String(f.get('message') ?? '').trim();
    const website = String(f.get('website') ?? '');
    if (!name || !email || !message) return;
    setBusy(true);
    setSendError('');
    try {
      await callFunction('forms/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, message, website }) });
      setDone(true);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : (ar ? 'تعذر إرسال الرسالة. حاولي مرة أخرى.' : 'The message could not be sent. Please try again.'));
    } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'تواصل معنا' : 'Contact us'}</h1>
      <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">{ar
        ? 'يسعدنا تواصلك معنا. نؤمن بأن التواصل الفعّال هو أساس التطور والنجاح. إذا كانت لديك أي أسئلة، أو ترغب في استكشاف سُبل التعاون، لا تتردد في مراسلتنا. يرجى ملء النموذج أدناه، وسيصلك رد من فريقنا الفني والتقني في أي وقت.'
        : 'We would love to hear from you. Effective communication is the foundation of growth and success. If you have questions or would like to explore working together, please get in touch. Fill in the form below and our technical team will get back to you.'}</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          {(settings.contact_email?.en || settings.contact_email?.ar) && (
            <a href={`mailto:${settings.contact_email.en || settings.contact_email.ar}`} className="rounded-2xl border p-4 hover:bg-secondary/50"><div className="text-sm text-muted-foreground">{ar ? 'البريد' : 'Email'}</div><div className="font-bold" dir="ltr">{settings.contact_email.en || settings.contact_email.ar}</div></a>
          )}
          {(settings.contact_phone?.ar) && (
            <a href={`tel:${settings.contact_phone.ar.replace(/[^+\d]/g, '')}`} className="rounded-2xl border p-4 hover:bg-secondary/50"><div className="text-sm text-muted-foreground">{ar ? 'الهاتف' : 'Phone'}</div><div className="font-bold" dir="ltr">{settings.contact_phone.ar}</div></a>
          )}
          {(settings.contact_whatsapp?.ar) && (
            <a href={`https://wa.me/${settings.contact_whatsapp.ar.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-2xl border p-4 hover:bg-secondary/50"><div className="text-sm text-muted-foreground">WhatsApp</div><div className="font-bold" dir="ltr">{settings.contact_whatsapp.ar.replace(/\D/g, '') === '972595676566' ? '+972 59 567 6566' : settings.contact_whatsapp.ar}</div></a>
          )}
          {(settings.contact_location?.ar || settings.contact_location?.en) && (
            <div className="rounded-2xl border p-4"><div className="text-sm text-muted-foreground">{ar ? 'العنوان' : 'Address'}</div><div className="font-bold">{pick(lang, settings.contact_location)}</div></div>
          )}
        </div>
        {done ? (
          <div className="rounded-3xl bg-secondary p-10 text-center"><div className="text-4xl">✓</div><h3 className="mt-2 text-xl font-bold">{ar ? 'وصلتنا رسالتك!' : 'Message received!'}</h3><p className="mt-1 text-muted-foreground">{ar ? 'نرد عليك قريبًا.' : 'We will reply soon.'}</p></div>
        ) : (
          <form onSubmit={send} className="grid gap-3 rounded-3xl border p-6">
            <p className="text-sm leading-6 text-muted-foreground">{ar ? 'تُستخدم بياناتك للرد على رسالتك فقط، ولا تظهر للزوار.' : 'Your details are used only to respond to your message and are not shown to visitors.'}</p>
            <input name="name" required placeholder={ar ? 'الاسم' : 'Name'} className="h-11 rounded-full border bg-card px-4" />
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <input name="email" required type="email" placeholder={ar ? 'البريد الإلكتروني' : 'Email'} dir="ltr" className="h-11 rounded-full border bg-card px-4" />
            <textarea name="message" required placeholder={ar ? 'رسالتك…' : 'Your message…'} rows={5} className="rounded-2xl border bg-card p-4" />
            {sendError && <p role="alert" className="rounded-xl bg-secondary px-4 py-3 text-sm">{sendError}</p>}
            <Button busy={busy} size="lg">{ar ? 'إرسال' : 'Send'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function VolunteerPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'تطوّع معنا' : 'Volunteer');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row: Record<string, string> = {};
    for (const k of ['full_name', 'email', 'phone', 'city', 'university', 'major', 'skills', 'experience', 'department', 'motivation', 'website']) row[k] = String(f.get(k) ?? '');
    if (!row.full_name.trim() || !row.email.trim()) return;
    setBusy(true);
    try {
      await callFunction('forms/volunteer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) });
      setDone(true);
    } finally { setBusy(false); }
  };
  if (done) return <div className="mx-auto max-w-xl px-5 pb-20 pt-32 text-center"><div className="text-5xl">🤝</div><h1 className="mt-3 text-3xl font-bold">{ar ? 'شكرًا لتطوعك!' : 'Thank you!'}</h1><p className="mt-2 text-muted-foreground">{ar ? 'توصلنا بطلبك وسنتواصل معك.' : 'We got your application.'}</p></div>;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'تطوّع معنا' : 'Volunteer with us'}</h1>
      <p className="mt-2 text-muted-foreground">{ar ? 'انضم لفريق آفاق كمدرب أو منسق أو عضو إعلامي.' : 'Join as trainer, coordinator or media member.'}</p>
      <form onSubmit={send} className="mt-6 grid gap-3 rounded-3xl border p-6 md:grid-cols-2">
        <input name="full_name" required placeholder={ar ? 'الاسم الكامل *' : 'Full name *'} className="h-11 rounded-full border bg-card px-4" />
        <input name="email" required type="email" placeholder="Email *" dir="ltr" className="h-11 rounded-full border bg-card px-4" />
        <input name="phone" placeholder={ar ? 'الهاتف' : 'Phone'} dir="ltr" className="h-11 rounded-full border bg-card px-4" />
        <input name="city" placeholder={ar ? 'المدينة' : 'City'} className="h-11 rounded-full border bg-card px-4" />
        <input name="university" placeholder={ar ? 'الجامعة' : 'University'} className="h-11 rounded-full border bg-card px-4" />
        <input name="major" placeholder={ar ? 'التخصص' : 'Major'} className="h-11 rounded-full border bg-card px-4" />
        <input name="department" placeholder={ar ? 'القسم الذي تريده' : 'Department'} className="h-11 rounded-full border bg-card px-4 md:col-span-2" />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <textarea name="skills" placeholder={ar ? 'مهاراتك' : 'Your skills'} rows={3} className="rounded-2xl border bg-card p-4 md:col-span-2" />
        <textarea name="motivation" placeholder={ar ? 'لماذا تريد التطوع؟' : 'Why volunteer?'} rows={3} className="rounded-2xl border bg-card p-4 md:col-span-2" />
        <Button busy={busy} size="lg" className="md:col-span-2">{ar ? 'إرسال الطلب' : 'Send application'}</Button>
      </form>
    </div>
  );
}

function JoinTrainerPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'قدم كمدرب' : 'Apply as trainer');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row: Record<string, string> = {};
    for (const k of ['full_name', 'email', 'phone', 'specialty', 'bio', 'website']) row[k] = String(f.get(k) ?? '');
    if (!row.full_name.trim() || !row.email.trim()) return;
    setBusy(true);
    try {
      await callFunction('forms/trainer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) });
      setDone(true);
    } finally { setBusy(false); }
  };
  if (done) return <div className="mx-auto max-w-xl px-5 pb-20 pt-32 text-center"><div className="text-5xl">📩</div><h1 className="mt-3 text-3xl font-bold">{ar ? 'وصل طلبك!' : 'Application received!'}</h1><p className="mt-2 text-muted-foreground">{ar ? 'الادارة بتراجع طلبك وبتتواصل معك. بعد القبول اعمل حساب بنفس الايميل وادخل بوابة المدرب.' : 'The admin will review it. After approval, create an account with the same email.'}</p></div>;
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'قدم كمدرب' : 'Apply as trainer'}</h1>
      <p className="mt-2 text-muted-foreground">{ar ? 'عبئ بياناتك وبتجي الادارة طلبك للمراجعة والقبول.' : 'Fill in your details for admin review.'}</p>
      <form onSubmit={send} className="mt-6 grid gap-3 rounded-3xl border p-6 md:grid-cols-2">
        <input name="full_name" required placeholder={ar ? 'الاسم الكامل *' : 'Full name *'} className="h-11 rounded-full border bg-card px-4" />
        <input name="email" required type="email" placeholder="Email *" dir="ltr" className="h-11 rounded-full border bg-card px-4" />
        <input name="phone" placeholder={ar ? 'الهاتف' : 'Phone'} dir="ltr" className="h-11 rounded-full border bg-card px-4" />
        <input name="specialty" placeholder={ar ? 'التخصص' : 'Specialty'} className="h-11 rounded-full border bg-card px-4" />
        <textarea name="bio" placeholder={ar ? 'نبذة عن خبرتك' : 'Your experience'} rows={4} className="rounded-2xl border bg-card p-4 md:col-span-2" />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <Button busy={busy} size="lg" className="md:col-span-2">{ar ? 'إرسال الطلب' : 'Send application'}</Button>
      </form>
    </div>
  );
}

function VerifyPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'التحقق من شهادة' : 'Verify certificate');
  const [code, setCode] = useState('');
  const [res, setRes] = useState<{ found: boolean; holder?: string; course?: string; issued?: string; code?: string } | null>(null);
  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setRes(null);
    const answer = await (await backendRequest('rpc/verify_certificate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p_code: code.trim() }) })).json();
    const row = (Array.isArray(answer) ? answer[0] : undefined) as { holder_ar: string; holder_en: string; course_ar: string | null; course_en: string | null; issued_on: string | null; code: string } | undefined;
    if (!row) setRes({ found: false });
    else setRes({ found: true, holder: ar ? row.holder_ar : row.holder_en, course: ar ? (row.course_ar ?? '') : (row.course_en ?? ''), issued: row.issued_on ?? '', code: row.code });
  };
  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'التحقق من شهادة' : 'Verify a certificate'}</h1>
      <form onSubmit={check} className="mt-6 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="AFAQ-2026-0001" aria-label="Certificate code" dir="ltr" className="h-12 flex-1 rounded-full border bg-card px-4 font-mono" />
        <Button size="lg">{ar ? 'تحقق' : 'Verify'}</Button>
      </form>
      {res && (res.found
        ? <div className="mt-6 rounded-3xl bg-green-500/10 p-6 text-center"><div className="text-4xl">✓</div><h3 className="mt-2 text-xl font-bold">{res.holder}</h3><p className="text-muted-foreground">{res.course}</p><p dir="ltr" className="mt-2 font-mono text-sm">{res.code}</p></div>
        : <p className="mt-6 rounded-3xl bg-red-500/10 p-6 text-center">{ar ? 'لم نجد شهادة بهذا الرقم.' : 'No certificate with this number.'}</p>)}
    </div>
  );
}

function FaqPage() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'الأسئلة الشائعة' : 'FAQ');
  const faqs = ar ? [
    ['هل الدورات مجانية؟', 'معظم دوراتنا مجانية لأن الأكاديمية يديرها فريق تطوعي.'],
    ['هل أحصل على شهادة؟', 'نعم، عند إكمال متطلبات الدورة تحصل على شهادة يمكن التحقق منها هنا في الموقع.'],
    ['هل الدورات حضورية أم إلكترونية؟', 'نقدّم الدورات بالشكلين حسب طبيعة كل دورة.'],
    ['كيف أصبح مدربًا؟', 'قدّم طلب تطوع من صفحة "تطوّع معنا" وسنتواصل معك.'],
  ] : [
    ['Are courses free?', 'Most are free — the academy is volunteer-run.'],
    ['Do I get a certificate?', 'Yes, verifiable right here on the site.'],
    ['Online or in person?', 'Both, depending on the course.'],
    ['How to become a trainer?', 'Apply on the Volunteer page.'],
  ];
  const [open, setOpen] = useState(0);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-28 sm:px-8">
      <h1 className="text-4xl font-bold">{ar ? 'الأسئلة الشائعة' : 'FAQ'}</h1>
      <div className="mt-6 grid gap-3">
        {faqs.map(([q, a], i) => (
          <div key={i} className="rounded-2xl border">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between p-4 text-start font-bold">{q}<span>{open === i ? '−' : '+'}</span></button>
            {open === i && <p className="px-4 pb-4 text-muted-foreground">{a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPage({ onDone }: { onDone: (u: User) => void }) {
  const { lang } = useLang();
  usePageMeta('Login');
  return (
    <div className="login-no-signup mx-auto w-full max-w-xl px-5 pb-20 pt-28 sm:px-8">
      <SignInScreen auth={client.auth} startWith="signIn" onSignedIn={(u) => { onDone(u as User); go({ page: 'account' }); }}
        text={{ signInTitle: lang === 'ar' ? 'تسجيل الدخول' : undefined } as never} />
    </div>
  );
}

function RegisterPage({ onDone }: { onDone: (u: User) => void }) {
  const { lang } = useLang();
  usePageMeta(lang === 'ar' ? 'حساب جديد' : 'Create account');
  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-20 pt-28 sm:px-8">
      <SignInScreen auth={client.auth} startWith="signUp" onSignedIn={(u) => { onDone(u as User); go({ page: 'account' }); }}
        text={{ signUpTitle: lang === 'ar' ? 'حساب جديد' : undefined } as never} />
    </div>
  );
}

function AccountPage({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  usePageMeta(ar ? 'حسابي' : 'My account');
  const [enrolls, setEnrolls] = useState<( { id: number; status: string; course_id: number; courses: Course | null } )[]>([]);
  const [certs, setCerts] = useState<{ code: string; holder_name_ar: string; holder_name_en: string }[]>([]);
  const [profile, setProfile] = useState({ full_name: '', phone: '', city: '', university: '', major: '' });
  const [pmsg, setPmsg] = useState('');
  const [progress, setProgress] = useState<Record<number, { done: number; total: number }>>({});
  const [myScores, setMyScores] = useState<{ quiz_id: number; score: number; total: number; title_ar: string; title_en: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    selectRows<{ id: number; status: string; course_id: number; courses: Course }>(`enrollments?select=*,courses(*)&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`)
      .then(async (r) => {
        const list = r.map((x) => ({ ...x, courses: (x as { courses: Course }).courses ?? null }));
        setEnrolls(list);
        const prog: Record<number, { done: number; total: number }> = {};
        for (const e of list) {
          try {
            const [ls, dn] = await Promise.all([
              selectRows<{ id: number }>(`lessons?select=id&course_id=eq.${e.course_id}`),
              selectRows<{ lesson_id: number }>(`lesson_progress?select=lesson_id&user_id=eq.${encodeURIComponent(user.id)}`),
            ]);
            const ids = new Set(ls.map((l) => l.id));
            prog[e.course_id] = { done: dn.filter((d) => ids.has(d.lesson_id)).length, total: ls.length };
          } catch { /* unpublished lessons stay hidden */ }
        }
        setProgress(prog);
      }).catch(() => {});
    selectRows<{ code: string; holder_name_ar: string; holder_name_en: string }>(`certificates?select=*&user_id=eq.${encodeURIComponent(user.id)}`).then(setCerts).catch(() => {});
    selectRows<{ full_name: string | null; phone: string | null; city: string | null; university: string | null; major: string | null }>(`profiles?select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`)
      .then((r) => {
        if (r[0]) setProfile({ full_name: r[0].full_name ?? '', phone: r[0].phone ?? '', city: r[0].city ?? '', university: r[0].university ?? '', major: r[0].major ?? '' });
        else setProfile({ full_name: user.name ?? '', phone: '', city: '', university: '', major: '' });
      }).catch(() => {});
    selectRows<{ quiz_id: number; score: number; total: number; quizzes: { title_ar: string; title_en: string } | null }>(`quiz_attempts?select=*,quizzes(title_ar,title_en)&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`)
      .then((r) => setMyScores(r.map((a) => ({ quiz_id: a.quiz_id, score: a.score, total: a.total, title_ar: a.quizzes?.title_ar ?? '', title_en: a.quizzes?.title_en ?? '' })))).catch(() => {});
  }, [user]);
  if (user === undefined) return <p className="px-5 pb-20 pt-28 text-center">…</p>;
  if (user === null) { go({ page: 'login' }); return null; }
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmsg('');
    try {
      await backendRequest('profiles', {
        method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: user.id, email: user.email, ...profile }),
      });
      setPmsg(ar ? 'تم حفظ معلوماتك.' : 'Saved.');
    } catch { setPmsg(ar ? 'تعذر الحفظ.' : 'Could not save.'); }
  };
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-20 pt-28 sm:px-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">{ar ? 'أهلًا' : 'Hi'} {user.name || user.email}</h1><p className="text-muted-foreground" dir="ltr">{user.email}</p></div>
        <Button variant="gray" onClick={async () => { await client.auth.signOut?.(); setUser(null); go({ page: 'home' }); }}>{ar ? 'خروج' : 'Sign out'}</Button>
      </div>
      <h2 className="mt-10 text-xl font-bold">{ar ? 'معلوماتي' : 'My info'}</h2>
      <form onSubmit={saveProfile} className="mt-3 grid gap-3 rounded-3xl border p-5 md:grid-cols-2">
        <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder={ar ? 'الاسم الكامل' : 'Full name'} className="h-11 rounded-full border bg-card px-4" />
        <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder={ar ? 'الهاتف' : 'Phone'} dir="ltr" className="h-11 rounded-full border bg-card px-4" />
        <input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder={ar ? 'المدينة' : 'City'} className="h-11 rounded-full border bg-card px-4" />
        <input value={profile.university} onChange={(e) => setProfile({ ...profile, university: e.target.value })} placeholder={ar ? 'الجامعة' : 'University'} className="h-11 rounded-full border bg-card px-4" />
        <input value={profile.major} onChange={(e) => setProfile({ ...profile, major: e.target.value })} placeholder={ar ? 'التخصص' : 'Major'} className="h-11 rounded-full border bg-card px-4 md:col-span-2" />
        <div className="flex items-center gap-3 md:col-span-2"><Button>{ar ? 'حفظ معلوماتي' : 'Save'}</Button>{pmsg && <span className="text-sm">{pmsg}</span>}</div>
      </form>
      <h2 className="mt-10 text-xl font-bold">{ar ? 'دوراتي' : 'My courses'}</h2>
      <div className="mt-3 grid gap-3">
        {enrolls.length === 0 && <p className="rounded-2xl bg-secondary/60 p-5 text-sm text-muted-foreground">{ar ? 'لم تسجل في أي دورة بعد.' : 'No enrollments yet.'}</p>}
        {enrolls.map((e) => {
          const p = progress[e.course_id];
          const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <button key={e.id} onClick={() => e.courses && go({ page: 'course', slug: e.courses.slug })} className="rounded-2xl border p-4 text-start hover:bg-secondary/40">
              <span className="flex items-center justify-between gap-2"><span className="font-bold">{e.courses ? (ar ? e.courses.title_ar : e.courses.title_en) : `#${e.course_id}`}</span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{e.status}</span></span>
              {p && p.total > 0 && (
                <span className="mt-3 block"><span className="block h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} /></span>
                  <span className="mt-1 block text-xs text-muted-foreground">{p.done}/{p.total} {ar ? 'محاضرة' : 'lessons'} · {pct}%</span></span>
              )}
            </button>
          );
        })}
      </div>
      <h2 className="mt-8 text-xl font-bold">{ar ? 'نتائجي بالاختبارات' : 'My quiz scores'}</h2>
      <div className="mt-3 grid gap-3">
        {myScores.length === 0 && <p className="rounded-2xl bg-secondary/60 p-5 text-sm text-muted-foreground">{ar ? 'لم تقدم أي اختبار بعد.' : 'No attempts yet.'}</p>}
        {myScores.slice(0, 10).map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border p-4">
            <span className="font-bold">{ar ? s.title_ar : s.title_en}</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold">{s.score}/{s.total}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-bold">{ar ? 'شهاداتي' : 'My certificates'}</h2>
      <div className="mt-3 grid gap-3">
        {certs.length === 0 && <p className="rounded-2xl bg-secondary/60 p-5 text-sm text-muted-foreground">{ar ? 'لا شهادات بعد.' : 'No certificates yet.'}</p>}
        {certs.map((c) => <div key={c.code} className="rounded-2xl border p-4"><span dir="ltr" className="font-mono">{c.code}</span><span className="mx-2">·</span>{ar ? c.holder_name_ar : c.holder_name_en}</div>)}
      </div>
    </div>
  );
}

export function Site({ route, user, setUser }: { route: Route; user: User; setUser: (u: User) => void }) {
  const { settings } = useSettings();
  const { lang } = useLang();
  const ar = lang === 'ar';
  useEffect(() => {
    try {
      const path = window.location.pathname.slice(0, 200);
      if (sessionStorage.getItem(`viewed:${path}`)) return;
      sessionStorage.setItem(`viewed:${path}`, '1');
      backendRequest('page_views', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }) }).catch(() => {});
    } catch { /* counting a visit never blocks the page */ }
  }, [route]);
  return (
    <div className="min-h-dvh">
      <Header route={route} user={user} />
      <main>
        {route.page === 'home' && <HomePage user={user} />}
        {route.page === 'courses' && <CoursesPage />}
        {route.page === 'course' && <CourseDetail slug={(route as { slug: string }).slug} user={user} />}
        {route.page === 'trainers' && <TrainersPage />}
        {route.page === 'trainer' && <TrainerDetail slug={(route as { slug: string }).slug} />}
        {route.page === 'news' && <NewsPage />}
        {route.page === 'post' && <PostDetail slug={(route as { slug: string }).slug} />}
        {route.page === 'events' && <EventsPage />}
        {route.page === 'event' && <EventDetail slug={(route as { slug: string }).slug} />}
        {route.page === 'about' && <AboutPage />}
        {route.page === 'contact' && <ContactPage />}
        {route.page === 'volunteer' && <VolunteerPage />}
        {route.page === 'join-trainer' && <JoinTrainerPage />}
        {route.page === 'verify' && <VerifyPage />}
        {route.page === 'faq' && <FaqPage />}
        {route.page === 'login' && <LoginPage onDone={setUser} />}
        {route.page === 'register' && <RegisterPage onDone={setUser} />}
        {route.page === 'quiz' && <QuizTake id={(route as { id: number }).id} user={user} />}
        {route.page === 'account' && <AccountPage user={user} setUser={setUser} />}
      </main>
      <SiteFooter
        name={pick(lang, settings.brand_name ? { ar: settings.brand_name.ar, en: settings.brand_name.en } : { ar: 'آفاق', en: 'Afaq' })}
        tagline={pick(lang, settings.footer_text)}
        columns={[
          {
            title: ar ? 'روابط سريعة' : 'Quick links',
            items: [
              { label: ar ? 'تطوع معنا' : 'Volunteer', href: '/volunteer' },
              { label: ar ? 'التحقق من شهادة' : 'Verify certificate', href: '/verify' },
              { label: ar ? 'الأسئلة الشائعة' : 'FAQ', href: '/faq' },
              { label: ar ? 'قدم كمدرب' : 'Apply as trainer', href: '/join-trainer' },
            ],
          },
          {
            title: ar ? 'اكتشف' : 'Explore',
            items: [
              { label: ar ? 'الدورات' : 'Courses', href: '/courses' },
              { label: ar ? 'المدربون' : 'Trainers', href: '/trainers' },
              { label: ar ? 'الفعاليات' : 'Events', href: '/events' },
              { label: ar ? 'الأخبار' : 'News', href: '/news' },
            ],
          },
        ]}
      />
    </div>
  );
}
