import { Children, useEffect, useState, type ReactNode } from 'react';
import { useLoadTurn } from '@/lib/eager-images';
import { cn } from '@/lib/utils';
import { SectionLink } from '@/components/ui/section-head';

/**
 * A photo tile: the photo fills it and its words sit white at its foot over a dark fade. Use it anywhere a photo
 * carries words: a service, a room, a dish, a product, a project, a person.
 */
export function PhotoTile({
  src,
  alt = '',
  position,
  featured,
  className,
  children,
}: {
  src: string;
  alt?: string;
  /** The photo's `object-position` (`'center 25%'` keeps a face clear of the words). */
  position?: string;
  /**
   * Why this one stands out, in a few words ("Most popular", "Best seller"): a label at its top corner and a ring of
   * the brand color, with room kept above the words so they never run under it (a roofer's "Most popular" sat on its
   * service's name on a phone: dev, 2026-10-23).
   */
  featured?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [turnRef, loadNow, loaded] = useLoadTurn<HTMLDivElement>();
  // A tile given its own height keeps it at every size (the FAQ's photo tile shrank on computers when the default
  // gained a phone size: 2026-10-21).
  const ownHeight = /(^|\s|:)min-h-/.test(className ?? '');
  const standsOut = featured != null && typeof featured !== 'boolean' && featured !== '';
  // A photo that is missing or fails to load leaves a tile of the brand color, never a broken image over a black box
  // with the words at its foot (the kit's audit, 2026-10-24).
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const noPhoto = !src?.trim() || failed;
  useEffect(() => {
    if (loadNow && noPhoto) loaded();
  }, [loadNow, noPhoto, loaded]);
  return (
    <div
      ref={turnRef}
      className={cn(
        'relative isolate flex flex-col justify-end overflow-hidden rounded-3xl p-6 md:p-7',
        // Without its photo: the site's quiet card surface with a glow of the brand in one corner and the page's own
        // words (base.css), not a picture that failed.
        noPhoto ? 'tile-no-photo' : 'bg-neutral-900 text-white',
        // Shorter on a phone, so a few show on a screen (owner, 2026-10-21: "the smaller cards on mobile look better").
        !ownHeight && 'min-h-60 md:min-h-80',
        className,
        standsOut && 'pt-20 ring-2 ring-[var(--brand)] md:pt-20',
      )}
    >
      {standsOut && (
        <span className="absolute top-4 left-4 z-10 rounded-full bg-[var(--brand)] px-3 py-1 text-[13px] font-medium whitespace-nowrap text-[var(--brand-ink)] shadow-[0_4px_14px_-4px_rgb(0_0_0/0.45)]">
          {featured}
        </span>
      )}
      {/* Its turn comes in page order, after the first screen (src/lib/eager-images.ts). */}
      {loadNow && !noPhoto && (
        <img
          decoding="async"
          fetchPriority="low"
          src={src}
          alt={alt}
          className="absolute inset-0 -z-10 size-full object-cover"
          style={position ? { objectPosition: position } : undefined}
          onLoad={loaded}
          onError={() => {
            loaded();
            setFailed(true);
          }}
        />
      )}
      {!noPhoto && (
        <div
          aria-hidden
          // On a phone the words fill more of the shorter tile, so the fade reaches higher and a label at the top stays
          // readable over a bright photo (2026-10-21).
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/60 to-black/30 md:via-black/45 md:to-black/0"
        />
      )}
      {children}
    </div>
  );
}

/** A shade over a photo tile's top, so the word there reads on a bright photo; none on a tile whose photo is missing. */
function TopShade({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 -z-10 h-2/5 bg-gradient-to-b from-black/70 to-transparent [.tile-no-photo_&]:hidden',
        className,
      )}
    />
  );
}

/** A tile's words: ONE short name at the tile's top (its `label`, else its title), the rest at its foot: the title, a
 *  line and a row with a price or detail and a button. All of them stacked at the foot read crowded, and only that one
 *  word goes up (owner, 2026-10-28: "the title on the top and the rest on the bottom", then "only the title, one
 *  word"; a tag at the top was rejected). */
export function TileWords({
  label,
  title,
  text,
  price,
  action,
  large = false,
}: {
  label?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  price?: ReactNode;
  /** A link styled with `buttonVariants({ variant: 'glass', size: 'sm' })`. */
  action?: ReactNode;
  /** A bigger name, for a wide tile. */
  large?: boolean;
}) {
  const name = <h3 className={cn('font-semibold tracking-tight', large ? 'text-3xl' : 'text-2xl')}>{title}</h3>;
  return (
    <>
      <TopShade className={label ? 'h-1/4 from-black/55' : undefined} />
      {label ? (
        <>
          <p className="mb-auto text-sm font-medium text-white/80">{label}</p>
          <div className="mt-4">{name}</div>
        </>
      ) : (
        <div className="mb-auto">{name}</div>
      )}
      {text && <p className={cn('max-w-md text-[15px] leading-relaxed text-white/90', label ? 'mt-2' : 'mt-4')}>{text}</p>}
      {(price || action) && (
        <div className="mt-5 flex items-center justify-between gap-4">
          {price ? <span className="font-semibold">{price}</span> : <span />}
          {action}
        </div>
      )}
    </>
  );
}

/**
 * A section as a photo mosaic (owner-approved, 2026-10-19): a large lead tile holding the section's label, title,
 * line and button beside 2 to 4 `PhotoTile`s, all one height band, rising into place as it scrolls into view.
 * It lays the tiles out by count (2: two wide tiles; 3: two small and one wide; 4: a 2x2). `flip` puts the lead on
 * the right: alternate it down a page. From tablets up the lead is a tall column, so a portrait keeps its face.
 */
export function Mosaic({
  id,
  lead,
  flip = false,
  children,
}: {
  id?: string;
  lead: {
    src: string;
    alt?: string;
    position?: string;
    eyebrow?: string;
    title: ReactNode;
    intro?: ReactNode;
    /** A small link onward ("See our plans"), drawn as the kit's `SectionLink`: a section between the first screen
     * and the last leads on with a link, never a full button (owner, 2026-10-19). */
    link?: { label: string; href: string };
    /** Older pages' full button; use `link`. */
    action?: ReactNode;
  };
  flip?: boolean;
  /** 2 to 4 `PhotoTile`s. */
  children: ReactNode;
}) {
  const tiles = Children.toArray(children).slice(0, 4);
  const span = (index: number) =>
    tiles.length === 2
      ? 'lg:col-span-2'
      : tiles.length === 3 && index === 2
        ? 'md:col-span-2 lg:col-span-2'
        : tiles.length === 4 && index >= 2
          ? 'md:col-span-1'
          : '';
  return (
    // A Mosaic is its own padded section; put straight inside a page's own padded section, it drops its padding and
    // width so the two do not add up (tiles 40 px from a phone's edge on 3 real sites, 2026-10-21). Only a section
    // with a width or side padding of its own: inside a bare `<section id>` (a link target) the tiles ran to the
    // screen's edges (production, 2026-10-26, two sites).
    <section
      id={id}
      className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16 [section:is([class*=max-w-],[class*=px-])>&]:max-w-none [section:is([class*=max-w-],[class*=px-])>&]:p-0"
    >
      <div
        className="grid gap-4 md:grid-cols-2 lg:h-[44rem] lg:grid-cols-4 lg:grid-rows-2"
      >
        <PhotoTile
          src={lead.src}
          alt={lead.alt}
          position={lead.position}
          className={cn(
            'min-h-[26rem] p-8 md:row-span-2 md:row-start-1 md:min-h-[40rem] md:p-10 lg:col-span-2',
            flip ? 'md:col-start-2 lg:col-start-3' : 'md:col-start-1',
          )}
        >
          {/* Only its small label goes to its top, as the tiles' one word does; the headline stays with its line and
              link at the foot (owner, 2026-10-28: "only the title, one word ... on this case only 'Coverage'"). */}
          {lead.eyebrow && (
            <>
              <TopShade className="h-1/4 from-black/55" />
              <p className="mb-auto text-sm font-medium uppercase tracking-[0.14em] text-white/80">{lead.eyebrow}</p>
            </>
          )}
          <h2
            className={cn(
              // The largest size only from a computer: in a tablet's half-width tile it split words ("Engineerin|g").
              'text-4xl font-semibold tracking-tight text-balance lg:text-5xl',
              lead.eyebrow && 'mt-6',
            )}
          >
            {lead.title}
          </h2>
          {lead.intro && <p className="mt-4 max-w-md text-lg text-white/90">{lead.intro}</p>}
          {lead.link ? (
            <SectionLink href={lead.link.href} className="mt-6 self-start">
              {lead.link.label}
            </SectionLink>
          ) : (
            lead.action && <div className="mt-8">{lead.action}</div>
          )}
        </PhotoTile>
        {tiles.map((tile, index) => (
          <div key={index} className={cn('flex min-h-60 md:min-h-80 [&>*]:flex-1', span(index))}>
            {tile}
          </div>
        ))}
      </div>
    </section>
  );
}
