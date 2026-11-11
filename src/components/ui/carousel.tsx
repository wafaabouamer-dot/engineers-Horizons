import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Children, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Swipeable slides (photos, testimonials, products): it follows the finger 1:1, a flick carries its speed, and
 * slides snap into place. Arrows and dots serve mouse and keyboard. Each child
 * is one slide; `slideClassName` sets their width (`basis-full`, `md:basis-1/2`).
 * A photo in a slide shows a quiet fill in its box until it arrives, never an
 * empty hole the page's color.
 */
export function Carousel({
  children,
  label,
  loop = false,
  className,
  slideClassName = 'basis-full',
}: {
  children: ReactNode;
  label: string;
  loop?: boolean;
  className?: string;
  slideClassName?: string;
}) {
  const [viewport, api] = useEmblaCarousel({ loop, align: 'start', duration: 24 });
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setIndex(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    sync();
    api.on('select', sync).on('reInit', sync);
    return () => {
      api.off('select', sync).off('reInit', sync);
    };
  }, [api]);
  const slides = Children.toArray(children);
  return (
    <section aria-roledescription="carousel" aria-label={label} className={cn('relative', className)}>
      <div ref={viewport} className="overflow-hidden">
        {/* The space between slides is each slide's own left padding, pulled back on the track: with a `gap`,
            two `md:basis-1/2` slides plus the gap were wider than the frame and the second lost its corners. */}
        <div className="-ml-4 flex touch-pan-y">
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              className={cn('min-w-0 shrink-0 pl-4 [&_img]:bg-[rgb(120_120_128/0.12)]', slideClassName)}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="gray" size="sm" aria-label="Previous" disabled={!loop && index === 0} onClick={() => api?.scrollPrev()}>
            <ChevronLeft />
          </Button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => api?.scrollTo(i)}
                // A 44px tall touch area above and below the 8px dot; not wider, or neighbors would overlap.
                className={cn(
                  "relative h-2 rounded-full transition-[width,background-color] duration-300 after:absolute after:inset-x-0 after:-inset-y-[18px] after:content-['']",
                  i === index ? 'w-5 bg-[var(--brand)]' : 'w-2 bg-[rgb(120_120_128/0.32)]',
                )}
              />
            ))}
          </div>
          <Button variant="gray" size="sm" aria-label="Next" disabled={!loop && index === count - 1} onClick={() => api?.scrollNext()}>
            <ChevronRight />
          </Button>
        </div>
      )}
    </section>
  );
}
