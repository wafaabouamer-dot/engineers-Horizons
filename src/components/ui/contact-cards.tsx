import { CalendarDays, ChevronRight, Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { words } from '@/components/ui/site-footer';
import { cn } from '@/lib/utils';

export type ContactKind = 'call' | 'text' | 'whatsapp' | 'email' | 'visit' | 'hours' | 'book';
/** One way to reach the business: `label` is the small word over it ("Call", "Llámanos"), `value` what it is. */
export type ContactItem = { kind: ContactKind; label: string; value: ReactNode; href?: string };

const ICONS: Record<ContactKind, LucideIcon> = {
  call: Phone,
  text: MessageCircle,
  whatsapp: MessageCircle,
  email: Mail,
  visit: MapPin,
  hours: Clock,
  book: CalendarDays,
};

/** Where a card opens: the phone, messages, mail or the map, from its value when no `href` is given. */
function linkFor({ kind, value, href }: ContactItem) {
  if (href) return href;
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/[^\d+]/g, '');
  if (kind === 'call') return `tel:${digits}`;
  if (kind === 'text') return `sms:${digits}`;
  if (kind === 'whatsapp') return `https://wa.me/${digits.replace(/^\+/, '')}`;
  if (kind === 'email') return `mailto:${value.trim()}`;
  if (kind === 'visit') return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  return undefined;
}

/**
 * The ways to reach a business, each its own card that does what it says: Call opens the phone, Email the mail app,
 * Visit the map, and Hours just shows them. An icon in a soft circle of the brand color, the label over the value
 * and an arrow on the ones that open something. `tone="glass"` over a photo. A strip of three contact details in one
 * glass bar read as a footer stuck in the page (owner, 2026-10-22: "at least make it individual cards"). Beside a
 * map or another block in a grid row they stack and fill its height (base.css).
 */
export function ContactCards({
  items,
  tone = 'plain',
  className,
}: {
  items: ContactItem[];
  tone?: 'plain' | 'glass';
  className?: string;
}) {
  const n = items.length;
  return (
    // The columns follow the cards' own room, not the screen's: three cards beside a map took a third of a 1440
    // screen each and broke a phone number and an email letter by letter (production, 2026-10-26). 36, 44 and 60rem
    // are where a full-width section's cards crossed the 640, 768 and 1024 px screens they were drawn for.
    // `data-contact-cards`: beside a map in a row, base.css stacks them and fills its height.
    <div data-contact-cards="" className={cn('@container w-full', n === 1 && 'max-w-md')}>
      <div
        className={cn(
          'grid gap-3 @min-[36rem]:grid-cols-2',
          n === 3 && '@min-[44rem]:grid-cols-3',
          (n === 4 || n > 5) && '@min-[60rem]:grid-cols-4',
          // Five: three and two in the middle, not four and one left alone (the kit's audit, 2026-10-24).
          n === 5 && '@min-[60rem]:grid-cols-6 @min-[60rem]:[&>*]:col-span-2 @min-[60rem]:[&>:nth-last-child(2)]:col-start-2',
          n > 1 &&
            n % 2 === 1 &&
            (n === 3
              ? '@min-[36rem]:@max-[44rem]:[&>:last-child]:col-span-2 @min-[36rem]:@max-[44rem]:[&>:last-child]:w-[calc(50%-0.375rem)] @min-[36rem]:@max-[44rem]:[&>:last-child]:justify-self-center'
              : '@min-[36rem]:@max-[60rem]:[&>:last-child]:col-span-2 @min-[36rem]:@max-[60rem]:[&>:last-child]:w-[calc(50%-0.375rem)] @min-[36rem]:@max-[60rem]:[&>:last-child]:justify-self-center'),
          n === 1 && '@min-[36rem]:grid-cols-1',
          className,
        )}
      >
        {items.map((item, i) => {
          const Icon = ICONS[item.kind];
          const href = linkFor(item);
          const external = href?.startsWith('http');
          return (
            <Card
              key={i}
              tone={tone}
              href={href}
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="flex flex-row items-center gap-4 p-5"
            >
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-full',
                  tone === 'glass'
                    ? 'bg-white/15 text-white'
                    : 'bg-[color-mix(in_oklab,var(--brand)_16%,transparent)] text-[var(--brand-text)]',
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm opacity-70">{item.label}</span>
                <span className="mt-0.5 block font-semibold [overflow-wrap:anywhere]">{words(item.value)}</span>
              </span>
              {href && <ChevronRight aria-hidden className="size-4 shrink-0 opacity-50" />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
