import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The page's first screen: a full-bleed photo of the subject under a dark fade, the words on the left in line with
 * the header's name (never centered), the headline in long lines up to 70% of the screen, its line narrower, the
 * buttons under them; on phones the words sit below the middle over a bottom fade. The floating header sits over
 * it. `position` is the photo's `object-position`: make or crop the photo with its subject on the right.
 *
 * Only the home page is a landing page. On any other page (a gallery, the services, booking) it is that page's short
 * header, the photo a band under the floating header with the page's title, so what the visitor clicked for shows
 * on the first screen: every tab of a barber's site opened on a screen-high photo of its own (owner, 2026-11-04:
 * "the tabs should open the things directly").
 */
/** The first screen's photo, for a section given none of its own to show (the FAQ's card, faq.tsx). */
let heroPhoto: string | undefined;
export const heroImage = () => heroPhoto;

export function Hero({
  src,
  alt = '',
  position,
  eyebrow,
  title,
  intro,
  actions,
  className,
}: {
  src: string;
  alt?: string;
  position?: string;
  /** A few words over the headline, such as "Licensed counseling · In person and online". */
  eyebrow?: ReactNode;
  title: ReactNode;
  /**
   * The line under the headline: ONE short sentence a visitor reads at a glance, never two and never a paragraph
   * (owner, 2026-10-26: a 30-word line under anela.ai's headline was "too long"). The rest goes in the sections below.
   */
  intro?: ReactNode;
  /** One or two links styled with `buttonVariants` (the main one first). */
  actions?: ReactNode;
  className?: string;
}) {
  // The home page: `/`, or a language's own root (`/es`).
  const inner =
    typeof window !== 'undefined' && !/^\/?(?:[a-z]{2}(?:-[a-zA-Z]{2})?\/?)?(?:index\.html)?$/.test(window.location.pathname);
  if (!inner) heroPhoto = src;
  return (
    <section
      // A full-width band: base.css keeps room between it and the next band or unspaced content.
      data-band=""
      // On an inner page, base.css trims the next section's top padding so its content shows under the header.
      data-page-header={inner ? '' : undefined}
      className={cn(
        'relative isolate flex items-end overflow-hidden bg-neutral-950 text-white',
        inner ? 'min-h-[22rem] md:min-h-[26rem]' : 'min-h-svh md:items-center',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        fetchPriority="high"
        className="absolute inset-0 -z-10 size-full object-cover"
        style={position ? { objectPosition: position } : undefined}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#101b43]/80 via-[#101b43]/30 to-transparent md:bg-gradient-to-r md:from-[#101b43]/70 md:via-[#5b3df0]/25 md:to-transparent"
      />
      {/* On a phone the words end a sixth of the screen above its foot, not at it (owner, 2026-10-22: "should we put
          the mobile headline more up?"; at 56 px the buttons sat on the screen's edge). */}
      <div
        className={cn(
          'hero-words mx-auto w-full max-w-7xl px-5 sm:px-8',
          inner ? 'pt-28 pb-10 md:pb-12' : 'pt-28 pb-[max(3.5rem,16svh)] md:py-32',
        )}
      >
        {eyebrow && <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/85">{eyebrow}</p>}
        <h1
          className={cn(
            'leading-[1.05] font-semibold tracking-tight text-pretty md:max-w-[70vw]',
            inner ? 'text-4xl md:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl',
            eyebrow && 'mt-4',
          )}
        >
          {title}
        </h1>
        {intro && <p className={cn('max-w-xl text-lg text-white/90 md:text-xl', inner ? 'mt-3' : 'mt-6')}>{intro}</p>}
        {actions && <div className={cn('flex flex-wrap gap-3', inner ? 'mt-6' : 'mt-8')}>{actions}</div>}
      </div>
    </section>
  );
}
