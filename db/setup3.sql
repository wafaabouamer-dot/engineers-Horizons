-- Afaq site database, part 3: foreign keys, functions, views, policies, trigger.

ALTER TABLE public."certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public."courses" ADD CONSTRAINT "courses_category_fkey" FOREIGN KEY (category) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public."courses" ADD CONSTRAINT "courses_trainer_id_fkey" FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;
ALTER TABLE public."enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public."lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
ALTER TABLE public."lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public."questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
ALTER TABLE public."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
ALTER TABLE public."quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.ensure_certificate_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c text; tries int := 0;
begin
 if NEW.code is not null and btrim(NEW.code) <> '' then
  NEW.code := btrim(NEW.code);
  return NEW;
 end if;
 loop
  tries := tries + 1;
  c := 'AFAQ-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  exit when not exists (select 1 from public.certificates where code = c);
  if tries > 20 then raise exception 'could not mint a unique certificate code'; end if;
 end loop;
 NEW.code := c;
 return NEW;
end; $function$;

CREATE OR REPLACE FUNCTION public.is_site_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from neon_auth."user" u join public.site_admins a on lower(a.email) = lower(u.email) where u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

CREATE OR REPLACE FUNCTION public.is_trainer_email(_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select _email is not null and exists (select 1 from neon_auth."user" u where lower(u.email) = lower(_email) and u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

CREATE OR REPLACE FUNCTION public.is_trainer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from public.trainer_access ta join neon_auth."user" u on lower(u.email) = lower(ta.account_email) where u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

CREATE OR REPLACE FUNCTION public.is_course_trainer(_course bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from public.courses c join public.trainers t on t.id = c.trainer_id join public.trainer_access ta on ta.trainer_id = t.id join neon_auth."user" u on lower(u.email) = lower(ta.account_email) where c.id = _course and u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_course bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from public.enrollments where course_id = _course and user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and status in ('approved','completed')) $function$;

CREATE OR REPLACE FUNCTION public.is_quiz_trainer(_quiz bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from public.quizzes q where q.id = _quiz and public.is_course_trainer(q.course_id)) $function$;

CREATE OR REPLACE FUNCTION public.my_trainer_status()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select case when public.is_site_admin() then 'admin' when public.is_trainer() then 'trainer' when exists (select 1 from public.trainer_requests r join neon_auth."user" u on lower(u.email) = lower(r.email) where u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified" and r.status in ('new','reviewing')) then 'pending' else 'none' end $function$;

CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
 RETURNS TABLE(holder_ar text, holder_en text, course_ar text, course_en text, issued_on date, code text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select c.holder_name_ar, c.holder_name_en, co.title_ar, co.title_en, c.issued_on, c.code
 from public.certificates c left join public.courses co on co.id = c.course_id
 where c.code = nullif(btrim(p_code), '');
$function$;

CREATE VIEW public.admin_trainers WITH (security_invoker = true) AS
SELECT t.id, t.slug, t.name_ar, t.name_en, t.title_ar, t.title_en, t.bio_ar, t.bio_en,
 t.qualifications_ar, t.qualifications_en, t.photo_url, t.video_url, t.initials,
 t.published, t.sort_order, t.created_at, ta.account_email
FROM public.trainers t LEFT JOIN public.trainer_access ta ON ta.trainer_id = t.id
WHERE public.is_site_admin();

CREATE VIEW public.trainer_portal_profiles WITH (security_invoker = true) AS
SELECT t.id, t.slug, t.name_ar, t.name_en, t.title_ar, t.title_en, t.bio_ar, t.bio_en,
 t.qualifications_ar, t.qualifications_en, t.photo_url, t.video_url, t.initials,
 t.published, t.sort_order, ta.account_email
FROM public.trainers t JOIN public.trainer_access ta ON ta.trainer_id = t.id
WHERE public.is_trainer_email(ta.account_email);

CREATE TRIGGER trg_cert_code BEFORE INSERT OR UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.ensure_certificate_code();
