import { Children, isValidElement, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** A photo across the top, edge to edge: an <img> with width, height and alt (its own aspect class). */
  media?: ReactNode;
  /**
   * With `media`: the photo beside the text instead of across the top, from tablets up (left or right of it). The
   * photo fills its half at whatever height the text needs, so a photo and the words about it share one card and
   * neither side is ever empty (a portrait card beside a stretched text card was half empty: dev, 2026-10-19).
   * A section that is this one card carries its title inside it: a small label, then the headline at the
   * section-title size, never a title floating above the card.
   */
  side?: 'left' | 'right';
  /**
   * plain (default): a surface a step off the page. tinted: a faint wash of the brand color, for one featured card.
   * glass: the kit's see-through liquid glass (as the header) with white text, for a card over a photo; its fields
   * get a dark fill so they read on the picture (plain is nearly clear there and a form's fields vanished: dev,
   * 2026-10-19; the owner chose see-through over a frosted card), and its titles (`h3`) take the brand color,
   * lifted toward white in light mode so a dark brand still reads on the glass (owner, 2026-10-19: word cards
   * over a photo read too plain; an icon on each was rejected).
   */
  tone?: 'plain' | 'tinted' | 'glass';
  /** Makes the whole card a link that lifts a little under the pointer. */
  href?: string;
};

/**
 * The card for items side by side (features, steps, plans, products, stats, reviews), so no text sits bare on
 * the page. A material, not a box: a surface a step off the page in either mode, a hairline edge brighter at
 * the top where light catches it, and a soft shadow instead of a border. Plain utilities, so a `className`
 * restyles it. Put a grid around several, sized to how many there are, so none sits alone on a last row:
 * 2 `sm:grid-cols-2`, 3 `md:grid-cols-3`, 4 `sm:grid-cols-2 lg:grid-cols-4`, 6 `sm:grid-cols-2 lg:grid-cols-3`
 * (`gap-4`). Cards in a row are the same height: keep the grid's stretch (no `items-start`/`items-center`).
 * The card pads its own words: put them straight inside. A lone wrapper `div` loses its own padding, so words
 * wrapped in a padded `div` are not padded twice (a three-up row at a tablet's width kept a sliver of text: dev,
 * 2026-10-19). Only what closes the card, a button or a price, goes last with `mt-auto`, so a row's buttons line
 * up; its words stay together under the title. A photo and its words go in one card with `side`, never a photo
 * card beside a text card.
 *
 * A card with no photo is ONE box: `className` styles the box that holds the words, so a page's own padding
 * replaces the card's and its gap, grid or row reach the content. It used to be a shell around a padded body, and
 * pages that wrote `className="grid gap-4 p-6"` or `"flex items-center justify-between"` got double padding, a
 * button against its text and rows squeezed into the middle (production, 2026-10-21, a food-ordering site's orders
 * and admin pages). The card is a column (for `mt-auto`) unless the page gives it a display of its own. Its contents
 * are spaced whatever they are (owner, 2026-10-21: "she can put text and buttons and whatever she wants and it will
 * lay them out beautifully"): an even step between items unless an item or the page sets its own spacing.
 */
/** A few words, or one heading or line holding only them: what a card that is just a name holds. */
function isName(children: ReactNode): boolean {
  const few = (value: unknown) =>
    (typeof value === 'string' || typeof value === 'number') && String(value).trim() !== '' && String(value).trim().split(/\s+/).length <= 4;
  const parts = Children.toArray(children);
  if (parts.length !== 1) return false;
  const only = parts[0];
  if (few(only)) return true;
  return (
    isValidElement<{ children?: unknown }>(only) &&
    typeof only.type === 'string' &&
    /^(h[1-6]|p|span|strong)$/.test(only.type) &&
    few(only.props.children)
  );
}

/** The brand glow from a card's bottom corner: a card with no photo reads as designed rather than an empty box. */
export const CARD_GLOW =
  'bg-[radial-gradient(farthest-corner_at_100%_100%,color-mix(in_oklab,var(--brand)_30%,transparent),transparent_70%)]';

export function Card({ media, side, tone = 'plain', href, className, children, ...props }: CardProps) {
  const beside = Boolean(media && side);
  const single = !media;
  // A class the page gives in any variant (`md:flex`, `sm:p-8`): the page lays out or pads the card itself. One aimed
  // at something inside the card (`[&_form]:grid`) is not the card's own.
  const pageSets = (kind: RegExp) =>
    typeof className === 'string' &&
    className
      .split(/\s+/)
      .some((name) => !name.startsWith('[') && !name.includes(']:') && kind.test(name.split(':').pop() ?? ''));
  const ownDisplay = pageSets(/^(?:flex|inline-flex|grid|inline-grid|block|inline-block|contents|table)$/);
  const ownPadding = pageSets(/^p[xytrbl]?-/);
  const ownSpacing = pageSets(/^(?:gap|space-[xy])-/);
  // A card holding only a name (a category, a dish, a place: a few words, or one heading of them) is a tile: the name
  // in its middle over a glow of the brand color. Five boxes with one word at the foot read as empty (production,
  // 2026-10-23, a food truck's categories; owner, 2026-10-24: "the text out of place"), and one with its word at the
  // top over an empty box too. A photo of each is better still: `ItemCard` with `image`, or `PhotoTile`.
  const nameOnly = single && tone === 'plain' && isName(children);
  const classes = cn(
    'overflow-hidden rounded-3xl',
    !(single && ownDisplay) && 'flex flex-col',
    single && !ownPadding && 'p-6 md:p-7',
    single && '[&>:has(+.mt-auto):not([class*=mb-])]:mb-4',
    // A lone padded wrapper loses its padding (the card pads), unless the page took the card's padding away to pad
    // the wrapper itself (`p-0` on the card, `p-6` inside: 5 real sites, 2026-10-21).
    single && !ownPadding && '[&>div:only-child:not([data-card])]:p-0',
    // Whatever goes inside is spaced: a column of words, buttons, fields or a picture gets an even step between
    // items (an item's own margin wins), a card the page lays out itself gets a gap (the page's own gap wins).
    single && !ownDisplay && !ownSpacing && 'card-flow',
    // A grid taller than its contents (a card stretched to its row's height) keeps its lines together at the top.
    single && ownDisplay && 'content-start gap-3',
    beside && (side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'),
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_0_0_1px_rgb(120_120_128/0.14),0_1px_2px_rgb(0_0_0/0.05),0_12px_32px_-20px_rgb(0_0_0/0.35)]',
    tone === 'tinted'
      ? 'bg-[color-mix(in_oklab,var(--brand)_12%,transparent)]'
      : tone === 'glass'
        ? // Words on see-through glass over a busy photo stay crisp a step heavier (apple-design, vibrancy).
          'glass font-medium shadow-[inset_0_1px_0_rgb(255_255_255/0.14),inset_0_0_0_1px_rgb(255_255_255/0.1),0_12px_32px_-10px_rgb(0_0_0/0.7)] [&_h3]:text-[var(--brand-text)] [:root:not(.dark)_&_h3]:text-[color-mix(in_oklab,var(--brand)_60%,white)] [&_:is(input,select,textarea)]:bg-black/45 [&_:is(input,select,textarea)]:text-white [&_[role=combobox]]:bg-black/45 [&_[role=combobox]]:text-white [&_[role=combobox]]:shadow-none'
        : 'bg-[rgb(120_120_128/0.1)]',
    nameOnly && CARD_GLOW,
    href &&
      'transition-[translate,box-shadow] duration-500 ease-[var(--ease-spring)] hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_0_0_1px_rgb(120_120_128/0.2),0_2px_4px_rgb(0_0_0/0.06),0_24px_48px_-24px_rgb(0_0_0/0.45)]',
    className,
    // After the page's own classes: the name sits in the middle whatever alignment the page gave the box.
    nameOnly && '!grid !content-center !items-center !justify-items-start',
  );
  const body = (
    <>
      {media && (
        <div
          // A photo that is missing or fails to load leaves a tinted panel, never a broken image (a restaurant added
          // without a photo showed one on a live home page: Kendall Eats v2, 2026-10-22).
          onErrorCapture={(event) => {
            if (event.target instanceof HTMLImageElement) event.target.style.visibility = 'hidden';
          }}
          onLoadCapture={(event) => {
            // A photo given later (a new src) shows again once it loads.
            if (event.target instanceof HTMLImageElement) event.target.style.visibility = '';
          }}
          className={cn(
            // `card-media`: on a phone a wide photo across the card's top is a banner at most 176 px tall (base.css).
            'card-media bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] [&_img]:block [&_img]:w-full [&_img]:object-cover [&_img:not([src])]:invisible',
            // Beside the text the photo fills its half at the text's height (at least a good portrait's), whatever
            // its own aspect class says.
            beside &&
              'relative md:min-h-[28rem] md:w-5/12 md:shrink-0 md:[&_img]:absolute md:[&_img]:inset-0 md:[&_img]:size-full',
          )}
        >
          {media}
        </div>
      )}
      {/* What sits right above an `mt-auto` closing item keeps a gap unless it sets its own: in a card with no room
          to spare `mt-auto` is 0, and a price sat on its button (dev, 2026-10-19). */}
      <div
        className={cn(
          // No quotes in this class: Tailwind reads the file's own text, so an escaped quote names another class.
          'card-flow flex flex-1 flex-col p-6 md:p-7 [&>:has(+.mt-auto):not([class*=mb-])]:mb-4 [&>div:only-child:not([data-card])]:p-0',
          // Beside a photo the words sit together in the middle: a closing button follows them, never a gap.
          beside && 'md:justify-center md:p-10 lg:p-12 md:[&>.mt-auto]:mt-8',
        )}
      >
        {children}
      </div>
    </>
  );
  const content = single ? children : body;
  // `data-card` lets base.css find a card beside a group of cards (it keeps its own height there).
  return href ? (
    <a href={href} data-card="" className={classes} {...props}>
      {content}
    </a>
  ) : (
    <div data-card="" className={classes} {...props}>
      {content}
    </div>
  );
}
