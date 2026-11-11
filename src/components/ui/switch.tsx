import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * An on/off setting in a list or form (the iOS switch): its label on the left, the switch on the right, and the
 * whole row presses it. The label is always shown: a switch without words read as a random green toggle (dev,
 * 2026-10-19). `className` styles the row. Not for light/dark: that is the kit's `ThemeButton`.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-4', className)}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 active:scale-100',
          checked ? 'bg-[#34c759]' : 'bg-[rgb(120_120_128/0.32)]',
        )}
      >
        <motion.span
          className="size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)]"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
        />
      </button>
    </label>
  );
}
