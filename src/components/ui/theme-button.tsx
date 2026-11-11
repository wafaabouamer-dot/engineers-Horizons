import { Moon, Sun } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * The light/dark switch: one round 40px sun/moon icon button that switches the whole page (src/lib/theme.ts
 * saves the choice). Labelled in the page's language from `<html lang>`. `data-theme-button` keeps it in the
 * header when the row folds (src/lib/fit-row.ts); other props, such as a `className`, reach the button.
 */
export function ThemeButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const [theme, setTheme] = useTheme();
  const dark = theme === 'dark';
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
  const label = dark ? (spanish ? 'Cambiar a modo claro' : 'Switch to light mode') : spanish ? 'Cambiar a modo oscuro' : 'Switch to dark mode';
  return (
    <button
      type="button"
      data-theme-button=""
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={cn('grid size-10 shrink-0 place-items-center rounded-full hover:bg-[rgb(120_120_128/0.14)]', className)}
      {...props}
    >
      {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
