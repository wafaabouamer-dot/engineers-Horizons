import { Children, createContext, isValidElement, useContext, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad';

// The dot carries the color; the pill stays quiet, so a status never reads as a button of the brand color beside it
// (owner, 2026-10-22: "Today" and "Directions" had the same colors).
const DOTS: Record<BadgeTone, string> = {
  neutral: 'bg-current opacity-45',
  brand: 'bg-[var(--brand)]',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
};

/**
 * A status in a small pill with a colored dot: New, Ready, Today, Closed, Sold out. `tone` colors the dot. As wide as
 * its words wherever it sits: in a column of words it stretched across the card (a barber's "Open now" in a `MapCard`,
 * dev 2026-10-26).
 */
export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      data-badge=""
      className={cn(
        'inline-flex h-7 w-fit items-center gap-2 rounded-full bg-[rgb(120_120_128/0.16)] px-3 text-[13px] font-medium whitespace-nowrap',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', DOTS[tone])} />
      {children}
    </span>
  );
}

export type RowProps = {
  /** The row's first column: a time, a date, an order number. */
  lead?: ReactNode;
  /** A small square photo in that first column instead (`/images/…`). */
  image?: string;
  alt?: string;
  title: ReactNode;
  text?: ReactNode;
  /** A quieter line under the text. */
  detail?: ReactNode;
  /** A quiet word in a column of its own before the status: a stage ("In review"), a place, a person. */
  meta?: ReactNode;
  /** A status: a word shows as a `Badge` in `tone`; or your own element. */
  status?: ReactNode;
  tone?: BadgeTone;
  /** A price or total. */
  amount?: ReactNode;
  /** A small button or link at the row's end (`Button size="sm"`). */
  action?: ReactNode;
  /** The whole row opens something: a page (`href`) or a panel of the page's own (`onClick`). */
  href?: string;
  onClick?: () => void;
};

type Columns = { lead: boolean; meta: boolean; status: boolean; amount: boolean; action: boolean };
const ColumnsUsed = createContext<Columns>({ lead: false, meta: false, status: false, amount: false, action: false });

// Whole class names, for Tailwind to read: a row's last cell runs on through the columns it does not use.
const SPAN = ['', '', 'sm:col-span-2', 'sm:col-span-3', 'sm:col-span-4'];

const splitOnPhone = (cols: Columns) => !cols.amount && !cols.action && (cols.meta || cols.status);

/** One row of a `RowList`. */
export function Row({ lead, image, alt = '', title, text, detail, meta, status, tone, amount, action, href, onClick }: RowProps) {
  const cols = useContext(ColumnsUsed);
  // A button alone stays on the row's line on a phone too (a schedule's Book buttons each took a line of their own,
  // doubling every row: 2026-10-22); with a status or an amount, the three share a line under the words.
  const inline = !cols.status && !cols.amount;
  // With no amounts, a phone keeps each row to its line: the status under the words, the button at the end (a
  // schedule's "Closed", "Today" and "Directions" each took a line of their own under the words: owner, 2026-10-22).
  // With amounts (orders), the status, amount and button share a line under the words.
  const phoneLine = !cols.amount;
  // With a quiet word or a status but no amount or button, a phone puts them on a second line of the list's own
  // columns, so every row's words and pills line up there too (owner, 2026-10-29: a task list's pills, each after a
  // stage word of its own length, zigzagged on a phone).
  const split = splitOnPhone(cols);
  const second = cols.lead ? ['max-sm:col-start-2', 'max-sm:col-start-3'] : ['max-sm:col-start-1', 'max-sm:col-start-2'];
  const statusNode = typeof status === 'string' ? <Badge tone={tone}>{status}</Badge> : status;
  const metaNode = meta != null && <span className="text-sm opacity-70">{meta}</span>;
  const cells = [
    cols.meta && {
      key: 'meta',
      value: meta,
      node: metaNode,
      className: split
        ? cn('justify-self-start max-sm:row-start-2', second[0])
        : cn('sm:justify-self-start', phoneLine && 'max-sm:hidden'),
    },
    cols.status && {
      key: 'status',
      value: status,
      node: statusNode,
      // Every row's pill as wide as the column's widest, its dot and word at the start: pills of three widths read
      // as untidy (owner, 2026-10-29, a task dashboard's High, Medium and Low).
      className: split
        ? cn('justify-self-stretch max-sm:row-start-2 [&>[data-badge]]:w-full', second[cols.meta ? 1 : 0])
        : cn('sm:justify-self-stretch sm:[&>[data-badge]]:w-full', phoneLine && 'max-sm:hidden'),
    },
    cols.amount && {
      key: 'amount',
      value: amount,
      node: amount,
      className: 'ml-auto font-semibold whitespace-nowrap tabular-nums sm:ml-0 sm:justify-self-end',
    },
    // After an amount the button keeps beside it; alone it goes to the line's end.
    cols.action && {
      key: 'action',
      value: action,
      node: action,
      // Above the row's own link, so it stays its own button.
      className: cn('relative z-10 sm:justify-self-end', !cols.amount && 'ml-auto sm:ml-0'),
    },
  ].filter((cell) => cell !== false);
  // The row's last cell ends at the list's right edge whatever columns it skips: a "Closed" with no button beside it
  // stood in the middle while the other rows' buttons ended at the edge (owner, 2026-10-22: "not aligned").
  let last = -1;
  cells.forEach((cell, i) => cell.value != null && (last = i));
  return (
    <li
      className={cn(
        'relative col-span-full grid grid-cols-subgrid items-center gap-y-3 px-5 py-4 sm:px-6',
        split && 'max-sm:gap-y-2',
        // Inside a card the card is the surface and pads the words: the rows meet its edges' padding.
        '[[data-card]_&]:px-0 sm:[[data-card]_&]:px-0',
        (href || onClick) && 'has-[[data-row-open]:focus-visible]:outline-2 has-[[data-row-open]:focus-visible]:outline-[var(--brand)]',
      )}
    >
      {cols.lead && (
        <div className={cn('text-sm font-medium tabular-nums opacity-80', !inline && 'self-start sm:self-center')}>
          {image ? (
            <img src={image} alt={alt} width={96} height={96} loading="lazy" className="size-12 rounded-xl object-cover" />
          ) : (
            lead
          )}
        </div>
      )}
      <div className={cn('min-w-0', split && (cols.meta && cols.status ? 'max-sm:col-span-3' : 'max-sm:col-span-2'))}>
        <p className="font-semibold tracking-tight">
          {/* A row that opens something: its title is the link or button, stretched over the whole row. */}
          {href ? (
            <a href={href} data-row-open="" className="outline-none after:absolute after:inset-0 hover:underline">
              {title}
            </a>
          ) : onClick ? (
            <button
              type="button"
              data-row-open=""
              onClick={onClick}
              className="text-left outline-none after:absolute after:inset-0 hover:underline"
            >
              {title}
            </button>
          ) : (
            title
          )}
        </p>
        {text != null && <p className="mt-0.5 text-sm opacity-70">{text}</p>}
        {detail != null && <p className="mt-0.5 text-sm opacity-50">{detail}</p>}
        {phoneLine && !split && (meta != null || status != null) && (
          <div className="mt-2 flex items-center gap-3 sm:hidden">
            {metaNode}
            {statusNode}
          </div>
        )}
      </div>
      {/* On a phone the status, amount and button share a line under the words; from tablets up each is a column of
          the list's own grid (subgrid), so every row's pills, prices and buttons line up. */}
      {last >= 0 && (
        <div className={cn(phoneLine ? 'contents' : 'col-span-full flex items-center gap-3 sm:contents')}>
          {cells.slice(0, last + 1).map((cell, i) => (
            <div
              key={cell.key}
              className={cn(
                cell.className,
                i === last && cells.length - i > 1 && cn(SPAN[cells.length - i], 'sm:justify-self-end'),
                phoneLine && !split && 'justify-self-end',
              )}
            >
              {cell.node}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * A list of rows on one surface, hairlines between them, for orders, bookings, appointments, tasks, tickets, a class
 * schedule, invoices, messages: each `Row` has a lead (a time, a date, a number, a photo), its words, then a quiet word
 * (`meta`), a status, an amount and a button, and opens something when given `href` or `onClick`. The list's columns
 * are shared, so every row's words, status, price and button line up whatever their widths (a dashboard's rows put
 * each price where its own badge ended: owner, 2026-10-22; a task list's stages and priorities zigzagged until three
 * follow-ups: 2026-10-29), each status pill is the column's width, and each row's last item ends at the same right
 * edge. It fills the width it is given, over a photo too. `tone="glass"` over a photo; inside a card or a glass card
 * it is clear and the card is its surface. Give `image` to set a photo beside the list on a computer, so a short list
 * does not stretch across an empty page.
 */
export function RowList({
  image,
  alt = '',
  tone = 'plain',
  className,
  children,
}: {
  image?: string;
  alt?: string;
  tone?: 'plain' | 'glass';
  className?: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const rows = items.filter(isValidElement<RowProps>).filter((row) => row.type === Row);
  // Rows made by a component of the page's own cannot be read: every column is kept, so nothing they pass is lost.
  const readable = rows.length === items.length;
  const has = (pick: (p: RowProps) => unknown) => !readable || rows.some((row) => pick(row.props) != null);
  const cols: Columns = {
    lead: has((p) => p.lead ?? p.image),
    meta: has((p) => p.meta),
    status: has((p) => p.status),
    amount: has((p) => p.amount),
    action: has((p) => p.action),
  };
  // A phone's columns: the lead, the words and, with no amounts, the button (the status goes under the words); with
  // no amount or button, the quiet word and the status as columns of a second line under the words.
  const phoneLine = !cols.amount;
  const columns = (phone: boolean) =>
    phone && splitOnPhone(cols)
      ? [cols.lead && 'auto', cols.meta && 'auto', cols.status && 'auto', 'minmax(0,1fr)'].filter(Boolean).join(' ')
      : [
      cols.lead && 'auto',
      'minmax(0,1fr)',
      !phone && cols.meta && 'auto',
      !phone && cols.status && 'auto',
      !phone && cols.amount && 'auto',
      (!phone || phoneLine) && cols.action && 'auto',
        ]
          .filter(Boolean)
          .join(' ');
  const list = (
    <ul
      data-row-list=""
      // On a phone the lead and the words are columns too (a wider "Wed" or "12:00 PM" no longer moves a row's words);
      // the rest shares a line under them unless the rows are one line.
      style={{ '--row-cols': columns(false), '--row-cols-phone': columns(true) } as CSSProperties}
      className={cn(
        'grid w-full grid-cols-[var(--row-cols-phone)] gap-x-4 self-stretch overflow-hidden rounded-3xl sm:grid-cols-[var(--row-cols)] sm:gap-x-6',
        'divide-y [.glass_&]:divide-white/15',
        // Inside a card it is clear, as inside a glass card: one surface, never a box in a box.
        '[[data-card]_&]:rounded-none [[data-card]_&]:bg-transparent [[data-card]_&]:shadow-none',
        tone === 'glass'
          ? 'glass divide-white/15'
          : 'divide-[var(--separator)] bg-[rgb(120_120_128/0.1)] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_0_0_1px_rgb(120_120_128/0.14),0_1px_2px_rgb(0_0_0/0.05),0_12px_32px_-20px_rgb(0_0_0/0.35)] [.glass_&]:bg-transparent [.glass_&]:shadow-none',
        !image && className,
      )}
    >
      <ColumnsUsed.Provider value={cols}>{children}</ColumnsUsed.Provider>
    </ul>
  );
  if (!image) return list;
  return (
    <div className={cn('grid w-full gap-6 self-stretch lg:grid-cols-12', className)}>
      {/* A short list sits in the middle of the photo's height: two rows at the top beside a 320 px photo left the
          list's side mostly empty (the kit's audit, 2026-10-24). */}
      <div className="lg:col-span-7 lg:flex lg:flex-col lg:justify-center">{list}</div>
      {/* As tall as the list (at least a good photo's height), never taller. */}
      <div className="relative hidden min-h-64 overflow-hidden rounded-3xl bg-[rgb(120_120_128/0.12)] lg:col-span-5 lg:block">
        <img
          src={image}
          alt={alt}
          width={800}
          height={1000}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    </div>
  );
}
