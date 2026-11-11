/**
 * A link to another page of the site cross-fades to the finished page: never a frame of the new page without its
 * pictures or its headline (owner, 2026-11-05, a builder's "Start a project": "it always like flashes the screen
 * before it takes you to the page, i want no flashes ever"). Filmed in Chrome, that click drew the new page dark for
 * five frames with its photos missing, then the photos, then its headline rising in.
 *
 * Every site, whatever changes its pages (its own `history.pushState`, React Router's `Link`): a plain click on a link
 * to another address of the site is held while the browser's view transition keeps the current page on screen, then
 * goes on to the page's own code. Once the new page is drawn it starts at its top (or at its `#section`), and the
 * pictures on that first screen get `PICTURES_MS` to arrive before the fade. Its first-screen words are there at once
 * (base.css skips their rise after a page change). Left alone: a link to a part of the same page, a new tab, another
 * site, a download, a click with a key held, a click the preview's tools took, and browsers without view transitions.
 * A link whose own code keeps the visitor on the page (a sign-in sheet, a quick view) leaves them where they were: the
 * listener runs before the page's own handlers, so only a changed address says a page change happened.
 */
const PICTURES_MS = 300;
/** How long a page's code has to start drawing the new page: a link it does not change pages for goes on as before. */
const DRAWN_MS = 300;

let installed = false;
let passing = false;

export function changePagesSmoothly() {
  if (installed || typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return;
  installed = true;
  document.addEventListener(
    'click',
    (event) => {
      if (passing || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return;
      if (link.target && link.target !== '_self') return;
      const to = new URL(link.href, location.href);
      if (to.origin !== location.origin || to.pathname === location.pathname) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      document.startViewTransition(async () => {
        document.documentElement.dataset.pageChanged = '';
        const drawn = changes(document.getElementById('root') ?? document.body);
        const from = location.pathname + location.search;
        passing = true;
        try {
          link.click();
        } finally {
          passing = false;
        }
        if (!(await drawn)) return;
        // The page's own effects (the kit's photos taking their turn) run before the first screen is measured.
        await new Promise((resolve) => setTimeout(resolve));
        // The link's own code kept the visitor here (it opened a sheet or a quick view): they stay where they were.
        if (location.pathname + location.search === from) return;
        const section = to.hash.length > 1 ? document.getElementById(decodeURIComponent(to.hash.slice(1))) : null;
        if (section) section.scrollIntoView();
        else window.scrollTo(0, 0);
        await firstScreenPictures();
      });
    },
    // Capture: ahead of the page's own link handling, after the preview's tools (they run first and take the click).
    true,
  );
}

/** Whether `el` changes within `DRAWN_MS`. */
function changes(el: Element) {
  return new Promise<boolean>((resolve) => {
    const watch = new MutationObserver(() => done(true));
    const timer = setTimeout(() => done(false), DRAWN_MS);
    const done = (seen: boolean) => {
      watch.disconnect();
      clearTimeout(timer);
      resolve(seen);
    };
    watch.observe(el, { childList: true, subtree: true });
  });
}

function firstScreenPictures() {
  const shown = [...document.images].filter((img) => {
    const box = img.getBoundingClientRect();
    return box.width > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
  });
  return Promise.race([
    Promise.all(shown.map((img) => img.decode().catch(() => undefined))),
    new Promise((resolve) => setTimeout(resolve, PICTURES_MS)),
  ]);
}
