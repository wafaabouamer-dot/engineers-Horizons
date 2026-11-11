import { MapPin } from 'lucide-react';
import { Children, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Where to find the business: a map of `address` beside its details (`children`: the address, hours, how to get there,
 * buttons), in one card; the map on top on a phone. The map is Google's for the address, darkened in dark mode, and
 * shows a soft panel with a pin while it loads, never an empty box (a lazy map photographed before it arrived read as
 * an empty card: 2026-10-22). Directions are a link to `https://www.google.com/maps/search/?api=1&query=` and the
 * address; put it in `children` as a button. The map goes beside the details when the card itself is wide enough
 * (a container query), on top of them otherwise: in a listing page's narrow column at a tablet's width, a side-by-side
 * card gave the address a strip one word wide (production QA bots, 2026-10-25). Details of two items or fewer (an
 * address and a Directions button) never go beside the map: in a map-tall column they read as a line at the top and a
 * button at the foot over empty space (owner, 2026-11-04, a barber site on an iPad). The map stays on top and,
 * where the card is wide, the address and the button share one row under it.
 */
export function MapCard({
  address,
  title,
  side = 'right',
  className,
  children,
}: {
  address: string;
  /** The map's name for screen readers: "Map of Grano Alto in El Poblado". */
  title: string;
  /** Which side the map is on when the card is wide enough for both. */
  side?: 'left' | 'right';
  className?: string;
  children: ReactNode;
}) {
  const short = Children.toArray(children).length <= 2;
  return (
    // The page's classes (a grid place, a margin) go on the box the card measures itself by.
    <div className={cn('@container', className)}>
      <Card className={cn('grid h-full gap-0 overflow-hidden p-0', !short && '@2xl:grid-cols-5')}>
        {/* In the middle of its side: a heading and an address at the top of a map-tall panel left it mostly empty
            below (the kit's audit, 2026-10-24). Ending in a button, the words start at the top and the button sits
            at the foot, its own width: centered together, a daycare's "Get directions" floated in the middle as a
            bar across the panel (owner, 2026-10-26: "the text more up and the button more down"). The panel sets
            the space between its lines: its own gap and a page's margins added up to wide holes. */}
        <div
          className={cn(
            'flex flex-col gap-3 p-6 [&>*]:my-0',
            '[&>:last-child:is(a,button)]:mt-3 [&>:last-child:is(a,button)]:self-start',
            short
              ? '@2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6 @2xl:px-8 @2xl:[&>:last-child:is(a,button)]:mt-0 @2xl:[&>:last-child:is(a,button)]:self-center'
              : '@2xl:col-span-2 @2xl:justify-center @2xl:p-8 @2xl:[&>:last-child:is(a,button)]:mt-auto',
            side === 'left' && !short && '@2xl:order-2',
          )}
        >
          {children}
        </div>
        <div
          className={cn(
            'relative min-h-64 bg-[rgb(120_120_128/0.14)]',
            short ? 'order-first @2xl:min-h-80' : '@max-2xl:order-first @2xl:col-span-3 @2xl:min-h-96',
          )}
        >
          <MapPin aria-hidden className="absolute top-1/2 left-1/2 size-8 -translate-1/2 text-[var(--brand-text)] opacity-60" />
          <iframe
            title={title}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`}
            loading="lazy"
            // Nothing at all: the full address handed Google the preview's pass
            // (`/__wb_view/…`), and this keyless embed renders with no Referer
            // (headless Chromium on dev, 2026-10-25).
            referrerPolicy="no-referrer"
            className="absolute inset-0 size-full border-0 dark:[filter:invert(0.92)_hue-rotate(180deg)_saturate(0.8)]"
          />
        </div>
      </Card>
    </div>
  );
}
