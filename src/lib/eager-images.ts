import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Every picture loads before anyone scrolls to it, the first screen's first, then the rest from the top of the page
 * down (owner, 2026-10-19: scrolling down must show everything already there, and a slow phone must not wait).
 *
 * 1. The first screen's pictures (the hero photo, the logo) download alone. The kit's other photos (`PhotoTile`,
 *    `PhotoBand`, `FormBand`) are not on the page yet, and pictures written `loading="lazy"` wait.
 * 2. Once the app has drawn and those have arrived (8 s at most), the rest go in page order, three at a time, each
 *    starting as one finishes, so the section a visitor reaches next is the one that arrives next.
 * 3. A photo that comes near the screen (a fast scroll) starts at once, ahead of the queue.
 *
 * Measured on a throttled 200 KB/s phone link, gym build: with every photo started together the hero photo took
 * 14.8 s, and after it the other eleven shared the line and finished in no order between 21 and 36 s. `loading="lazy"`
 * alone does not hold pictures back (the browser fetches lazy pictures within about two screens at once), and the
 * page's `load` event fires before React draws the page, so neither can be the signal.
 */
const IN_FLIGHT = 3;
const STALL_MS = 15_000;

type Item = {
  el: Element;
  start: () => void;
  started: boolean;
  done: boolean;
  timer?: ReturnType<typeof setTimeout>;
};
const queue: Item[] = [];
let active = 0;
let ready = false;
// The pictures still to come, for the agent's page pictures (check-ui `shot:` waits for those it covers): a kit photo
// has no <img> until its turn, so a picture taken before then showed its tile empty (dev4 browser test 2026-10-19).
if (typeof window !== 'undefined') {
  (window as Window & { __wbPhotosWaiting?: () => Element[] }).__wbPhotosWaiting = () => queue.map((item) => item.el);
}

const topOf = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

function begin(item: Item) {
  item.started = true;
  active += 1;
  // A picture that never answers frees its place, so one stuck request cannot stop the rest.
  item.timer = setTimeout(() => finish(item), STALL_MS);
  item.start();
}

function finish(item: Item) {
  if (item.done) return;
  item.done = true;
  if (item.timer) clearTimeout(item.timer);
  if (item.started) active -= 1;
  const at = queue.indexOf(item);
  if (at >= 0) queue.splice(at, 1);
  pump();
}

function pump() {
  if (!ready) return;
  const waiting = queue.filter((item) => !item.started).sort((a, b) => topOf(a.el) - topOf(b.el));
  for (const item of waiting) {
    if (active >= IN_FLIGHT) break;
    begin(item);
  }
}

/**
 * For a kit photo: a ref for the element that holds it, whether its turn has come (render the `<img>` then), and the
 * call for its `onLoad`/`onError` that hands the place to the next photo.
 */
export function useLoadTurn<T extends Element>() {
  const ref = useRef<T>(null);
  const item = useRef<Item | null>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const entry: Item = { el, start: () => setGo(true), started: false, done: false };
    item.current = entry;
    queue.push(entry);
    pump();
    const near = new IntersectionObserver(
      (entries) => {
        if (ready && !entry.started && entries.some((e) => e.isIntersecting)) begin(entry);
      },
      { rootMargin: '800px 0px' },
    );
    near.observe(el);
    return () => {
      near.disconnect();
      finish(entry);
    };
  }, []);
  const loaded = useCallback(() => {
    if (item.current) finish(item.current);
  }, []);
  return [ref, go, loaded] as const;
}

export function loadImagesEagerly() {
  // A picture written `loading="lazy"` joins the same queue: its turn switches it to eager, its load frees the place.
  const enqueue = (img: HTMLImageElement) => {
    if (queue.some((item) => item.el === img)) return;
    const entry: Item = {
      el: img,
      start: () => {
        if (!img.getAttribute('fetchpriority')) img.fetchPriority = 'low';
        img.loading = 'eager';
      },
      started: false,
      done: false,
    };
    if (img.complete) return;
    img.addEventListener('load', () => finish(entry), { once: true });
    img.addEventListener('error', () => finish(entry), { once: true });
    queue.push(entry);
  };
  const enqueueAll = (root: ParentNode) => {
    for (const img of root.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) enqueue(img);
  };
  const frame = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  // The pictures the first screen is already loading (not lazy): the hero photo, the logo.
  const firstScreen = () =>
    new Promise<void>((resolve) => {
      const pending = [...document.images].filter((img) => !img.complete && img.loading !== 'lazy');
      let left = pending.length;
      if (left === 0) return resolve();
      const one = () => {
        left -= 1;
        if (left <= 0) resolve();
      };
      for (const img of pending) {
        img.addEventListener('load', one, { once: true });
        img.addEventListener('error', one, { once: true });
      }
    });
  const start = async () => {
    for (let i = 0; i < 120 && !document.querySelector('#root > *'); i += 1) await frame();
    await frame();
    await Promise.race([firstScreen(), new Promise<void>((resolve) => setTimeout(resolve, 8000))]);
    ready = true;
    enqueueAll(document);
    pump();
  };
  void start();
  new MutationObserver((records) => {
    if (!ready) return;
    let added = false;
    for (const record of records) {
      if (record.type === 'attributes') {
        const img = record.target as HTMLImageElement;
        if (img.loading === 'lazy') {
          enqueue(img);
          added = true;
        }
        continue;
      }
      for (const node of record.addedNodes) {
        if (node instanceof HTMLImageElement) {
          if (node.loading === 'lazy') {
            enqueue(node);
            added = true;
          }
        } else if (node instanceof Element) {
          enqueueAll(node);
          added = true;
        }
      }
    }
    if (added) pump();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['loading'],
  });
}
