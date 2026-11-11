-- Schema exported from Anela.
-- DDL only: no rows, no roles, no grants, no connection string.
-- 19 tables, 9 functions, 0 views and 1 trigger in schema "public".
-- Its table rules name the roles anonymous and authenticated: create them first where they do not exist.
SET check_function_bodies = false;

CREATE EXTENSION IF NOT EXISTS "pg_session_jwt";

CREATE TABLE "categories" ("id" text NOT NULL, "name_ar" text NOT NULL, "name_en" text NOT NULL, "sort_order" integer NOT NULL DEFAULT 0, CONSTRAINT "categories_pkey" PRIMARY KEY (id));

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "certificates" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "code" text NOT NULL, "holder_name_ar" text NOT NULL, "holder_name_en" text NOT NULL, "user_id" text, "course_id" bigint, "issued_on" date NOT NULL DEFAULT CURRENT_DATE, CONSTRAINT "certificates_code_key" UNIQUE (code), CONSTRAINT "certificates_code_unique" UNIQUE (code), CONSTRAINT "certificates_pkey" PRIMARY KEY (id));

ALTER TABLE "certificates" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "contact_messages" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "name" text NOT NULL, "email" text NOT NULL, "message" text NOT NULL, "handled" boolean NOT NULL DEFAULT false, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "contact_messages_pkey" PRIMARY KEY (id));

ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "courses" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "slug" text NOT NULL, "category" text, "trainer_id" bigint, "hours" integer NOT NULL DEFAULT 0, "price" numeric NOT NULL DEFAULT 0, "capacity" integer, "level_ar" text, "level_en" text, "title_ar" text NOT NULL, "title_en" text NOT NULL, "summary_ar" text, "summary_en" text, "description_ar" text, "description_en" text, "audience_ar" text, "audience_en" text, "requirements_ar" text, "requirements_en" text, "method" text NOT NULL DEFAULT 'online'::text, "outcomes" jsonb NOT NULL DEFAULT '[]'::jsonb, "cover_url" text, "video_url" text, "start_date" date, "end_date" date, "registration_open" boolean NOT NULL DEFAULT true, "published" boolean NOT NULL DEFAULT true, "featured" boolean NOT NULL DEFAULT false, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "courses_pkey" PRIMARY KEY (id), CONSTRAINT "courses_slug_key" UNIQUE (slug));

ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "enrollments" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "user_id" text NOT NULL DEFAULT auth.user_id(), "user_email" text, "user_name" text, "course_id" bigint NOT NULL, "status" text NOT NULL DEFAULT 'pending'::text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "enrollments_pkey" PRIMARY KEY (id), CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE (user_id, course_id));

ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "events" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "kind" text NOT NULL DEFAULT 'event'::text, "slug" text NOT NULL, "title_ar" text NOT NULL, "title_en" text NOT NULL, "summary_ar" text, "summary_en" text, "description_ar" text, "description_en" text, "speaker" text, "location" text, "starts_at" timestamp with time zone, "capacity" integer, "cover_url" text, "video_url" text, "registration_open" boolean NOT NULL DEFAULT true, "published" boolean NOT NULL DEFAULT true, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "events_pkey" PRIMARY KEY (id), CONSTRAINT "events_slug_key" UNIQUE (slug));

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "lesson_progress" ("user_id" text NOT NULL DEFAULT auth.user_id(), "lesson_id" bigint NOT NULL, "done" boolean NOT NULL DEFAULT true, "updated_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "lesson_progress_pkey" PRIMARY KEY (user_id, lesson_id));

ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "lessons" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "course_id" bigint NOT NULL, "title_ar" text NOT NULL, "title_en" text NOT NULL, "summary_ar" text, "summary_en" text, "video_url" text, "material_url" text, "duration_min" integer, "sort_order" integer NOT NULL DEFAULT 0, "published" boolean NOT NULL DEFAULT true, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "lessons_pkey" PRIMARY KEY (id));

ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "page_views" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "path" text NOT NULL, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "page_views_pkey" PRIMARY KEY (id));

ALTER TABLE "page_views" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "posts" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "kind" text NOT NULL DEFAULT 'news'::text, "slug" text NOT NULL, "date" date NOT NULL DEFAULT CURRENT_DATE, "title_ar" text NOT NULL, "title_en" text NOT NULL, "excerpt_ar" text, "excerpt_en" text, "content_ar" text, "content_en" text, "author" text, "cover_url" text, "video_url" text, "published" boolean NOT NULL DEFAULT true, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "posts_pkey" PRIMARY KEY (id), CONSTRAINT "posts_slug_key" UNIQUE (slug));

ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "profiles" ("id" text NOT NULL DEFAULT auth.user_id(), "email" text NOT NULL, "full_name" text, "phone" text, "city" text, "university" text, "major" text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "profiles_pkey" PRIMARY KEY (id));

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "questions" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "quiz_id" bigint NOT NULL, "text_ar" text NOT NULL, "text_en" text NOT NULL, "options" jsonb NOT NULL DEFAULT '[]'::jsonb, "correct_index" integer NOT NULL DEFAULT 0, "points" integer NOT NULL DEFAULT 1, "sort_order" integer NOT NULL DEFAULT 0, CONSTRAINT "questions_pkey" PRIMARY KEY (id));

ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "quiz_attempts" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "quiz_id" bigint NOT NULL, "user_id" text NOT NULL DEFAULT auth.user_id(), "user_name" text, "user_email" text, "answers" jsonb NOT NULL DEFAULT '[]'::jsonb, "score" integer NOT NULL DEFAULT 0, "total" integer NOT NULL DEFAULT 0, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY (id));

ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "quizzes" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "course_id" bigint NOT NULL, "lesson_id" bigint, "title_ar" text NOT NULL, "title_en" text NOT NULL, "description_ar" text, "description_en" text, "sort_order" integer NOT NULL DEFAULT 0, "published" boolean NOT NULL DEFAULT true, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "quizzes_pkey" PRIMARY KEY (id));

ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "site_admins" ("email" text NOT NULL, CONSTRAINT "site_admins_pkey" PRIMARY KEY (email));

ALTER TABLE "site_admins" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "site_settings" ("key" text NOT NULL, "value_ar" text, "value_en" text, CONSTRAINT "site_settings_pkey" PRIMARY KEY (key));

ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "trainer_requests" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "full_name" text NOT NULL, "email" text NOT NULL, "phone" text, "specialty" text, "bio" text, "status" text NOT NULL DEFAULT 'new'::text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "trainer_requests_pkey" PRIMARY KEY (id));

ALTER TABLE "trainer_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "trainers" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "slug" text NOT NULL, "name_ar" text NOT NULL, "name_en" text NOT NULL, "title_ar" text, "title_en" text, "bio_ar" text, "bio_en" text, "qualifications_ar" text, "qualifications_en" text, "photo_url" text, "video_url" text, "initials" text NOT NULL DEFAULT ''::text, "user_id" text, "published" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT 0, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "account_email" text, CONSTRAINT "trainers_pkey" PRIMARY KEY (id), CONSTRAINT "trainers_slug_key" UNIQUE (slug));

ALTER TABLE "trainers" ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON TABLE public.trainers FROM PUBLIC, anonymous, authenticated;
REVOKE SELECT (user_id, account_email) ON TABLE public.trainers FROM PUBLIC, anonymous, authenticated;
GRANT SELECT (
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order
) ON TABLE public.trainers TO anonymous, authenticated;

CREATE TABLE "volunteer_applications" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "full_name" text NOT NULL, "email" text NOT NULL, "phone" text, "city" text, "university" text, "major" text, "skills" text, "experience" text, "department" text, "motivation" text, "status" text NOT NULL DEFAULT 'new'::text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "volunteer_applications_pkey" PRIMARY KEY (id));

ALTER TABLE "volunteer_applications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE "courses" ADD CONSTRAINT "courses_category_fkey" FOREIGN KEY (category) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE "courses" ADD CONSTRAINT "courses_trainer_id_fkey" FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL;

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_fkey" FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

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

CREATE OR REPLACE FUNCTION public.is_course_trainer(_course bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from public.courses c join public.trainers t on t.id = c.trainer_id join neon_auth."user" u on lower(u.email) = lower(t.account_email) where c.id = _course and u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

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

CREATE OR REPLACE FUNCTION public.is_site_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from neon_auth."user" u join public.site_admins a on lower(a.email) = lower(u.email) where u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

CREATE OR REPLACE FUNCTION public.is_trainer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from neon_auth."user" u join public.trainers t on lower(t.account_email) = lower(u.email) where u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified" and t.account_email is not null) $function$;

CREATE OR REPLACE FUNCTION public.is_trainer_email(_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select _email is not null and exists (select 1 from neon_auth."user" u where lower(u.email) = lower(_email) and u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified") $function$;

CREATE OR REPLACE FUNCTION public.my_trainer_status()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select case when public.is_site_admin() then 'admin' when public.is_trainer() then 'trainer' when exists (select 1 from public.trainer_requests r join neon_auth."user" u on lower(u.email) = lower(r.email) where u.id::text = current_setting('request.jwt.claims', true)::jsonb ->> 'sub' and u."emailVerified" and r.status in ('new','reviewing')) then 'pending' else 'none' end $function$;

CREATE VIEW public.admin_trainers WITH (security_barrier = true) AS
SELECT
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order, created_at, account_email
FROM public.trainers
WHERE public.is_site_admin();

CREATE VIEW public.trainer_portal_profiles WITH (security_barrier = true) AS
SELECT
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order, account_email
FROM public.trainers
WHERE public.is_trainer_email(account_email);

REVOKE ALL ON TABLE public.admin_trainers, public.trainer_portal_profiles FROM PUBLIC, anonymous, authenticated;
GRANT SELECT ON TABLE public.admin_trainers, public.trainer_portal_profiles TO authenticated;

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

CREATE POLICY "categories_admin" ON "categories" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "categories_read" ON "categories" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING (true);

CREATE POLICY "certs_admin" ON "certificates" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "certs_owner_read" ON "certificates" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = auth.user_id()));

CREATE POLICY "contact_admin_del" ON "contact_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_site_admin());

CREATE POLICY "contact_admin_read" ON "contact_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_site_admin());

CREATE POLICY "contact_admin_write" ON "contact_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_site_admin());

CREATE POLICY "courses_admin" ON "courses" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "courses_read" ON "courses" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR is_site_admin()));

CREATE POLICY "enroll_admin_update" ON "enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "enroll_delete" ON "enrollments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((user_id = auth.user_id()) OR is_site_admin()));

CREATE POLICY "enroll_insert" ON "enrollments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = auth.user_id()) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM courses c
  WHERE ((c.id = enrollments.course_id) AND c.published AND c.registration_open)))));

CREATE POLICY "enroll_read" ON "enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.user_id()) OR is_site_admin()));

CREATE POLICY "enroll_trainer_read" ON "enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_course_trainer(course_id));

CREATE POLICY "enroll_trainer_update" ON "enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_course_trainer(course_id)) WITH CHECK (is_course_trainer(course_id));

CREATE POLICY "enroll_update_self" ON "enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = auth.user_id())) WITH CHECK (((user_id = auth.user_id()) AND (status = 'pending'::text)));

CREATE POLICY "events_admin" ON "events" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "events_read" ON "events" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR is_site_admin()));

CREATE POLICY "lp_admin" ON "lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_site_admin());

CREATE POLICY "lp_own" ON "lesson_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ((user_id = auth.user_id())) WITH CHECK ((user_id = auth.user_id()));

CREATE POLICY "lessons_read" ON "lessons" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_site_admin() OR is_course_trainer(course_id) OR (published AND is_enrolled(course_id))));

CREATE POLICY "lessons_write" ON "lessons" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_site_admin() OR is_course_trainer(course_id))) WITH CHECK ((is_site_admin() OR is_course_trainer(course_id)));

CREATE POLICY "views_add" ON "page_views" AS PERMISSIVE FOR INSERT TO "anonymous", "authenticated" WITH CHECK (true);

CREATE POLICY "views_admin_read" ON "page_views" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_site_admin());

CREATE POLICY "posts_admin" ON "posts" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "posts_read" ON "posts" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR is_site_admin()));

CREATE POLICY "profiles_self_insert" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((id = auth.user_id()));

CREATE POLICY "profiles_self_read" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((id = auth.user_id()) OR is_site_admin()));

CREATE POLICY "profiles_self_update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((id = auth.user_id()) OR is_site_admin()));

CREATE POLICY "questions_read" ON "questions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_site_admin() OR is_quiz_trainer(quiz_id) OR (EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = questions.quiz_id) AND q.published AND is_enrolled(q.course_id))))));

CREATE POLICY "questions_write" ON "questions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_site_admin() OR is_quiz_trainer(quiz_id))) WITH CHECK ((is_site_admin() OR is_quiz_trainer(quiz_id)));

CREATE POLICY "attempts_delete" ON "quiz_attempts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_site_admin());

CREATE POLICY "attempts_read" ON "quiz_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.user_id()) OR is_site_admin() OR is_quiz_trainer(quiz_id)));

CREATE POLICY "quizzes_read" ON "quizzes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_site_admin() OR is_course_trainer(course_id) OR (published AND is_enrolled(course_id))));

CREATE POLICY "quizzes_write" ON "quizzes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_site_admin() OR is_course_trainer(course_id))) WITH CHECK ((is_site_admin() OR is_course_trainer(course_id)));

CREATE POLICY "site_admins_manage" ON "site_admins" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "settings_admin" ON "site_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "settings_read" ON "site_settings" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING (true);

CREATE POLICY "treq_admin_del" ON "trainer_requests" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_site_admin());

CREATE POLICY "treq_admin_read" ON "trainer_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_site_admin());

CREATE POLICY "treq_admin_write" ON "trainer_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_site_admin());

CREATE POLICY "treq_own_read" ON "trainer_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_trainer_email(email));

CREATE POLICY "trainers_admin" ON "trainers" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());

CREATE POLICY "trainers_own_read" ON "trainers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_trainer_email(account_email));

CREATE POLICY "trainers_own_update" ON "trainers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_trainer_email(account_email));

CREATE POLICY "trainers_read" ON "trainers" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR is_site_admin()));

CREATE POLICY "vol_admin_del" ON "volunteer_applications" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_site_admin());

CREATE POLICY "vol_admin_read" ON "volunteer_applications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_site_admin());

CREATE POLICY "vol_admin_write" ON "volunteer_applications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_site_admin());

CREATE TRIGGER trg_cert_code BEFORE INSERT OR UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION ensure_certificate_code();
