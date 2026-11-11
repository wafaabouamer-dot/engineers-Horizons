import { useEffect, useState } from 'react';
import { LangProvider, useLang } from '@/lib/lang';
import { NotFound } from '@/components/ui/not-found';
import { signedInUser, type BackendError } from '@/lib/data';
import { Site, parseRoute } from './pages/Site';
import { AdminPanel } from './pages/Admin';
import { TrainerRoute } from './pages/Trainer';

type User = { id: string; email: string; name: string; emailVerified: boolean } | null | undefined;

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [user, setUser] = useState<User>(undefined);
  useEffect(() => {
    const fn = () => {
      setPath(window.location.pathname);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  useEffect(() => {
    signedInUser().then(
      (u) => setUser((u as User) ?? null),
      (_e: BackendError) => setUser(null),
    );
  }, []);
  useEffect(() => {
    const rtl = document.documentElement.lang === 'ar';
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  });

  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  const isTrainer = path === '/trainer' || path.startsWith('/trainer/');
  const route = parseRoute(isAdmin || isTrainer ? '/' : path);
  const known =
    isAdmin ||
    ['/', '/courses', '/trainers', '/news', '/events', '/about', '/contact', '/volunteer', '/verify', '/faq', '/login', '/register', '/quiz', '/trainer', '/join-trainer', '/account'].some(
      (p) => path === p || path.startsWith(p + '/'),
    );

  return (
    <LangProvider languages={['ar', 'en']} region="PS">
      <LangSync />
      {isAdmin ? (
        <AdminPanel />
      ) : isTrainer ? (
        <TrainerRoute />
      ) : known ? (
        <Site route={route} user={user ?? null} setUser={setUser} />
      ) : (
        <NotFound />
      )}
    </LangProvider>
  );
}

function LangSync() {
  const { lang } = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  return null;
}
