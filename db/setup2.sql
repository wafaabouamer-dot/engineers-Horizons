-- Afaq site database, part 2: remaining tables, private trainer emails,
-- functions, views, policies, trigger and seed content.
-- No GRANT/REVOKE here: the platform manages visitor privileges itself.
-- Private trainer emails live in trainer_access (admin + owner only),
-- never in the public trainers table, so visitors cannot read them.

CREATE TABLE public."posts" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "kind" text NOT NULL DEFAULT 'news'::text, "slug" text NOT NULL, "date" date NOT NULL DEFAULT CURRENT_DATE, "title_ar" text NOT NULL, "title_en" text NOT NULL, "excerpt_ar" text, "excerpt_en" text, "content_ar" text, "content_en" text, "author" text, "cover_url" text, "video_url" text, "published" boolean NOT NULL DEFAULT true, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "posts_pkey" PRIMARY KEY (id), CONSTRAINT "posts_slug_key" UNIQUE (slug));
ALTER TABLE public."posts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."profiles" ("id" text NOT NULL DEFAULT auth.user_id(), "email" text NOT NULL, "full_name" text, "phone" text, "city" text, "university" text, "major" text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "profiles_pkey" PRIMARY KEY (id));
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."questions" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "quiz_id" bigint NOT NULL, "text_ar" text NOT NULL, "text_en" text NOT NULL, "options" jsonb NOT NULL DEFAULT '[]'::jsonb, "correct_index" integer NOT NULL DEFAULT 0, "points" integer NOT NULL DEFAULT 0, "sort_order" integer NOT NULL DEFAULT 0, CONSTRAINT "questions_pkey" PRIMARY KEY (id));
ALTER TABLE public."questions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."quiz_attempts" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "quiz_id" bigint NOT NULL, "user_id" text NOT NULL DEFAULT auth.user_id(), "user_name" text, "user_email" text, "answers" jsonb NOT NULL DEFAULT '[]'::jsonb, "score" integer NOT NULL DEFAULT 0, "total" integer NOT NULL DEFAULT 0, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY (id));
ALTER TABLE public."quiz_attempts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."quizzes" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "course_id" bigint NOT NULL, "title_ar" text NOT NULL, "title_en" text NOT NULL, "description_ar" text, "description_en" text, "sort_order" integer NOT NULL DEFAULT 0, "published" boolean NOT NULL DEFAULT true, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "quizzes_pkey" PRIMARY KEY (id));
ALTER TABLE public."quizzes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."site_admins" ("email" text NOT NULL, CONSTRAINT "site_admins_pkey" PRIMARY KEY (email));
ALTER TABLE public."site_admins" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."site_settings" ("key" text NOT NULL, "value_ar" text, "value_en" text, CONSTRAINT "site_settings_pkey" PRIMARY KEY (key));
ALTER TABLE public."site_settings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."trainer_requests" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "full_name" text NOT NULL, "email" text NOT NULL, "phone" text, "specialty" text, "bio" text, "status" text NOT NULL DEFAULT 'new'::text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "trainer_requests_pkey" PRIMARY KEY (id));
ALTER TABLE public."trainer_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."trainers" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "slug" text NOT NULL, "name_ar" text NOT NULL, "name_en" text NOT NULL, "title_ar" text, "title_en" text, "bio_ar" text, "bio_en" text, "qualifications_ar" text, "qualifications_en" text, "photo_url" text, "video_url" text, "initials" text NOT NULL DEFAULT ''::text, "published" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT 0, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "trainers_pkey" PRIMARY KEY (id), CONSTRAINT "trainers_slug_key" UNIQUE (slug));
ALTER TABLE public."trainers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."volunteer_applications" ("id" bigint NOT NULL GENERATED ALWAYS AS IDENTITY, "full_name" text NOT NULL, "email" text NOT NULL, "phone" text, "city" text, "university" text, "major" text, "skills" text, "experience" text, "department" text, "motivation" text, "status" text NOT NULL DEFAULT 'new'::text, "created_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "volunteer_applications_pkey" PRIMARY KEY (id));
ALTER TABLE public."volunteer_applications" ENABLE ROW LEVEL SECURITY;

CREATE TABLE public."trainer_access" ("trainer_id" bigint NOT NULL, "account_email" text NOT NULL, CONSTRAINT "trainer_access_pkey" PRIMARY KEY (trainer_id), CONSTRAINT "trainer_access_trainer_id_fkey" FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE);
ALTER TABLE public."trainer_access" ENABLE ROW LEVEL SECURITY;
