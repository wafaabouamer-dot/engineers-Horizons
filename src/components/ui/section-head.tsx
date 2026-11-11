import { Children, isValidElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A small link onward from a section, in the brand color with a chevron. Between the first screen and the page's
 * last section a section leads on with this, never a full button: the same big button in every section read as
 * repetition, and one left under a row of cards looked out of place (owner, 2026-10-19).
 */
export function SectionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        // 40px tall to press; the negative margin keeps it where it was.
        'section-link group -my-2 inline-flex shrink-0 items-center gap-1 py-2 text-[17px] font-semibold underline-offset-4 hover:underline',
        className,
      )}
    >
      {children}
      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
        ›
      </span>
    </a>
  );
}

/**
 * A section's title: a small label, the headline at the section-title size and its line, with an optional `link`
 * onward beside it (under the line below 1280 px). Several links sit in a row under the line instead: two side by side
 * at the far right floated apart from the title (owner, 2026-10-28, an insurance site's "Read all reviews on Google"
 * and "Leave a review"). It takes the color of where it sits: white on a photo band, the page's ink elsewhere, the
 * label in the brand color on the page.
 */
export function SectionHead({
  eyebrow,
  title,
  intro,
  link,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  /** `{ label, href }`, or a `<SectionLink>` of the page's own: given as an element it showed only its "›" (dev,
   *  2026-10-28, an insurance site's "Read reviews on Google"). */
  link?: { label: string; href: string } | ReactNode;
  className?: string;
}) {
  // Several: a list, or one element (a fragment or the page's own row) holding more than one link.
  const several =
    (Array.isArray(link) && link.length > 1) ||
    (isValidElement<{ children?: ReactNode }>(link) &&
      link.type !== SectionLink &&
      link.type !== 'a' &&
      Children.toArray(link.props.children).filter((child) => isValidElement(child)).length > 1);
  const onward = isValidElement(link) || Array.isArray(link)
    ? link
    : link && typeof link === 'object' && 'href' in link && <SectionLink href={link.href}>{link.label}</SectionLink>;
  return (
    <div
      // base.css keeps room under it before the section's content.
      data-section-head=""
      className={cn(
        // The link beside the words only from 1280 px: beside them on an iPad it took their room, and the headline
        // broke at half the screen (owner, 2026-11-05: "why on ipad gets cut shorter?").
        'flex w-full flex-col gap-4 self-stretch xl:flex-row xl:items-end xl:justify-between xl:gap-10',
        className,
      )}
    >
      {/* 90% of the section from a tablet up, the headline filling its lines and the intro as wide: a balanced headline
          in 56rem split into two short lines over a wide section's left half (owner, 2026-11-05, a builder's "The
          owner's team behind South Florida's landmark builds": "why not use more of the screen", then "just make it
          90%"), and at 576 px a narrower intro broke into three lines, its last word alone (2026-10-29). */}
      <div className="sm:w-[90%] sm:max-w-6xl">
        {eyebrow && <p className="section-label text-sm font-medium uppercase tracking-[0.14em]">{eyebrow}</p>}
        <h2
          className={cn(
            'text-3xl font-semibold tracking-tight text-pretty md:text-4xl lg:text-5xl',
            eyebrow && 'mt-3',
          )}
        >
          {title}
        </h2>
        {intro && <p className="mt-4 text-lg text-pretty opacity-85">{intro}</p>}
        {several && <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">{onward}</div>}
      </div>
      {!several && onward}
    </div>
  );
}
