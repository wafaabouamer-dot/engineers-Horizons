import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A film that plays as the page scrolls (the frames of a video, one per step of the scroll), smooth on every screen:
 * every frame is loaded as soon as the page opens, in an order that gives the whole motion early (every 16th frame,
 * then every 8th, and so on) and never fetched while someone scrolls; the frame for the scroll position is drawn on a
 * canvas at the screen's own sharpness. A phone shows `tallFrames` (a 9:16 version) when there is one: a wide frame
 * filling a phone is its middle strip enlarged about 3.5 times. Production 2026-10-28: a site's own player fetched
 * 300 frames a few at a time while scrolling and stuttered, and on a phone it was blurry.
 *
 *   <ScrollFilm frames={filmFrames('/film/wide', 120)} tallFrames={filmFrames('/film/tall', 120)} label="Our film">
 *     {(progress) => <h1 style={{ opacity: between(progress, 0.4, 0.55) }}>Time, perfected.</h1>}
 *   </ScrollFilm>
 *
 * `frames` are the pictures in order (about 120 at the video's full size, `.jpg`: Safari draws a JPEG frame three
 * times faster than a WebP one, measured 2026-10-28); `screens` is how many screens of
 * scrolling the film lasts (more is slower); the children sit over the film, a function of the film's progress (0 to 1)
 * for words that come and go. The section is that many screens tall, with the film held in place while it plays.
 */
export function ScrollFilm({
  frames,
  tallFrames,
  screens = 4,
  label,
  className,
  children,
}: {
  frames: string[];
  tallFrames?: string[];
  screens?: number;
  label?: string;
  className?: string;
  children?: ReactNode | ((progress: number) => ReactNode);
}) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  // The words over the film follow its progress only when they ask for it (a function), so a film with plain words
  // over it draws a frame and nothing else on each step of the scroll.
  const follows = useRef(false);
  follows.current = typeof children === 'function';
  const [loaded, setLoaded] = useState(0);
  // Read on the first render, so a phone never starts loading the wide frames it will not show.
  const [tall, setTall] = useState(() => typeof window !== 'undefined' && matchMedia('(max-aspect-ratio: 4/5)').matches);

  useEffect(() => {
    const query = matchMedia('(max-aspect-ratio: 4/5)');
    const read = () => setTall(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);

  const set = tall && tallFrames?.length ? tallFrames : frames;
  const key = set.join('|');

  useEffect(() => {
    const box = section.current;
    const view = canvas.current;
    const context = view?.getContext('2d');
    if (!box || !view || !context || !set.length) return;
    const images: (HTMLImageElement | undefined)[] = new Array(set.length);
    const ready = new Array<boolean>(set.length).fill(false);
    let shown = -1;
    let frame = 0;
    let stopped = false;
    let count = 0;

    // The nearest frame already loaded, so a fast scroll during the first seconds shows the motion, never a blank.
    const nearest = (index: number) => {
      for (let step = 0; step < set.length; step++) {
        if (ready[index - step]) return index - step;
        if (ready[index + step]) return index + step;
      }
      return -1;
    };
    const draw = (index: number) => {
      const image = images[index];
      if (!image) return;
      const scale = Math.max(view.width / image.naturalWidth, view.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (view.width - width) / 2, (view.height - height) / 2, width, height);
    };
    const tick = () => {
      frame = 0;
      const rect = box.getBoundingClientRect();
      const range = rect.height - innerHeight;
      const now = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
      const index = nearest(Math.round(now * (set.length - 1)));
      if (index >= 0 && index !== shown) {
        shown = index;
        draw(index);
      }
      if (follows.current) setProgress(Math.round(now * 1000) / 1000);
    };
    const update = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      // Twice the CSS size at most: a phone's 3x canvas costs memory and draws slower for nothing the eye sees.
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const rect = view.getBoundingClientRect();
      view.width = Math.max(1, Math.round(rect.width * ratio));
      view.height = Math.max(1, Math.round(rect.height * ratio));
      shown = -1;
      update();
    };

    // Every frame now, a few at a time: the first, then every 16th, 8th, 4th, 2nd and the rest.
    const order: number[] = [];
    for (const stride of [16, 8, 4, 2, 1]) {
      for (let index = 0; index < set.length; index += stride) if (!order.includes(index)) order.push(index);
    }
    let next = 0;
    const load = () => {
      if (stopped || next >= order.length) return;
      const index = order[next++]!;
      const image = new Image();
      image.decoding = 'async';
      image.onload = image.onerror = () => {
        if (stopped) return;
        ready[index] = image.naturalWidth > 0;
        count++;
        if (count === set.length || count % 8 === 0) setLoaded(count / set.length);
        shown = -1;
        update();
        load();
      };
      image.src = set[index]!;
      images[index] = image;
    };
    for (let lane = 0; lane < 6; lane++) load();

    const watch = new ResizeObserver(resize);
    watch.observe(view);
    addEventListener('scroll', update, { passive: true });
    resize();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      watch.disconnect();
      removeEventListener('scroll', update);
    };
    // `key` stands for the frames, so a new array with the same pictures does not reload them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <section
      ref={section}
      // A full-width band: base.css keeps room between it and the next band or unspaced content.
      data-band=""
      aria-label={label}
      className={cn('relative bg-black text-white', className)}
      style={{ height: `${screens * 100}svh` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {/* Loading: a thin line along the bottom, gone once every frame is in. */}
        {loaded < 1 && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/15">
            <div className="h-full bg-white/70 transition-[width] duration-300" style={{ width: `${loaded * 100}%` }} />
          </div>
        )}
        <div className="relative size-full">{typeof children === 'function' ? children(progress) : children}</div>
      </div>
    </section>
  );
}

/** The frame files `dir/001.jpg` to `dir/<count>.jpg`, as `web-video.mjs --film` makes them (`wb-ai`). */
export function filmFrames(dir: string, count: number, extension = 'jpg'): string[] {
  return Array.from({ length: count }, (_, index) => `${dir}/${String(index + 1).padStart(3, '0')}.${extension}`);
}

/** 0 before `from`, 1 after `to`, easing between: for words that fade in (or `1 - between` to fade out) mid-film. */
export function between(progress: number, from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (progress - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
