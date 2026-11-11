/**
 * A tall or square photo (almost always a person) cropped to fill a wider box keeps its upper part, where the face is.
 * From the middle, a full-length portrait in a wide card lost its owner's forehead (owner, 2026-11-02, "why is her
 * face cut like that"), and square headshots in 16:10 team cards lost the tops of their heads ("why are these cut?").
 * A tall photo keeps 15% from its top, a square one 25%; the height kept only matters when a box crops the top and
 * bottom, so the same photo in a box that crops its sides is unchanged. Wide photos (a car, a dish, a room) stay
 * centered, so nothing at their foot is cut. Every photo on the site, with nothing for the page to do; a page's own
 * position (`object-top`, `object-[…]`, `style`) is kept.
 */
let installed = false;

export function keepFacesInCroppedPhotos() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const place = (img: HTMLImageElement) => {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || h < w * 0.9 || img.style.objectPosition) return;
    const style = getComputedStyle(img);
    // Only one the page left at the middle (the default); any position of its own stands.
    if (style.objectFit !== 'cover' || style.objectPosition !== '50% 50%') return;
    img.style.objectPosition = h > w * 1.1 ? '50% 15%' : '50% 25%';
  };
  // Loads do not bubble: caught on the way down, for every picture the page shows now or later.
  document.addEventListener('load', (event) => event.target instanceof HTMLImageElement && place(event.target), true);
  document.querySelectorAll('img').forEach((img) => img.complete && place(img));
}
