-- Afaq site database, part 5: admin access, seed content, WhatsApp +972.

INSERT INTO public.site_admins (email)
VALUES ('hallamohdafana2002@gmail.com')
ON CONFLICT (email) DO NOTHING;

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
  ('about_title', 'من نحن', 'About us'),
  (
    'about_text',
    'نحن فريق تقني طموح يجمع شغف البرمجة بروح الابتكار، نؤمن بأن التكنولوجيا هي المفتاح الأقوى لإحداث تأثير حقيقي وتقديم حلول ذكية تسهّل الحياة اليومية.

نركز في عملنا على هندسة وتطوير واجهات رقمية متكاملة تتميز بسلاسة الاستخدام، السرعة، والتصميم العصري، مع توظيف أحدث تقنيات الويب والذكاء الاصطناعي لخلق تجارب مستخدم فريدة وموثوقة.

هدفنا هو تحويل الأفكار المعقدة إلى منتجات رقمية نابضة بالحياة، تلبي تطلعات المستخدمين وترتقي بمعايير الجودة التقنية.',
    'We are an ambitious technology team bringing a passion for programming together with a spirit of innovation. We believe technology is one of the most powerful ways to make a real difference and create smart solutions that make everyday life easier.

We engineer and develop complete digital interfaces focused on usability, speed, and contemporary design. By drawing on modern web technologies and artificial intelligence, we create distinctive, dependable user experiences.

Our goal is to turn complex ideas into vibrant digital products that meet needs and set a higher bar for technical quality.'
  ),
  (
    'contact_whatsapp',
    '972595676566',
    '972595676566'
  ),
  (
    'contact_phone',
    '+972 59 567 6566',
    '+972 59 567 6566'
  ),
  (
    'brand_name',
    'أكاديمية آفاق',
    'Afaq Academy'
  ),
  (
    'hero_kicker',
    'أكاديمية آفاق للمهندسين',
    'Afaq Academy for Engineers'
  ),
  (
    'hero_title',
    'تعلّم اليوم، وابنِ آفاق الغد',
    'Learn today, build tomorrow'
  ),
  (
    'hero_text',
    'دورات وورشات عملية في البرمجة والذكاء الاصطناعي والشبكات، من الفكرة حتى الشهادة.',
    'Hands-on courses and workshops in programming, AI and networks — from first lesson to certificate.'
  ),
  (
    'cta_title',
    'جاهزة تبدأي رحلتك معنا؟',
    'Ready to start your journey?'
  ),
  (
    'cta_text',
    'سجّلي اليوم في دورات وورشات آفاق، أو تطوّعي مع الفريق.',
    'Join Afaq courses and workshops today, or volunteer with the team.'
  ),
  (
    'footer_text',
    'أكاديمية آفاق — دورات وورشات تقنية للطلبة والخريجين والمهندسين.',
    'Afaq Academy — tech courses and workshops for students, graduates and engineers.'
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
