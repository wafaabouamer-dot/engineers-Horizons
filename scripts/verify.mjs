import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import path from 'node:path';
import { findRestartingLoops } from './loop-check.mjs';
import { cannotFindName, missingPictures, starterStillMounted, unfilteredMyLists } from './starter-checks.mjs';
import { findSmallText } from './text-sizes.mjs';
import { accentFilledCards, checkThemes, themeSwitchesLittle } from './theme-check.mjs';

const root = process.cwd();
const { scripts = {} } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const runner = process.env.npm_execpath;
if (!runner || !scripts.build) {
  console.error('[verify] FAILED: run pnpm verify in a project with a build script.');
  process.exit(1);
}
// The build passes on the starter page too, so it is checked first (production 2026-10-15/16).
if (starterStillMounted(root)) {
  console.error(
    '[verify] FAILED page: src/App.tsx is still the starter placeholder, so the preview shows nothing that was built. ' +
      "Mount the site or game there (a recipe's App.tsx is part of its copy).",
  );
  process.exit(1);
}

// A site or app: the build, then the type check for undefined names only (below; any other type
// complaint does not break the running page). A game keeps the type check its recipes rely on, run here directly: the starter
// has no `typecheck` script, so nothing invites a second, separate run.
const TYPECHECK = ['--require', './scripts/cache.cjs', './node_modules/typescript/bin/tsc', '--noEmit'];
const tasks = (scripts['check:game'] ? ['typecheck', 'check:game', 'build'] : ['build']).filter(
  (name) => name === 'typecheck' || scripts[name],
);
const logs = path.join(root, 'node_modules/.cache/verification');
mkdirSync(logs, { recursive: true });
for (const name of tasks) {
  const log = path.join(logs, `${name.replace(':', '-')}.log`);
  const fd = openSync(log, 'w');
  const start = performance.now();
  let result;
  try {
    const argv = name === 'typecheck' && !scripts.typecheck ? TYPECHECK : [runner, 'run', name];
    result = spawnSync(process.execPath, argv, {
      cwd: root,
      env: { ...process.env, CI: '1' },
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    });
  } finally {
    closeSync(fd);
  }
  if (result.error || result.status !== 0) {
    // Read a bounded tail; a large failed suite must not be loaded into RAM.
    const length = statSync(log).size;
    const tail = Buffer.alloc(Math.min(length, 32 * 1024));
    const input = openSync(log, 'r');
    try {
      readSync(input, tail, 0, tail.length, length - tail.length);
    } finally {
      closeSync(input);
    }
    console.error(tail.toString('utf8').split(/\r?\n/).slice(-60).join('\n'));
    if (result.error) console.error(result.error.message);
    console.error(`[verify] Full log: ${path.relative(root, log)}`);
    // Keep the verdict last even when a caller trims console output.
    console.error(
      `[verify] FAILED ${name} (${result.signal ?? result.status ?? 'could not start'})`,
    );
    process.exit(result.status && result.status > 0 ? result.status : 1);
  }
  console.log(`[verify] PASS ${name} (${((performance.now() - start) / 1000).toFixed(2)}s)`);
}
// A site: the same type check, failing only on a name nothing defines, which builds cleanly and
// crashes the page when it is reached; the crash check below opens only the first page (a signed-in
// page went blank on `useBanReason` while verify passed three times, production 2026-10-15). If the
// type check cannot run, nothing is said.
const passed = [...tasks];
if (!scripts['check:game'] && existsSync(path.join(root, 'node_modules/typescript/bin/tsc'))) {
  const start = performance.now();
  const check = spawnSync(process.execPath, [...TYPECHECK, '--pretty', 'false'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  const output = check.stdout ?? '';
  // Ran means it judged the code: no errors, or its own error lines. A crash, a missing tsconfig
  // or an unstartable process says nothing either way.
  const ran = !check.error && (check.status === 0 || /\): error TS\d+:/.test(output));
  const missing = ran ? cannotFindName(output) : [];
  if (missing.length) {
    console.error(missing.slice(0, 20).join('\n'));
    console.error(
      `[verify] FAILED names: ${missing.length} name(s) above are used but never defined or imported, and the page ` +
        'crashes when it reaches one. Import or define each; for a name a <script> tag in index.html defines, add ' +
        '`declare const name: any;`.',
    );
    process.exit(1);
  }
  if (ran) {
    passed.push('names');
    console.log(`[verify] PASS names (${((performance.now() - start) / 1000).toFixed(2)}s)`);
  }
}

// A picture the code shows with no file behind it is a blank tile or a broken image on the live site (a realtor's
// "Little Havana" tile, production 2026-10-25).
const pictures = missingPictures(root);
if (pictures.length) {
  console.error(pictures.slice(0, 12).map(({ file, line, path: picture }) => `${picture} (${file}:${line})`).join('\n'));
  console.error(
    `[verify] FAILED pictures: ${pictures.length} picture(s) above are shown by the site but public/ has no file at ` +
      'that path, so visitors see a blank or broken picture. Make each one with the image tool and copy it into ' +
      "public/ at that path, or point it at a picture the site has.",
  );
  process.exit(1);
}
passed.push('pictures');

const uiHint = '';

// A note, never a failure: a "My ..." page whose query names no person shows the owner everyone's rows.
const myLists = unfilteredMyLists(root);
if (myLists.length) {
  const where = myLists.slice(0, 5).map(({ file, line, path: route }) => `${file}:${line} (${route})`).join('; ');
  console.log(
    `[verify] NOTE my lists: ${where}. If this page lists only the signed-in person's rows, filter them in ` +
      "the query (user_id=eq.<their id>, or email=eq.<their confirmed email, lowercased>): the owner's rights " +
      "read every row, so without it the owner sees everyone's rows as their own. A list of everyone on purpose " +
      'stays as it is.',
  );
}
// A note, never a failure: text under 12px is hard to read, unless the owner asked for it.
const small = findSmallText(root);
if (small.length) {
  // Every place at once, grouped by file, so one pass fixes them all.
  const byFile = new Map();
  for (const { file, line, px } of small) byFile.set(file, [...(byFile.get(file) ?? []), `${line} (${px}px)`]);
  const places = [...byFile].map(([file, lines]) => `${file} lines ${lines.join(', ')}`).join('; ');
  console.log(
    `[verify] NOTE text sizes: ${small.length} place(s) use text under 12px, which is hard to read: ${places}. ` +
      'Fix them all in one pass: `pnpm fix:text` raises every one to 12px; then make anything people read ' +
      '(paragraphs, descriptions, form fields, card text) 16px. Keep a smaller size only if the owner asked for it.',
  );
}
// A note, never a failure: a light/dark button over colors that never change switches nothing.
const themes = checkThemes(root);
if (themeSwitchesLittle(themes)) {
  const where = themes.samples.map(({ file, line, colors }) => `${file}:${line} (${colors})`).join('; ');
  console.log(
    `[verify] NOTE light/dark: the page has a light/dark button, but ${themes.fixed} of its ` +
      `${themes.fixed + themes.themed} white, black or gray backgrounds and text colors stay the same in both ` +
      `modes, so the button changes little. Give the page's background and those a dark: version in a different ` +
      `color (or switch them with CSS variables under .dark), starting with ${where}.`,
  );
}
// A note, never a failure: a card or section filled solid with the button color reads heavy.
const filled = accentFilledCards(root);
if (filled.length) {
  const where = filled.slice(0, 5).map(({ file, line, color }) => `${file}:${line} (${color})`).join('; ');
  console.log(
    `[verify] NOTE accent: ${filled.length} card(s) or section(s) are filled solid with the accent color: ` +
      `${where}. Keep the accent on small things (buttons, tags, thin lines) and give these a neutral` +
      `surface: the page color, a soft tint such as bg-${filled[0].color}/10, or a photo. ` +
      'Keep one only if the owner asked for it.',
  );
}
// A note, never a failure: the starter's --brand (black in light, white in dark) is a placeholder; sites
// that kept it came out black and white, buttons and charts included (14 of 19 dev site builds, 2026-10-16).
const baseCss = path.join(root, 'src', 'base.css');
const setsBrand = (dir) =>
  (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []).some((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return setsBrand(full);
    return full !== baseCss && /\.(css|[jt]sx?)$/.test(entry.name) && /--brand\s*:/.test(readFileSync(full, 'utf8'));
  });
if (!scripts['check:game'] && existsSync(baseCss) && !setsBrand(path.join(root, 'src'))) {
  console.log(
    "[verify] NOTE brand color: the site still has the starter's black and white --brand, so its buttons, tags " +
      'and charts have no color. Choose one from the subject and set --brand and --brand-ink in src/index.css for ' +
      ':root and :root.dark (a lighter shade in dark). Keep black and white only if the owner asked for it.',
  );
}
// A note, never a failure: a game loop that restarts while people play flashes the screen.
const loops = await findRestartingLoops(root);
if (loops.length) {
  const where = loops
    .slice(0, 5)
    .map(({ file, line, deps }) => `${file}:${line} (restarts when ${deps.join(', ')} change${deps.length === 1 ? 's' : ''})`)
    .join('; ');
  console.log(
    `[verify] NOTE game loop: ${loops.length} animation loop(s) restart while the game runs: ${where}. ` +
      'Each restart stops the loop and resets its canvas, so players see the screen flash or stutter as they ' +
      'play. Start the loop once: the effect lists only refs and setters, and the loop reads props, callbacks ' +
      'and state through refs updated each render (onScoreRef.current = onScore).',
  );
}
// A note, never a failure: without `check:game` a game's own checks never run here, and verify passed
// on the build alone (three recipe boots left it out until 2026-10-17).
if (!scripts['check:game'] && ['src/game', 'src/games'].some((dir) => existsSync(path.join(root, dir)))) {
  console.log('[verify] NOTE game checks: this project has a game folder but no check:game script, so its game checks did not run. Register them: npm pkg set scripts.check:game="pnpm check src/game/<checks>.ts".');
}
// A note, never a failure: the starter's title and description become every shared link's
// preview and the browser tab (a published game shared as "New Project", 2026-10-12).
try {
  const head = readFileSync(path.join(root, 'index.html'), 'utf8');
  const left = [
    /<title>\s*New Project\s*<\/title>/i.test(head) && 'title "New Project"',
    /content="A new project\."/i.test(head) && 'description "A new project."',
  ].filter(Boolean);
  if (left.length) {
    console.log(
      `[verify] NOTE page title: index.html still has the starter ${left.join(' and ')}. ` +
        'Link previews and the browser tab show them: set them to this site\'s name and one plain sentence about it.',
    );
  }
  // The starter's tab icon is the logo the build makes; a game made none, and every visit of its live
  // site asked for a missing /logo.png (dev4 browser test 2026-10-19).
  if (/<link[^>]+rel="icon"[^>]+href="\/logo\.png"/i.test(head) && !existsSync(path.join(root, 'public', 'logo.png'))) {
    console.log(
      '[verify] NOTE tab icon: index.html shows /logo.png in the browser tab, but public/logo.png does not exist. ' +
        "Make this site's logo there (the kit Logo), or point the icon link at a picture the site has.",
    );
  }
} catch {
  /* no index.html at the root: nothing to say */
}
console.log(`[verify] PASS: ${passed.join(', ')}.${uiHint}`);
