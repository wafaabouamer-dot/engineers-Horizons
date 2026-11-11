import { Check, ChevronDown } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

/** The empty field's words follow the page's own language (the site's <html lang>), like the kit's other words. */
function chooseWords(): string {
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es') ? 'Elige una opción' : 'Choose one';
}

/**
 * A choice from a short list (apple-design: a menu that grows from its control, a material surface, a check on the
 * chosen row), never the system's own list, which looks dated. The field matches the page's fields; the list opens
 * as a glass menu as wide as the field, grows from it, and keeps arrow keys, typing to jump, Enter and Escape.
 * Inside a `<form>`, `name` sends the value like a native select. `label` shows above the field, like every other
 * field's label: it was for screen readers only, and phones showed "Choose one" with no question (dev, 2026-10-20).
 *
 * The list is a popover that never holds the page: a click outside closes it AND does what it was for. Radix's own
 * Select locks the page while open, so a click on another dropdown or tab only closed the first (owner, 2026-10-29,
 * a task dashboard), and it has no setting to stop that.
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = chooseWords(),
  name,
  required,
  label,
  className,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  /** The question above the field ("Who is the lesson for?"); then write no other label for it. */
  label?: string;
  className?: string;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const pointer = useRef<string | null>(null);
  const [own, setOwn] = useState(true);
  const [inner, setInner] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const current = value !== undefined ? value : inner;
  const chosen = options.find((option) => option.value === current);
  const optionId = (index: number) => `${id}-option-${index}`;

  // A page that wrote the question itself just before the field (`<span>Size</span>`, or a `<label>` holding the
  // words and the Select) keeps its own: the kit's would say it twice. A field just before is never that.
  useLayoutEffect(() => {
    const before = box.current?.previousSibling;
    const control = before instanceof Element && before.querySelector('input, textarea, select, button');
    const words = before?.textContent?.toLowerCase() ?? '';
    if (label && !control && words.includes(label.trim().toLowerCase())) setOwn(false);
  }, [label]);

  // The form's own copy of the value (the hidden select) follows it.
  useEffect(() => {
    if (native.current) native.current.value = current;
  }, [current]);

  // The highlighted choice stays in view as the arrow keys move it.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  });

  const openList = (next: boolean) => {
    if (next) {
      setActive(Math.max(0, options.findIndex((option) => option.value === current)));
      pointer.current = null;
    }
    setOpen(next);
  };

  // The mouse moves the highlight only when it really moves: a list opening under a resting pointer gets a move with
  // the same position, which took the highlight from the arrow keys.
  const hover = (index: number, x: number, y: number) => {
    const at = `${x},${y}`;
    const still = pointer.current === null || pointer.current === at;
    pointer.current = at;
    if (!still && index !== active) setActive(index);
  };

  const choose = (next: string) => {
    // Back on the field, so Tab goes on from it (Safari left nothing focused once the list closed).
    trigger.current?.focus({ preventScroll: true });
    setOpen(false);
    if (next === current) return;
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    // A form listening for changes hears it, as from a native select.
    const select = native.current;
    if (select) {
      select.value = next;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // Typing jumps to the choice that starts with the letters typed (a pause starts over).
  const jump = (key: string) => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > 700 ? key : t.text + key;
    t.at = now;
    const words = t.text.toLowerCase();
    const from = t.text.length === 1 ? active + 1 : Math.max(active, 0);
    const order = [...options.slice(from), ...options.slice(0, from)];
    const hit = order.find((option) => option.label.toLowerCase().startsWith(words));
    if (hit) setActive(options.indexOf(hit));
  };

  const onListKey = (event: KeyboardEvent) => {
    const last = options.length - 1;
    const move = (index: number) => {
      event.preventDefault();
      setActive(Math.min(Math.max(index, 0), last));
    };
    const typing = Date.now() - typed.current.at < 700;
    if (event.key === 'ArrowDown') move(active + 1);
    else if (event.key === 'ArrowUp') move(active - 1);
    else if (event.key === 'Home' || event.key === 'PageUp') move(0);
    else if (event.key === 'End' || event.key === 'PageDown') move(last);
    else if (event.key === 'Enter' || (event.key === ' ' && !typing)) {
      event.preventDefault();
      if (options[active]) choose(options[active].value);
    } else if (event.key === 'Tab') setOpen(false);
    else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) jump(event.key);
  };

  const field = (
    <Popover.Root open={open} onOpenChange={openList}>
      <Popover.Trigger
        ref={trigger}
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-label={label}
        data-placeholder={chosen ? undefined : ''}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openList(true);
          }
        }}
        className={cn(
          // At least 48px, taller when a long choice wraps: a supper club's "Smoke & Cedar · Saturday, November 14 ·
          // 7:00 PM" took two lines on a phone and filled a fixed 48 px box to its edges (dev, 2026-10-26).
          'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left text-base outline-none',
          'bg-white text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] dark:bg-[rgb(120_120_128/0.16)] dark:text-inherit dark:shadow-[inset_0_0_0_1px_rgb(142_142_147/0.8)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--brand)] data-[placeholder]:opacity-60',
          className,
        )}
      >
        <span className="min-w-0">{chosen ? chosen.label : placeholder}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={list}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-labelledby={label ? undefined : id}
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            list.current?.focus();
          }}
          onKeyDown={onListKey}
          className={cn(
            'z-50 max-h-[min(22rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-44 overflow-y-auto overscroll-contain rounded-2xl p-1.5 outline-none',
            'bg-white/80 text-[#1d1d1f] shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_18px_48px_-12px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-150',
            'dark:bg-[rgb(40_40_44/0.82)] dark:text-white dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_18px_48px_-12px_rgb(0_0_0/0.7)]',
          )}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === current}
              data-highlighted={index === active ? '' : undefined}
              onPointerMove={(event) => hover(index, event.clientX, event.clientY)}
              onClick={() => choose(option.value)}
              className="relative flex min-h-11 cursor-pointer select-none items-center rounded-xl py-2.5 pr-3 pl-9 text-base outline-none transition-colors duration-100 data-[highlighted]:bg-[var(--brand)] data-[highlighted]:text-[var(--brand-ink)]"
            >
              {option.value === current && (
                <span className="absolute left-3 inline-flex">
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                </span>
              )}
              {option.label}
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
      {/* What a form sends and checks (`name`, `required`), as a native select would. */}
      {(name !== undefined || required) && (
        <select ref={native} aria-hidden tabIndex={-1} name={name} required={required} defaultValue={current} className="sr-only">
          <option value="" />
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Popover.Root>
  );
  if (!label) return field;
  return (
    <div ref={box} className="grid gap-1.5">
      {own && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}
      {field}
    </div>
  );
}
