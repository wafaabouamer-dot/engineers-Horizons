BEGIN;

INSERT INTO public.site_admins (email)
VALUES ('hallamohdafana2002@gmail.com')
ON CONFLICT (email) DO NOTHING;

REVOKE SELECT ON TABLE public.trainers FROM anonymous;
GRANT SELECT (
  id, slug, name_ar, name_en, title_ar, title_en, bio_ar, bio_en,
  qualifications_ar, qualifications_en, photo_url, video_url, initials,
  published, sort_order
) ON TABLE public.trainers TO anonymous;

INSERT INTO public.categories (id, name_ar, name_en, sort_order)
VALUES
  ('software-development', 'البرمجة وتطوير الويب', 'Programming & Web Development', 1),
  ('cloud-security', 'الأمن السيبراني والشبكات', 'Cybersecurity & Networks', 2),
  ('artificial-intelligence', 'الذكاء الاصطناعي', 'Artificial Intelligence', 3),
  ('data-science', 'علوم البيانات', 'Data Science', 4),
  ('computer-engineering', 'هندسة الحاسوب والأنظمة المضمنة', 'Computer & Embedded Systems Engineering', 5),
  ('cloud-computing', 'الحوسبة السحابية', 'Cloud Computing', 6)
ON CONFLICT (id) DO UPDATE
SET name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, sort_order = EXCLUDED.sort_order;

INSERT INTO public.site_settings (key, value_ar, value_en)
VALUES
  (
    'about_title',
    'من نحن',
    'About us'
  ),
  (
    'about_text',
    'نحن فريق تقني طموح يجمع شغف البرمجة بروح الابتكار، نؤمن بأن التكنولوجيا هي المفتاح الأقوى لإحداث تأثير حقيقي وتقديم حلول ذكية تسهّل الحياة اليومية.

نركز في عملنا على هندسة وتطوير واجهات رقمية متكاملة تتميز بسلاسة الاستخدام، السرعة، والتصميم العصري، مع توظيف أحدث تقنيات الويب والذكاء الاصطناعي لخلق تجارب مستخدم فريدة وموثوقة.

هدفنا هو تحويل الأفكار المعقدة إلى منتجات رقمية نابضة بالحياة، تلبي تطلعات المستخدمين وترتقي بمعايير الجودة التقنية.',
    'We are an ambitious technology team bringing a passion for programming together with a spirit of innovation. We believe technology is one of the most powerful ways to make a real difference and create smart solutions that make everyday life easier.

We engineer and develop complete digital interfaces focused on usability, speed, and contemporary design. By drawing on modern web technologies and artificial intelligence, we create distinctive, dependable user experiences.

Our goal is to turn complex ideas into vibrant digital products that meet users’ needs and set a higher bar for technical quality.'
  ),
  (
    'social_posts',
    'https://www.instagram.com/p/DerpDzpuBK6/
https://www.instagram.com/p/DeWcwN5uz8S/
https://www.instagram.com/p/DeMpihcjFCs/
https://www.instagram.com/p/DeP1Be6uFD7/
https://www.instagram.com/p/DfUsiVcjo7f/
https://www.instagram.com/p/De_9Ic7jgfj/',
    'https://www.instagram.com/p/DerpDzpuBK6/
https://www.instagram.com/p/DeWcwN5uz8S/
https://www.instagram.com/p/DeMpihcjFCs/
https://www.instagram.com/p/DeP1Be6uFD7/
https://www.instagram.com/p/DfUsiVcjo7f/
https://www.instagram.com/p/De_9Ic7jgfj/'
  )
ON CONFLICT (key) DO UPDATE
SET value_ar = EXCLUDED.value_ar, value_en = EXCLUDED.value_en;

INSERT INTO public.courses (
  slug, category, hours, price, level_ar, level_en, title_ar, title_en,
  summary_ar, summary_en, description_ar, description_en, method,
  cover_url, registration_open, published, featured
)
VALUES
  (
    'web-development-digital-interfaces', 'software-development', 0, 0,
    'قريباً', 'Coming soon', 'تطوير الويب والواجهات الرقمية', 'Web Development & Digital Interfaces',
    'قريباً — تعلّم بناء مواقع وتطبيقات ويب عصرية من الفكرة حتى الإطلاق.',
    'Coming soon — build modern web experiences from the first idea to launch.',
    'نعمل على تجهيز هذه الدورة. تابعوا إعلانات آفاق لمعرفة موعد التسجيل.',
    'This course is being prepared. Follow Afaq announcements for registration dates.',
    'online', '/images/course-web.jpg', false, true, true
  ),
  (
    'cybersecurity-cloud-infrastructure', 'cloud-security', 0, 0,
    'قريباً', 'Coming soon', 'الأمن السيبراني والبنية السحابية', 'Cybersecurity & Cloud Infrastructure',
    'قريباً — مدخل عملي إلى حماية الأنظمة والخدمات السحابية.',
    'Coming soon — a practical introduction to secure systems and cloud services.',
    'نعمل على تجهيز هذه الدورة. تابعوا إعلانات آفاق لمعرفة موعد التسجيل.',
    'This course is being prepared. Follow Afaq announcements for registration dates.',
    'online', '/images/course-eng.jpg', false, true, true
  )
ON CONFLICT (slug) DO NOTHING;

DROP POLICY IF EXISTS "enroll_insert" ON public.enrollments;
CREATE POLICY "enroll_insert"
ON public.enrollments
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.user_id()
  AND status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = enrollments.course_id
      AND c.published
      AND c.registration_open
  )
);

COMMIT;
