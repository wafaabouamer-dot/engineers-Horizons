import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Sheet } from '@/components/ui/sheet';
import { useFitRow } from '@/lib/fit-row';
import { useLang, useLangMenu } from '@/lib/lang';
import { cn } from '@/lib/utils';

/** A page link for the menu: `href` (a page or `#section`) or `onClick`; `current` marks the page shown. */
export type MenuLink = { label: string; href?: string; onClick?: () => void; current?: boolean };

/**
 * The bar holds ONE row. A page's own row (one flex box, or a component of its own) is used as given. Anything
 * else, the logo, links and buttons put in one by one, is laid out in the kit's row: the first item (the name)
 * on the left, the rest on the right. Put in loose, the logo itself was taken for the row and the bar came out
 * reversed, its menu button over the name (dev, 2026-10-22, a bakery).
 */
/** The menu button's name follows the page's own language (the site's <html lang>), like the kit's other words. */
function menuWords(): string {
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es') ? 'Menú' : 'Menu';
}

/**
 * How far below the top of what follows the bar its first words sit: the bar floats over a first screen's photo,
 * so a page that opens with words needs room above them (`null` when there are none to measure).
 */
function firstWordsOffset(bar: HTMLElement): number | null {
  let from: Element | null = bar;
  while (from && !from.nextElementSibling) from = from.parentElement;
  const next = from?.nextElementSibling;
  if (!(next instanceof HTMLElement)) return null;
  const walker = document.createTreeWalker(next, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || node.parentElement?.closest('[aria-hidden="true"], .sr-only')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    return box.top - next.getBoundingClientRect().top;
  }
  return null;
}

/**
 * A bilingual site's menu always offers its languages: on a phone the bar folds the language switch away, and three
 * of five sites whose menus left them out had no way to Spanish there (QA bots round 6, production, 2026-10-26).
 * A menu that already lists them (by name or code) is left as it is.
 */
function withLanguages(menu: MenuLink[], languages: MenuLink[], codes: string[]): MenuLink[] {
  const listed = new Set(menu.map((link) => link.label.trim().toLowerCase()));
  const named = [...languages.map((language) => language.label.toLowerCase()), ...codes];
  return named.some((name) => listed.has(name)) ? menu : [...menu, ...languages];
}

/** Where a link goes, the same for `/#book` and `#book` on the home page. */
const samePlace = (href: string | null | undefined) => (href ?? '').trim().replace(/^\/(?=#)/, '');

function oneRow(children: ReactNode, pages: MenuLink[] = []): ReactNode {
  const items = Children.toArray(children);
  const only = items.length === 1 ? items[0] : undefined;
  if (isValidElement<{ className?: unknown }>(only) && only.type !== Fragment) {
    if (typeof only.type !== 'string') return only;
    if (/(^|\s)(inline-)?flex(\s|$)/.test(String(only.props.className ?? ''))) return only;
  }
  const [name, ...rest] = items;
  return (
    <div data-kit-row="" className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5 sm:px-8 [&>:first-child]:mr-auto">
      {name}
      {/* The menu's pages, when the row has no links of its own: a clinic's bar of logo, account, sun/moon and
          language showed a computer only a menu button (dev, 2026-10-22). They fold back into the menu first. */}
      {pages.length > 0 && (
        <nav data-menu-pages="" className="flex items-center gap-6">
          {pages.map((page) => (
            <a
              key={page.label}
              href={page.href}
              aria-current={page.current ? 'page' : undefined}
              // 40px tall to press on a touch screen; the padding is empty, so the row looks the same.
              className="py-2.5 text-[15px] font-medium whitespace-nowrap"
            >
              {page.label}
            </a>
          ))}
        </nav>
      )}
      {rest}
    </div>
  );
}

/**
 * The header: a see-through glass capsule floating over the top of the page (owner, 2026-10-19). It takes no
 * room of its own, so the first section starts behind it and its photo or color shows through from the first
 * screen. `className` styles the capsule. A site in one language uses it as it is, with no `LangProvider` (a
 * portfolio wrote its own header, taking the bar for one that needed a language setup: production, 2026-10-29).
 * With `menu`, the row keeps one line at every width: what does not fit (the links first, then each
 * `data-fold` control from the end) moves into the menu button, which opens those links in a Sheet
 * (src/lib/fit-row.ts). Put every link, and every `data-fold` control, in `menu`. On a phone the bar is the name,
 * the sun/moon and the menu button: the `data-fold` controls (the main button, a language switch) live in the menu
 * there (owner, 2026-10-19: the booking button is on every section already; the bar's copy was one too many).
 * A control marked `data-keep` (a shop's cart with its count) is never folded, on a phone too.
 */
export function GlassBar({
  children,
  tone = 'light',
  className,
  menu,
  menuLabel = menuWords(),
}: {
  children: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
  menu?: MenuLink[];
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const capsule = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const languages = useLangMenu();
  const codes = useLang().languages;
  const links = menu?.length ? withLanguages(menu, languages, codes) : null;
  // The menu's words, so the fold never takes a menu link for the site's name.
  const labels = useRef<readonly string[]>([]);
  labels.current = links?.map((link) => link.label) ?? [];
  // Pull what follows up under the header by its own height, and stop a #section link under it, before the
  // first paint and whenever its height changes. The capsule is as wide as the page's column (the row's own
  // max-width), so it lines up with the page under it.
  useLayoutEffect(() => {
    const bar = header.current;
    const pill = capsule.current;
    if (!bar || !pill) return;
    const row = (slot.current ?? pill).firstElementChild;
    const widest = row ? getComputedStyle(row).maxWidth : 'none';
    pill.style.maxWidth = widest && widest !== 'none' ? widest : '80rem';
    const root = document.documentElement;
    const before = root.style.scrollPaddingTop;
    const float = () => {
      // A page that padded the box around the bar, to clear it, pushed the bar down by that padding onto its own
      // title (dev, 2026-10-22: a booking page put `pt-28` on the div holding the header and `main`). The bar
      // takes the padding's place at the top, and what follows still starts below the padding.
      const box = bar.parentElement;
      const boxStyle = box ? getComputedStyle(box) : undefined;
      const above =
        box?.firstElementChild === bar && boxStyle && boxStyle.display !== 'contents'
          ? parseFloat(boxStyle.paddingTop) || 0
          : 0;
      bar.style.marginTop = above > 0 ? `-${above}px` : '';
      // A page's first words never sit under the bar: a video tool's page opened with `pt-8` and its label read
      // through the glass beside the name (production, 2026-10-24). Such a page starts as much lower as it needs.
      const words = firstWordsOffset(bar);
      const under = words === null ? 0 : Math.max(0, bar.offsetHeight + 32 - above - words);
      const margin = `${above - bar.offsetHeight + under}px`;
      if (bar.style.marginBottom !== margin) bar.style.marginBottom = margin;
      root.style.scrollPaddingTop = `${bar.offsetHeight}px`;
    };
    // A sticky header sticks only inside its parent, and not under a box that clips with `hidden`. A page that put
    // the bar inside its own `<header>` or `<div>` gave it a parent that ends where the bar ends, so the bar
    // scrolled away (dev, 2026-10-19). Such a wrapper (no `main` inside, no taller than a banner) drops its own
    // box, and `overflow: hidden` above the bar clips as `clip`, which looks the same and lets it stick.
    const undo: (() => void)[] = [];
    let wrapper = bar.parentElement;
    while (
      wrapper &&
      wrapper !== document.body &&
      !wrapper.querySelector('main') &&
      wrapper.offsetHeight <= 160
    ) {
      const box = wrapper;
      const was = box.style.display;
      box.style.display = 'contents';
      undo.push(() => (box.style.display = was));
      wrapper = box.parentElement;
    }
    for (let up = bar.parentElement; up && up !== root; up = up.parentElement) {
      const box = up;
      const style = getComputedStyle(box);
      for (const axis of ['overflowX', 'overflowY'] as const) {
        if (style[axis] !== 'hidden') continue;
        const was = box.style[axis];
        box.style[axis] = 'clip';
        undo.push(() => (box.style[axis] = was));
      }
    }
    // After the wrappers above are settled, so it reads the box the bar really sits in (still before first paint).
    float();
    const watch = new ResizeObserver(float);
    watch.observe(bar);
    // Another page under the same bar (a link within the site) is measured again.
    watch.observe(document.body);
    return () => {
      watch.disconnect();
      root.style.scrollPaddingTop = before;
      for (const restore of undo) restore();
    };
  }, []);
  useFitRow(slot, menuButton, Boolean(links), labels);
  // The links the kit's row already shows beside the name (a "Book" button, a cart): the menu's other pages join
  // them there, so a row with one button still shows the site's pages on a computer (dev, 2026-10-22).
  const [ownLabels, setOwnLabels] = useState('');
  useLayoutEffect(() => {
    const row = slot.current?.querySelector<HTMLElement>(':scope > [data-kit-row]');
    if (!row) return;
    const own = [...row.querySelectorAll('a[href]')]
      .filter((a) => !a.closest('[data-menu-pages]') && !row.firstElementChild?.contains(a))
      .flatMap((a) => [`t:${(a.textContent ?? '').trim().toLowerCase()}`, `h:${samePlace(a.getAttribute('href'))}`])
      .sort()
      .join('|');
    if (own !== ownLabels) setOwnLabels(own);
  });
  // A page the row shows by its words or by where it goes ("Book a consult" for the menu's "Book a consultation").
  const shown = new Set(ownLabels.split('|'));
  const pages = links
    ? links.filter(
        (link) =>
          link.href && !shown.has(`t:${link.label.trim().toLowerCase()}`) && !shown.has(`h:${samePlace(link.href)}`),
      )
    : [];
  // The row inside the capsule always has room at its ends and the bar's height, whoever wrote it: the kit row has
  // px-5 sm:px-8 and h-14, a page's own flex row may have neither. Marked once per row, only for what is missing;
  // base.css gives the room (`data-room-start`, `data-room-end`, `data-room-height`), the kit row's at every width.
  const room = (row: HTMLElement) => {
    if (row.dataset.roomRead !== undefined) return;
    row.dataset.roomRead = '';
    const style = getComputedStyle(row);
    if (parseFloat(style.paddingLeft) < 12) row.dataset.roomStart = '';
    if (parseFloat(style.paddingRight) < 8 && !links) row.dataset.roomEnd = '';
    if (row.getBoundingClientRect().height < 52) row.dataset.roomHeight = '';
  };
  useLayoutEffect(() => {
    if (links) return;
    const row = capsule.current?.firstElementChild;
    if (row instanceof HTMLElement) room(row);
  });
  // The menu button sits from the row's last item by the row's own gap, and its lines sit as far from the capsule's
  // edge as the row starts from the other (a phone header's sun to menu gap was 8 px beside a 24 px cart to sun gap,
  // its right edge tighter than its left: dev, 2026-10-22, the owner). The lines are 18 px in the 44 px button.
  useLayoutEffect(() => {
    const host = slot.current;
    const button = menuButton.current;
    if (!host || !button) return;
    const place = () => {
      const row = host.firstElementChild;
      if (!(row instanceof HTMLElement)) return;
      // A page's own row without room inside the capsule takes the kit row's: a Modernize's logo ran into the
      // capsule's rounded left end on a phone (owner, 2026-10-26: "Its overlapping with the left edge!!").
      room(row);
      const style = getComputedStyle(row);
      const gap = parseFloat(style.columnGap);
      const start = parseFloat(style.paddingLeft);
      button.style.marginLeft = gap > 0 ? `${gap - parseFloat(style.paddingRight)}px` : '';
      button.style.marginRight = start > 0 ? `${Math.max(0, start - 13)}px` : '';
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(host);
    return () => watch.disconnect();
  }, [links]);
  // Light mode's capsule is clear glass, never milky white (owner, 2026-10-19: "like dark mode"). Its words turn
  // white over a photo or a dark part of the page and stay dark over a light one, as Apple's glass does: a few
  // points along its middle read the first picture, or solid color, under them.
  const [overDark, setOverDark] = useState(false);
  useEffect(() => {
    if (tone === 'dark') return;
    const paint = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const shades = new Map<string, number>();
    // How light a color is, 0 to 255, or -1 when it is mostly see-through.
    const shade = (color: string) => {
      let light = shades.get(color);
      if (light === undefined && paint) {
        paint.clearRect(0, 0, 1, 1);
        paint.fillStyle = 'transparent';
        paint.fillStyle = color;
        paint.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
        light = a < 128 ? -1 : 0.2126 * r + 0.7152 * g + 0.0722 * b;
        shades.set(color, light);
      }
      return light ?? -1;
    };
    const darkAt = (x: number, y: number) => {
      for (const el of document.elementsFromPoint(x, y)) {
        if (header.current?.contains(el)) continue;
        if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement) {
          return true;
        }
        const style = getComputedStyle(el);
        if (style.backgroundImage.includes('url(')) return true;
        const light = shade(style.backgroundColor);
        if (light >= 0) return light < 128;
      }
      return false;
    };
    let frame = 0;
    const check = () => {
      frame = 0;
      const pill = capsule.current;
      if (!pill) return;
      const box = pill.getBoundingClientRect();
      const y = box.top + box.height / 2;
      const points = [0.1, 0.3, 0.5, 0.7, 0.9].map((part) => box.left + box.width * part);
      setOverDark(points.filter((x) => darkAt(x, y)).length > points.length / 2);
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
    // Pictures and sections that arrive later, and the light/dark switch on <html>.
    const pages = new MutationObserver(soon);
    pages.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => {
      window.removeEventListener('scroll', soon);
      window.removeEventListener('resize', soon);
      pages.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tone]);
  // A link to a part of the page (`#prices`) lands with that part filling the screen: its top edge at the top,
  // under the floating header, when its own top padding clears the header, and otherwise just low enough that its
  // first line does. A jump used to stop a strip low and show the part above (owner, 2026-10-19), because a
  // section's `scroll-mt-*` added to the header's own room; this ignores both. An id on the first thing inside a
  // section lands the whole section.
  useEffect(() => {
    const spot = (target: HTMLElement) => {
      let part = target;
      const section = target.parentElement?.closest('section');
      if (section) {
        const edge = section.getBoundingClientRect().top + parseFloat(getComputedStyle(section).paddingTop);
        if (target.getBoundingClientRect().top <= edge + 1) part = section;
      }
      const room = (header.current?.offsetHeight ?? 0) + 16 - parseFloat(getComputedStyle(part).paddingTop);
      return Math.max(0, part.getBoundingClientRect().top + window.scrollY - Math.max(0, room));
    };
    const jump = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      const hash = link?.getAttribute('href') ?? '';
      const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      if (!target) return;
      event.preventDefault();
      history.pushState(null, '', hash);
      window.scrollTo({ top: spot(target), behavior: 'smooth' });
    };
    document.addEventListener('click', jump);
    return () => document.removeEventListener('click', jump);
  }, []);
  return (
    <header
      ref={header}
      className="pointer-events-none sticky top-0 z-30 px-2 pt-2 sm:px-4 sm:pt-3.5"
    >
      {/* Links and buttons rest at full strength: a dimmed link (`opacity-80`) read gray on the glass. A hover,
          a press and a disabled button still change it (`:where` keeps this rule weaker than a hover class).
          The capsule wears the kit's own see-through glass, unchanged: a heavier blur read as a solid gray
          pill on a dark page (owner, 2026-10-19: "the header is not see through"). */}
      <div
        ref={capsule}
        data-over={overDark ? 'dark' : undefined}
        className={cn(
          tone === 'dark' ? 'glass' : 'glass-light glass-clear',
          'pointer-events-auto mx-auto rounded-full',
          links && 'max-sm:[&_[data-fold]]:hidden',
          '[&_a:not(:where(:active))]:opacity-100 [&_button:not(:where(:disabled))]:opacity-100',
          className,
        )}
      >
        {links ? (
          <div className="flex items-center">
            <div ref={slot} className="min-w-0 flex-1">
              {oneRow(children, pages)}
            </div>
            <button
              ref={menuButton}
              type="button"
              aria-label={menuLabel}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="mr-2 -ml-3 grid size-11 shrink-0 place-items-center md:hidden"
            >
              <span aria-hidden className="flex w-[18px] flex-col gap-[5px]">
                <span className="h-[1.5px] rounded-full bg-current" />
                <span className="h-[1.5px] rounded-full bg-current" />
              </span>
            </button>
          </div>
        ) : (
          oneRow(children)
        )}
      </div>
      {/* On the page's top layer, outside the header's stacking order, so nothing on the page covers it. */}
      {links &&
        createPortal(
          <Sheet open={open} onOpenChange={setOpen} label={menuLabel}>
            <nav aria-label={menuLabel} className="flex flex-col pb-2">
              {links.map((link) => {
                const choose = () => {
                  link.onClick?.();
                  setOpen(false);
                };
                const look = cn(
                  'flex min-h-14 w-full items-center border-b border-[var(--separator)] text-left text-[19px] tracking-tight last:border-0',
                  link.current ? 'font-semibold' : 'font-medium',
                );
                return link.href ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={choose}
                    aria-current={link.current ? 'page' : undefined}
                    className={look}
                  >
                    {link.label}
                  </a>
                ) : (
                  <button
                    key={link.label}
                    type="button"
                    onClick={choose}
                    aria-current={link.current ? 'page' : undefined}
                    className={cn(look, 'rounded-none')}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>
          </Sheet>,
          document.body,
        )}
    </header>
  );
}
