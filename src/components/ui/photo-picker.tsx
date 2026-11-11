import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The page's own language names the button over a chosen photo (the site's <html lang>). A Spanish site showed
 *  "Change photo" where the build passed no `changeLabel` (dev browser test, 2026-10-23). */
function changeWords(): string {
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('es') ? 'Cambiar foto' : 'Change photo';
}

/**
 * A photo the visitor takes or chooses: a large tap area that shows the chosen photo, never
 * the browser's bare "Choose File / no file selected" (real iPhone, dev 2026-10-15). A phone
 * offers the camera and the photo library from it. Pass the `File` on to `askAI` or
 * `makePicture`, or upload it.
 */
export function PhotoPicker({
  file,
  onFileChange,
  label,
  hint,
  changeLabel = changeWords(),
  className,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** What to add, as a call to action: "Add a photo of your plant". */
  label: string;
  /** One line under it: "Take one or choose from your photos". */
  hint?: string;
  /** The button over a chosen photo; without it, "Change photo" or "Cambiar foto" by the page's language. */
  changeLabel?: string;
  className?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) {
      setUrl(undefined);
      // Cleared: the same photo can be chosen again.
      if (input.current) input.current.value = '';
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <label
      htmlFor={id}
      className={cn(
        'relative flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-6 text-center transition-colors',
        url
          ? 'bg-black'
          : 'border border-dashed border-[rgb(120_120_128/0.45)] bg-[rgb(120_120_128/0.08)] hover:bg-[rgb(120_120_128/0.14)]',
        'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[color-mix(in_oklab,var(--brand)_25%,transparent)]',
        className,
      )}
    >
      {url ? (
        <>
          <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
          <span className="relative mt-auto rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
            {changeLabel}
          </span>
        </>
      ) : (
        <>
          <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-[var(--brand-text)]">
            <ImagePlus className="size-6" aria-hidden />
          </span>
          <span className="text-base font-semibold">{label}</span>
          {hint && <span className="text-sm opacity-70">{hint}</span>}
        </>
      )}
      {/* The field itself covers the whole area, unseen: a tap anywhere opens the picker, and a
          press by name (the build's button check) lands on it instead of on the words above a
          one-pixel field, which read as "something lies on top of it" (dev 2026-10-15). */}
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        aria-label={label}
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
