import { motion } from 'motion/react';
import { useId, useLayoutEffect, useRef, useState, type HTMLAttributes } from 'react';
import { Select } from '@/components/ui/select';
import { springs } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Switches between 2 to 5 views or ranges of one thing (the iOS segmented control): the thumb glides on a spring.
 * Other props reach the group, so a header's `data-fold` works on it.
 *
 * When equal segments do not fit, each takes the width of its own label; when even that cannot show every whole label
 * in the room it has, it is the kit's `Select` instead, a menu
 * with the same choices, as Apple does on a phone (dev, 2026-10-21: five admin tabs on a phone either ended four
 * labels in "…" or, put in a scrolling strip by the page, hid the fifth past the screen's edge). It turns back into
 * segments when the room returns. The segments stay in the page, hidden, to measure the labels.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  const group = useRef<HTMLDivElement>(null);
  // equal: segments as wide as the widest label (the iOS look); content: each as wide as its own label, when equal
  // ones do not fit (5 short tabs on a phone fit this way); menu: the kit's Select, when even that does not fit.
  const [fit, setFit] = useState<'equal' | 'content' | 'menu'>('equal');
  const menu = fit === 'menu';
  // The window's width when it last had to narrow: a parent that shrinks around the narrower control cannot show the
  // room coming back, so a wider window tries the segments again (it stayed a menu on a computer: dev, 2026-10-21).
  const narrowedAt = useRef(0);
  const labels = options.map((option) => option.label).join('\n');
  useLayoutEffect(() => {
    const segments = group.current;
    const host = segments?.parentElement;
    if (!segments || !host) return;
    const check = () => {
      const buttons = [...segments.querySelectorAll<HTMLElement>('[role=radio]')];
      if (!buttons.length) return;
      const side = (el: Element) => {
        const style = getComputedStyle(el);
        return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      };
      if (fit !== 'equal' && window.innerWidth > narrowedAt.current + 1) {
        setFit('equal');
        return;
      }
      if (menu) return;
      // The words' own width: the label's box is as wide as its segment, so it read every label as the widest one
      // and folded tabs that fit (2026-10-21).
      const text = (el: Element | null) => {
        if (!el) return 0;
        const range = document.createRange();
        range.selectNodeContents(el);
        return Math.ceil(range.getBoundingClientRect().width);
      };
      const widths = buttons.map((b) => text(b.lastElementChild) + side(b));
      const equal = Math.max(...widths) * widths.length + side(segments);
      const content = widths.reduce((sum, width) => sum + width, 0) + side(segments);
      const room = host.clientWidth - side(host);
      if (room <= 0) return;
      const next = equal <= room + 1 ? 'equal' : content <= room + 1 ? 'content' : 'menu';
      if (next !== fit) {
        if (next !== 'equal') narrowedAt.current = window.innerWidth;
        setFit(next);
      }
    };
    check();
    const watch = new ResizeObserver(check);
    watch.observe(host);
    window.addEventListener('resize', check);
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [labels, fit, menu]);
  const segments = (
    <div
      ref={group}
      {...(menu ? { 'aria-hidden': true, inert: true } : props)}
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-grid grid-flow-col rounded-[10px] bg-[rgb(120_120_128/0.16)] p-0.5 pointer-coarse:rounded-[12px] max-sm:rounded-[12px]',
        fit === 'content' ? 'auto-cols-auto' : 'auto-cols-fr',
        // Measuring only: one pixel, clipped and invisible, so it can never widen the page.
        menu ? 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0' : className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={menu ? -1 : undefined}
            onClick={() => onChange(option.value)}
            // 40px tall where a finger presses and on a phone-wide screen, like the small Button: a supper club's seat
            // count was 32 px segments on a phone (QA bots round 6, production, 2026-10-26).
            className="relative h-8 min-w-0 rounded-[8px] px-3 pointer-coarse:h-10 pointer-coarse:rounded-[10px] max-sm:h-10 max-sm:rounded-[10px] text-sm font-medium tracking-[-0.01em] whitespace-nowrap transition-opacity hover:opacity-70 active:scale-100 aria-checked:hover:opacity-100"
          >
            {selected && !menu && (
              <motion.span
                layoutId={`${id}-thumb`}
                transition={springs.snappy}
                className="absolute inset-0 rounded-[8px] bg-white pointer-coarse:rounded-[10px] max-sm:rounded-[10px] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] dark:bg-zinc-600"
              />
            )}
            {/* A label that does not fit ends in "…" inside its own segment; the chosen one is colored for its thumb. */}
            <span className={cn('relative block truncate', selected && 'text-zinc-900 dark:text-white')}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
  if (!menu) return segments;
  return (
    <>
      {segments}
      <div {...props} role="group" aria-label={label} className={className}>
        <Select
          options={options.map((option) => ({ value: option.value, label: option.label }))}
          value={value}
          onValueChange={(next) => onChange(next as T)}
        />
      </div>
    </>
  );
}
