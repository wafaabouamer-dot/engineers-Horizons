import { useEffect, type RefObject } from 'react';

/** The visible box this much shorter than the page means a keyboard, not a browser toolbar. */
const KEYBOARD_MIN = 120;
/**
 * Below this visible height (a phone held sideways with the keyboard up, about
 * 130px) a panel cut to fit would leave its content a slit narrower than one
 * field, so it stays as it was and Safari scrolls the page to the field. An
 * upright phone shows far more (392px on an iPhone 14 Pro).
 */
const VISIBLE_MIN = 200;
/** Room above the panel's top, as its `max-h-[calc(100dvh-1rem)]` keeps. */
const TOP_GAP = 16;
/** Room around a focused field inside the panel. */
const FIELD_PAD = 12;

/**
 * Keeps a panel fixed to the bottom of the screen (the kit's Sheet) above the
 * phone's keyboard while `active`. Phone browsers do not shrink the page for the
 * keyboard: a `bottom-0` panel stays under the keys and Safari scrolls the page
 * to show the field, so the panel jumps from field to field and a field just
 * above the keys sits under Safari's bar there, which takes the first tap.
 * `visualViewport` is the box really visible: while the keyboard is up the
 * panel ends at its bottom, is no taller than it, and its own content (never
 * the page) scrolls to show the focused field. The page height is
 * `documentElement.clientHeight`, never `innerHeight`, which iOS reports wrong
 * while the keyboard slides. Keyboard down, nothing is changed. The Sheet keeps
 * it active until its close has finished, so a submit that closes the form
 * slides it down from where it was instead of dropping it behind the keys.
 */
export function useAboveKeyboard(
  active: boolean,
  panel: RefObject<HTMLElement | null>,
  scroller: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const view = window.visualViewport;
    const el = panel.current;
    if (!active || !view || !el) return;
    let frame = 0;
    let reveal = false;
    const fit = () => {
      frame = 0;
      const page = document.documentElement.clientHeight;
      const up = page - view.height > KEYBOARD_MIN && view.height >= VISIBLE_MIN;
      const maxHeight = up ? `${Math.round(view.height - TOP_GAP)}px` : '';
      if (el.style.maxHeight !== maxHeight) reveal = true;
      el.style.bottom = up ? `${Math.max(0, Math.round(page - view.offsetTop - view.height))}px` : '';
      el.style.maxHeight = maxHeight;
      const box = scroller.current;
      const field = document.activeElement;
      if (up && reveal && box && field instanceof HTMLElement && field !== box && box.contains(field)) {
        keepInView(box, field);
      }
      reveal = false;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    const focused = () => {
      reveal = true;
      schedule();
    };
    view.addEventListener('resize', schedule);
    view.addEventListener('scroll', schedule);
    el.addEventListener('focusin', focused);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      view.removeEventListener('resize', schedule);
      view.removeEventListener('scroll', schedule);
      el.removeEventListener('focusin', focused);
      el.style.bottom = '';
      el.style.maxHeight = '';
    };
  }, [active, panel, scroller]);
}

/** Scrolls `box` so `field` shows in it with room to spare; its top wins when it is too tall. */
function keepInView(box: HTMLElement, field: HTMLElement) {
  const outer = box.getBoundingClientRect();
  const inner = field.getBoundingClientRect();
  const above = outer.top + FIELD_PAD - inner.top;
  const below = inner.bottom + FIELD_PAD - outer.bottom;
  if (above > 0) box.scrollTop -= above;
  else if (below > 0) box.scrollTop += Math.min(below, -above);
}
