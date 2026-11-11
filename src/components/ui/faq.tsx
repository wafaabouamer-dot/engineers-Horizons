import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { heroImage } from '@/components/ui/hero';
import { PhotoTile } from '@/components/ui/mosaic';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';

/**
 * Questions and answers: a photo tile holding the section's label, title and a line (how to ask more), beside one
 * card of questions that open in place, each a full-width row with a chevron, separated by hairlines. Without a photo
 * the words stand on the page above the questions, as every section's title does, with no box: a box with nothing but
 * its words at the foot read as empty, black or glowing (dev and production, 2026-10-23 and 24; owner: "the text out
 * of place"), and the title alone beside the questions left an empty column under it (owner, 2026-11-03, a coffee
 * shop's "Good to know"). Its small label is in the accent on the page and on its photo, as the page's other
 * sections' are: the page's own, else "FAQ" ("Preguntas frecuentes") unless the title already says it (owner,
 * 2026-11-03). Its chevrons take the accent. Given no photo it takes the first screen's (`Hero`), so the card beside
 * the questions is always there: a headline alone above them read as plain (owner, the same day: "didn't we used to
 * have a card to the left of the questions?"). Only a page with no `Hero` photo either shows the words above the
 * questions.
 */
export function Faq({
  id,
  eyebrow,
  title,
  intro,
  image,
  imageAlt = '',
  position,
  items,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /** The photo of the title tile: the place, the team at work, the product in use. */
  image?: string;
  imageAlt?: string;
  position?: string;
  items: { q: string; a: ReactNode }[];
}) {
  const { lang } = useLang();
  const photo = image ?? heroImage();
  // Not when the title already says it ("Questions, answered", "FAQ"): the label would repeat it.
  const says = typeof title === 'string' && /question|faq|pregunta/i.test(title);
  const label = eyebrow ?? (says ? undefined : lang === 'es' ? 'Preguntas frecuentes' : 'FAQ');
  return (
    <section
      id={id}
      // Inside a section of the page's own, it is that section's content: its own width and padding set it in from
      // the page's other sections (production, 2026-10-25, a help desk's questions). Only a section with a width or
      // side padding: inside a bare `<section id>` it kept its own, or it ran to the screen's edges (2026-10-26).
      className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16 [section:is([class*=max-w-],[class*=px-])_&]:max-w-none [section:is([class*=max-w-],[class*=px-])_&]:px-0 [section:is([class*=max-w-],[class*=px-])_&]:py-0"
    >
      <div className={cn('grid', photo ? 'gap-4 lg:grid-cols-5' : 'gap-10 md:gap-12')}>
        {photo ? (
          <PhotoTile
            src={photo}
            alt={imageAlt}
            position={position}
            // As tall as its questions need: beside two questions a 26rem photo left their card mostly empty (the kit's
            // audit, 2026-10-24).
            className={cn('min-h-72 p-8 md:p-10 lg:col-span-2', items.length > 3 && 'lg:min-h-[26rem]')}
          >
            {/* The accent's light form, which reads on a photo (base.css `--accent-light`). */}
            {label && (
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--accent-light)]">{label}</p>
            )}
            <h2 className={cn('text-4xl font-semibold tracking-tight text-balance', label && 'mt-3')}>{title}</h2>
            {intro && <div className="mt-4 text-lg text-white/90">{intro}</div>}
          </PhotoTile>
        ) : (
          // The section title's own sizes (section-head.tsx), so it reads as one with the page's other titles.
          <div className="sm:w-[90%] sm:max-w-6xl">
            {label && <p className="section-label text-sm font-medium uppercase tracking-[0.14em]">{label}</p>}
            <h2
              className={cn('text-3xl font-semibold tracking-tight text-pretty md:text-4xl lg:text-5xl', label && 'mt-3')}
            >
              {title}
            </h2>
            {intro && <div className="mt-4 text-lg text-pretty opacity-85">{intro}</div>}
          </div>
        )}
        <div
          className={cn(
            'flex flex-col justify-center rounded-3xl bg-[rgb(120_120_128/0.1)] px-6 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_0_0_1px_rgb(120_120_128/0.14)] md:px-8',
            photo && 'lg:col-span-3',
          )}
        >
          {items.map((item, index) => (
            <details key={item.q} className={cn('group', index > 0 && 'border-t border-[var(--separator)]')}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown aria-hidden className="size-5 shrink-0 text-[var(--accent-text)] transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="pb-6 opacity-75">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
