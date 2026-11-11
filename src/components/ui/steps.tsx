import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { useLoadTurn } from '@/lib/eager-images';
import { cn } from '@/lib/utils';

export type Step = {
  title: ReactNode;
  text?: ReactNode;
  /** What stands large in place of its number: a year or a date, for a timeline ("2024"). */
  mark?: ReactNode;
};

/**
 * How it works, step by step, or a timeline (each step's year as its `mark`): a card for each step, its number or
 * year large in the accent color with an accent line beside it on every card (owner, 2026-10-24: "1" not "01", and the last card's line was missing), in a row on a computer
 * and a column on a phone. With `image` the section is a photo band: the photo under
 * a dark fade and the steps on the kit's glass; without one, the steps sit on the page over a soft glow of the brand
 * color. A row of plain step cards read as empty boxes (owner, 2026-10-22: "missing the accents or the background
 * picture"). Words above the steps (a `SectionHead`) go in `children`; `id` is the section's, for a link to it. It is
 * a whole section, full width with its own container: a width on it (`max-w-7xl`) moved the steps in from the
 * page's other sections.
 */
export function Steps({
  id,
  steps,
  image,
  alt = '',
  position,
  className,
  children,
}: {
  id?: string;
  steps: Step[];
  /** A photo behind the section (`/images/…`). */
  image?: string;
  alt?: string;
  /** The photo's `object-position`. */
  position?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [turnRef, loadNow, loaded] = useLoadTurn<HTMLElement>();
  const n = steps.length;
  return (
    <section
      ref={turnRef}
      id={id}
      // With its photo it is a full-width band: base.css keeps room between it and the next band or unspaced content.
      data-band={image ? '' : undefined}
      className={cn(
        'relative isolate overflow-clip py-24 md:py-32',
        // Inside a section of the page's own (its heading written just above), the steps are that section's content:
        // their own section's padding doubled the gaps above and below and set the cards in from the heading
        // (production, 2026-10-25, a pet salon's "Book in a few minutes").
        !image && '[section_&]:py-0',
        image && 'bg-neutral-950 text-white',
        className,
      )}
    >
      {image ? (
        <>
          {loadNow && (
            <img
              decoding="async"
              fetchPriority="low"
              src={image}
              alt={alt}
              // On a phone the stacked steps make the section several screens tall: the photo is one screen at its
              // top and fades into its dark, never stretched over all of it (as PhotoBand, owner, 2026-10-27).
              className="absolute inset-x-0 top-0 -z-10 h-svh w-full object-cover md:inset-0 md:h-full"
              style={position ? { objectPosition: position } : undefined}
              onLoad={loaded}
              onError={loaded}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-svh bg-gradient-to-b from-transparent from-55% to-neutral-950 md:hidden"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/75 via-black/60 to-black/80" />
        </>
      ) : (
        <div
          aria-hidden
          // Faded out at every edge, however wide the section is: a glow lit at the bottom edge ended in a hard line
          // there (dev, 2026-10-23).
          className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side_at_50%_55%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent)]"
        />
      )}
      <div
        className={cn(
          'mx-auto flex max-w-7xl flex-col items-start gap-5 px-5 sm:px-8 [&>div:only-child:not([data-card])]:p-0',
          !image && '[section_section_&]:max-w-none [section_section_&]:px-0',
        )}
      >
        {children}
        <ol
          className={cn(
            'grid w-full gap-4',
            children != null && 'mt-7',
            n === 2 && 'md:grid-cols-2',
            n === 3 && 'md:grid-cols-3',
            n === 4 && 'md:grid-cols-2 lg:grid-cols-4',
            // Past four, rows of three on six half-columns, so a last row of one or two sits in the middle (five steps
            // left a hole at the end of their second row: the kit's audit, 2026-10-24); two to a row on a tablet, a
            // last one alone in the middle.
            n > 4 && 'md:grid-cols-2 lg:grid-cols-6 lg:[&>*]:col-span-2',
            n > 4 && n % 3 === 1 && 'lg:[&>:last-child]:col-start-3',
            n > 4 && n % 3 === 2 && 'lg:[&>:nth-last-child(2)]:col-start-2',
            n > 4 &&
              n % 2 === 1 &&
              'md:max-lg:[&>:last-child]:col-span-2 md:max-lg:[&>:last-child]:w-[calc(50%-0.5rem)] md:max-lg:[&>:last-child]:justify-self-center',
          )}
        >
          {steps.map((step, i) => (
            <li key={i} className="flex">
              <Card tone={image ? 'glass' : 'plain'} className="flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-5xl leading-none font-semibold tracking-tight text-[var(--accent-text)] tabular-nums">
                    {step.mark ?? i + 1}
                  </span>
                  <span
                    aria-hidden
                    className="h-px flex-1 bg-gradient-to-r from-[color-mix(in_oklab,var(--accent-text)_70%,transparent)] to-transparent"
                  />
                </div>
                {/* The number carries the color; on glass the title stays white (the glass card's titles are brand). */}
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-balance text-current!">{step.title}</h3>
                {step.text != null && <p className="mt-2 leading-relaxed opacity-80">{step.text}</p>}
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
