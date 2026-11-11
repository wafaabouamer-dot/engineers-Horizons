import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Carousel } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

export type Review = {
  quote: ReactNode;
  name: string;
  /** Who they are: "Regular since 2019", "Bride, June 2026". */
  detail?: ReactNode;
  /** 1 to 5; leave out for no stars. */
  stars?: number;
  /** Their photo (`/images/…`); without one, their initials in a circle of the accent color. */
  image?: string;
};

/** A review's words between quote marks in the accent, the size of the words, at their start and end (owner,
 *  2026-10-28: a large mark above the words and another under them read as misplaced). Marks the page typed itself are
 *  dropped, never doubled; words given as elements are shown as they are. */
function Quoted({ quote, accent }: { quote: ReactNode; accent: string }) {
  if (typeof quote !== 'string') return <>{quote}</>;
  const words = quote.trim().replace(/^["“”„]+/, '').replace(/["“”]+$/, '');
  // line-height 0: a mark a little larger than the words never makes its line taller than the rest.
  // A little room between each mark and the words: the opening one touched the first letter (owner, 2026-10-28).
  const mark = cn('font-serif text-[1.2em] leading-[0] font-bold', accent);
  return (
    <>
      <span aria-hidden className={cn(mark, 'mr-[0.14em]')}>
        &ldquo;
      </span>
      {words}
      <span aria-hidden className={cn(mark, 'ml-[0.08em]')}>
        &rdquo;
      </span>
    </>
  );
}

/** A review of a sentence or two. */
const short = (quote: ReactNode) => typeof quote === 'string' && quote.length <= 140;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

/**
 * What customers say: each review a card with its stars in the accent color when it has them, the words between
 * quote marks in the accent (larger when every review is short, one size in a row), and who said it (their photo, or
 * their initials in an accent circle). Plain words in a plain card read too plain (owner, 2026-10-28). Three side by
 * side on a computer, two on a tablet, one and the edge of the next on a phone; past that many they swipe, with
 * arrows for a mouse. `label` names them for screen readers ("Reviews"). `tone="glass"` over a photo.
 */
export function Reviews({
  items,
  label,
  tone = 'plain',
  className,
}: {
  items: Review[];
  label: string;
  tone?: 'plain' | 'glass';
  className?: string;
}) {
  const n = items.length;
  // Larger words when every review is a sentence or two, so short ones fill their cards; one size for all of a row
  // (owner, 2026-10-28: a larger short review beside a smaller long one did not match).
  const large = n === 1 || items.every((review) => short(review.quote));
  // The site's accent (base.css); on a photo its light form, as a dark one vanished there.
  const accent = tone === 'glass' ? 'text-[var(--accent-light)]' : 'text-[var(--accent-text)]';
  // One review is a wide quote in the middle of the row, two share it: a lone card a third wide, or two beside an empty
  // third, left the row half empty (the kit's audit, 2026-10-24).
  return (
    <Carousel
      label={label}
      className={cn(n === 1 && 'mx-auto max-w-3xl', className)}
      slideClassName={n === 1 ? 'basis-full' : n === 2 ? 'basis-[86%] sm:basis-1/2' : 'basis-[86%] sm:basis-1/2 lg:basis-1/3'}
    >
      {items.map((review, i) => (
        <Card key={i} tone={tone} className={cn('h-full gap-5 p-6 md:p-7', n === 1 && 'md:p-10')}>
          {review.stars != null && (
            <div className="flex gap-1" role="img" aria-label={`${review.stars} / 5`}>
              {Array.from({ length: 5 }, (_, star) => (
                <Star
                  key={star}
                  aria-hidden
                  className={cn('size-[18px]', star < review.stars! ? cn('fill-current', accent) : 'opacity-25')}
                />
              ))}
            </div>
          )}
          {/* On a phone one card shows at a time, each as tall as the longest: a four-line review stood in a card 672 px
              tall beside an eighteen-line one (dev, 2026-10-28). There a long review shows its first eight lines. */}
          <blockquote
            className={cn(
              'text-pretty',
              large
                ? 'text-xl leading-snug font-medium tracking-tight md:text-2xl'
                : 'text-lg leading-relaxed max-sm:line-clamp-8',
            )}
          >
            <Quoted quote={review.quote} accent={accent} />
          </blockquote>
          <div className="mt-auto flex items-center gap-3 pt-2">
            {review.image ? (
              <img
                src={review.image}
                alt=""
                width={80}
                height={80}
                loading="lazy"
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--accent-text)_18%,transparent)] text-sm font-semibold text-[var(--accent-text)]"
              >
                {initials(review.name)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-semibold">{review.name}</span>
              {review.detail != null && (
                <span className={cn('block text-sm', tone === 'glass' ? 'text-white/75' : 'opacity-65')}>
                  {review.detail}
                </span>
              )}
            </span>
          </div>
        </Card>
      ))}
    </Carousel>
  );
}
