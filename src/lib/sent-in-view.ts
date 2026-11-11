/**
 * A form that turns into its message once sent (a thank-you, a booking's "Done") shows that message, never the page
 * below it. The message is shorter than the form, so a phone that sent from the form's foot was left on the next
 * section or the footer with the message above the screen, and the visitor could not tell the send worked (real
 * iPhone on dev: a grooming salon's "Thanks, Pepper!" 2026-10-16, a barber's "Listo, Lucia" 2026-10-25).
 *
 * Every form on the site, with nothing for the page to do: after a send, when the form leaves the page within
 * `WATCH_MS`, what took its place (the first thing added in the nearest box that held it and is still there) scrolls
 * to just under the header if its top went above it. With nothing added, that box does, unless it is taller than the
 * screen (a list a row was saved in). Left alone: a form in a dialog or panel, and a form that stays (an error,
 * cleared fields, its own message beside it).
 */
const WATCH_MS = 20_000;
/** Room between the header (or the top of the screen) and the message. */
const GAP = 16;

let installed = false;

export function keepSentFormsInView() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.closest('[role="dialog"], [role="alertdialog"], dialog')) return;
      const holders: Element[] = [];
      for (let el = form.parentElement; el && el !== document.body; el = el.parentElement) holders.push(el);
      const watch = new MutationObserver((records) => {
        if (form.isConnected) return;
        stop();
        const holder = holders.find((el) => el.isConnected);
        if (!holder) return;
        const added = records
          .flatMap((record) => [...record.addedNodes])
          .map((node) => (node instanceof Element ? node : node.parentElement))
          .filter((el): el is Element => !!el && el.isConnected && holder.contains(el))
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        // After the browser has laid out the message.
        requestAnimationFrame(() => (added[0] ? reveal(added[0], false) : reveal(holder, true)));
      });
      const timer = setTimeout(() => stop(), WATCH_MS);
      const stop = () => {
        watch.disconnect();
        clearTimeout(timer);
      };
      watch.observe(document.body, { childList: true, subtree: true });
    },
    // Capture: a page's own submit handler cannot stop it from seeing the send.
    true,
  );
}

function reveal(el: Element, onlyIfItFits: boolean) {
  const header = document.querySelector('header');
  const under =
    header && /^(fixed|sticky)$/.test(getComputedStyle(header).position)
      ? Math.max(0, header.getBoundingClientRect().bottom)
      : 0;
  const rect = el.getBoundingClientRect();
  if (rect.top >= under) return;
  if (onlyIfItFits && rect.height > window.innerHeight - under - GAP) return;
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - under - GAP), behavior: 'smooth' });
}
