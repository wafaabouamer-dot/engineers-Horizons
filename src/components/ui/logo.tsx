import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Whether a picture's corners are see-through: a mark drawn on nothing, not a tile on its own background. */
function clearCorners(img: HTMLImageElement): boolean {
  try {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(img, 0, 0, size, size);
    const corners = [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1],
    ];
    return corners.filter(([x, y]) => context.getImageData(x!, y!, 1, 1).data[3]! < 200).length >= 2;
  } catch {
    // A picture from another site cannot be read: it keeps the tile.
    return false;
  }
}

/**
 * Whether a logo picture is wide (a wordmark) or clear (a mark on a see-through background): either shows whole at
 * its own shape, never cropped into the rounded tile with its shadow. An owner's own wordmark was cut to a square on a
 * real site (2026-10-21), and Anela's own see-through triangle sat cropped in a shadowed tile when a Modernize kept it
 * (owner, 2026-10-26: "the logo looks kinda weird, make it transparent and laid out properly").
 */
export function useWideLogo() {
  const ref = useRef<HTMLImageElement>(null);
  const [wide, setWide] = useState(false);
  const [clear, setClear] = useState(false);
  const read = () => {
    const img = ref.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    // Anything not close to square shows whole: a developer's 1200 by 941 wordmark (1.28) was cut into the square tile
    // and read "clarc" (dev, 2026-10-28).
    const ratio = img.naturalWidth / img.naturalHeight;
    setWide(ratio > 1.1 || ratio < 0.9);
    setClear(clearCorners(img));
  };
  useLayoutEffect(() => {
    if (ref.current?.complete) read();
  }, []);
  return { ref, wide, clear, onLoad: read };
}

/**
 * The site's logo for the header (owner, 2026-10-19: every site gets its own): the mark, a picture made with the
 * image tool for this business (a symbol only, no letters, on a solid background in its brand color, square), shown
 * as a small rounded app-icon tile, beside the name in bold, and nothing under it (owner, 2026-10-19: no line of
 * what the business is). The name stays real text: a picture's letters blur and cannot follow the page's language.
 * When the bar is short of room, the picture alone stands for the name before the main button leaves the bar
 * (src/lib/fit-row.ts). The same picture is the tab icon
 * (`<link rel="icon" href="/logo.png">` in index.html). An owner's own logo image takes its place. A picture that
 * does not load leaves the bar (the footer's hides itself) and the name stands alone: a build that made no logo showed the
 * browser's broken-image icon in its header on every page (dev browser test 2026-10-23).
 */
/** The picture the header's `Logo` shows, for the footer to show the same one (`SiteFooter`). */
let headerMark: string | undefined;
export const headerLogo = () => headerMark;

export function Logo({
  src = '/logo.png',
  name,
  href = '/',
  className,
}: {
  /** The mark: a square picture in `public/` (`public/logo.png` is `/logo.png`). */
  src?: string;
  name: string;
  /** No longer shown; kept so a page that still passes it builds. */
  kind?: string;
  href?: string;
  className?: string;
}) {
  headerMark = src;
  const mark = useWideLogo();
  // THE TAB ICON IS THE SAME PICTURE (owner, 2026-10-19). index.html names /logo.png, so a mark saved under another
  // name left every tab blank: 32 of 115 dev site builds, 2026-10-25..11-04, had a logo the tab never showed.
  const tabIcon = () => {
    const img = mark.ref.current;
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!img?.naturalWidth || !link || link.href === img.currentSrc) return;
    link.href = img.currentSrc;
    link.removeAttribute('type');
  };
  useLayoutEffect(() => {
    if (mark.ref.current?.complete) tabIcon();
  }, [src]);
  // A picture that fails to load leaves the bar, so the header reads the name as words only and never folds them
  // away: hidden in place, it still counted as the name's picture, and a phone's bar showed nothing on the left
  // (production, 2026-10-26, a site with no /logo.png).
  const [missing, setMissing] = useState<string | null>(null);
  return (
    // 40px tall to press (the mark is 32 or 36 px); the negative margin keeps the header row as it was.
    <a href={href} className={cn('-my-1 flex min-w-0 items-center gap-2.5 py-1', className)}>
      {missing !== src && (
        <img
          ref={mark.ref}
          src={src}
          alt=""
          width={36}
          height={36}
          onLoad={() => {
            mark.onLoad();
            tabIcon();
          }}
          onError={() => setMissing(src)}
          className={cn(
            'shrink-0',
            mark.wide
              ? 'h-9 w-auto max-w-44 object-contain'
              : mark.clear
                ? 'size-8 object-contain'
                : 'size-9 rounded-[10px] object-cover shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_2px_6px_rgb(0_0_0/0.25)]',
          )}
        />
      )}
      <span className="min-w-0 text-[17px] leading-[1.1] font-semibold tracking-tight">{name}</span>
    </a>
  );
}
