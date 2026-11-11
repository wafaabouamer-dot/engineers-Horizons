// Text under 12px in the project's source: found by `pnpm verify`, raised to 12px by
// `pnpm fix:text` (which the agent runs when it chooses to).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SIZE =
  /font-size\s*:\s*([\d.]+)(px|rem)|font\s*:[^;{}]*?([\d.]+)(px|rem)|text-\[([\d.]+)(px|rem)\]|fontSize\s*[:=]\s*\{?\s*['"]?([\d.]+)(px|rem)?/g;

// A project with no src/ (a plain page brought in as index.html) or no index.html has none of
// them to read (production audit 2026-10-28: verify crashed with ENOENT after PASS build in ten
// import turns, and the agents patched our scripts or deleted scripts/).
function files(root) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(css|scss|[jt]sx?)$/.test(entry.name)) out.push(full);
    }
  };
  walk(path.join(root, 'src'));
  if (existsSync(path.join(root, 'index.html'))) out.push(path.join(root, 'index.html'));
  return out;
}

/**
 * The size a match names, in px, and the number and unit as written. A number inside a function
 * (`calc(13 * var(--u, 1px))`, `clamp(…)`) is not a font size: the games kit's `var(--u, 1px)` is a size
 * UNIT, and raising it to 12px made a 13 × 12 = 156 px online chip (a zombie game on dev, 2026-10-18).
 * Such a size is computed, so it is neither reported nor raised (`px` 0).
 */
function sizeOf(m) {
  const value = m[1] ?? m[3] ?? m[5] ?? m[7];
  const unit = m[2] ?? m[4] ?? m[6] ?? m[8] ?? '';
  const before = m[0].slice(0, m[0].lastIndexOf(`${value}${unit}`));
  const open = (before.match(/\(/g) ?? []).length - (before.match(/\)/g) ?? []).length;
  if (open > 0) return { value, unit, px: 0 };
  return { value, unit, px: unit === 'rem' ? Number(value) * 16 : Number(value) };
}

/** Every place with text under 12px: `{ file, line, px }`. */
export function findSmallText(root) {
  const small = [];
  for (const file of files(root)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, index) => {
        for (const m of text.matchAll(SIZE)) {
          const { px } = sizeOf(m);
          if (px > 0 && px < 12) small.push({ file: path.relative(root, file), line: index + 1, px: +px.toFixed(1) });
        }
      });
  }
  return small;
}

/** Raise every size under 12px to 12px (0.75rem for rem), in place; returns how many. */
export function raiseSmallText(root) {
  let raised = 0;
  for (const file of files(root)) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(SIZE, (...args) => {
      const match = args[0];
      const { value, unit, px } = sizeOf(args);
      if (!(px > 0 && px < 12)) return match;
      raised += 1;
      const at = match.lastIndexOf(`${value}${unit}`);
      return `${match.slice(0, at)}${unit === 'rem' ? '0.75' : '12'}${unit}${match.slice(at + value.length + unit.length)}`;
    });
    if (after !== before) writeFileSync(file, after);
  }
  return raised;
}
