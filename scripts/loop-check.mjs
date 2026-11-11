// Animation loops that restart while a game runs: found by `pnpm verify`.
//
// A loop started in a React effect is torn down and started again whenever a
// dependency of that effect changes. When the change comes from playing (a parent's
// `onScore` callback, state the loop itself sets, a function rebuilt on every render
// the loop causes), the loop restarts mid-game; every restart resets the canvas and
// players see the screen flash (an owner's game flashed white several times a second
// while he climbed, 2026-10-10). Values that change only on a deliberate act (theme,
// seed, a new run, start/stop) are left alone: restarting then is a reset.
// Read from source with the TypeScript parser the project already has.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function files(root) {
  const out = [];
  const walk = (dir) => {
    // No src/ (a plain page brought in as index.html): nothing to read, never a crash.
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.[jt]sx?$/.test(entry.name)) out.push(full);
    }
  };
  walk(path.join(root, 'src'));
  return out;
}

const EFFECTS = new Set(['useEffect', 'useLayoutEffect']);
const CALLBACK_PROP = /^on[A-Z]/;

/** Every effect that drives an animation loop and restarts as the game plays: `{ file, line, deps }`. */
export async function findRestartingLoops(root) {
  let ts;
  try {
    ts = (await import('typescript')).default;
  } catch {
    return [];
  }
  const calleeName = (call) => {
    const e = call.expression;
    if (ts.isIdentifier(e)) return e.text;
    if (ts.isPropertyAccessExpression(e)) return e.name.text;
    return '';
  };
  const each = (node, fn) => {
    const visit = (n) => {
      fn(n);
      ts.forEachChild(n, visit);
    };
    visit(node);
  };
  const rootName = (expr) => {
    while (ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr)) expr = expr.expression;
    return ts.isIdentifier(expr) ? expr.text : undefined;
  };
  const functionName = (fn) => {
    if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
    const parent = fn.parent;
    return parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) ? parent.name.text : undefined;
  };

  // A loop, not one frame: three's setAnimationLoop, the kit's createLoop, or a frame
  // callback that asks for the next frame itself. A single requestAnimationFrame (focus
  // or scroll after a change) is ordinary UI and stays quiet.
  const drivesLoop = (effect) => {
    let found = false;
    each(effect.body ?? effect, (node) => {
      if (found || !ts.isCallExpression(node)) return;
      const name = calleeName(node);
      if (name === 'setAnimationLoop' || name === 'createLoop') found = true;
      else if (name === 'requestAnimationFrame') {
        const arg = node.arguments[0];
        for (let up = node.parent; up && up !== effect; up = up.parent)
          if (ts.isFunctionLike(up) && arg && ts.isIdentifier(arg) && functionName(up) === arg.text) found = true;
      }
    });
    return found;
  };

  // `if (!open) return;` at the top: that value switches the loop on and off, which is
  // a start or a stop, not a restart in the middle of play.
  const gateNames = (effect) => {
    const names = new Set();
    const statements = effect.body && ts.isBlock(effect.body) ? effect.body.statements : [];
    for (const st of statements) {
      if (!ts.isIfStatement(st)) continue;
      const then = ts.isBlock(st.thenStatement) ? st.thenStatement.statements[0] : st.thenStatement;
      if (then && ts.isReturnStatement(then)) each(st.expression, (n) => ts.isIdentifier(n) && names.add(n.text));
    }
    return names;
  };

  // The component or hook around the effect: its props, its state and their setters,
  // what it rebuilds on every render, and its own functions (to follow calls into them).
  const describe = (owner) => {
    const d = { props: new Set(), propsObjects: new Set(), setterOf: new Map(), rebuilt: new Set(), memoDeps: new Map(), fns: new Map() };
    for (const param of owner.parameters ?? []) {
      if (ts.isIdentifier(param.name)) d.propsObjects.add(param.name.text);
      else if (ts.isObjectBindingPattern(param.name))
        for (const el of param.name.elements) if (ts.isIdentifier(el.name)) d.props.add(el.name.text);
    }
    const statements = owner.body && ts.isBlock(owner.body) ? owner.body.statements : [];
    for (const st of statements) {
      if (ts.isFunctionDeclaration(st) && st.name) {
        d.rebuilt.add(st.name.text);
        d.fns.set(st.name.text, st);
      }
      if (!ts.isVariableStatement(st)) continue;
      for (const decl of st.declarationList.declarations) {
        const init = decl.initializer;
        if (!init) continue;
        const hook = ts.isCallExpression(init) ? calleeName(init) : '';
        if (ts.isArrayBindingPattern(decl.name)) {
          // const [value, setValue] = useState(...)
          const [first, second] = decl.name.elements;
          const named = (el) => el && !ts.isOmittedExpression(el) && ts.isIdentifier(el.name) ? el.name.text : undefined;
          if ((hook === 'useState' || hook === 'useReducer') && named(first)) d.setterOf.set(named(first), named(second));
        } else if (ts.isObjectBindingPattern(decl.name)) {
          // const { onScore } = props
          if (ts.isIdentifier(init) && d.propsObjects.has(init.text))
            for (const el of decl.name.elements) if (ts.isIdentifier(el.name)) d.props.add(el.name.text);
        } else if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (hook === 'useCallback' || hook === 'useMemo') {
            const deps = init.arguments[1];
            if (deps && ts.isArrayLiteralExpression(deps)) d.memoDeps.set(name, deps.elements.map(rootName).filter(Boolean));
            else d.rebuilt.add(name);
            if (init.arguments[0] && ts.isFunctionLike(init.arguments[0])) d.fns.set(name, init.arguments[0]);
          } else if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
            d.rebuilt.add(name);
            d.fns.set(name, init);
          } else if (ts.isObjectLiteralExpression(init) || ts.isArrayLiteralExpression(init) || ts.isNewExpression(init)) {
            d.rebuilt.add(name); // a new object or array on every render
          }
        }
      }
    }
    return d;
  };

  // What the running loop does to React: which setters it calls (also through the
  // component's own functions it calls), and whether it calls a parent's callback.
  const loopEffects = (effect, d) => {
    const setters = new Set([...d.setterOf.values()].filter(Boolean));
    const called = new Set();
    let callsParent = false;
    const seen = new Set();
    const walk = (node) => {
      each(node, (n) => {
        if (!ts.isCallExpression(n)) return;
        const name = calleeName(n);
        if (setters.has(name)) called.add(name);
        if (CALLBACK_PROP.test(name)) callsParent = true;
        const fn = ts.isIdentifier(n.expression) ? d.fns.get(name) : undefined;
        if (fn && !seen.has(fn)) {
          seen.add(fn);
          walk(fn);
        }
      });
    };
    walk(effect.body ?? effect);
    return { called, rerenders: called.size > 0 || callsParent };
  };

  const changesWhilePlaying = (dep, d, run, seen = new Set()) => {
    const name = rootName(dep) ?? (typeof dep === 'string' ? dep : undefined);
    if (!name || seen.has(name) || /Ref$/.test(name)) return false;
    seen.add(name);
    const text = typeof dep === 'string' ? dep : dep.getText();
    if (d.props.has(name) && CALLBACK_PROP.test(name)) return true;
    if (d.propsObjects.has(name) && CALLBACK_PROP.test(text.split('.')[1] ?? '')) return true;
    if (d.setterOf.has(name) && run.called.has(d.setterOf.get(name))) return true;
    if (d.rebuilt.has(name)) return run.rerenders;
    const memo = d.memoDeps.get(name);
    return !!memo && memo.some((inner) => changesWhilePlaying(inner, d, run, seen));
  };

  const found = [];
  for (const file of files(root)) {
    const text = readFileSync(file, 'utf8');
    if (!/requestAnimationFrame|setAnimationLoop|createLoop/.test(text) || !/use(Layout)?Effect/.test(text)) continue;
    const kind = /x$/.test(file) ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
    each(source, (node) => {
      if (!ts.isCallExpression(node) || !EFFECTS.has(calleeName(node))) return;
      const [effect, deps] = node.arguments;
      if (!effect || !deps || !ts.isArrayLiteralExpression(deps) || !deps.elements.length) return;
      if (!ts.isFunctionLike(effect) || !drivesLoop(effect)) return;
      let owner = node.parent;
      while (owner && !ts.isFunctionLike(owner)) owner = owner.parent;
      if (!owner) return;
      const d = describe(owner);
      const run = loopEffects(effect, d);
      const gates = gateNames(effect);
      const restarts = deps.elements
        .filter((dep) => !gates.has(rootName(dep)) && changesWhilePlaying(dep, d, run))
        .map((dep) => dep.getText(source));
      if (restarts.length) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        found.push({ file: path.relative(root, file).split(path.sep).join('/'), line: line + 1, deps: restarts });
      }
    });
  }
  return found;
}
