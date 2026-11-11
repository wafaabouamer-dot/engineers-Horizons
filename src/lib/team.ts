import type { Trainer } from './site';

export type TeamSeed = {
  slug: string;
  name: { ar: string; en: string };
  role: { ar: string; en: string };
  experience: { ar: string; en: string };
  bio: { ar: string; en: string };
  email?: string;
  linkedin?: string;
  image: string;
};

export const initialTeam: TeamSeed[] = [
  {
    slug: 'hala-affaneh',
    name: { ar: 'م. هلا عفانة', en: 'Hala Affaneh' },
    role: { ar: 'رئيسة مجلس الإدارة والمؤسسة والمديرة التنفيذية | مهندسة أنظمة حاسوب', en: 'Founder, Chairwoman & CEO | Computer Systems Engineer & Constructor' },
    experience: { ar: '+7 سنوات خبرة', en: '7+ years of experience' },
    bio: {
      ar: '+10 مشاريع في الأنظمة المضمنة وتعلّم الآلة، وأكثر من 20 مشروعاً في المواقع وتطبيقات الهاتف والشبكات. درّبت أكثر من 300 طالب، ولها 3 أبحاث علمية.',
      en: '10+ embedded systems and machine-learning projects; 20+ website, mobile-app, and networking projects; trained 300+ students; and authored 3 scientific papers.',
    },
    image: '/images/team-hala.png',
  },
  {
    slug: 'yaser-abu-namous',
    name: { ar: 'ياسر أبو ناموس', en: 'Yaser Abu Namous' },
    role: { ar: 'متخصص وسائط متعددة', en: 'Multimedia Specialist' },
    experience: { ar: '20 سنة خبرة', en: '20 years of experience' },
    bio: { ar: 'متخصص في الوسائط المتعددة، وأنجز مشروعاً واحداً.', en: 'Multimedia specialist with 1 completed project.' },
    linkedin: 'https://www.linkedin.com/in/yaser-mohammed-08bb4043b/',
    image: '/images/team-yaser.png',
  },
  {
    slug: 'ibrahim-mukhaymer',
    name: { ar: 'إبراهيم مخيمر', en: 'Ibrahim Mukhaymer' },
    role: { ar: 'عضو فريق آفاق', en: 'Afaq Team Member' },
    experience: { ar: 'أكثر من 6 سنوات خبرة', en: 'More than 6 years of experience' },
    bio: { ar: 'خبرة مهنية تمتد لأكثر من ست سنوات.', en: 'More than six years of professional experience.' },
    image: '/images/team-ibrahim.jpg',
  },
  {
    slug: 'wafa-abu-amer',
    name: { ar: 'م. وفاء أبو عامر', en: 'Wafa Abu Amer' },
    role: { ar: 'مهندسة برمجيات وذكاء اصطناعي', en: 'Software & AI Engineer' },
    experience: { ar: '5 سنوات خبرة', en: '5 years of experience' },
    bio: { ar: 'أنجزت أكثر من 30 مشروعاً في المواقع والتطبيقات والشبكات.', en: 'Delivered 30+ projects across websites, applications, and networks.' },
    linkedin: 'https://www.linkedin.com/in/wafa-abuamer-a265a5443',
    image: '/images/team-wafa-abu-amer.jpg',
  },
  {
    slug: 'shahd-al-hammami',
    name: { ar: 'م. شهد الحمامي', en: 'Shahd Al-Hammami' },
    role: { ar: 'مهندسة شبكات ومتخصصة UX/UI ومديرة مشاريع', en: 'Network Engineer, UX/UI Specialist & Project Manager' },
    experience: { ar: '+5 سنوات خبرة', en: '5+ years of experience' },
    bio: { ar: 'أدارت أكثر من 50 مشروعاً، وتجمع خبرتها بين هندسة الشبكات وتجربة وواجهات المستخدم وإدارة المشاريع.', en: 'Managed 50+ projects, combining network engineering, UX/UI, and project management.' },
    linkedin: 'https://www.linkedin.com/in/shahed-hamami-101025317/',
    image: '/images/team-shahd.png',
  },
  {
    slug: 'khaled-alsibakhi',
    name: { ar: 'خالد السباخي', en: 'Khaled Alsibakhi' },
    role: { ar: 'متخصص تكنولوجيا المعلومات', en: 'Information Technology Specialist' },
    experience: { ar: '5 سنوات خبرة', en: '5 years of experience' },
    bio: { ar: 'أنجز أكثر من 20 مشروعاً في تطوير مواقع الويب.', en: 'Delivered 20+ website projects.' },
    linkedin: 'http://www.linkedin.com/in/khaled-alsibakhi',
    image: '/images/team-khaled.png',
  },
  {
    slug: 'nour-abu-ali',
    name: { ar: 'م. نور أبو علي', en: 'Nour Abu Ali' },
    role: { ar: 'مطورة برمجيات | مهندسة أنظمة حاسوب', en: 'Software Developer | Computer Systems Engineer' },
    experience: { ar: '+4 سنوات خبرة', en: '4+ years of experience' },
    bio: { ar: 'أنجزت أكثر من 30 مشروعاً في المواقع والتطبيقات والشبكات.', en: 'Delivered 30+ projects across websites, applications, and networks.' },
    linkedin: 'https://www.linkedin.com/in/nour-abu-ali-320a27429',
    image: '/images/team-nour.png',
  },
  {
    slug: 'fadel-mohammad-ennaba',
    name: { ar: 'فضل محمد عنابة', en: 'Fadel Mohammad Ennaba' },
    role: { ar: 'الوجه الإعلامي لفريق آفاق | طالب نظم معلومات إدارية', en: 'Afaq Media Representative | Management Information Systems Student' },
    experience: { ar: 'التقديم وصناعة المحتوى', en: 'Presenting & content creation' },
    bio: {
      ar: 'يقدّم إعلانات البرامج التدريبية والورش عبر منصات التواصل الاجتماعي. تشمل مهاراته التحدث أمام الجمهور، وصناعة المحتوى، وكتابة السيناريوهات، والتواصل الإبداعي.',
      en: 'Presents training-program and workshop announcements across social platforms. Skilled in public speaking, content creation, scriptwriting, and creative communication.',
    },
    image: '/images/team-fadel.png',
  },
];

export type TeamCardMember = {
  key: string;
  name: { ar: string; en: string };
  role: { ar: string; en: string };
  experience: { ar: string; en: string };
  bio: { ar: string; en: string };
  email?: string | null;
  linkedin?: string;
  image?: string | null;
};

const LINKEDIN_MARKER = /\n?\[LinkedIn: ([^\]]+)\]\s*$/i;

export function getLinkedin(bio: string | null | undefined): string | undefined {
  return bio?.match(LINKEDIN_MARKER)?.[1];
}

export function withoutLinkedin(bio: string | null | undefined): string {
  return (bio ?? '').replace(LINKEDIN_MARKER, '').trim();
}

export function teamSeedRow(member: TeamSeed, index: number): Record<string, unknown> {
  return {
    slug: `team-${member.slug}`,
    name_ar: member.name.ar,
    name_en: member.name.en,
    title_ar: member.role.ar,
    title_en: member.role.en,
    bio_ar: member.bio.ar,
    bio_en: `${member.bio.en}${member.linkedin ? `\n[LinkedIn: ${member.linkedin}]` : ''}`,
    qualifications_ar: member.experience.ar,
    qualifications_en: member.experience.en,
    photo_url: member.image,
    account_email: member.email ?? null,
    initials: member.name.ar.slice(0, 2),
    published: true,
    sort_order: index + 1,
  };
}

export function teamRowToCard(row: Trainer): TeamCardMember {
  return {
    key: String(row.id),
    name: { ar: row.name_ar, en: row.name_en },
    role: { ar: row.title_ar ?? '', en: row.title_en ?? '' },
    experience: { ar: row.qualifications_ar ?? '', en: row.qualifications_en ?? '' },
    bio: { ar: row.bio_ar ?? '', en: withoutLinkedin(row.bio_en) },
    email: row.account_email,
    linkedin: getLinkedin(row.bio_en),
    image: row.photo_url,
  };
}

export function teamSeedToCard(member: TeamSeed): TeamCardMember {
  return {
    key: member.slug,
    name: member.name,
    role: member.role,
    experience: member.experience,
    bio: member.bio,
    email: member.email,
    linkedin: member.linkedin,
    image: member.image,
  };
}

export function isTeamRow(row: Trainer): boolean {
  return row.slug.startsWith('team-');
}
