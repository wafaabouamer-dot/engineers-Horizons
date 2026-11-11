import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * ONE LANGUAGE FOR THE WHOLE SITE, switched in one place. Every app of a production test hand-rolled its English and
 * Spanish (2026-10-22): a switch that changed nothing until a reload, words saved in one language only, a choice
 * forgotten on the next page. Wrap the app once and read the language anywhere:
 *
 *   <LangProvider languages={['en', 'es']}>…</LangProvider>           in App.tsx, around everything
 *   const { lang, pick } = useLang();
 *   pick({ en: 'Book a visit', es: 'Reserva una visita' })             the words for the language shown
 *
 * The first visit gets the visitor's own browser language when the site has it, else the first one listed; a choice
 * is kept on that device. `<html lang>` follows, so the kit's own words (sign-in, dialogs, menus) switch too, and
 * screen readers read the right language. `lang` is what to pass where a service takes a language (Stripe Checkout's
 * `locale`). Saved words a visitor or the owner writes are theirs: store them as written, never one copy per
 * language. `LangSwitch` (components/ui/lang-switch) is the control.
 *
 * Numbers and prices go through `number()` and `money()`, which write them the page's way: a bare
 * `toLocaleString()` follows the visitor's browser, and an English page showed "12,99" in a Spanish browser
 * (QA bots, production 2026-10-23). `region` is the business's country (`'US'` unless given: `'CO'` writes
 * Colombian pesos and numbers the Colombian way).
 */
type Lang = {
  lang: string;
  languages: string[];
  setLang: (code: string) => void;
  /** The value for the language shown, else the first language's. */
  pick: <T>(byLang: Record<string, T>) => T;
  /** A number written the page's way: `number(1234.5)` is "1,234.5" in the US, "1.234,5" for Colombia (`region="CO"`). */
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** A price from its smallest unit (cents): `money(1299)` is "$12.99"; `money(5000, 'EUR')`. */
  money: (minor: number, currency?: string) => string;
};

/** The locale numbers are written in: the language shown, in the business's country. */
function localeOf(lang: string, region: string): string {
  return lang.includes('-') ? lang : `${lang}-${region}`;
}

function formatters(locale: string) {
  return {
    number: (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, options).format(value),
    money: (minor: number, currency = 'USD') => {
      const format = new Intl.NumberFormat(locale, { style: 'currency', currency });
      // Cents for dollars, whole yen for yen: the currency says how many digits its smallest unit has.
      const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
      return format.format(minor / 10 ** digits);
    },
  };
}

const KEY = 'lang';
const LangContext = createContext<Lang | null>(null);

/** Each language's name in itself, for the switch and the menu. */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  de: 'Deutsch',
  it: 'Italiano',
  ht: 'Kreyòl',
  vi: 'Tiếng Việt',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
};
export const languageName = (code: string) => LANGUAGE_NAMES[code] ?? code.toUpperCase();

function firstLanguage(languages: string[]): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && languages.includes(saved)) return saved;
  } catch {
    // Storage off (a private window): the browser's language, as on a first visit.
  }
  for (const wanted of navigator.languages ?? [navigator.language]) {
    const code = wanted.toLowerCase().split('-')[0] ?? '';
    if (languages.includes(code)) return code;
  }
  return languages[0] ?? 'en';
}

function show(code: string) {
  // Before React renders the new words: the kit's own elements read the page's language as they render.
  document.documentElement.lang = code;
  // The writing direction follows the language: Arabic (and Hebrew, Persian, Urdu) read right-to-left.
  document.documentElement.dir = ['ar', 'he', 'fa', 'ur'].includes(code.toLowerCase()) ? 'rtl' : 'ltr';
}

export function LangProvider({
  languages,
  region = 'US',
  children,
}: {
  languages: string[];
  /** The business's country, for how numbers and money are written (`'US'`, `'MX'`, `'CO'`). */
  region?: string;
  children: ReactNode;
}) {
  const [lang, setState] = useState(() => {
    const first = firstLanguage(languages);
    show(first);
    return first;
  });
  const setLang = (code: string) => {
    if (!languages.includes(code)) return;
    show(code);
    try {
      localStorage.setItem(KEY, code);
    } catch {
      // Kept for this visit only.
    }
    setState(code);
  };
  const pick = <T,>(byLang: Record<string, T>): T =>
    (byLang[lang] ?? byLang[languages[0] ?? ''] ?? Object.values(byLang)[0]) as T;
  return (
    <LangContext.Provider value={{ lang, languages, setLang, pick, ...formatters(localeOf(lang, region)) }}>
      {children}
    </LangContext.Provider>
  );
}

/** The language shown and the way to change it. Outside a `LangProvider`: the page's `<html lang>`, one language. */
export function useLang(): Lang {
  const value = useContext(LangContext);
  if (value) return value;
  const lang = (typeof document === 'undefined' ? '' : document.documentElement.lang.split('-')[0]) || 'en';
  return {
    lang,
    languages: [lang],
    setLang: () => undefined,
    pick: <T,>(byLang: Record<string, T>) => (byLang[lang] ?? Object.values(byLang)[0]) as T,
    ...formatters(localeOf(lang, 'US')),
  };
}

/** The switch's choices as `GlassBar` menu items, one per language (the menu is where the switch goes on a phone). */
export function useLangMenu(): { label: string; onClick: () => void; current: boolean }[] {
  const { lang, languages, setLang } = useLang();
  return languages.length > 1
    ? languages.map((code) => ({ label: languageName(code), onClick: () => setLang(code), current: code === lang }))
    : [];
}
