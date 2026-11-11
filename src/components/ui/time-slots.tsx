import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TimeSlot = {
  value: string;
  /** What the visitor reads: "10:00 AM", "2:30 PM". */
  label: ReactNode;
  /** Taken or past: shown, not pickable. */
  disabled?: boolean;
  /** A short line under the time: "2 left", "Full". */
  note?: ReactNode;
};

/** The words when a day has no times, in the page's language (`<html lang>`). */
function noTimes(): string {
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es')
    ? 'No quedan horarios este día. Prueba otro día.'
    : 'No times left on this day. Try another day.';
}

/**
 * The times to pick from for a booking (a showing, a class, a table, a drop-off): one chip per time, as many to a row
 * as fit their column, each wide enough for "12:30 PM" on one line, the chosen one in the brand color. Hand-made time
 * buttons in a fixed count of columns broke "10:00 AM" over two lines in a listing page's narrow column (production QA
 * bots, 2026-10-25). Taken times stay in place, faded, so the day keeps its shape; a day with no times says so, never
 * an empty space. Put the day choice above it (`SegmentedControl` or `Select`). `label` names the group for screen
 * readers ("Showing times"); `empty` replaces the no-times words.
 */
export function TimeSlots({
  slots,
  value,
  onChange,
  label,
  empty,
  className,
}: {
  slots: TimeSlot[];
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  empty?: ReactNode;
  className?: string;
}) {
  if (slots.length === 0) {
    return (
      <p
        className={cn(
          'rounded-2xl bg-[rgb(120_120_128/0.1)] px-5 py-4 text-[15px] opacity-80 shadow-[inset_0_0_0_1px_rgb(120_120_128/0.14)]',
          className,
        )}
      >
        {empty ?? noTimes()}
      </p>
    );
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2', className)}>
      {slots.map((slot) => {
        const chosen = slot.value === value;
        return (
          <button
            key={slot.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={slot.disabled}
            onClick={() => onChange(slot.value)}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center rounded-2xl px-3 py-2 text-[15px] leading-tight font-medium whitespace-nowrap tabular-nums',
              'transition-[background-color,color,scale] duration-200 active:scale-[0.97]',
              chosen
                ? 'bg-[var(--brand)] text-[var(--brand-ink)] shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent)]'
                : 'bg-[rgb(120_120_128/0.12)] shadow-[inset_0_0_0_1px_rgb(120_120_128/0.16)] hover:bg-[rgb(120_120_128/0.2)]',
              slot.disabled && 'cursor-not-allowed line-through opacity-40 hover:bg-[rgb(120_120_128/0.12)]',
            )}
          >
            {slot.label}
            {slot.note != null && (
              <span className={cn('mt-0.5 text-xs font-normal no-underline', chosen ? 'opacity-85' : 'opacity-65')}>
                {slot.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
