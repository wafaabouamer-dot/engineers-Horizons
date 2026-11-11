import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OwnerGate } from '@/components/ui/sign-in';
import { BackendErrorNotice, backendRequest } from '@/lib/data';
import { useLang } from '@/lib/lang';
import { usePageMeta } from '@/lib/page-meta';
import { client } from '@/lib/auth';
import { uploadMedia, isVideo, loadTable, pick, slug, upsertRow, upsertTrainer, deleteRow, videoEmbed, useSettings, saveSettings, safeHttpUrl } from '@/lib/site';
import { LessonsManager, QuizzesManager } from './Trainer';
import { getLinkedin, initialTeam, teamSeedRow, withoutLinkedin } from '@/lib/team';

type Tab = 'dash' | 'stats' | 'site' | 'courses' | 'lessons' | 'quizzes' | 'team' | 'trainers' | 'trainer-reqs' | 'cats' | 'posts' | 'events' | 'enroll' | 'certs' | 'msgs' | 'vols' | 'admins';

const TABS: { id: Tab; ar: string; en: string }[] = [
  { id: 'dash', ar: 'نظرة عامة', en: 'Overview' },
  { id: 'stats', ar: 'الإحصائيات والتصدير', en: 'Stats & export' },
  { id: 'site', ar: 'نصوص وصور وفيديو الموقع', en: 'Site content' },
  { id: 'courses', ar: 'الدورات', en: 'Courses' },
  { id: 'lessons', ar: 'المحاضرات', en: 'Lessons' },
  { id: 'quizzes', ar: 'الاختبارات', en: 'Quizzes' },
  { id: 'team', ar: 'فريق العمل', en: 'Team' },
  { id: 'trainers', ar: 'أعضاء الفريق والمدربون', en: 'Team members & trainers' },
  { id: 'trainer-reqs', ar: 'طلبات المدربين', en: 'Trainer requests' },
  { id: 'cats', ar: 'التصنيفات', en: 'Categories' },
  { id: 'posts', ar: 'الأخبار والمقالات', en: 'Posts' },
  { id: 'events', ar: 'الورشات والفعاليات', en: 'Events' },
  { id: 'enroll', ar: 'التسجيلات', en: 'Enrollments' },
  { id: 'certs', ar: 'الشهادات', en: 'Certificates' },
  { id: 'msgs', ar: 'الرسائل', en: 'Messages' },
  { id: 'vols', ar: 'التطوع', en: 'Volunteers' },
  { id: 'admins', ar: 'المشرفون', en: 'Admins' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'h-11 rounded-xl border bg-card px-3 text-[15px] w-full';
const areaCls = 'rounded-xl border bg-card p-3 text-[15px] w-full';

function MediaField({ label, value, onChange, accept = 'image/*,video/*' }: { label: string; value: string; onChange: (v: string) => void; accept?: string }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const embed = videoEmbed(value);
  return (
    <div className="grid gap-2 rounded-2xl border p-3">
      <span className="text-sm font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" placeholder="https://…"
        className={inputCls} aria-label={label || 'media'} />
      <div className="flex items-center gap-2">
        <label className="cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm hover:brightness-95">
          {busy ? '…' : ar ? 'ارفع من جهازك' : 'Upload'}
          <input type="file" accept={accept} className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true); setErr('');
            try { onChange(await uploadMedia(f)); }
            catch (err) { setErr(err instanceof Error ? err.message : 'error'); }
            finally { setBusy(false); e.target.value = ''; }
          }} />
        </label>
        {value && <button type="button" onClick={() => onChange('')} className="text-xs text-red-500">{ar ? 'إزالة' : 'Remove'}</button>}
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      {value && (
        <div className="overflow-hidden rounded-xl">
          {embed
            ? <iframe src={embed} title="preview" className="aspect-video w-full" referrerPolicy="strict-origin-when-cross-origin" />
            : isVideo(value)
              ? <video src={value} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
              : <img src={value} alt="" className="max-h-44 w-full object-cover" />}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{ar ? 'للصورة: الصق رابطا او ارفعها من جهازك. للفيديو: الصق رابط يوتيوب او درايف او ملف mp4 — وملف درايف لازم يكون مشاركا (اي شخص لديه الرابط يمكنه العرض).' : 'Image: paste a URL or upload from your device. Video: YouTube, Drive (shared: anyone with the link) or mp4.'}</p>
    </div>
  );
}

function BiFields({ prefix, row, setRow, label }: { prefix: string; row: Record<string, unknown>; setRow: (r: Record<string, unknown>) => void; label: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <Field label={`${label} (عربي)`}>
        <input value={String(row[`${prefix}_ar`] ?? '')} onChange={(e) => setRow({ ...row, [`${prefix}_ar`]: e.target.value })} className={inputCls} />
      </Field>
      <Field label={`${label} (English)`}>
        <input value={String(row[`${prefix}_en`] ?? '')} onChange={(e) => setRow({ ...row, [`${prefix}_en`]: e.target.value })} dir="ltr" className={inputCls} />
      </Field>
    </div>
  );
}

function BiArea({ prefix, row, setRow, label }: { prefix: string; row: Record<string, unknown>; setRow: (r: Record<string, unknown>) => void; label: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <Field label={`${label} (عربي)`}>
        <textarea value={String(row[`${prefix}_ar`] ?? '')} onChange={(e) => setRow({ ...row, [`${prefix}_ar`]: e.target.value })} rows={3} className={areaCls} />
      </Field>
      <Field label={`${label} (English)`}>
        <textarea value={String(row[`${prefix}_en`] ?? '')} onChange={(e) => setRow({ ...row, [`${prefix}_en`]: e.target.value })} rows={3} dir="ltr" className={areaCls} />
      </Field>
    </div>
  );
}

function EditorShell({ title, onClose, onSave, busy, children }: { title: string; onClose: () => void; onSave: () => void; busy: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-auto rounded-3xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-secondary">✕</button>
        </div>
        <div className="grid gap-4">{children}</div>
        <div className="mt-6 flex gap-2">
          <Button busy={busy} onClick={onSave} className="flex-1">حفظ</Button>
          <Button variant="gray" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Site content: every text, image, video ----------
function SiteEditor() {
  const { settings, reload } = useSettings();
  const [form, setForm] = useState<Record<string, { ar: string; en: string }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (started) return;
    const keys = Object.keys(settings);
    if (keys.length === 0) return;
    const f: Record<string, { ar: string; en: string }> = {};
    for (const [k, v] of Object.entries(settings)) f[k] = { ...v };
    setForm(f);
    setStarted(true);
  }, [settings, started]);
  const set = (k: string, side: 'ar' | 'en', v: string) => setForm((p) => ({ ...p, [k]: { ar: p[k]?.ar ?? '', en: p[k]?.en ?? '', [side]: v } }));
  const keys: { k: string; label: string; type: 'text' | 'area' | 'image' | 'single' | 'urls' }[] = [
    { k: 'brand_name', label: 'اسم الأكاديمية', type: 'text' },
    { k: 'hero_kicker', label: 'السطر الصغير فوق العنوان', type: 'text' },
    { k: 'hero_title', label: 'العنوان الرئيسي', type: 'text' },
    { k: 'hero_text', label: 'النص تحت العنوان', type: 'area' },
    { k: 'hero_image', label: 'صورة الواجهة الرئيسية', type: 'image' },
    { k: 'hero_video_url', label: 'فيديو الواجهة (YouTube أو mp4 — يظهر بدل الصورة)', type: 'image' },
    { k: 'about_title', label: 'عنوان "من نحن"', type: 'text' },
    { k: 'about_text', label: 'نص "من نحن"', type: 'area' },
    { k: 'about_image', label: 'صورة "من نحن"', type: 'image' },
    { k: 'about_video_url', label: 'فيديو "من نحن"', type: 'image' },
    { k: 'social_posts', label: 'روابط إنستغرام (رابط في كل سطر: روابط /p/ تظهر في الإعلانات والأخبار، وروابط /reel/ تظهر في الورشات)', type: 'urls' },
    { k: 'cta_title', label: 'عنوان الدعوة الأخيرة', type: 'text' },
    { k: 'cta_text', label: 'نص الدعوة الأخيرة', type: 'area' },
    { k: 'contact_email', label: 'البريد الإلكتروني', type: 'single' },
    { k: 'contact_phone', label: 'الهاتف', type: 'single' },
    { k: 'contact_whatsapp', label: 'واتساب', type: 'single' },
    { k: 'contact_location', label: 'العنوان', type: 'text' },
    { k: 'footer_text', label: 'نص التذييل', type: 'area' },
  ];
  const save = async () => {
    setBusy(true); setMsg('');
    try {
      const links = (form.social_posts?.ar ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (links.some((value) => !/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[a-zA-Z0-9_-]+\/?(?:\?.*)?$/.test(value))) {
        setMsg('تأكدي أن كل سطر رابط منشور صحيح على Instagram.');
        return;
      }
      const rows = Object.entries(form).map(([key, v]) => ({ key, value_ar: v.ar, value_en: v.en }));
      await backendRequest('site_settings', {
        method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(rows),
      });
      setMsg('تم الحفظ — الموقع تحدث فورًا.');
      reload();
    } catch (error) { setMsg(error instanceof Error ? error.message : 'تعذر الحفظ.'); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4">
      <p className="rounded-2xl bg-secondary/70 p-4 text-sm">كل كلمة وصورة وفيديو في الموقع تتغير من هنا: الواجهة، من نحن، الدعوة الأخيرة، ومعلومات التواصل. الحفظ يظهر فورًا للزوار.</p>
      {keys.map(({ k, label, type }) => (
        <div key={k} className="rounded-2xl border p-4">
          <div className="mb-2 text-sm font-bold">{label}</div>
          {type === 'image' ? (
            <MediaField label={label} value={form[k]?.ar ?? ''} onChange={(v) => setForm((p) => ({ ...p, [k]: { ar: v, en: v } }))} />
          ) : type === 'urls' ? (
            <textarea aria-label={label} value={form[k]?.ar ?? ''} onChange={(e) => setForm((p) => ({ ...p, [k]: { ar: e.target.value, en: e.target.value } }))}
              rows={7} dir="ltr" placeholder="https://www.instagram.com/p/…" className={areaCls} />
          ) : type === 'single' ? (
            <input aria-label={label} value={form[k]?.ar ?? ''} onChange={(e) => set(k, 'ar', e.target.value)} dir="ltr" className={inputCls} />
          ) : type === 'area' ? (
            <div className="grid gap-2 md:grid-cols-2">
              <textarea aria-label={`${label} عربي`} value={form[k]?.ar ?? ''} onChange={(e) => set(k, 'ar', e.target.value)} rows={3} className={areaCls} />
              <textarea aria-label={`${label} English`} value={form[k]?.en ?? ''} onChange={(e) => set(k, 'en', e.target.value)} rows={3} dir="ltr" className={areaCls} />
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <input aria-label={`${label} عربي`} value={form[k]?.ar ?? ''} onChange={(e) => set(k, 'ar', e.target.value)} className={inputCls} />
              <input aria-label={`${label} English`} value={form[k]?.en ?? ''} onChange={(e) => set(k, 'en', e.target.value)} dir="ltr" className={inputCls} />
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button busy={busy} size="lg" onClick={save}>حفظ كل التغييرات</Button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}

// ---------- Courses ----------
function CoursesManager() {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cats, setCats] = useState<Record<string, unknown>[]>([]);
  const [trainers, setTrainers] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = async () => {
    setRows(await loadTable<Record<string, unknown>>('courses', 'start_date', true));
    setCats(await loadTable<Record<string, unknown>>('categories', 'sort_order', true));
    setTrainers(await loadTable<Record<string, unknown>>('admin_trainers', 'sort_order', true));
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!editing) return;
    if (!String(editing.title_ar ?? '').trim()) { setErr('العنوان بالعربية مطلوب'); return; }
    setBusy(true); setErr('');
    try {
      const row = { ...editing };
      if (!String(row.slug ?? '').trim()) row.slug = slug(String(row.title_en || row.title_ar));
      if (typeof row.outcomes === 'string') {
        try { row.outcomes = JSON.parse(String(row.outcomes)); } catch { row.outcomes = String(row.outcomes).split('\n').filter(Boolean).map((s) => ({ ar: s, en: s })); }
      }
      if (row.price === '' || row.price === undefined) row.price = 0;
      if (row.hours === '' || row.hours === undefined) row.hours = 0;
      const id = row.id as number | undefined;
      const copy = { ...row };
      delete copy.id; delete copy.trainers;
      await upsertRow('courses', copy, id);
      setEditing(null);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الحفظ'); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-4 flex justify-between"><h3 className="text-xl font-bold">الدورات ({rows.length})</h3>
        <Button size="sm" onClick={() => setEditing({ published: true, registration_open: true, featured: false, method: 'online', hours: 0, price: 0, outcomes: [] })}>+ دورة جديدة</Button></div>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={String(r.id)} className="flex items-center gap-3 rounded-2xl border p-3">
            {String(r.cover_url ?? '') && <img src={String(r.cover_url)} alt="" className="size-14 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{String(r.title_ar)}</div>
              <div className="text-xs text-muted-foreground">{String(r.slug)} · {r.published ? 'منشورة' : 'مسودة'}{r.featured ? ' · مميزة' : ''}</div>
            </div>
            <Button size="sm" variant="gray" onClick={() => setEditing({ ...r })}>تعديل</Button>
            <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف هذه الدورة؟')) { await deleteRow('courses', Number(r.id)); load(); } }}>حذف</Button>
          </div>
        ))}
      </div>
      {editing && (
        <EditorShell title={editing.id ? 'تعديل دورة' : 'دورة جديدة'} onClose={() => setEditing(null)} onSave={save} busy={busy}>
          <BiFields prefix="title" row={editing} setRow={setEditing} label="العنوان" />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="الرابط (slug)"><input value={String(editing.slug ?? '')} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} dir="ltr" className={inputCls} /></Field>
            <Field label="التصنيف">
              <select value={String(editing.category ?? '')} onChange={(e) => setEditing({ ...editing, category: e.target.value || null })} className={inputCls}>
                <option value="">—</option>
                {cats.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name_ar)}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="المدرب">
              <select value={editing.trainer_id === null || editing.trainer_id === undefined ? '' : String(editing.trainer_id)} onChange={(e) => setEditing({ ...editing, trainer_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                <option value="">—</option>
                {trainers.map((t) => <option key={String(t.id)} value={String(t.id)}>{String(t.name_ar)}</option>)}
              </select>
            </Field>
            <Field label="طريقة التدريب">
              <select value={String(editing.method ?? 'online')} onChange={(e) => setEditing({ ...editing, method: e.target.value })} className={inputCls}>
                <option value="online">إلكتروني</option><option value="onsite">حضوري</option><option value="hybrid">مدمج</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Field label="الساعات"><input type="number" value={String(editing.hours ?? 0)} onChange={(e) => setEditing({ ...editing, hours: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="السعر (0=مجاني)"><input type="number" value={String(editing.price ?? 0)} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="المقاعد"><input type="number" value={editing.capacity === null || editing.capacity === undefined ? '' : String(editing.capacity)} onChange={(e) => setEditing({ ...editing, capacity: e.target.value ? Number(e.target.value) : null })} className={inputCls} /></Field>
            <Field label="البدء"><input type="date" value={String(editing.start_date ?? '')} onChange={(e) => setEditing({ ...editing, start_date: e.target.value || null })} className={inputCls} /></Field>
          </div>
          <BiFields prefix="level" row={editing} setRow={setEditing} label="المستوى" />
          <BiArea prefix="summary" row={editing} setRow={setEditing} label="الوصف المختصر" />
          <BiArea prefix="description" row={editing} setRow={setEditing} label="الوصف الكامل" />
          <BiArea prefix="audience" row={editing} setRow={setEditing} label="الفئة المستهدفة" />
          <Field label="ماذا سيتعلم؟ (سطر لكل نقطة: عربي | English)">
            <textarea value={Array.isArray(editing.outcomes) ? (editing.outcomes as { ar: string; en: string }[]).map((o) => `${o.ar} | ${o.en}`).join('\n') : String(editing.outcomes ?? '')}
              onChange={(e) => setEditing({ ...editing, outcomes: e.target.value.split('\n').filter(Boolean).map((line) => { const [a, b] = line.split('|'); return { ar: (a ?? '').trim(), en: (b ?? a ?? '').trim() }; }) })}
              rows={3} className={areaCls} />
          </Field>
          <MediaField label="صورة الغلاف" value={String(editing.cover_url ?? '')} onChange={(v) => setEditing({ ...editing, cover_url: v || null })} />
          <MediaField label="فيديو الدورة (يوتيوب أو درايف أو mp4)" value={String(editing.video_url ?? '')} onChange={(v) => setEditing({ ...editing, video_url: v || null })} />
          <div className="flex flex-wrap gap-4">
            {[['published', ar ? 'منشورة' : 'Published'], ['registration_open', 'التسجيل مفتوح'], ['featured', 'مميزة في الرئيسية']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editing[k])} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} className="size-4" />{l}</label>
            ))}
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
        </EditorShell>
      )}
    </div>
  );
}

// ---------- Trainers ----------
function TrainerCourses({ trainerId }: { trainerId: number }) {
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [pick, setPick] = useState('');
  const load = async () => setCourses(await loadTable<Record<string, unknown>>('courses', 'start_date', true));
  useEffect(() => { load(); }, []);
  const assigned = courses.filter((c) => Number(c.trainer_id) === trainerId);
  const free = courses.filter((c) => Number(c.trainer_id) !== trainerId);
  return (
    <div className="mt-2 rounded-xl bg-secondary/40 p-3">
      <div className="mb-2 text-sm font-bold">دورات هذا المدرب ({assigned.length})</div>
      <div className="flex flex-wrap gap-2">
        {assigned.map((c) => (
          <span key={String(c.id)} className="flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs shadow">
            {String(c.title_ar)}
            <button onClick={async () => { await upsertRow('courses', { trainer_id: null }, Number(c.id)); load(); }} className="text-red-500" aria-label="remove">✕</button>
          </span>
        ))}
        {assigned.length === 0 && <span className="text-xs text-muted-foreground">لا دورات مسندة بعد.</span>}
      </div>
      {free.length > 0 && (
        <div className="mt-2 flex gap-2">
          <select aria-label="اسناد دورة" value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 min-w-0 flex-1 rounded-full border bg-card px-2 text-xs">
            <option value="">اسند دورة…</option>
            {free.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.title_ar)}</option>)}
          </select>
          <Button size="sm" onClick={async () => { if (!pick) return; await upsertRow('courses', { trainer_id: trainerId }, Number(pick)); setPick(''); load(); }}>اسناد</Button>
        </div>
      )}
    </div>
  );
}

function TrainersManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const load = async () =>   setRows(await loadTable<Record<string, unknown>>('admin_trainers', 'sort_order', true));
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!editing) return;
    if (!String(editing.name_ar ?? '').trim()) { setErr('الاسم بالعربية مطلوب'); return; }
    setBusy(true); setErr('');
    try {
      const row = { ...editing };
      if (!String(row.slug ?? '').trim()) row.slug = slug(String(row.name_en || row.name_ar));
      if (!String(row.initials ?? '').trim()) row.initials = String(row.name_ar).slice(0, 2);
      const id = row.id as number | undefined;
      const copy = { ...row };
      delete copy.id;
      await upsertTrainer(copy, id);
      setEditing(null); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'تعذر الحفظ'); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="mb-4 flex justify-between"><h3 className="text-xl font-bold">المدربون ({rows.length})</h3>
        <Button size="sm" onClick={() => setEditing({ published: true, sort_order: rows.length + 1, initials: '' })}>+ مدرب جديد</Button></div>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={String(r.id)} className="rounded-2xl border p-3">
            <div className="flex items-center gap-2">
              <img src={String(r.photo_url || '/images/trainer-1.jpg')} alt="" className="size-14 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1"><div className="truncate font-bold">{String(r.name_ar)}</div>
                <div className="truncate text-xs text-muted-foreground" dir="ltr">{String(r.account_email ?? '')} · {r.published ? 'منشور' : 'مخفي'}</div></div>
              <Button size="sm" variant="gray" aria-label={`دورات ${String(r.name_ar)}`} onClick={() => setOpenId(openId === Number(r.id) ? null : Number(r.id))}>دوراته</Button>
              <Button size="sm" variant="gray" aria-label={`تعديل ${String(r.name_ar)}`} onClick={() => setEditing({ ...r })}>تعديل</Button>
              <Button size="sm" variant="gray" aria-label={`حذف ${String(r.name_ar)}`} onClick={async () => { if (confirm('حذف هذا المدرب؟')) { await deleteRow('trainers', Number(r.id)); load(); } }}>حذف</Button>
            </div>
            {openId === Number(r.id) && <TrainerCourses trainerId={Number(r.id)} />}
          </div>
        ))}
      </div>
      {editing && (
        <EditorShell title={editing.id ? 'تعديل مدرب' : 'مدرب جديد'} onClose={() => setEditing(null)} onSave={save} busy={busy}>
          <BiFields prefix="name" row={editing} setRow={setEditing} label="الاسم" />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="الرابط (slug)"><input value={String(editing.slug ?? '')} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} dir="ltr" className={inputCls} /></Field>
            <Field label="الأحرف الأولى"><input value={String(editing.initials ?? '')} onChange={(e) => setEditing({ ...editing, initials: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="إيميل حساب المدرب (يربطه ببوابة المدرب)"><input value={String(editing.account_email ?? '')} onChange={(e) => setEditing({ ...editing, account_email: e.target.value.trim() || null })} dir="ltr" placeholder="trainer@mail.com" className={inputCls} /></Field>
          <BiFields prefix="title" row={editing} setRow={setEditing} label="المسمى" />
          <BiArea prefix="bio" row={editing} setRow={setEditing} label="النبذة" />
          <BiArea prefix="qualifications" row={editing} setRow={setEditing} label="المؤهلات" />
          <MediaField label="الصورة الشخصية" value={String(editing.photo_url ?? '')} onChange={(v) => setEditing({ ...editing, photo_url: v || null })} />
          <MediaField label="فيديو تعريفي (يوتيوب أو درايف أو mp4)" value={String(editing.video_url ?? '')} onChange={(v) => setEditing({ ...editing, video_url: v || null })} />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="الترتيب"><input type="number" value={String(editing.sort_order ?? 0)} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editing.published)} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="size-4" />منشور</label>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
        </EditorShell>
      )}
    </div>
  );
}

function TeamManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = async () => {
    try {
      const all = await loadTable<Record<string, unknown>>('admin_trainers', 'sort_order', true);
      setRows(all.filter((row) => String(row.slug ?? '').startsWith('team-')));
      setErr('');
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'تعذر تحميل أعضاء الفريق');
    }
  };
  useEffect(() => { void load(); }, []);

  const importDefaults = async () => {
    setBusy(true);
    setErr('');
    try {
      const existing = new Set(rows.map((row) => String(row.slug ?? '')));
      for (const [index, member] of initialTeam.entries()) {
        const row = teamSeedRow(member, index);
        if (!existing.has(String(row.slug))) await upsertTrainer(row);
      }
      await saveSettings({ team_initialized: { ar: 'true', en: 'true' } });
      await load();
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'تعذر حفظ الفريق الافتراضي');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    const nameAr = String(editing.name_ar ?? '').trim();
    const nameEn = String(editing.name_en ?? '').trim();
    const titleAr = String(editing.title_ar ?? '').trim();
    const titleEn = String(editing.title_en ?? '').trim();
    const expAr = String(editing.experience_ar ?? '').trim();
    const expEn = String(editing.experience_en ?? '').trim();
    const bioAr = String(editing.bio_ar ?? '').trim();
    const bioEn = String(editing.bio_en ?? '').trim();
    const email = String(editing.account_email ?? '').trim();
    const linkedin = String(editing.linkedin ?? '').trim();
    const photo = String(editing.photo_url ?? '').trim();
    if (!nameAr || !nameEn || !titleAr || !titleEn || !expAr || !bioAr || !photo) {
      setErr('يرجى إدخال الاسم والمسمى والخبرة والنبذة والصورة.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(linkedin) && !safeHttpUrl(linkedin)) {
      setErr('رابط لينكدإن يجب أن يبدأ بـ http أو https.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const row: Record<string, unknown> = {
        slug: String(editing.slug || `team-${slug(nameEn || nameAr)}`).startsWith('team-')
          ? String(editing.slug || `team-${slug(nameEn || nameAr)}`)
          : `team-${slug(nameEn || nameAr)}`,
        name_ar: nameAr,
        name_en: nameEn,
        title_ar: titleAr,
        title_en: titleEn,
        qualifications_ar: expAr,
        qualifications_en: expEn || expAr,
        bio_ar: bioAr,
        bio_en: `${bioEn || bioAr}${linkedin ? `\n[LinkedIn: ${linkedin}]` : ''}`,
        account_email: email || null,
        photo_url: photo,
        initials: nameAr.slice(0, 2),
        published: Boolean(editing.published),
        sort_order: Number(editing.sort_order ?? rows.length + 1),
      };
      const id = editing.id as number | undefined;
      await upsertTrainer(row, id);
      await saveSettings({ team_initialized: { ar: 'true', en: 'true' } });
      setEditing(null);
      await load();
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'تعذر حفظ عضو الفريق');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Record<string, unknown>) => {
    if (!confirm(`حذف ${String(row.name_ar ?? 'عضو الفريق')}؟`)) return;
    setErr('');
    try {
      await deleteRow('trainers', Number(row.id));
      await saveSettings({ team_initialized: { ar: 'true', en: 'true' } });
      await load();
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : 'تعذر حذف عضو الفريق');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">فريق العمل ({rows.length})</h3>
          <p className="mt-1 text-sm text-muted-foreground">إدارة أعضاء الفريق الظاهرين في الموقع. التغييرات تحفظ في قاعدة البيانات.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gray" busy={busy} onClick={importDefaults}>اعتماد أعضاء الفريق الافتراضيين</Button>
          <Button size="sm" onClick={() => { setErr(''); setEditing({ published: true, sort_order: rows.length + 1, photo_url: '' }); }}>+ عضو جديد</Button>
        </div>
      </div>
      {err && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{err}</p>}
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={String(row.id)} className="flex flex-wrap items-center gap-3 rounded-2xl border p-3">
            <img src={String(row.photo_url || '/images/trainer-1.jpg')} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{String(row.name_ar ?? '')}</div>
              <div className="truncate text-xs text-muted-foreground">{String(row.title_ar ?? '')}</div>
              <div className="truncate text-xs text-muted-foreground" dir="ltr">{String(row.account_email ?? '')}</div>
            </div>
            <span className="text-xs text-muted-foreground">{row.published ? 'منشور' : 'مخفي'}</span>
            <Button size="sm" variant="gray" onClick={() => {
              const bioEn = String(row.bio_en ?? '');
              setErr('');
              setEditing({
                ...row,
                experience_ar: String(row.qualifications_ar ?? ''),
                experience_en: String(row.qualifications_en ?? ''),
                bio_en: withoutLinkedin(bioEn),
                linkedin: getLinkedin(bioEn) ?? '',
              });
            }}>تعديل</Button>
            <Button size="sm" variant="gray" onClick={() => void remove(row)}>حذف</Button>
          </div>
        ))}
        {rows.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا يوجد أعضاء محفوظون بعد. اعتمد الفريق الافتراضي أو أضف عضواً جديداً.</p>}
      </div>
      {editing && (
        <EditorShell title={editing.id ? 'تعديل عضو الفريق' : 'إضافة عضو للفريق'} onClose={() => setEditing(null)} onSave={() => void save()} busy={busy}>
          <BiFields prefix="name" row={editing} setRow={setEditing} label="الاسم" />
          <BiFields prefix="title" row={editing} setRow={setEditing} label="المنصب / التخصص" />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="سنوات الخبرة (عربي)">
              <input value={String(editing.experience_ar ?? '')} onChange={(e) => setEditing({ ...editing, experience_ar: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Experience (English)">
              <input value={String(editing.experience_en ?? '')} onChange={(e) => setEditing({ ...editing, experience_en: e.target.value })} dir="ltr" className={inputCls} />
            </Field>
          </div>
          <Field label="البريد الإلكتروني">
            <input type="email" value={String(editing.account_email ?? '')} onChange={(e) => setEditing({ ...editing, account_email: e.target.value })} dir="ltr" className={inputCls} />
          </Field>
          <Field label="LinkedIn (رابط أو اسم)">
            <input value={String(editing.linkedin ?? '')} onChange={(e) => setEditing({ ...editing, linkedin: e.target.value })} dir="ltr" className={inputCls} />
          </Field>
          <BiArea prefix="bio" row={editing} setRow={setEditing} label="النبذة والإنجازات" />
          <MediaField label="الصورة الشخصية" value={String(editing.photo_url ?? '')} onChange={(value) => setEditing({ ...editing, photo_url: value })} accept="image/*" />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="ترتيب العرض">
              <input type="number" value={String(editing.sort_order ?? 0)} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editing.published)} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="size-4" />منشور في الموقع</label>
          </div>
        </EditorShell>
      )}
    </div>
  );
}

// ---------- Generic simple managers ----------
function TrainerRequestsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('trainer_requests', 'created_at', false));
  useEffect(() => { load(); }, []);
  const accept = async (r: Record<string, unknown>) => {
    setBusyId(Number(r.id));
    try {
      const base = slug(String(r.full_name));
      const row = {
        slug: `${base}-${Date.now().toString(36)}`,
        name_ar: String(r.full_name), name_en: String(r.full_name),
        title_ar: String(r.specialty ?? ''), title_en: String(r.specialty ?? ''),
        bio_ar: String(r.bio ?? ''), bio_en: String(r.bio ?? ''),
        account_email: String(r.email).trim().toLowerCase(),
        initials: String(r.full_name).trim().slice(0, 2),
        published: true, sort_order: 99,
      };
      await upsertTrainer(row);
      await upsertRow('trainer_requests', { status: 'accepted' }, Number(r.id));
      await load();
    } finally { setBusyId(null); }
  };
  return (
    <div>
      <h3 className="mb-1 text-xl font-bold">طلبات المدربين ({rows.length})</h3>
      <p className="mb-4 text-sm text-muted-foreground">القبول بينشئ ملف مدرب مربوط بإيميله — بعدها بيقدر يعمل حساب بنفس الإيميل ويفوت بوابة المدرب. ربط الدورات بيكون من تبويب المدربين (دوراته) أو من كل دورة.</p>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={String(r.id)} className={`rounded-2xl border p-4 ${String(r.status) === 'new' ? 'border-[var(--accent)]' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{String(r.full_name)}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">{String(r.email)} {String(r.phone ?? '')}</span>
              <span className="flex-1" />
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">{String(r.status) === 'new' ? 'جديد' : String(r.status) === 'reviewing' ? 'قيد المراجعة' : String(r.status) === 'accepted' ? 'مقبول' : 'مرفوض'}</span>
            </div>
            {(String(r.specialty ?? '') || String(r.bio ?? '')) && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{[r.specialty, r.bio].filter(Boolean).join('\n')}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {String(r.status) !== 'accepted' && (
                <Button size="sm" busy={busyId === Number(r.id)} onClick={() => accept(r)}>قبول وإنشاء مدرب</Button>
              )}
              {String(r.status) === 'new' && (
                <Button size="sm" variant="gray" onClick={async () => { await upsertRow('trainer_requests', { status: 'reviewing' }, Number(r.id)); load(); }}>قيد المراجعة</Button>
              )}
              {String(r.status) !== 'rejected' && String(r.status) !== 'accepted' && (
                <Button size="sm" variant="gray" onClick={async () => { await upsertRow('trainer_requests', { status: 'rejected' }, Number(r.id)); load(); }}>رفض</Button>
              )}
              <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف؟')) { await deleteRow('trainer_requests', Number(r.id)); load(); } }}>حذف</Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">لا طلبات.</p>}
      </div>
    </div>
  );
}

function CatsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('categories', 'sort_order', true));
  useEffect(() => { load(); }, []);
  const [f, setF] = useState({ id: '', ar: '', en: '' });
  return (
    <div>
      <h3 className="mb-4 text-xl font-bold">التصنيفات</h3>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={String(r.id)} className="flex items-center gap-2 rounded-2xl border p-3">
            <span className="font-bold">{String(r.name_ar)} / {String(r.name_en)}</span>
            <span className="text-xs text-muted-foreground" dir="ltr">{String(r.id)}</span>
            <span className="flex-1" />
            <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف؟')) { await deleteRow('categories', String(r.id), true); load(); } }}>حذف</Button>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 rounded-2xl border p-4 md:grid-cols-4">
        <input value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} placeholder="المعرف بالإنجليزية" dir="ltr" className={inputCls} />
        <input value={f.ar} onChange={(e) => setF({ ...f, ar: e.target.value })} placeholder="عربي" className={inputCls} />
        <input value={f.en} onChange={(e) => setF({ ...f, en: e.target.value })} placeholder="English" dir="ltr" className={inputCls} />
        <Button onClick={async () => { if (!f.id.trim() || !f.ar.trim()) return; await upsertRow('categories', { id: f.id.trim(), name_ar: f.ar, name_en: f.en || f.ar, sort_order: rows.length }); setF({ id: '', ar: '', en: '' }); load(); }}>إضافة</Button>
      </div>
    </div>
  );
}

function PostsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [kind, setKind] = useState('news');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('posts', 'date', false));
  useEffect(() => { load(); }, []);
  const kinds = [['news', 'أخبار'], ['blog', 'مدونة'], ['success', 'قصص نجاح'], ['announcement', 'إعلانات']];
  const list = rows.filter((r) => String(r.kind) === kind);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {kinds.map(([id, l]) => <button key={id} onClick={() => setKind(id)} className={`rounded-full px-4 py-2 text-sm ${kind === id ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>{l}</button>)}
        <span className="flex-1" />
        <Button size="sm" onClick={() => setEditing({ kind, published: true, date: new Date().toISOString().slice(0, 10) })}>+ جديد</Button>
      </div>
      <div className="grid gap-3">
        {list.map((r) => (
          <div key={String(r.id)} className="flex items-center gap-3 rounded-2xl border p-3">
            {String(r.cover_url ?? '') && <img src={String(r.cover_url)} alt="" className="size-14 rounded-xl object-cover" />}
            <div className="min-w-0 flex-1"><div className="truncate font-bold">{String(r.title_ar)}</div><div className="text-xs text-muted-foreground">{String(r.date)} · {r.published ? 'منشور' : 'مسودة'}</div></div>
            <Button size="sm" variant="gray" onClick={() => setEditing({ ...r })}>تعديل</Button>
            <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف؟')) { await deleteRow('posts', Number(r.id)); load(); } }}>حذف</Button>
          </div>
        ))}
      </div>
      {editing && (
        <EditorShell title="مقال" onClose={() => setEditing(null)} busy={busy} onSave={async () => {
          setBusy(true);
          try {
            const row = { ...editing };
            if (!String(row.slug ?? '').trim()) row.slug = slug(String(row.title_en || row.title_ar));
            const id = row.id as number | undefined;
            delete row.id;
            await upsertRow('posts', row, id);
            setEditing(null); load();
          } finally { setBusy(false); }
        }}>
          <BiFields prefix="title" row={editing} setRow={setEditing} label="العنوان" />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="الرابط"><input value={String(editing.slug ?? '')} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} dir="ltr" className={inputCls} /></Field>
            <Field label="التاريخ"><input type="date" value={String(editing.date ?? '')} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="الكاتب"><input value={String(editing.author ?? '')} onChange={(e) => setEditing({ ...editing, author: e.target.value })} className={inputCls} /></Field>
          <BiArea prefix="excerpt" row={editing} setRow={setEditing} label="الملخص" />
          <BiArea prefix="content" row={editing} setRow={setEditing} label="المحتوى" />
          <MediaField label="صورة الغلاف" value={String(editing.cover_url ?? '')} onChange={(v) => setEditing({ ...editing, cover_url: v || null })} />
          <MediaField label="فيديو (يوتيوب أو درايف أو mp4)" value={String(editing.video_url ?? '')} onChange={(v) => setEditing({ ...editing, video_url: v || null })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editing.published)} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="size-4" />منشور</label>
        </EditorShell>
      )}
    </div>
  );
}

function EventsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [kind, setKind] = useState('workshop');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('events', 'starts_at', false));
  useEffect(() => { load(); }, []);
  const list = rows.filter((r) => String(r.kind) === kind);
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {[['workshop', 'ورشات'], ['event', 'فعاليات']].map(([id, l]) => <button key={id} onClick={() => setKind(id)} className={`rounded-full px-4 py-2 text-sm ${kind === id ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>{l}</button>)}
        <span className="flex-1" />
        <Button size="sm" onClick={() => setEditing({ kind, published: true, registration_open: true })}>+ جديد</Button>
      </div>
      <div className="grid gap-3">
        {list.map((r) => (
          <div key={String(r.id)} className="flex items-center gap-3 rounded-2xl border p-3">
            <div className="min-w-0 flex-1"><div className="truncate font-bold">{String(r.title_ar)}</div><div className="text-xs text-muted-foreground">{String(r.starts_at ?? '')} · {String(r.location ?? '')}</div></div>
            <Button size="sm" variant="gray" onClick={() => setEditing({ ...r })}>تعديل</Button>
            <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف؟')) { await deleteRow('events', Number(r.id)); load(); } }}>حذف</Button>
          </div>
        ))}
      </div>
      {editing && (
        <EditorShell title="فعالية / ورشة" onClose={() => setEditing(null)} busy={busy} onSave={async () => {
          setBusy(true);
          try {
            const row = { ...editing };
            if (!String(row.slug ?? '').trim()) row.slug = slug(String(row.title_en || row.title_ar));
            if (row.starts_at === '') row.starts_at = null;
            const id = row.id as number | undefined;
            delete row.id;
            await upsertRow('events', row, id);
            setEditing(null); load();
          } finally { setBusy(false); }
        }}>
          <BiFields prefix="title" row={editing} setRow={setEditing} label="العنوان" />
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="الرابط"><input value={String(editing.slug ?? '')} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} dir="ltr" className={inputCls} /></Field>
            <Field label="الموعد"><input type="datetime-local" value={editing.starts_at ? String(editing.starts_at).slice(0, 16) : ''} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inputCls} /></Field>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="المكان / رابط اللقاء"><input value={String(editing.location ?? '')} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className={inputCls} /></Field>
            <Field label="المتحدث"><input value={String(editing.speaker ?? '')} onChange={(e) => setEditing({ ...editing, speaker: e.target.value })} className={inputCls} /></Field>
          </div>
          <BiArea prefix="summary" row={editing} setRow={setEditing} label="الملخص" />
          <BiArea prefix="description" row={editing} setRow={setEditing} label="الوصف" />
          <MediaField label="صورة الغلاف" value={String(editing.cover_url ?? '')} onChange={(v) => setEditing({ ...editing, cover_url: v || null })} />
          <MediaField label="فيديو" value={String(editing.video_url ?? '')} onChange={(v) => setEditing({ ...editing, video_url: v || null })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editing.published)} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} className="size-4" />منشور</label>
        </EditorShell>
      )}
    </div>
  );
}

function EnrollManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('enrollments', 'created_at', false));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h3 className="mb-4 text-xl font-bold">طلبات التسجيل ({rows.length})</h3>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={String(r.id)} className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
            <div className="min-w-40 flex-1"><div className="font-bold">{String(r.user_name || r.user_email || r.user_id)}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{String(r.user_email ?? '')}</div></div>
            <select aria-label="حالة التسجيل" value={String(r.status)} onChange={async (e) => { await upsertRow('enrollments', { status: e.target.value }, Number(r.id)); load(); }} className="h-10 rounded-full border bg-card px-3 text-sm">
              {['pending', 'approved', 'rejected', 'completed'].map((s) => <option key={s} value={s}>{s === 'pending' ? 'معلق' : s === 'approved' ? 'مقبول' : s === 'rejected' ? 'مرفوض' : 'مكتمل'}</option>)}
            </select>
            <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف؟')) { await deleteRow('enrollments', Number(r.id)); load(); } }}>حذف</Button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">لا طلبات بعد.</p>}
      </div>
    </div>
  );
}

function CertsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setRows(await loadTable<Record<string, unknown>>('certificates', 'issued_on', false));
    setCourses(await loadTable<Record<string, unknown>>('courses', 'start_date', true));
  };
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="mb-4 flex justify-between"><h3 className="text-xl font-bold">الشهادات ({rows.length})</h3>
        <Button size="sm" onClick={() => setEditing({ code: '', issued_on: new Date().toISOString().slice(0, 10) })}>+ شهادة</Button></div>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={String(r.id)} className="flex items-center gap-2 rounded-2xl border p-3">
            <span dir="ltr" className="font-mono text-sm">{String(r.code)}</span>
            <span className="font-bold">{String(r.holder_name_ar)}</span>
            <span className="flex-1" />
            <Button size="sm" variant="gray" onClick={() => setEditing({ ...r })}>تعديل</Button>
            <Button size="sm" variant="gray" onClick={async () => { if (confirm('حذف؟')) { await deleteRow('certificates', Number(r.id)); load(); } }}>حذف</Button>
          </div>
        ))}
      </div>
      {editing && (
        <EditorShell title="شهادة" onClose={() => setEditing(null)} busy={busy} onSave={async () => {
          setBusy(true);
          try {
            const row = { ...editing };
            const id = row.id as number | undefined;
            delete row.id;
            await upsertRow('certificates', row, id);
            setEditing(null); load();
          } finally { setBusy(false); }
        }}>
          <Field label="رمز التحقق (فريد لكل شهادة)">
            <div className="flex gap-2">
              <input value={String(editing.code ?? '')} readOnly placeholder="يُولّد تلقائياً عند الحفظ" dir="ltr" className={`${inputCls} font-mono`} />
              <Button size="sm" variant="gray" onClick={() => setEditing({ ...editing, code: '' })}>رمز جديد</Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">اتركه فارغاً ليولّد الموقع رمزاً فريداً لا يتكرر، أو اضغط رمز جديد لاستبداله.</p>
          </Field>
          <BiFields prefix="holder_name" row={editing} setRow={setEditing} label="اسم الحاصل" />
          <Field label="معرف الطالب (user_id) — ليرى شهادته في حسابه">
            <input value={String(editing.user_id ?? '')} onChange={(e) => setEditing({ ...editing, user_id: e.target.value || null })} dir="ltr" placeholder="الصقه من حساب الطالب" className={`${inputCls} font-mono`} />
          </Field>
          <Field label="الدورة">
            <select value={editing.course_id === null || editing.course_id === undefined ? '' : String(editing.course_id)} onChange={(e) => setEditing({ ...editing, course_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
              <option value="">—</option>
              {courses.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.title_ar)}</option>)}
            </select>
          </Field>
          <Field label="تاريخ الإصدار"><input type="date" value={String(editing.issued_on ?? '')} onChange={(e) => setEditing({ ...editing, issued_on: e.target.value })} className={inputCls} /></Field>
        </EditorShell>
      )}
    </div>
  );
}

function MsgsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('contact_messages', 'created_at', false));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h3 className="mb-4 text-xl font-bold">رسائل التواصل ({rows.length})</h3>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={String(r.id)} className={`rounded-2xl border p-4 ${!r.handled ? 'border-[var(--accent)]' : ''}`}>
            <div className="flex items-center gap-2"><span className="font-bold">{String(r.name)}</span>
              <a href={`mailto:${String(r.email)}`} className="text-xs text-[var(--brand-text)]" dir="ltr">{String(r.email)}</a><span className="flex-1" />
              <button onClick={async () => { await upsertRow('contact_messages', { handled: !r.handled }, Number(r.id)); load(); }}
                className={`rounded-full px-3 py-1 text-xs ${r.handled ? 'bg-secondary' : 'bg-[var(--brand)] text-[var(--brand-ink)]'}`}>{r.handled ? 'تمت' : 'جديدة'}</button>
              <button onClick={async () => { if (confirm('حذف؟')) { await deleteRow('contact_messages', Number(r.id)); load(); } }} className="text-xs text-red-500">حذف</button></div>
            <p className="mt-2 whitespace-pre-line text-sm">{String(r.message)}</p>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">لا رسائل.</p>}
      </div>
    </div>
  );
}

function VolsManager() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const load = async () => setRows(await loadTable<Record<string, unknown>>('volunteer_applications', 'created_at', false));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h3 className="mb-4 text-xl font-bold">طلبات التطوع ({rows.length})</h3>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={String(r.id)} className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{String(r.full_name)}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">{String(r.email)} {String(r.phone ?? '')}</span><span className="flex-1" />
              <select aria-label="حالة الطلب" value={String(r.status)} onChange={async (e) => { await upsertRow('volunteer_applications', { status: e.target.value }, Number(r.id)); load(); }} className="h-9 rounded-full border px-2 text-xs">
                {[['new', 'جديد'], ['reviewing', 'قيد المراجعة'], ['accepted', 'مقبول'], ['rejected', 'مرفوض']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={async () => { if (confirm('حذف؟')) { await deleteRow('volunteer_applications', Number(r.id)); load(); } }} className="text-xs text-red-500">حذف</button></div>
            <details className="mt-2"><summary className="cursor-pointer text-sm text-[var(--brand-text)]">التفاصيل</summary>
              <p className="mt-1 whitespace-pre-line text-xs">{[r.university, r.major, r.city, r.department, r.skills, r.experience, r.motivation].filter(Boolean).join('\n')}</p></details>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">لا طلبات.</p>}
      </div>
    </div>
  );
}

function AdminsManager() {
  const [rows, setRows] = useState<{ email: string }[]>([]);
  const [email, setEmail] = useState('');
  const load = async () => {
    try {
      const res = await backendRequest('site_admins?select=*');
      setRows(await res.json());
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h3 className="mb-2 text-xl font-bold">المشرفون</h3>
      <p className="mb-4 text-sm text-muted-foreground">هذه الإيميلات فقط تفتح لوحة الإدارة. أضف إيميل المشرف هنا، ثم عليه إنشاء حساب بنفس الإيميل وتأكيده بالكود.</p>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.email} className="flex items-center gap-2 rounded-2xl border p-3">
            <span dir="ltr">{r.email}</span><span className="flex-1" />
            <button onClick={async () => { if (rows.length <= 1) { alert('لا يمكن حذف آخر مشرف'); return; } if (confirm('إزالة؟')) { await deleteRow('site_admins', r.email, true); load(); } }} className="text-xs text-red-500">إزالة</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mail.com" dir="ltr" className={inputCls} />
        <Button onClick={async () => {
          if (!email.includes('@')) return;
          await backendRequest('site_admins', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
          setEmail(''); load();
        }}>إضافة</Button>
      </div>
    </div>
  );
}

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function StatsManager() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [enroll, setEnroll] = useState<Record<string, unknown>[]>([]);
  const [certs, setCerts] = useState<Record<string, unknown>[]>([]);
  const [views, setViews] = useState<Record<string, unknown>[]>([]);
  const [msgs, setMsgs] = useState<Record<string, unknown>[]>([]);
  const [vols, setVols] = useState<Record<string, unknown>[]>([]);
  const [treqs, setTreqs] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const [c, e, ce, v, m, vo, t] = await Promise.all([
          loadTable<Record<string, unknown>>('courses', 'start_date', true),
          loadTable<Record<string, unknown>>('enrollments', 'created_at', false),
          loadTable<Record<string, unknown>>('certificates', 'issued_on', false),
          loadTable<Record<string, unknown>>('page_views', 'created_at', false).catch(() => [] as Record<string, unknown>[]),
          loadTable<Record<string, unknown>>('contact_messages', 'created_at', false),
          loadTable<Record<string, unknown>>('volunteer_applications', 'created_at', false),
          loadTable<Record<string, unknown>>('trainer_requests', 'created_at', false),
        ]);
        setCourses(c); setEnroll(e); setCerts(ce); setViews(v); setMsgs(m); setVols(vo); setTreqs(t);
      } catch { /* tables a role may not read stay empty */ } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <p className="text-muted-foreground">…</p>;
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const last14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (13 - i)); return day(d); });
  const byDay = new Map<string, number>();
  for (const v of views) { const k = day(new Date(String(v.created_at))); byDay.set(k, (byDay.get(k) ?? 0) + 1); }
  const maxDay = Math.max(1, ...last14.map((d) => byDay.get(d) ?? 0));
  const last30 = views.filter((v) => Date.now() - new Date(String(v.created_at)).getTime() < 30 * 86400000).length;
  const byPath = new Map<string, number>();
  for (const v of views) byPath.set(String(v.path), (byPath.get(String(v.path)) ?? 0) + 1);
  const topPaths = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const students = new Set(enroll.map((e) => String(e.user_id)));
  const st = (s: string) => enroll.filter((e) => String(e.status) === s).length;
  const courseName = (id: unknown) => { const c = courses.find((x) => String(x.id) === String(id)); return c ? String(c.title_ar) : `#${String(id)}`; };
  const cards: [string, number][] = [
    ['الطلاب المسجلون', students.size], ['زيارات آخر ٣٠ يوم', last30], ['تسجيلات معلقة', st('pending')],
    ['الشهادات الصادرة', certs.length], ['رسائل جديدة', msgs.filter((m) => !m.handled).length], ['طلبات تطوع', vols.length],
  ];
  const studentsCsv = enroll.map((e) => ({ student: String(e.user_name ?? e.user_email ?? e.user_id ?? ''), email: String(e.user_email ?? ''), course: courseName(e.course_id), status: String(e.status ?? ''), date: String(e.created_at ?? '').slice(0, 10) }));
  const stamp = day(today);
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([l, n]) => (
          <Card key={l}><div className="text-4xl font-extrabold text-[var(--brand-text)]">{n}</div><div className="mt-1 text-muted-foreground">{l}</div></Card>
        ))}
      </div>
      <div className="rounded-3xl border p-5">
        <h4 className="font-bold">الدورات: من مسجل ومن أنهى</h4>
        <div className="mt-3 grid gap-2">
          {courses.length === 0 && <p className="text-sm text-muted-foreground">لا دورات بعد.</p>}
          {courses.map((c) => {
            const mine = enroll.filter((e) => String(e.course_id) === String(c.id));
            const done = mine.filter((e) => String(e.status) === 'completed').length;
            const ok = mine.filter((e) => String(e.status) === 'approved' || String(e.status) === 'completed').length;
            return (
              <div key={String(c.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-secondary/50 px-4 py-3">
                <span className="min-w-40 flex-1 font-bold">{String(c.title_ar)}</span>
                <span className="text-sm text-muted-foreground">مسجلون {mine.length}</span>
                <span className="text-sm text-muted-foreground">مقبولون {ok}</span>
                <span className="text-sm text-muted-foreground">مكتملون {done}</span>
                <span className="text-sm text-muted-foreground">شهادات {certs.filter((x) => String(x.course_id) === String(c.id)).length}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-3xl border p-5">
        <h4 className="font-bold">زيارات آخر ١٤ يوم ({views.length} إجمالًا)</h4>
        {views.length === 0
          ? <p className="mt-2 text-sm text-muted-foreground">بدأ العدّاد من اليوم: كل زيارة لصفحة تُحسب مرة واحدة. عودي غدًا وسترين الأعمدة هنا.</p>
          : <>
            <div className="mt-4 flex h-28 items-end gap-1.5" dir="ltr">
              {last14.map((d) => (
                <div key={d} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d}: ${byDay.get(d) ?? 0}`}>
                  <div className="w-full rounded-t-lg bg-[var(--brand)]" style={{ height: `${Math.max(4, Math.round(((byDay.get(d) ?? 0) / maxDay) * 100))}%` }} />
                  <span className="text-xs text-muted-foreground">{d.slice(5)}</span>
                </div>
              ))}
            </div>
            {topPaths.length > 0 && <div className="mt-3 grid gap-1 text-sm text-muted-foreground">{topPaths.map(([p, n]) => <div key={p} className="flex justify-between" dir="ltr"><span className="font-mono">{p}</span><span>{n}</span></div>)}</div>}
          </>}
      </div>
      <div className="rounded-3xl border p-5">
        <h4 className="font-bold">تنزيل البيانات (ملف إكسل CSV)</h4>
        <p className="mt-1 text-sm text-muted-foreground">يفتح مباشرة في إكسل مع دعم العربية. حمّليه متى شئت لتلخيص معلومات مؤسستك.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="gray" disabled={!studentsCsv.length} onClick={() => downloadCsv(`students-${stamp}.csv`, studentsCsv)}>الطلاب والتسجيلات ({enroll.length})</Button>
          <Button size="sm" variant="gray" disabled={!certs.length} onClick={() => downloadCsv(`certificates-${stamp}.csv`, certs)}>الشهادات ({certs.length})</Button>
          <Button size="sm" variant="gray" disabled={!msgs.length} onClick={() => downloadCsv(`messages-${stamp}.csv`, msgs)}>الرسائل ({msgs.length})</Button>
          <Button size="sm" variant="gray" disabled={!vols.length} onClick={() => downloadCsv(`volunteers-${stamp}.csv`, vols)}>المتطوعون ({vols.length})</Button>
          <Button size="sm" variant="gray" disabled={!treqs.length} onClick={() => downloadCsv(`trainer-requests-${stamp}.csv`, treqs)}>طلبات المدربين ({treqs.length})</Button>
          <Button size="sm" variant="gray" disabled={!views.length} onClick={() => downloadCsv(`visits-${stamp}.csv`, views)}>الزيارات ({views.length})</Button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ courses: 0, trainers: 0, enroll: 0, msgs: 0, vols: 0, certs: 0 });
  useEffect(() => {
    (async () => {
      const count = async (t: string) => {
        try {
          const res = await backendRequest(`${t}?select=id`, { headers: { Prefer: 'count=exact' } });
          const c = res.headers.get('content-range');
          const m = c?.match(/\/(\d+)/);
          return m ? Number(m[1]) : 0;
        } catch { return 0; }
      };
      setStats({
        courses: await count('courses'), trainers: await count('trainers'), enroll: await count('enrollments'),
        msgs: await count('contact_messages'), vols: await count('volunteer_applications'), certs: await count('certificates'),
      });
    })();
  }, []);
  const cards = [
    ['الدورات', stats.courses], ['المدربون', stats.trainers], ['التسجيلات', stats.enroll],
    ['رسائل جديدة', stats.msgs], ['طلبات تطوع', stats.vols], ['شهادات', stats.certs],
  ];
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([l, n]) => (
          <Card key={l as string}><div className="text-4xl font-extrabold text-[var(--brand-text)]">{n}</div><div className="mt-1 text-muted-foreground">{l}</div></Card>
        ))}
      </div>
      <div className="mt-6 rounded-3xl bg-secondary/60 p-6">
        <h4 className="font-bold">كيف تعدل الموقع؟</h4>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
          <li>• النصوص والصور والفيديو: تبويب «نصوص وصور وفيديو الموقع» — كل شيء يتغير فورًا.</li>
          <li>• الدورات والمدربون: افتح تبويبها، اضغط «تعديل»، غيّر الصورة أو الفيديو أو الكلام ثم احفظ.</li>
          <li>• الصورة: الصق رابطًا أو ارفع من جهازك. الفيديو: الصق رابط YouTube أو mp4.</li>
        </ul>
      </div>
    </div>
  );
}

async function isSiteAdminAccount(): Promise<boolean> {
  const response = await backendRequest('rpc/is_site_admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  return (await response.json()) === true;
}

export function AdminPanel() {
  const { lang } = useLang();
  usePageMeta(lang === 'ar' ? 'لوحة الإدارة' : 'Admin');
  const [tab, setTab] = useState<Tab>('dash');
  const [allCourses, setAllCourses] = useState<{ id: number; title_ar: string; title_en: string; trainer_id: number | null }[]>([]);
  useEffect(() => { loadTable<Record<string, unknown>>('courses', 'start_date', true).then((r) => setAllCourses(r.map((c) => ({ id: Number(c.id), title_ar: String(c.title_ar), title_en: String(c.title_en), trainer_id: c.trainer_id === null ? null : Number(c.trainer_id) })))).catch(() => {}); }, []);
  const back = () => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); };
  return (
    <OwnerGate auth={client.auth} isOwner={isSiteAdminAccount} confirmFirst text={{ noAccessTitle: lang === 'ar' ? 'هذه الصفحة للمشرفين فقط' : undefined } as never}>
      <div className="min-h-dvh bg-secondary/30">
        <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-5 sm:px-8">
            <img src="/logo.png" alt="" className="size-8 rounded-lg bg-white object-cover" />
            <span className="font-bold">{lang === 'ar' ? 'لوحة الإدارة' : 'Admin'}</span>
            <span className="flex-1" />
            <Button size="sm" variant="gray" onClick={back}>{lang === 'ar' ? 'عرض الموقع' : 'View site'}</Button>
            <Button size="sm" variant="gray" onClick={() => client.auth.signOut?.()}>خروج</Button>
          </div>
          <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-5 pb-3 sm:px-8">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === t.id ? 'bg-[var(--brand)] text-[var(--brand-ink)]' : 'bg-secondary'}`}>
                {lang === 'ar' ? t.ar : t.en}
              </button>
            ))}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
          {tab === 'dash' && <Dashboard />}
          {tab === 'stats' && <StatsManager />}
          {tab === 'site' && <SiteEditor />}
          {tab === 'courses' && <CoursesManager />}
          {tab === 'lessons' && <LessonsManager courses={allCourses} title={lang === 'ar' ? 'المحاضرات' : 'Lessons'} />}
          {tab === 'quizzes' && <QuizzesManager courses={allCourses} title={lang === 'ar' ? 'الاختبارات' : 'Quizzes'} />}
          {tab === 'team' && <TeamManager />}
          {tab === 'trainers' && <TrainersManager />}
          {tab === 'trainer-reqs' && <TrainerRequestsManager />}
          {tab === 'cats' && <CatsManager />}
          {tab === 'posts' && <PostsManager />}
          {tab === 'events' && <EventsManager />}
          {tab === 'enroll' && <EnrollManager />}
          {tab === 'certs' && <CertsManager />}
          {tab === 'msgs' && <MsgsManager />}
          {tab === 'vols' && <VolsManager />}
          {tab === 'admins' && <AdminsManager />}
        </main>
      </div>
    </OwnerGate>
  );
}

export function AdminRoute() {
  return <AdminPanel />;
}
