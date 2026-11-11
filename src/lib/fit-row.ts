import { useLayoutEffect, type RefObject } from 'react';

/**
 * Keeps a header row on one line at every width, and folds what does not fit into the menu button.
 *
 * WHY (production 2026-10-18): a clinic's header put its name, 6 links, a pill, EN/ES, the sun/moon and a
 * button in one bar; the links showed from `md` whatever their length, so at every computer width the
 * labels wrapped onto three lines and the name ran under the links. Whether a row fits depends on its words
 * (Spanish labels run about 30% longer), so no breakpoint can decide it: this measures.
 *
 * What it sorts in the row: the NAME (its first link, words or picture that is not a menu item; never
 * hidden), the sun/moon
 * (`[data-theme-button]`; never hidden), a control marked `[data-keep]` (a cart with its count; never hidden, on a
 * phone too), the controls marked `[data-fold]` (a language switch, then the main
 * button, last in the row), a link drawn as a filled pill (a main button the page did not mark; it folds after the
 * marked ones), and LINKS (every other link or text button). It folds, until the row fits:
 *   1. the links one at a time from the last, wherever they sit (a `<nav>`, a `<ul>`, beside the name), never
 *      leaving one alone; a box left empty hides too. All of them at once emptied a whole bar: a site's seven
 *      tabs and its quote button all went when Spanish made them 100 px too long (production, 2026-10-25);
 *   2. the `[data-fold]` controls before the last, one at a time from the end;
 *   3. the name's words beside its picture (a logo's name and line): the picture stays as the name;
 *   4. the last `[data-fold]` control, the main button;
 *   5. last, the name may take two lines.
 * A long name used to fill a short bar and push the main button into the menu (owner, 2026-10-19: "the only
 * thing you see on that header is that long name"); the logo's picture now carries the name first. (On a phone
 * GlassBar keeps the `data-fold` controls in the menu altogether.)
 * Until that last step the row stays on one line (no wrapping, no shrinking), so "does it fit" is a real
 * question. It unfolds when the row is as wide again as it was when it folded, and any change to the
 * row's content starts over from nothing folded. The menu button shows whenever a link or control is not
 * on screen, whether the fold or the page's own class (`hidden md:flex`) hid it, and whenever a menu item
 * has nothing in the row at all (a Sign in or Owner page kept only in the menu: Kendall Eats v2, 2026-10-22,
 * had no way to sign in on a computer).
 *
 * Everything it sets is an inline style it puts back exactly, on elements the page renders without a
 * `style` of their own, so React's re-renders leave it alone. Platform file: "Update this project" brings
 * its fixes to sites already built, so `useFitRow`'s signature stays as it is (glass-bar.tsx imports it).
 */

type Saved = Map<HTMLElement, Map<string, string>>;

const CONTROL = 'a, button, [role="button"]';

function setStyle(saved: Saved, el: HTMLElement, prop: string, value: string): void {
  let props = saved.get(el);
  if (!props) saved.set(el, (props = new Map()));
  if (!props.has(prop)) props.set(prop, el.style.getPropertyValue(prop));
  el.style.setProperty(prop, value);
}

function restoreAll(saved: Saved): void {
  for (const [el, props] of saved) for (const [prop, value] of props) el.style.setProperty(prop, value);
  saved.clear();
}

const hasText = (el: Element): boolean => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');

/** On screen as far as layout goes: no `display: none` on it or above it, up to the row. */
function displayed(el: HTMLElement, row: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== row; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

/**
 * The row's own parts. `menuLabels` are the menu's words: a link that is also a menu item is a link,
 * never the name, so a row that opens with links before a centered name keeps its name (review B2).
 */
export function sortRow(row: HTMLElement, menuLabels: readonly string[] = []) {
  const labels = new Set(menuLabels.map((label) => label.trim().toLowerCase()));
  const all = [...row.querySelectorAll<HTMLElement>('*')];
  const menuItem = (el: HTMLElement) => {
    const control = el.closest<HTMLElement>(CONTROL);
    return Boolean(control && labels.has((control.textContent ?? '').trim().toLowerCase()));
  };
  const first = all.find(
    (el) =>
      (el.matches('a, img, svg') || hasText(el)) &&
      !menuItem(el) &&
      // A skip link for screen readers is not the name; nor are the controls.
      !el.closest('.sr-only, [data-theme-button], [data-keep], [data-fold], [role="radiogroup"]'),
  );
  // The name is its link, or the box around a logo and its words (so the words can still wrap last).
  const box = first?.matches('img, svg') && first.parentElement !== row ? first.parentElement : first;
  const name = (first?.closest<HTMLElement>('a') ?? box) ?? null;
  const theme = all.filter((el) => el.hasAttribute('data-theme-button'));
  const marked = all.filter((el) => el.hasAttribute('data-fold') && !el.parentElement?.closest('[data-fold]'));
  const keeps = all.filter((el) => el.hasAttribute('data-keep') && !el.parentElement?.closest('[data-keep]'));
  const controls = all.filter(
    (el) =>
      el.matches(CONTROL) &&
      (el.textContent ?? '').trim() !== '' &&
      !(name && (name === el || name.contains(el) || el.contains(name))) &&
      !el.closest('.sr-only, [data-theme-button], [data-keep], [data-fold], [role="radiogroup"]') &&
      !el.parentElement?.closest(CONTROL),
  );
  // A filled pill is the page's main button even unmarked: folded with the links it went with every tab.
  const pill = (el: HTMLElement) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    return /(^|\s)rounded-full(\s|$)/.test(cls) && /(^|\s)bg-/.test(cls) && !el.closest('nav, ul, [data-menu-pages]');
  };
  const folds = [...marked, ...controls.filter(pill)];
  const links = controls.filter((el) => !pill(el));
  return { name, theme, folds, keeps, links };
}

/** A control's words and its accessible name, lowercased: what a menu item's label can match. */
const namesOf = (el: Element): string[] =>
  [el.textContent ?? '', el.getAttribute('aria-label') ?? ''].map((w) => w.trim().toLowerCase()).filter(Boolean);

/**
 * Whether every menu item has something on screen in the row: a control with its words or name, or one
 * compact `data-fold` control standing for one item each (a language switch reads "EN ES" in the row and
 * "Español" in the menu). Only a `data-fold` control stands in, since only those go in the menu: a
 * `data-keep` cart, which need not, once stood in for a Sign in kept only in the menu (review 2026-10-22).
 * A menu item with nothing for it needs the menu button.
 */
export function menuShown(row: HTMLElement, parts: ReturnType<typeof sortRow>, menuLabels: readonly string[]): boolean {
  const all = new Set(menuLabels.map((label) => label.trim().toLowerCase()).filter(Boolean));
  const left = new Set(all);
  for (const el of row.querySelectorAll<HTMLElement>(CONTROL)) {
    if (displayed(el, row)) for (const words of namesOf(el)) left.delete(words);
  }
  const named = (el: Element) => namesOf(el).some((words) => all.has(words));
  // Only a marked control stands in (a language switch): an unmarked main button is not a menu item.
  const standIns = parts.folds.filter(
    (control) =>
      control.hasAttribute('data-fold') &&
      displayed(control, row) &&
      !named(control) &&
      ![...control.querySelectorAll(CONTROL)].some(named),
  ).length;
  return left.size <= standIns;
}

/** The words beside the name's picture (a logo's name and line), or none when the name has no picture. */
function wordsOf(name: HTMLElement | null): HTMLElement[] {
  if (!name || !name.querySelector('img, svg')) return [];
  return ([...name.children] as HTMLElement[]).filter(
    (child) => !child.matches('img, svg') && !child.querySelector('img, svg') && (child.textContent ?? '').trim() !== '',
  );
}

/** The row's direct child holding `el`. */
function topOf(el: HTMLElement, row: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node.parentElement !== row) node = node.parentElement;
  return node;
}

export function useFitRow(
  slot: RefObject<HTMLElement | null>,
  menuButton: RefObject<HTMLElement | null>,
  enabled: boolean,
  menuLabels?: RefObject<readonly string[]>,
): void {
  useLayoutEffect(() => {
    const holder = slot.current;
    const button = menuButton.current;
    let row = holder?.firstElementChild as HTMLElement | null;
    if (!enabled || !holder || !row || !button) return;
    const saved: Saved = new Map();
    /** The row width each level needed when it folded into the next. */
    let needed: number[] = [];
    let level = 0;
    let parts = sortRow(row, menuLabels?.current ?? []);
    /** After the links, in order: the controls before the last from the end, the name's words, the last one. */
    const after = () => {
      const words = wordsOf(parts.name);
      return [
        ...parts.folds.slice(0, -1).reverse().map((control) => [control]),
        ...(words.length ? [words] : []),
        ...parts.folds.slice(-1).map((control) => [control]),
      ];
    };
    let folds = after();

    /** How many links each link step hides: one more each time from the last, but never one left alone. */
    const linkSteps = () => {
      const n = parts.links.length;
      const counts = Array.from({ length: Math.max(0, n - 2) }, (_, i) => i + 1);
      return n > 0 ? [...counts, n] : [];
    };
    /** Steps in fold order: the links, the controls and the name's words, then the name's line. */
    const steps = () => linkSteps().length + folds.length + 1;
    const apply = () => {
      restoreAll(saved);
      if (!row) return;
      const wrapName = level >= steps();
      setStyle(saved, row, 'flex-wrap', 'nowrap');
      setStyle(saved, row, 'white-space', 'nowrap');
      // Nothing shrinks, the name included, until the last step: a name that may shrink (`truncate`) ate the
      // room and the links never folded (review B2).
      const nameTop = parts.name ? topOf(parts.name, row) : null;
      for (const child of [...row.children] as HTMLElement[]) setStyle(saved, child, 'flex-shrink', '0');
      if (wrapName && parts.name && nameTop) {
        setStyle(saved, parts.name, 'white-space', 'normal');
        setStyle(saved, nameTop, 'flex-shrink', '1');
        setStyle(saved, nameTop, 'min-width', '0');
      }
      const counts = linkSteps();
      const hiddenLinks = level >= 1 && counts.length ? (counts[Math.min(level, counts.length) - 1] ?? 0) : 0;
      if (hiddenLinks > 0) {
        const folded = parts.links.slice(parts.links.length - hiddenLinks);
        for (const link of folded) setStyle(saved, link, 'display', 'none');
        // A box whose children are all hidden now (a links <nav>) goes too, so its gap or margin goes.
        for (const link of folded) {
          for (let box = link.parentElement; box && box !== row; box = box.parentElement) {
            if (parts.name && box.contains(parts.name)) break;
            const kids = [...box.children] as HTMLElement[];
            if (hasText(box) || kids.some((kid) => displayed(kid, row!))) break;
            setStyle(saved, box, 'display', 'none');
          }
        }
      }
      for (const group of folds.slice(0, Math.max(0, level - counts.length))) {
        for (const el of group) setStyle(saved, el, 'display', 'none');
      }
      const hidden = parts.links.filter((link) => !displayed(link, row!)).length;
      if (hidden === parts.links.length) {
        // The controls keep to the end of the row: the first item after the name's takes the free space.
        const after = ([...row.children] as HTMLElement[]).slice(nameTop ? [...row.children].indexOf(nameTop) + 1 : 0);
        const next = after.find((child) => displayed(child, row!));
        if (next) setStyle(saved, next, 'margin-left', 'auto');
      }
      // The menu shows whenever any link or control is not on screen, whoever hid it: a page that shows two of
      // its links only from `xl` left them unreachable at 900 px (review B2).
      const missing =
        hidden > 0 ||
        parts.folds.some((control) => !displayed(control, row!)) ||
        !menuShown(row, parts, menuLabels?.current ?? []);
      setStyle(saved, button, 'display', missing ? 'grid' : 'none');
    };
    /** How far what the row shows runs past its room. A flex row can run into its own end padding without
     * scrolling, so the last thing shown is measured against it too (the main button sat on the capsule's edge at
     * 945 px: dev, 2026-10-19). */
    const overflowBy = () => {
      if (!row) return 0;
      const end = row.getBoundingClientRect().right - (parseFloat(getComputedStyle(row).paddingRight) || 0);
      // In-flow children only: one the page places on its own (`absolute`) is not in the row's line.
      const shown = ([...row.children] as HTMLElement[]).filter(
        (child) => displayed(child, row!) && !/absolute|fixed/.test(getComputedStyle(child).position),
      );
      const past = Math.max(0, ...shown.map((child) => child.getBoundingClientRect().right - end));
      return Math.max(row.scrollWidth - row.clientWidth, Math.ceil(past));
    };
    const overflows = () => overflowBy() > 1;
    const fit = () => {
      if (!row) return;
      apply();
      while (level > 0 && row.clientWidth >= (needed[level] ?? Infinity)) {
        level -= 1;
        apply();
        if (overflows()) {
          level += 1;
          apply();
          break;
        }
      }
      while (overflows() && level < steps()) {
        needed[level + 1] = row.clientWidth + overflowBy();
        level += 1;
        apply();
      }
    };
    const restart = () => {
      if (!row) return;
      parts = sortRow(row, menuLabels?.current ?? []);
      folds = after();
      needed = [];
      level = 0;
      fit();
    };

    let frame = 0;
    const sizes = new ResizeObserver(() => {
      // A frame later, so this pass's own changes never re-enter the observer in the same frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    const watch = () => {
      sizes.disconnect();
      if (!row) return;
      sizes.observe(row);
      for (const child of row.children) sizes.observe(child);
    };
    // React replacing or rewriting what is in the header, the row itself included (a row keyed by language
    // came back unfolded, review B2): read the row again and start over. Attributes are not watched, so the
    // styles set here never call it again.
    const content = new MutationObserver(() => {
      const now = holder.firstElementChild as HTMLElement | null;
      if (now !== row) {
        restoreAll(saved);
        row = now;
      }
      watch();
      restart();
    });
    content.observe(holder, { childList: true, subtree: true, characterData: true });
    // A MENU THAT CHANGES WITHOUT THE ROW is read again: Sign in joins the menu once the account check
    // answers, after the first paint, and nothing in the row changes for the observers above to see (a dev
    // build, 2026-10-22: Sign in only in the menu, and no menu button on a computer). A cheap compare.
    let labelsSeen = (menuLabels?.current ?? []).join('\n');
    const labelsWatch = window.setInterval(() => {
      const now = (menuLabels?.current ?? []).join('\n');
      if (now === labelsSeen) return;
      labelsSeen = now;
      restart();
    }, 400);
    watch();
    fit();
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(labelsWatch);
      sizes.disconnect();
      content.disconnect();
      restoreAll(saved);
    };
  }, [slot, menuButton, enabled, menuLabels]);
}
