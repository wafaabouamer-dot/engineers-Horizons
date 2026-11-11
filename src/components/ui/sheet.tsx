import { X } from 'lucide-react';
import { animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAboveKeyboard } from '@/lib/sheet-keyboard';
import { project, springs } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * A panel that slides up from the bottom (details, filters, a cart), with
 * Apple's feel: it follows the finger, a flick carries it where the gesture was
 * going, and the page dims behind it. Escape closes it and focus returns to
 * whatever opened it. Closed, it is hidden: nothing to see, tab to or read.
 * On a phone, its fields stay above the keyboard. It has its own Close button
 * (top right; production 2026-10-21: a menu with only a grab bar read as one
 * with no way out), so what goes inside needs no X of its own.
 */
export function Sheet({
  open,
  onOpenChange,
  label,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const [shown, setShown] = useState(false);
  const isOpen = useRef(open);
  isOpen.current = open;
  // Hidden only once the close has finished and nothing reopened it meanwhile.
  const hideIfClosed = () => {
    if (!isOpen.current) setShown(false);
  };
  const [height, setHeight] = useState(0);
  const dragControls = useDragControls();
  const y = useMotionValue(10_000);
  const scrim = useTransform(y, (value) =>
    height ? 0.4 * Math.max(0, Math.min(1, 1 - value / height)) : 0,
  );

  useLayoutEffect(() => {
    // Closed sits fully below the screen, shadow included. Not measured while
    // the keyboard caps it, or a close after typing would stop short.
    if (ref.current && !ref.current.style.maxHeight) setHeight(ref.current.offsetHeight + 48);
  }, [children]);

  // Held until the close has finished, so a submit slides the form down from where it was.
  useAboveKeyboard(shown, ref, body);

  useEffect(() => {
    if (!height) return;
    if (open) {
      if (y.get() > height) y.set(height);
      animate(y, 0, springs.default);
      // Only on opening: a height change while open (a list that grows as the
      // visitor types) must not pull focus out of the field.
      if (!wasOpen.current) {
        opener.current = document.activeElement as HTMLElement | null;
        // Visible now, not on the next render, so the focus can land.
        if (ref.current) ref.current.style.visibility = 'visible';
        setShown(true);
        ref.current?.focus({ preventScroll: true });
      }
    } else if (wasOpen.current) {
      void animate(y, height, springs.snappy).then(hideIfClosed);
      opener.current?.focus({ preventScroll: true });
    } else {
      y.set(height);
    }
    wasOpen.current = open;
  }, [open, height, y]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // On the page's top layer: a sheet inside a header's glass or a moving card (anything with a backdrop filter or a
  // transform) would be fixed to that box instead of the screen, and open off it (production 2026-10-22).
  return createPortal(
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-40 bg-black"
        style={{ opacity: scrim, pointerEvents: open ? 'auto' : 'none' }}
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        tabIndex={-1}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-[560px] flex-col rounded-t-[22px] bg-white px-6 pt-2 pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-zinc-900 shadow-[0_-12px_40px_rgb(0_0_0/0.18)] outline-none dark:bg-zinc-900 dark:text-zinc-50',
          className,
        )}
        style={{ y, visibility: shown ? 'visible' : 'hidden' }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const landing = y.get() + project(info.velocity.y);
          if (landing > height * 0.5) {
            onOpenChange(false);
            animate(y, height, { ...springs.momentum, velocity: info.velocity.y });
          } else {
            const spring = Math.abs(info.velocity.y) > 400 ? springs.momentum : springs.default;
            animate(y, 0, { ...spring, velocity: info.velocity.y });
          }
        }}
      >
        <div
          className="relative -mx-6 flex h-11 shrink-0 touch-none items-start justify-center pt-1"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div aria-hidden className="h-[5px] w-9 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <button
            type="button"
            aria-label={closeLabel()}
            className="absolute top-0 right-2 grid size-11 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-[-4px] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            // A press here closes; it never starts the drag the row around it begins.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden className="size-5" strokeWidth={2} />
          </button>
        </div>
        {/* The panel pads its sides: a lone padded wrapper inside keeps only its top and bottom padding, so the words
            are not squeezed into a phone's middle (13 real sites wrapped their content in `p-5`, 2026-10-21). */}
        <div ref={body} className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y [&>div:only-child:not([data-card])]:px-0">
          {children}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

/** The page's own language decides the button's name (the site's <html lang>). */
function closeLabel(): string {
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es') ? 'Cerrar' : 'Close';
}
