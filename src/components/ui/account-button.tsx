import { LogOut, UserRound } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useEffect, useState } from 'react';
import type { SignedInUser } from '@/components/ui/sign-in';
import { signedInUser, useSignInChanges } from '@/lib/data';
import { cn } from '@/lib/utils';

const WORDS = {
  en: { signIn: 'Sign in', signOut: 'Sign out', account: (name: string) => `Account: ${name}` },
  es: { signIn: 'Iniciar sesión', signOut: 'Cerrar sesión', account: (name: string) => `Cuenta: ${name}` },
};
const words = () => (document.documentElement.lang.toLowerCase().startsWith('es') ? WORDS.es : WORDS.en);

type Go = { href?: string; onClick?: () => void };
export type AccountLink = Go & { label: string };

const item =
  'flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[15px] outline-none select-none data-[highlighted]:bg-[rgb(120_120_128/0.14)] [&_svg]:size-[18px] [&_svg]:opacity-70';
const round =
  'grid size-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

/**
 * Who is signed in, and Sign out, for the header (put it in `GlassBar`'s row, before the sun/moon): a round button
 * with the person's initial in the brand color that opens a small menu with their name and email, the `links` to
 * their own pages (My bookings, My orders) and Sign out. Signed out it is a person icon that goes to `signIn` (a
 * page or a sheet with `SignInCard`); without `signIn` it shows nothing then. It stays in the bar at every width.
 * Before it, a site's only Sign out was on a page it could not open, and another linked to a `/logout` that did not
 * exist (production 2026-10-22). Words follow `<html lang>`. Pages behind `OwnerGate`/`MemberGate` close the moment
 * the person signs out here.
 */
export function AccountButton({
  auth,
  signIn,
  links = [],
  className,
}: {
  /** `client.auth` from `src/lib/auth.ts` (`wb-backend`). */
  auth: { signOut(): Promise<unknown> };
  signIn?: Go;
  links?: AccountLink[];
  className?: string;
}) {
  const [user, setUser] = useState<SignedInUser | null | undefined>(undefined);
  const changes = useSignInChanges();
  useEffect(() => {
    let current = true;
    signedInUser<SignedInUser>().then(
      (who) => current && setUser(who),
      () => current && setUser(null),
    );
    return () => {
      current = false;
    };
  }, [changes]);
  const w = words();

  if (user === undefined) return <span aria-hidden data-keep="" className={cn('size-10 shrink-0', className)} />;
  if (!user) {
    if (!signIn) return null;
    const look = cn(round, 'hover:bg-[rgb(120_120_128/0.14)]', className);
    const icon = <UserRound aria-hidden className="size-5" strokeWidth={2} />;
    return signIn.href ? (
      <a href={signIn.href} aria-label={w.signIn} data-keep="" className={look}>
        {icon}
      </a>
    ) : (
      <button type="button" aria-label={w.signIn} data-keep="" onClick={signIn.onClick} className={look}>
        {icon}
      </button>
    );
  }
  const name = user.name?.trim() || user.email;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={w.account(name)}
        data-keep=""
        className={cn(round, 'bg-[var(--brand)] text-[15px] font-semibold text-[var(--brand-ink)]', className)}
      >
        {name.charAt(0).toUpperCase()}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white p-1.5 text-zinc-900 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/5 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/10"
        >
          <div className="px-3 pt-2.5 pb-3">
            <p className="truncate font-semibold">{name}</p>
            {name !== user.email && <p className="truncate text-sm opacity-65">{user.email}</p>}
          </div>
          {links.length > 0 && (
            <>
              <DropdownMenu.Separator className="mx-2 my-1 h-px bg-[var(--separator)]" />
              {links.map((link) => (
                <DropdownMenu.Item key={link.label} className={item} asChild={Boolean(link.href)} onSelect={link.onClick}>
                  {link.href ? <a href={link.href}>{link.label}</a> : <span>{link.label}</span>}
                </DropdownMenu.Item>
              ))}
            </>
          )}
          <DropdownMenu.Separator className="mx-2 my-1 h-px bg-[var(--separator)]" />
          <DropdownMenu.Item className={item} onSelect={() => void auth.signOut().catch(() => undefined)}>
            <LogOut aria-hidden />
            {w.signOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
