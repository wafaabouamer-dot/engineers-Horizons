BEGIN;

REVOKE SELECT ON TABLE public.trainers FROM PUBLIC, anonymous, authenticated;
REVOKE SELECT (user_id, account_email) ON TABLE public.trainers FROM PUBLIC, anonymous, authenticated;
GRANT SELECT (
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order
) ON TABLE public.trainers TO anonymous, authenticated;

CREATE OR REPLACE VIEW public.admin_trainers WITH (security_barrier = true) AS
SELECT
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order, created_at, account_email
FROM public.trainers
WHERE public.is_site_admin();

CREATE OR REPLACE VIEW public.trainer_portal_profiles WITH (security_barrier = true) AS
SELECT
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order, account_email
FROM public.trainers
WHERE public.is_trainer_email(account_email);

REVOKE ALL ON TABLE public.admin_trainers, public.trainer_portal_profiles FROM PUBLIC, anonymous, authenticated;
GRANT SELECT ON TABLE public.admin_trainers, public.trainer_portal_profiles TO authenticated;

COMMIT;
