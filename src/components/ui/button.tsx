import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Action buttons as Apple capsules. The press and the spring back come from
 * src/base.css; colors from --brand and --brand-ink. Plain utilities, so a
 * `className` restyles them (and so would a page-wide `button {}` reset, which
 * the notes rule out).
 */
export const buttonVariants = cva(
  // A link styled as a button presses like one: a 0.97 press in 100ms instead of the plain link's dim (emil-design-eng).
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[1.05em] [&_svg]:shrink-0 transition-[scale,background-color,color,filter] duration-200 active:scale-[0.97] active:opacity-100 active:duration-100 active:ease-out',
  {
    variants: {
      variant: {
        filled: 'bg-[var(--brand)] text-[var(--brand-ink)] hover:brightness-110',
        tinted:
          'bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-[var(--brand-text)] hover:bg-[color-mix(in_oklab,var(--brand)_22%,transparent)]',
        gray: 'bg-[rgb(120_120_128/0.16)] hover:bg-[rgb(120_120_128/0.26)]',
        plain: 'text-[var(--brand-text)] hover:bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]',
        glass: 'glass bg-[rgb(0_0_0/0.37)] text-white hover:bg-[rgb(0_0_0/0.46)]',
        // The class's own light and dark looks: hard-coded white utilities beat its dark rule and left a muddy
        // gray pill with near-black words in dark mode.
        'glass-light': 'glass-light hover:brightness-105',
      },
      size: {
        // 40px square at least where a finger presses: a bakery's 32px quantity steppers were hard to hit on a phone
        // (production QA bots, 2026-10-25).
        // On a phone-wide screen too, whatever the pointer: QA bots measuring a 375 px window with a mouse kept
        // reading the 32 px button as a phone's (2026-10-25).
        sm: 'h-8 px-3.5 text-sm pointer-coarse:h-10 pointer-coarse:min-w-10 max-sm:h-10 max-sm:min-w-10',
        // 44px where a finger presses (the touch target), 40px under a pointer.
        md: 'h-10 px-[18px] text-[15px] pointer-coarse:h-11',
        lg: 'h-12 px-6 text-[17px]',
      },
    },
    defaultVariants: { variant: 'filled', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** While its work runs: a spinner before the words, and no second press (a pay or save button pressed twice). */
    busy?: boolean;
  };

/**
 * A button with an `onClick` does that and never submits the form around it (the sign-in card's
 * "Forgot password?" sits inside its form). A button with neither a `type` nor an `onClick` can only
 * be a form's send button, so it submits: `<Button>Send request</Button>` in a form did nothing at
 * all, no thank-you and no error, and the agent blamed the visitor's missing account (real iPhone,
 * dev 2026-10-20). A written `type` always wins.
 */
export function Button({ className, variant, size, type, busy, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? (props.onClick ? 'button' : 'submit')}
      className={cn(buttonVariants({ variant, size }), busy && 'cursor-progress disabled:opacity-100', className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <LoaderCircle aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}
