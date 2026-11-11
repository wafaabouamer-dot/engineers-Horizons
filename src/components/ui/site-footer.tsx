import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { headerLogo, useWideLogo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

export type FooterItem = ReactNode | { label: string; href: string };

/**
 * An email breaks after its @ or a dot when it must, never in the middle of a word: a long domain in a footer column
 * ended "…coralgables.co" with the "m" alone on the next line (production, 2026-10-25). Contact cards use it too.
 */
export function words(text: ReactNode): ReactNode {
  if (typeof text !== 'string' || !text.includes('@')) return text;
  const parts = text.split(/(?<=[@.])/);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <wbr />}
    </Fragment>
  ));
}

/**
 * The site's footer on its own quiet surface (owner, 2026-10-19, chosen from two designs): on the left the logo, the
 * name and its line; on the right up to 4 titled columns (Visit, Hours, Contact, Explore...), four as a roomy two by
 * two, spread evenly to the right margin, two of them about a quarter and three quarters across the room beside
 * the name (a column short of the right margin, a row of five blocks squeezed into one line, and two lone columns
 * at the area's two edges all read badly: owner, 2026-10-19); then a hairline and one row of small print. A long
 * list of links runs in two columns under its title when it has only one column beside it. No button: the page already asks for the booking, and the
 * footer's repeated it. An item with `href` is a link; any other item is shown as it is. The footer writes the
 * copyright, unless the note carries its own.
 */
export function SiteFooter({
  name,
  tagline,
  logo,
  columns,
  note,
  className,
}: {
  name: ReactNode;
  tagline?: ReactNode;
  /** The logo's picture: by default the one the header's `Logo` shows, else `/logo.png`; it hides itself if there
   *  is none. A site whose logo is `/images/logo.webp` passed it to the header only, and every page asked for a
   *  `/logo.png` that was not there (production, 2026-10-29). */
  logo?: string;
  /** No longer shown (the footer has no button); kept so a page that still passes it builds. */
  action?: ReactNode;
  columns: { title: string; items: FooterItem[] }[];
  /** Small print beside the copyright: a notice, a disclaimer (a note with its own © replaces the footer's). */
  note?: ReactNode;
  className?: string;
}) {
  const mark = useWideLogo();
  const picture = logo ?? headerLogo() ?? '/logo.png';
  const shown = columns.slice(0, 4);
  const ownCopyright = typeof note === 'string' && note.includes('©');
  return (
    <footer className={cn('border-t border-[var(--separator)] bg-[rgb(120_120_128/0.06)]', className)}>
      <div className="mx-auto max-w-7xl px-5 pt-16 pb-10 sm:px-8 md:pt-20">
        {/* From a tablet up the name sits on the left and the columns beside it, as on a computer: under the name,
            two columns spread to a tablet's edges left a wide hole between them (owner, 2026-10-19). */}
        <div className="grid gap-14 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div className="flex max-w-sm flex-col gap-4">
            <div className="flex items-center gap-3">
              {picture && (
                <img
                  ref={mark.ref}
                  src={picture}
                  alt=""
                  width={40}
                  height={40}
                  onLoad={mark.onLoad}
                  className={cn(
                    'shrink-0',
                    mark.wide
                      ? 'h-10 w-auto max-w-48 object-contain'
                      : mark.clear
                        ? 'size-9 object-contain'
                        : 'size-10 rounded-xl object-cover',
                  )}
                  onError={(event) => (event.currentTarget.style.display = 'none')}
                />
              )}
              <p className="text-xl font-semibold tracking-tight">{name}</p>
            </div>
            {tagline && <p className="text-[15px] leading-relaxed opacity-65">{tagline}</p>}
          </div>
          <div
            className={cn(
              // Two columns on a phone, the right one ending at the right margin (owner, 2026-10-19), no wider than
              // a phone's width, so a large phone held sideways keeps them together. From a tablet up, as on a computer,
              // three or four columns spread evenly to the right margin, and two sit about a quarter and three quarters
              // across the room beside the name, since at its two edges they left a hole (owner, 2026-10-19).
              'grid w-full max-w-md grid-cols-[minmax(0,auto)_minmax(0,auto)] justify-between gap-x-6 gap-y-12 sm:gap-x-16',
              'md:max-w-none md:grid-cols-[auto_auto] md:gap-x-10',
              shown.length >= 3 ? 'md:justify-between' : 'md:justify-around',
              shown.length === 3 && 'lg:grid-cols-[auto_auto_auto]',
            )}
          >
            {shown.map((column) => {
              // A long list runs in two columns only beside one other column: with three or four there is no room,
              // and a contact list split beside its long address ran its second half off the screen (production,
              // 2026-11-02, an insurance site's Facebook and Instagram).
              const long = shown.length <= 2 && column.items.length > 5;
              // A long email needs the whole row on a phone; in half of it, it split mid-word (2026-10-21). Long by its
              // whole length: a short name at a long domain split too (2026-10-25).
              const email = column.items.some((item) => {
                const text = item && typeof item === 'object' && 'label' in item ? item.label : item;
                return typeof text === 'string' && text.includes('@') && text.length > 24;
              });
              return (
                <div key={column.title} className={cn('min-w-0', email && 'max-md:col-span-2')}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] opacity-50">{column.title}</p>
                  <ul
                    className={cn(
                      'mt-5 text-[14px] leading-6 sm:text-[15px]',
                      // A short list is a plain list: as a grid it let the column shrink under a long email, which then
                      // ran into the next column.
                      long
                        ? 'grid gap-y-3 lg:auto-cols-max lg:grid-flow-col lg:grid-rows-[repeat(var(--rows),auto)] lg:gap-x-10'
                        : 'space-y-3',
                    )}
                    style={long ? ({ '--rows': Math.ceil(column.items.length / 2) } as CSSProperties) : undefined}
                  >
                    {column.items.map((item, index) => (
                      <li key={index} className="[overflow-wrap:anywhere] lg:[overflow-wrap:normal]">
                        {item && typeof item === 'object' && 'href' in item ? (
                          // 40px tall to press; the negative margin keeps the list's lines where they were.
                          <a href={item.href} className="-my-2 inline-block py-2 opacity-80 transition-opacity hover:opacity-100">
                            {words(item.label)}
                          </a>
                        ) : (
                          <span className="opacity-80">{words(item as ReactNode)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-[var(--separator)] pt-6 text-[13px] opacity-55 md:flex-row md:justify-between md:gap-8">
          {!ownCopyright && (
            <p>
              © {new Date().getFullYear()} {name}
            </p>
          )}
          {note && <p className="md:max-w-2xl">{note}</p>}
        </div>
      </div>
    </footer>
  );
}
