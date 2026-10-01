// বাংলাদেশ সময় (UTC+6) অনুযায়ী দিনের হিসাব — সব সময় মিলিসেকেন্ডে (epoch ms)
export const OFFSET = 6 * 3600 * 1000;
export const DAY = 86400000;

export type Period = 'TODAY' | 'WEEK' | 'MONTH';

export function dhakaDay(ms: number = Date.now()) {
  return new Date(ms + OFFSET).toISOString().slice(0, 10);
}

export function range(period: string, now: number = Date.now()) {
  const l = new Date(now + OFFSET);
  const y = l.getUTCFullYear(), m = l.getUTCMonth(), d = l.getUTCDate();
  let start = Date.UTC(y, m, d);
  if (period === 'WEEK') start = Date.UTC(y, m, d - ((l.getUTCDay() + 1) % 7)); // সপ্তাহ শুরু শনিবার
  if (period === 'MONTH') start = Date.UTC(y, m, 1);
  return { from: start - OFFSET, to: now + 60000 };
}

export function sinceDays(days: number) {
  const d = Math.min(Math.max(Math.floor(days) || 1, 1), 90);
  return range('TODAY').from - (d - 1) * DAY;
}

// "2027-03-31" -> ওই দিনের শেষ (বাংলাদেশ সময়)
export function parseExpiry(s?: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59) - OFFSET;
  return isNaN(t) ? null : t;
}

// "2027-03" (month picker) -> মাসের শেষ দিন "2027-03-31"
export function monthEnd(m: string): string | null {
  const x = /^(\d{4})-(\d{1,2})$/.exec((m || '').trim());
  if (!x) return null;
  const y = +x[1], mo = +x[2];
  if (mo < 1 || mo > 12) return null;
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
}
