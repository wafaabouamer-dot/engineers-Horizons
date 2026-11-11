import type { ReactNode } from 'react';
import { useLoadTurn } from '@/lib/eager-images';
import { cn } from '@/lib/utils';

/**
 * A full-width photo band: the photo edge to edge under a dark fade, its words white on the page column. It breaks
 * a run of plain sections: a `SectionHead` (with its link, if it leads on) and cards, never a full button under
 * them (owner, 2026-10-19). As the page's last section it is a title, its line and the page's main button, or a
 * booking or contact form as two `Card tone="glass"` in a grid. Children stack on the column's left with even space between
 * them, and a button keeps its own width (an ending drawn as a tinted box with a stretched button read as a bar:
 * dev, 2026-10-19). `position` is the photo's `object-position` (`'center 30%'`); `id` is the section's, for a link
 * to it. Its words go straight in: the band is the page's column and padding, and a lone wrapper `div` loses its
 * own padding (a wrapper carrying the link's id doubled the band's padding: dev, 2026-10-19). A lone `Card` is a box,
 * not a wrapper, and keeps its padding (a glass card's words touched its edge: dev, 2026-10-27).
 */
export function PhotoBand({
  id,
  src,
  alt = '',
  position,
  className,
  children,
}: {
  id?: string;
  src: string;
  alt?: string;
  position?: string;
  className?: string;
  children: ReactNode;
}) {
  const [turnRef, loadNow, loaded] = useLoadTurn<HTMLElement>();
  return (
    // A near-black base under the photo: while it loads, or if it fails, white words would sit on a white page.
    <section
      ref={turnRef}
      id={id}
      // base.css keeps room between it and the next band or unspaced content beside it.
      data-band=""
      className={cn(
        'relative isolate overflow-clip bg-neutral-950 py-24 text-white md:py-32',
        className,
      )}
    >
      {/* Its turn comes in page order, after the first screen (src/lib/eager-images.ts). On a phone the cards stack
          and the band grows to several screens: a photo stretched over all of it showed a dark sliver blown up
          eight times (dev, 2026-10-22, Painted Wings), and one held in place while the cards slid over it read as a
          page that had stopped scrolling (owner, 2026-10-27). So there the photo is one screen tall at the band's
          top, scrolls with it, and fades into the band's dark under the cards that follow. */}
      {loadNow && (
        <div className="absolute inset-0 -z-10">
          <img
            decoding="async"
            fetchPriority="low"
            src={src}
            alt={alt}
            className="absolute inset-x-0 top-0 h-svh w-full object-cover md:inset-0 md:h-full"
            style={position ? { objectPosition: position } : undefined}
            onLoad={loaded}
            onError={loaded}
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-svh bg-gradient-to-b from-transparent from-55% to-neutral-950 md:hidden" />
        </div>
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-black/60 md:bg-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/55 md:to-black/20"
      />
      {/* A list of rows fills the column, in a card of the page's own too (a schedule shrank to its words: 2026-10-22). */}
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-5 sm:px-8 [&>.grid]:self-stretch [&>:has([data-row-list])]:self-stretch [&>:is(a,button):last-child]:mt-3 [&>div:only-child:not([data-card])]:p-0">
        {children}
      </div>
    </section>
  );
}
