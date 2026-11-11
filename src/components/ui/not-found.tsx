import { buttonVariants } from '@/components/ui/button';
import { usePageMeta } from '@/lib/page-meta';
import { cn } from '@/lib/utils';

const WORDS = {
  en: { title: 'Page not found', text: "This page doesn't exist or has moved.", home: 'Back to home' },
  es: { title: 'Página no encontrada', text: 'Esta página no existe o se movió.', home: 'Volver al inicio' },
};

/**
 * The page for any address the site does not have (a typo, an old link): a large 404 in the brand color, a line and a
 * way home, in the middle of the screen under the header, and `noindex` so search engines never list it (an app's
 * pages all answer 200, so this is how Google tells a missing page). Put it on the router's catch-all route
 * (`path="*"`). Words follow `<html lang>` unless given.
 */
export function NotFound({
  title,
  text,
  home = '/',
  homeLabel,
  className,
}: {
  title?: string;
  text?: string;
  home?: string;
  homeLabel?: string;
  className?: string;
}) {
  const w = document.documentElement.lang.toLowerCase().startsWith('es') ? WORDS.es : WORDS.en;
  usePageMeta({ title: title ?? w.title, noindex: true });
  return (
    <main className={cn('grid min-h-[80svh] place-items-center px-5 pt-24 pb-16 text-center', className)}>
      <div className="flex max-w-md flex-col items-center">
        <p className="text-7xl leading-none font-semibold tracking-tight text-[var(--brand-text)] tabular-nums md:text-8xl">
          404
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title ?? w.title}</h1>
        <p className="mt-3 text-lg opacity-75">{text ?? w.text}</p>
        <a href={home} className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
          {homeLabel ?? w.home}
        </a>
      </div>
    </main>
  );
}
