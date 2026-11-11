import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function chooseTheme(next: Theme) {
  document.documentElement.classList.toggle('dark', next === 'dark');
  try {
    localStorage.setItem('theme', next);
  } catch {
    // Private browsing can refuse storage; the choice still applies for this visit.
  }
  for (const listener of listeners) listener();
}

/** Light or dark for the page. Starts from the `dark` class index.html set; a visitor's choice is saved for their next visit. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  return [useSyncExternalStore(subscribeTheme, readTheme), chooseTheme];
}
