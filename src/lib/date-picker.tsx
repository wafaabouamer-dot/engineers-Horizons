import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { cn } from '@/lib/utils';

/**
 * Every date field on the site (`<input type="date">`) opens the kit's calendar on a computer: a glass card in the
 * style of the kit's menus (components/ui/select.tsx), the month with arrows, the week's days, today ringed and the
 * chosen day in the brand color. The system's own calendar looked like another program's (owner, 2026-11-01, a task
 * dashboard: "the calendar date picker is not set up"). Nothing for the page to do: the field keeps its value,
 * `min`, `max`, `required` and `onChange`; typing a date still works. Phones and tablets keep their own picker, made
 * for touch. A field with `data-native` keeps the system's calendar everywhere.
 */
let installed = false;
let current: { root: Root; host: HTMLElement } | null = null;

export function pickDatesInKitCalendar() {
  if (installed || typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
  installed = true;
  // base.css hides the system's calendar button and draws the kit's icon instead.
  document.documentElement.setAttribute('data-kit-dates', '');
  fitDateFields();
  const field = (target: EventTarget | null) => {
    const input = target instanceof Element ? target.closest('input[type="date"]') : null;
    return input instanceof HTMLInputElement && !input.disabled && !input.readOnly && !input.hasAttribute('data-native')
      ? input
      : null;
  };
  // Pressed: the kit's calendar, never the system's (Safari opens its own on the press itself).
  document.addEventListener(
    'mousedown',
    (event) => {
      const input = field(event.target);
      if (!input) return;
      event.preventDefault();
      open(input);
    },
    true,
  );
  document.addEventListener('click', (event) => field(event.target) && event.preventDefault(), true);
  // From the keyboard, as a menu opens: Alt+Down.
  document.addEventListener(
    'keydown',
    (event) => {
      const input = field(event.target);
      if (input && event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        open(input);
      }
    },
    true,
  );
}

/**
 * A date field too narrow for its date and the icon gives the date the room: the icon goes and the side padding is
 * trimmed, so "mm/dd/yyyy" never shows as "mm/dd/y" (dev, 2026-11-03: a restaurant's date in a 120 px column of a
 * three-field row). Watched as fields come and as their width changes; a wide field keeps its icon.
 */
function fitDateFields() {
  const ruler = document.createElement('canvas').getContext('2d');
  const fit = (input: HTMLInputElement) => {
    if (!ruler || !input.isConnected) return;
    const style = getComputedStyle(input);
    ruler.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    // The widest the field's words get: its date, else the empty field's "mm/dd/yyyy".
    const words = ruler.measureText(input.value ? new Date(`${input.value}T12:00`).toLocaleDateString() : 'mm/dd/yyyy').width;
    const room = input.clientWidth - parseFloat(style.paddingLeft) - 40;
    input.toggleAttribute('data-narrow', words + 6 > room);
  };
  const sizes = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target as HTMLInputElement)));
  const watch = (root: ParentNode) =>
    root.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach((input) => {
      if (input.dataset.kitFit != null) return;
      input.dataset.kitFit = '';
      sizes.observe(input);
      input.addEventListener('change', () => fit(input));
    });
  watch(document);
  new MutationObserver((records) => {
    for (const record of records)
      record.addedNodes.forEach((node) => node instanceof Element && (node.matches('input[type="date"]') ? watch(node.parentElement ?? document) : watch(node)));
  }).observe(document.body, { childList: true, subtree: true });
}

function open(input: HTMLInputElement) {
  close();
  // Inside the dialog that holds the field, if any: a dialog keeps clicks and focus inside itself.
  const holder = input.closest('[role="dialog"], [role="alertdialog"], dialog') ?? document.body;
  const host = holder.appendChild(document.createElement('div'));
  const root = createRoot(host);
  current = { root, host };
  root.render(<Calendar input={input} onClose={close} />);
}

function close() {
  if (!current) return;
  const { root, host } = current;
  current = null;
  root.unmount();
  host.remove();
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && iso(a) === iso(b);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
};

/** The page's language (its <html lang>), as the kit's other words. */
function language() {
  return document.documentElement.lang || navigator.language || 'en';
}

/** The first day of the week where the page's language is spoken: Sunday in English, Monday in most others. */
function weekStart(locale: string) {
  try {
    const info = (new Intl.Locale(locale) as unknown as { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } });
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (first) return first % 7;
  } catch {
    // An unknown language falls through to the guess below.
  }
  return /^en/i.test(locale) ? 0 : 1;
}

/** Sets the field as typing would, so React's `onChange` and a form's own listeners hear it. */
function setValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function Calendar({ input, onClose }: { input: HTMLInputElement; onClose: () => void }) {
  const locale = language();
  const spanish = locale.toLowerCase().startsWith('es');
  const chosen = parse(input.value);
  const min = parse(input.min);
  const max = parse(input.max);
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const allowed = (d: Date) => !(min && d < min) && !(max && d > max);
  const start = chosen ?? (min && min > todayDay ? min : max && max < todayDay ? max : todayDay);
  const [focus, setFocus] = useState(start);
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);

  // Under the field, or over it when there is no room below; inside the screen's edges.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.showPopover?.();
    const put = () => {
      const r = input.getBoundingClientRect();
      const h = el.offsetHeight;
      const w = el.offsetWidth;
      let top = r.bottom + 8;
      if (top + h > window.innerHeight - 8 && r.top - 8 - h >= 8) top = r.top - 8 - h;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPlace({ top, left });
    };
    put();
    window.addEventListener('resize', put);
    window.addEventListener('scroll', put, true);
    return () => {
      window.removeEventListener('resize', put);
      window.removeEventListener('scroll', put, true);
    };
  }, [input]);

  // A press anywhere else closes it and still does what it was for; Escape closes it.
  useEffect(() => {
    const down = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node) && event.target !== input) onClose();
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        input.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [input, onClose]);

  // The keyboard's day keeps the focus as it moves.
  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>('[data-focus]')?.focus({ preventScroll: true });
  }, [focus]);

  const choose = (d: Date) => {
    if (!allowed(d)) return;
    setValue(input, iso(d));
    onClose();
    input.focus({ preventScroll: true });
  };

  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const lead = (first.getDay() - weekStart(locale) + 7) % 7;
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
  const weekdays = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d));
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first);
  const full = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });

  const onKey = (event: KeyboardEvent) => {
    const step: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -((focus.getDay() - weekStart(locale) + 7) % 7)),
      End: () => addDays(focus, 6 - ((focus.getDay() - weekStart(locale) + 7) % 7)),
    };
    if (step[event.key]) {
      event.preventDefault();
      setFocus(step[event.key]());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(focus);
    } else if (event.key === 'Tab') {
      onClose();
    }
  };

  const arrow = 'grid size-9 place-items-center rounded-full outline-none transition-colors hover:bg-[rgb(120_120_128/0.16)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]';
  return (
    <div
      ref={box}
      popover="manual"
      role="dialog"
      aria-label={spanish ? 'Elige una fecha' : 'Choose a date'}
      onKeyDown={onKey}
      style={{ top: place?.top ?? -9999, left: place?.left ?? -9999 }}
      className={cn(
        'kit-calendar fixed inset-auto m-0 w-[19.5rem] overflow-visible rounded-2xl border-0 p-3',
        'bg-white/80 text-[#1d1d1f] shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_18px_48px_-12px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-150',
        'dark:bg-[rgb(40_40_44/0.82)] dark:text-white dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_18px_48px_-12px_rgb(0_0_0/0.7)]',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 pl-2">
        <p className="text-[15px] font-semibold capitalize">{title}</p>
        <div className="flex">
          <button type="button" aria-label={spanish ? 'Mes anterior' : 'Previous month'} className={arrow} onClick={() => setFocus(addMonths(focus, -1))}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button type="button" aria-label={spanish ? 'Mes siguiente' : 'Next month'} className={arrow} onClick={() => setFocus(addMonths(focus, 1))}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      <div role="grid" className="grid grid-cols-7 gap-0.5 text-center">
        {weekdays.map((name, i) => (
          <span key={`w${i}`} aria-hidden className="pb-1 text-xs font-medium opacity-55">
            {name}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === first.getMonth();
          const isChosen = sameDay(day, chosen);
          const isFocus = sameDay(day, focus);
          const ok = allowed(day);
          return (
            <button
              key={iso(day)}
              type="button"
              tabIndex={isFocus ? 0 : -1}
              data-focus={isFocus ? '' : undefined}
              aria-label={full.format(day)}
              aria-pressed={isChosen}
              aria-disabled={!ok || undefined}
              onClick={() => choose(day)}
              className={cn(
                'mx-auto grid size-10 place-items-center rounded-full text-[15px] tabular-nums outline-none transition-colors',
                !inMonth && 'opacity-40',
                ok ? 'cursor-pointer hover:bg-[color-mix(in_oklab,var(--brand)_16%,transparent)]' : 'cursor-default opacity-25',
                sameDay(day, todayDay) && !isChosen && 'font-semibold text-[var(--brand-text)] ring-1 ring-current',
                isChosen && 'bg-[var(--brand)] font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand)]',
                isFocus && 'focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {allowed(todayDay) && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => choose(todayDay)}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--brand-text)] outline-none hover:bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            {spanish ? 'Hoy' : 'Today'}
          </button>
        </div>
      )}
    </div>
  );
}
