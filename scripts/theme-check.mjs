// Two color checks `pnpm verify` prints as notes, never failures: a light/dark
// button over colors that mostly stay fixed (it switches nothing anyone sees), and
// cards or sections filled solid with the accent color.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const NEUTRAL_PALETTE = /^(?:slate|gray|zinc|neutral|stone)$/;
/** A background or text color utility: white, black, a palette step or an arbitrary value, with an optional opacity. */
const COLOR = new RegExp(`^(bg|text)-(white|black|(?:${PALETTE})-\\d{2,3}|\\[[^\\]]+\\])(?:\\/(\\[[^\\]]+\\]|[\\d.]+))?$`);
const VAR_COLOR = /^(bg|text)-\[var\((--[\w-]+)\)\]/;
const CLASS_STRING = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\}|\{"([^"]*)"\})/g;

/** `#rgb`, `#rrggbb(aa)` or `rgb(r g b / a)` as 0-255 channels and alpha; undefined otherwise. */
function parseColor(value) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return { r, g, b, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)$/i.exec(
    value.replace(/_/g, ' '),
  );
  if (!rgb) return undefined;
  const a = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1);
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a };
}

/**
 * What a color utility does across light and dark: `light` or `dark` is a surface or text that
 * only looks right in one mode (white, black, light or dark grays, cream); `mid` is a gray that
 * reads on both; `accent` is a brand color meant to stay; `clear` is see-through (under half
 * opacity). Undefined for anything that is not a color (`text-lg`, `bg-[url(...)]`).
 */
function colorOf(token) {
  const m = COLOR.exec(token);
  if (!m) return undefined;
  const [, prop, value, opacity] = m;
  let alpha = 1;
  if (opacity) {
    const n = Number(opacity.replace(/^\[|\]$/g, ''));
    if (Number.isFinite(n)) alpha = n > 1 ? n / 100 : n;
  }
  let kind;
  if (value === 'white') kind = 'light';
  else if (value === 'black') kind = 'dark';
  else if (!value.startsWith('[')) {
    const [name, stepText] = value.split(/-(?=\d)/);
    const step = Number(stepText);
    if (NEUTRAL_PALETTE.test(name)) {
      kind = step <= 300 ? 'light' : step >= (prop === 'bg' ? 700 : 600) ? 'dark' : 'mid';
    } else kind = step <= 100 ? 'light' : step >= 900 ? 'dark' : 'accent';
  } else {
    const c = parseColor(value.slice(1, -1));
    if (!c) return undefined;
    alpha *= c.a;
    const [r, g, b] = [c.r, c.g, c.b].map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const sat = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    kind = l >= 0.85 ? 'light' : l <= 0.15 ? 'dark' : sat > 0.25 ? 'accent' : l >= 0.75 ? 'light' : l <= 0.3 ? 'dark' : 'mid';
  }
  return { prop, kind: alpha < 0.5 ? 'clear' : kind, token };
}

function sources(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      // The kit themes itself; the check is about the page the agent wrote.
      if (entry.isDirectory()) {
        if (full !== path.join(root, 'src', 'components', 'ui')) walk(full);
      } else if (/\.(css|[jt]sx)$/.test(entry.name)) out.push(full);
    }
  };
  walk(path.join(root, 'src'));
  return out;
}

/** What the project's CSS switches for dark mode (its color variables), and how it
 * paints the page itself: `switches`, `fixed` (one color in both modes) or undefined. */
function darkCss(css) {
  const names = new Set();
  const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, selector, body] of blocks) {
    if (/\.dark\b/.test(selector)) for (const v of body.matchAll(/(--[\w-]+)\s*:/g)) names.add(v[1]);
  }
  let page;
  for (const [, selector, body] of blocks) {
    const bg = /(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1];
    if (!bg || !/(?:^|[\s,>])(?:html|body|main|#root|:root)\s*(?:$|,)/m.test(selector)) continue;
    const vars = [...bg.matchAll(/var\((--[\w-]+)/g)].map((v) => v[1]);
    if (/\.dark\b/.test(selector) || vars.some((v) => names.has(v))) return { names, page: 'switches' };
    page = 'fixed';
  }
  return { names, page };
}

/** A full-height wrapper: the page's own surface when it carries a background. */
const PAGE_HEIGHT = /^(?:min-h|h)-(?:screen|dvh|svh|lvh|\[100(?:dvh|svh|lvh|vh)\])$/;

/**
 * Undefined when the page has no light/dark button; otherwise how many class
 * strings switch a gray, white or black with the theme (`themed`) and how many
 * keep one that only suits one mode (`fixed`), with the first fixed ones as
 * `{ file, line, colors }`. Brand colors, mid grays and see-through overlays look
 * the same in both modes on purpose, so they count neither way. `page` says how
 * the page's own background behaves (a full-height wrapper's, else the CSS's).
 */
export function checkThemes(root) {
  const files = sources(root).map((file) => ({ file, text: readFileSync(file, 'utf8') }));
  const all = files.map((f) => f.text).join('\n');
  // The kit's ThemeButton calls useTheme inside components/ui, which this check skips: name it here.
  if (!/useTheme\s*\(|<ThemeButton\b|classList\.(?:toggle|add|remove)\(\s*['"]dark['"]/.test(all)) return undefined;
  const css = darkCss(files.filter((f) => f.file.endsWith('.css')).map((f) => f.text).join('\n'));
  const darkVars = css.names;
  let page;
  let themed = 0;
  let fixed = 0;
  const samples = [];
  for (const { file, text } of files) {
    if (file.endsWith('.css')) continue;
    text.split('\n').forEach((line, index) => {
      for (const m of line.matchAll(CLASS_STRING)) {
        const tokens = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').split(/\s+/).filter(Boolean);
        // Base colors only: hover, focus, group and dark: variants are not the resting look.
        const base = tokens.filter((t) => !t.includes(':'));
        const colors = base.map(colorOf).filter(Boolean);
        const grays = colors.filter((c) => c.kind === 'light' || c.kind === 'dark' || c.kind === 'mid');
        const themedVars = base.filter((t) => darkVars.has(VAR_COLOR.exec(t)?.[2] ?? ''));
        // A dark: color counts only when it differs: `bg-[#121016] dark:bg-[#121016]` switches nothing.
        const darkColors = tokens.filter((t) => /^dark:(bg|text)-/.test(t)).map((t) => t.slice(5)).filter((t) => !base.includes(t));
        const hasDark = darkColors.length > 0;
        // The first full-height wrapper with a background is the page's surface.
        const bg = colors.find((c) => c.prop === 'bg');
        const varBg = base.some((t) => t.startsWith('bg-') && darkVars.has(VAR_COLOR.exec(t)?.[2] ?? ''));
        if (page === undefined && tokens.some((t) => PAGE_HEIGHT.test(t)) && (bg || varBg)) {
          const switches = varBg || darkColors.some((t) => t.startsWith('bg-'));
          page = switches ? 'switches' : bg.kind === 'light' || bg.kind === 'dark' ? 'fixed' : 'other';
        }
        if (themedVars.length || (hasDark && grays.length)) {
          themed += 1;
          continue;
        }
        // An element on its own brand color (a gold button, a colored tag) is the same in both modes on purpose.
        if (colors.some((c) => c.prop === 'bg' && c.kind === 'accent')) continue;
        const oneMode = grays.filter((c) => c.kind !== 'mid');
        if (!oneMode.length) continue;
        fixed += 1;
        if (samples.length < 5) {
          samples.push({ file: path.relative(root, file), line: index + 1, colors: oneMode.map((c) => c.token).join(' ') });
        }
      }
    });
  }
  return { themed, fixed, samples, page: page === 'other' ? undefined : (page ?? css.page) };
}

/**
 * Whether the light/dark button changes little: most of the page's grays, white
 * and black keep one color. A page whose own background switches does switch (a
 * dark band or a photo that stays is a choice), whatever its other colors say.
 */
export function themeSwitchesLittle(result) {
  if (!result || result.page === 'switches') return false;
  return result.fixed >= 12 && result.themed / (result.themed + result.fixed) < 0.35;
}

const SATURATED = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

/** A saturated hex: a color, not a near-white, near-black or gray surface. */
function saturatedHex(hex) {
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return s > 0.35 && l > 0.12 && l < 0.85;
}

/** A solid fill in a color: a brand variable or utility, a saturated palette step or hex. */
function colorFill(token) {
  let m;
  if ((m = /^bg-\[var\(--([\w-]+)\)\]$/.exec(token))) {
    return /brand|accent|primary|gold|highlight/.test(m[1]) &&
      !/ink|fg|text|soft|tint|muted|subtle|surface|paper|line|border|bg/.test(m[1]);
  }
  if (/^bg-(?:brand|accent|primary)(?:-\d{2,3})?$/.test(token)) return true;
  if (new RegExp(`^bg-(?:${SATURATED})-[3-8]00$`).test(token)) return true;
  if ((m = /^bg-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]$/.exec(token))) return saturatedHex(m[1]);
  return false;
}

/** Real vertical padding (20px or more) or height (140px or more): a card or section. */
function big(base) {
  return base.some((t) => {
    let m;
    if ((m = /^(?:p|py|pt|pb)-(\d+(?:\.5)?)$/.exec(t))) return Number(m[1]) * 4 >= 20;
    if ((m = /^(?:p|py)-\[(\d+)px\]$/.exec(t))) return Number(m[1]) >= 20;
    if ((m = /^(?:min-h|h)-\[(\d+)px\]$/.exec(t))) return Number(m[1]) >= 140;
    if ((m = /^(?:min-h|h)-(\d+)$/.exec(t))) return Number(m[1]) * 4 >= 140;
    return /^(?:min-h|h)-(?:screen|svh|dvh)/.test(t);
  });
}

/**
 * Cards and sections filled solid with the site's accent: the color its pill
 * buttons use, or a variable named for the brand. `{ file, line, color }` each.
 */
export function accentFilledCards(root) {
  const strings = [];
  for (const file of sources(root)) {
    if (file.endsWith('.css')) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      for (const m of line.matchAll(CLASS_STRING)) {
        // Base colors only: hover, focus, group and dark: variants are not the resting look.
        const base = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').split(/\s+/).filter((t) => t && !t.includes(':'));
        strings.push({ file: path.relative(root, file), line: index + 1, base });
      }
    });
  }
  const pill = (base) => base.includes('rounded-full') && !big(base);
  const card = (base) => !base.includes('rounded-full') && big(base);
  const buttonColors = new Set(strings.filter((s) => pill(s.base)).flatMap((s) => s.base.filter(colorFill)));
  const accent = (t) => buttonColors.has(t) || (/^bg-(?:\[var\(|brand|accent|primary)/.test(t) && colorFill(t));
  return strings
    .filter((s) => card(s.base) && s.base.some(accent))
    .map(({ file, line, base }) => ({ file, line, color: base.find(accent).slice(3) }));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('theme-check.mjs')) {
  const root = path.resolve(process.argv[2] ?? '.');
  const result = checkThemes(root);
  console.log(JSON.stringify({ ...result, flagged: themeSwitchesLittle(result), accentFilled: accentFilledCards(root) }));
}
