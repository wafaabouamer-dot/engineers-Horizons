import { Check } from 'lucide-react';
import { Children, createContext, isValidElement, useContext, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CARD_GLOW } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** The card's button: `label` on a wide card; `short` (else the label's first word) when the card is narrow. */
export type ItemButton = { label: string; short?: string; href?: string; onClick?: () => void };

export type ItemCardProps = {
  /** The item's photo (`/images/…`), across the card's top. */
  image?: string;
  alt?: string;
  title: ReactNode;
  /** A line or two about it. */
  text?: ReactNode;
  /** A quieter line under it: a size, a duration, beds and baths. */
  detail?: ReactNode;
  /** What it includes, one line each, shown as a checklist. */
  points?: ReactNode[];
  price?: ReactNode;
  /** The card's button, beside the price (add to cart, book, choose). */
  button?: ItemButton;
  /** Your own control there instead of `button`. */
  action?: ReactNode;
  /**
   * Why this one stands out, in a few words ("Most popular", "Chef's pick", "Más pedido"): a label on its photo, a
   * wash of the brand color and its edge. Only with words: a card highlighted for no stated reason read as random
   * (owner, 2026-10-22: "it needs to be with intention").
   */
  featured?: ReactNode;
  /** Makes the whole card a link (leave out `button` then). */
  href?: string;
  className?: string;
  /** Anything else, after the words (a note, a badge, a rating). */
  children?: ReactNode;
};

/**
 * A short item (a name, a line, a price) gets a square photo and sits two to a row on a phone; a fuller one gets the
 * width. The line and the detail count together: a gym's classes, each a sentence and a schedule line, stood two to a
 * row on a phone, eight lines tall and 170 px wide (dev, 2026-10-23).
 */
function isShort({ text, detail, points }: Pick<ItemCardProps, 'text' | 'detail' | 'points'>) {
  if (points?.length) return false;
  const words = (value: ReactNode) => (typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0);
  if (text != null && typeof text !== 'string') return false;
  return words(text) + words(detail) <= 12;
}

/**
 * The grid's reading of its cards, so cards side by side share one size: two day passes decided alone, and the one
 * with a word fewer had smaller words than its neighbor (dev, 2026-10-23).
 */
const GridShort = createContext<boolean | null>(null);

/**
 * The grid holds this card alone: with a photo it lies across the row, the photo beside its words, instead of a
 * card a third wide beside an empty row (the kit's audit, 2026-10-24).
 */
const GridAlone = createContext(false);

function ItemAction({ button }: { button: ItemButton }) {
  const short = button.short ?? button.label.split(/\s+/)[0];
  // The card's own width picks the words (a container query): "Add" in half a phone, "Add to cart" where it fits.
  const words = (
    <>
      <span className="@3xs:hidden">{short}</span>
      <span className="hidden @3xs:inline">{button.label}</span>
    </>
  );
  return button.href ? (
    <a href={button.href} className={buttonVariants({ size: 'sm' })}>
      {words}
    </a>
  ) : (
    <Button size="sm" onClick={button.onClick}>
      {words}
    </Button>
  );
}

/**
 * A card for one of the things people choose: a product, a service, a dish, a room, a listing, a class, a plan. Its
 * photo across the top; under it the name, its line and a quieter detail, a checklist of what it includes, and at
 * the foot the price with a small button beside it, so a row's prices and buttons line up (owner's pick of three,
 * 2026-10-22). Give what there is: every part but the name is optional. Several go in `ItemGrid`.
 */
export function ItemCard({
  image,
  alt = '',
  title,
  text,
  detail,
  points,
  price,
  button,
  action,
  featured,
  href,
  className,
  children,
}: ItemCardProps) {
  const alone = useContext(GridAlone);
  const gridShort = useContext(GridShort);
  // Across the row a card has room for its full-size words, whatever the grid read.
  const short = !(alone && image) && (gridShort ?? isShort({ text, detail, points }));
  const standsOut = featured != null && typeof featured !== 'boolean' && featured !== '';
  const label = standsOut && (
    <span className="rounded-full bg-[var(--brand)] px-3 py-1 text-[13px] font-medium whitespace-nowrap text-[var(--brand-ink)] shadow-[0_4px_14px_-4px_rgb(0_0_0/0.45)]">
      {featured}
    </span>
  );
  const foot = price != null || button || action;
  const across = alone && Boolean(image);
  return (
    <Card
      href={href}
      side={across ? 'left' : undefined}
      tone={standsOut ? 'tinted' : 'plain'}
      className={cn(
        '@container relative',
        standsOut && 'ring-1 ring-[var(--brand)]',
        // Across the row the photo is only as tall as the words need: a bakery's one-item categories each stood 448 px
        // tall, half of it an empty panel (production, 2026-10-25).
        across && 'md:[&>.card-media]:min-h-64 md:[&>.card-media]:w-2/5',
        // A short card with no photo glows from a corner: a gym's three gift amounts stood as plain boxes of words
        // (dev, 2026-10-23). A card with a checklist is full already, and a glow there outshone the featured one.
        !image && !points?.length && !standsOut && CARD_GLOW,
        className,
      )}
      media={
        image ? (
          <>
            <img
              src={image}
              alt={alt}
              width={800}
              height={short ? 800 : 500}
              loading="lazy"
              decoding="async"
              className={short && !across ? 'aspect-square' : 'aspect-[16/10]'}
            />
            {/* On the photo, out of the words' flow, so the card's words line up with its neighbors'. */}
            {label && <span className="absolute top-3 left-3 z-10">{label}</span>}
          </>
        ) : undefined
      }
    >
      {label && !image && <div>{label}</div>}
      <h3 className={cn('leading-snug font-semibold tracking-tight text-balance', short ? 'text-lg' : 'text-xl')}>
        {title}
      </h3>
      {text != null && (
        <p className={cn('mt-1.5', short ? 'text-sm opacity-70' : 'leading-relaxed opacity-75')}>{text}</p>
      )}
      {detail != null && <p className="mt-0.5 text-sm opacity-50">{detail}</p>}
      {points && points.length > 0 && (
        <ul className="mt-5 space-y-2.5 border-t border-[var(--separator)] pt-5">
          {points.map((point, i) => (
            <li key={i} className="flex gap-3">
              <Check aria-hidden className="mt-[0.3em] size-4 shrink-0 text-[var(--brand-text)]" strokeWidth={2.5} />
              <span className="opacity-90">{point}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
      {foot && (
        // Across the row the price keeps its button beside it, not at the far end of the card.
        <div className={cn('mt-auto flex flex-wrap items-center gap-2', across ? 'gap-x-6' : 'justify-between')}>
          {price != null && <p className="font-semibold @3xs:text-lg">{price}</p>}
          {button ? <ItemAction button={button} /> : action}
        </div>
      )}
    </Card>
  );
}

/**
 * Lays out a set of `ItemCard`s on every screen, the columns sized to how many there are. On a phone short items
 * (products, dishes) sit two to a row and fuller ones (a paragraph, a checklist) one; `phone` sets it. Fuller ones
 * are never more than three to a row. A last card left alone on a two-column row sits in the middle.
 */
export function ItemGrid({ phone, className, children }: { phone?: 1 | 2; className?: string; children: ReactNode }) {
  const items = Children.toArray(children);
  const n = items.length;
  // Only cards it can read: a card inside the site's own component still sizes itself, and the grid treats it as a
  // fuller one, one to a row on a phone. Read as short, a realtor's wrapped listing cards stood two to a phone's row,
  // 170 px wide, their titles wrapping word by word (production, 2026-10-25).
  const readable = items.every((item) => isValidElement(item) && item.type === ItemCard);
  const short = readable && items.every((item) => isValidElement<ItemCardProps>(item) && isShort(item.props));
  const shared = readable ? short : null;
  const two = (phone ?? (short && n > 1 ? 2 : 1)) === 2;
  // One card with a photo lies across the row (`GridAlone`), at most a reading width; one without stays a card's width.
  const alone =
    n === 1 &&
    (isValidElement<ItemCardProps>(items[0]) && items[0].type === ItemCard && items[0].props.image ? 'max-w-3xl' : 'max-w-md');
  return (
    // The columns follow the grid's own width, not the screen's: beside a 22rem panel a map page's camps stood four to
    // a row, 200 px wide, their names wrapping word by word (production, 2026-10-26). 44 and 60rem are where a
    // full-width section's grid crossed the 768 and 1024 px screens it was drawn for; two to a row from 34rem, so two
    // fuller cards of about 270 px share a 1024 px screen's column beside a panel instead of one card 570 px wide.
    <div className={cn('@container w-full', alone)}>
      <div
        className={cn(
          'grid gap-3 @min-[34rem]:gap-4',
          n > 1 && (two ? 'grid-cols-2' : '@min-[34rem]:grid-cols-2'),
          n === 3 && '@min-[44rem]:grid-cols-3',
          short && n === 4 && '@min-[60rem]:grid-cols-4',
          short && n === 5 && '@min-[44rem]:grid-cols-3 @min-[60rem]:grid-cols-5',
          short && n === 6 && '@min-[44rem]:grid-cols-3',
          short && n > 6 && '@min-[44rem]:grid-cols-3 @min-[60rem]:grid-cols-4',
          // Fuller cards (a paragraph, a checklist) stay three to a row at most: five in a row of 1440 px were 220 px
          // wide, their lists wrapping word by word (owner, 2026-10-22, a salon's services). Four make two rows of two;
          // past that, rows of three on six half-columns, so a last row of one or two sits in the middle.
          !short && n > 4 && '@min-[44rem]:grid-cols-6 @min-[44rem]:[&>*]:col-span-2',
          !short && n > 4 && n % 3 === 1 && '@min-[44rem]:[&>:last-child]:col-start-3',
          !short && n > 4 && n % 3 === 2 && '@min-[44rem]:[&>:nth-last-child(2)]:col-start-2',
          // A last card alone on a two-column row: the middle, its own width (whole class names: Tailwind reads them).
          n > 1 &&
            n % 2 === 1 &&
            (two
              ? '@max-[44rem]:[&>:last-child]:col-span-2 @max-[44rem]:[&>:last-child]:w-[calc(50%-0.375rem)] @max-[44rem]:[&>:last-child]:justify-self-center @min-[34rem]:@max-[44rem]:[&>:last-child]:w-[calc(50%-0.5rem)]'
              : '@min-[34rem]:@max-[44rem]:[&>:last-child]:col-span-2 @min-[34rem]:@max-[44rem]:[&>:last-child]:w-[calc(50%-0.5rem)] @min-[34rem]:@max-[44rem]:[&>:last-child]:justify-self-center'),
          className,
        )}
      >
        <GridAlone.Provider value={n === 1}>
          <GridShort.Provider value={shared}>{children}</GridShort.Provider>
        </GridAlone.Provider>
      </div>
    </div>
  );
}
