import { AlertDialog } from 'radix-ui';
import { useCallback, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WORDS = {
  en: { cancel: 'Cancel', confirm: 'Confirm', failed: "That didn't work. Try again." },
  es: { cancel: 'Cancelar', confirm: 'Confirmar', failed: 'No funcionó. Inténtalo de nuevo.' },
};
const words = () => (document.documentElement.lang.toLowerCase().startsWith('es') ? WORDS.es : WORDS.en);

export type ConfirmOptions = {
  title: ReactNode;
  /** What happens, in a sentence: "Your seats go back on sale and the $90 is refunded." */
  text?: ReactNode;
  /** The action, said as the button says it: "Cancel order", "Delete event". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** A red action button, for deleting, cancelling or refunding. */
  danger?: boolean;
  /**
   * The work, run with the dialog still open and its button busy: it closes when the work finishes, and stays open
   * with the error's words when it throws, so the person can try again or cancel.
   */
  onConfirm?: () => unknown;
};

/**
 * A question before something that cannot be taken back (cancel an order, delete an event, refund a ticket): in the
 * middle of the screen at every size, over a dimmed page, on the page's top layer (a dialog drawn in the page opened
 * 5,800 px down a phone's page: production 2026-10-22, a ticket site's confirmations). Escape and Cancel close it; the
 * action's button shows it is working and the dialog waits for it. Words follow `<html lang>` (English, or Spanish
 * for `es`) unless given. Use it instead of the browser's `confirm()`, which looks like an error from the browser.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Cancel this order?', confirmLabel: 'Cancel order', danger: true, onConfirm: cancel }))
 *
 * or controlled: `<ConfirmDialog open={open} onOpenChange={setOpen} title=… onConfirm=… />`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  text,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
}: ConfirmOptions & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const w = words();
  const close = (next: boolean) => {
    if (busy) return;
    setProblem('');
    onOpenChange(next);
  };
  const run = async () => {
    setBusy(true);
    setProblem('');
    try {
      await onConfirm?.();
      setBusy(false);
      onOpenChange(false);
    } catch (cause) {
      setBusy(false);
      const message = (cause as { userMessage?: unknown; message?: unknown } | null) ?? {};
      setProblem(
        typeof message.userMessage === 'string'
          ? message.userMessage
          : typeof message.message === 'string' && message.message
            ? message.message
            : w.failed,
      );
    }
  };
  return (
    <AlertDialog.Root open={open} onOpenChange={close}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <AlertDialog.Content
          {...(text == null ? { 'aria-describedby': undefined } : {})}
          className="fixed inset-0 z-50 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl bg-white p-6 text-zinc-900 shadow-[0_24px_64px_-12px_rgb(0_0_0/0.5)] outline-none sm:p-7 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <AlertDialog.Title className="text-xl leading-snug font-semibold tracking-tight text-balance">{title}</AlertDialog.Title>
          {text != null && (
            <AlertDialog.Description className="mt-2 leading-relaxed opacity-75">{text}</AlertDialog.Description>
          )}
          {problem && (
            <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
              {problem}
            </p>
          )}
          {/* On a phone the two buttons stack full width with the action on top, as an iPhone's alert. */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="gray" disabled={busy} className="max-sm:w-full">
                {cancelLabel ?? w.cancel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              busy={busy}
              onClick={() => void run()}
              className={cn('max-sm:w-full', danger && 'bg-red-600 text-white hover:bg-red-600 dark:bg-red-500')}
            >
              {confirmLabel ?? w.confirm}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Opens a `ConfirmDialog` of its own and answers whether the person went ahead (and its `onConfirm` finished). */
function ask(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    let done = false;
    let wentAhead = false;
    const finish = (went: boolean) => {
      if (done) return;
      done = true;
      resolve(went);
      // After its closing animation.
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 400);
    };
    function Asked() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog
          {...options}
          open={open}
          onConfirm={async () => {
            await options.onConfirm?.();
            wentAhead = true;
          }}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) finish(wentAhead);
          }}
        />
      );
    }
    root.render(<Asked />);
  });
}

/** `confirm(options)`: true once the person went ahead and `onConfirm` (if any) finished, false when they backed out. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return useCallback(ask, []);
}
