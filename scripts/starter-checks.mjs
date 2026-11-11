import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * IS src/App.tsx STILL THE STARTER PLACEHOLDER? (production 2026-10-15/16: game builds copied a
 * recipe's files but never its App.tsx; `pnpm verify` passed four times on one of them while the
 * preview showed only the placeholder's dot.)
 *
 * The marker alone is not proof: an agent kept it around its real site (dev 2026-10-06, the publish
 * guard's `isStarterApp`). The placeholder imports nothing and holds only an empty span in its marked
 * element; an import, a word or any other tag is a site. No App.tsx at all (a game drawn without
 * React) is not the starter either, nor a placeholder the page no longer shows: an index.html that
 * does not load /src/main.tsx (the owner's own page or game put there), or a main.tsx that does not
 * render ./App (production 2026-10-28: verify failed such a page and sent the agent to port a
 * working game into React). Publish asks the same question before it builds.
 */
export function starterStillMounted(root) {
  const file = path.join(root, 'src', 'App.tsx');
  if (!existsSync(file)) return false;
  const page = path.join(root, 'index.html');
  // From the root or relative to it (`src/main.tsx`, `./src/main.tsx`): Vite loads the same file.
  if (existsSync(page) && !/(?:^|[^\w./-])(?:\.?\/)?src\/main\.tsx/.test(readFileSync(page, 'utf8'))) return false;
  const entry = path.join(root, 'src', 'main.tsx');
  if (existsSync(entry) && !/from\s+['"]\.\/App(\.tsx)?['"]/.test(readFileSync(entry, 'utf8'))) return false;
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const at = source.indexOf('data-wb-initial');
  if (at < 0 || /^\s*import\b/m.test(source)) return false;
  const inside = source.slice(at);
  const rest = inside
    .slice(inside.indexOf('>') + 1)
    .replace(/<span\b[^>]*\/>|<span\b[^>]*>\s*<\/span>|<\/[a-z]+>/g, '');
  return !rest.includes('<') && !/\w/.test(rest);
}

/**
 * The type check's errors for a name nothing defines, in the page's own code: it builds cleanly and
 * crashes the page when it is reached (`frameAt`, `deleteRow`; production 2026-10-14..16). "Cannot
 * find name" (2304, 2552, 2580, 2591), `React.useState` with no import (2686) and a shorthand
 * property with no such name (18004). Every other type complaint leaves the page running, so it is
 * not reported. Tests are not the page. `output` is `tsc --pretty false` output.
 */
export function cannotFindName(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => /^src[\\/][^(]+\(\d+,\d+\): error TS(2304|2552|2580|2591|2686|18004): /.test(line))
    .filter((line) => !/\.(test|spec)\.[jt]sx?\(/.test(line));
}

/**
 * A "MY ..." PAGE THAT READS EVERYONE'S ROWS (production QA 2026-10-17, 10-19, 10-23, 10-25: four
 * times the rule was in the agent's notes and skipped). The owner's rights read every row, so a
 * personal list that rests on row rules shows the owner everyone's bookings as theirs. Only a page
 * that calls itself personal (its file is account/my-..., or it shows a "My ..." / "Mis ..." heading),
 * that is not an owner page (`OwnerGate`), and whose `useRows`/`selectRows` path filters on no person
 * key (`*_id=eq.`, `user_id=eq.`, `email=eq.`). A directory or feed that lists everyone on purpose is
 * not personal, so it is not named.
 */
export function unfilteredMyLists(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.[jt]sx$/.test(entry.name) || /\.(test|spec)\./.test(entry.name)) continue;
      const source = readFileSync(full, 'utf8');
      // Case matters: `MyBookings`, `my-bookings`, `MisReservas`, never `Mission` or `mystery`. A heading,
      // never a nav link ("My account" in a header would name the whole site's reads).
      const personal =
        /^(?:[Aa]ccount|[Mm]y(?:[-_][a-z]|[A-Z])[\w-]*|[Mm]is?(?:[-_][a-z]|[A-Z])[\w-]*)\.[jt]sx$/.test(entry.name) ||
        /<h[12][^>]*>\s*(?:My|Mis|Mi)\s/u.test(source);
      if (!personal || source.includes('OwnerGate')) continue;
      // The whole file, not line by line: a formatter puts a long call's path on the next line.
      for (const call of source.matchAll(/\b(?:useRows|selectRows)\s*(?:<[^(]*>)?\(\s*(['"`])([^'"`]*)\1/g)) {
        const route = call[2];
        if (/(?:^|[?&,(])(?:\w*_id|id|email)=eq\./.test(route)) continue;
        const line = source.slice(0, call.index).split('\n').length;
        found.push({ file: path.relative(root, full).replace(/\\/g, '/'), line, path: route.slice(0, 60) });
      }
    }
  };
  walk(path.join(root, 'src'));
  return found;
}

/**
 * PICTURES THE SITE SHOWS THAT IT DOES NOT HAVE: a path written in the code (`'/images/little-havana.jpg'`, a CSS
 * `url(/images/hero.jpg)`) with no file at that path in public/. Visitors see a blank tile or a broken picture
 * (production, 2026-10-25: a realtor's "Little Havana" tile was black on the live site). Paths built at run time
 * (`${slug}`) and pictures from the database or another site are not checked.
 */
export function missingPictures(root) {
  const found = new Map();
  const walk = (dir) => {
    for (const entry of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const full = path.join(dir, entry.name);
      // The kit's own defaults (the Logo's `/logo.png`) hide themselves when the picture is not there.
      if (entry.isDirectory()) {
        if (path.relative(root, full).replace(/\\/g, '/') !== 'src/components/ui') walk(full);
        continue;
      }
      if (!/\.(?:[jt]sx?|css)$/.test(entry.name) || /\.(test|spec)\./.test(entry.name)) continue;
      const source = readFileSync(full, 'utf8');
      for (const match of source.matchAll(/(['"`(])(\/[^'"`()\s]+?\.(?:jpe?g|png|webp|avif|gif|svg))(?:[?#][^'"`)\s]*)?(?=['"`)])/gi)) {
        const picture = match[2];
        if (picture.startsWith('//') || picture.includes('${') || found.has(picture)) continue;
        if (existsSync(path.join(root, 'public', decodeURI(picture)))) continue;
        const line = source.slice(0, match.index).split('\n').length;
        found.set(picture, { file: path.relative(root, full).replace(/\\/g, '/'), line, path: picture });
      }
    }
  };
  walk(path.join(root, 'src'));
  return [...found.values()];
}
