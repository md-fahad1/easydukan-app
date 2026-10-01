import React from 'react';
import { monthEnd, } from '@/lib/dates';
import { monthYear, toEn } from '@/lib/format';
import { Input } from './ui';

// "03/2027", "3-27", "2027-03" — সবই চলবে → মাসের শেষ দিন "2027-03-31"
export function parseMonth(raw: string): string | null {
  const s = toEn(raw || '');
  let m = /^(\d{1,2})[/\-.](\d{4}|\d{2})$/.exec(s);
  let y: number, mo: number;
  if (m) { mo = +m[1]; y = m[2].length === 2 ? 2000 + +m[2] : +m[2]; }
  else if ((m = /^(\d{4})[/\-.](\d{1,2})$/.exec(s))) { y = +m[1]; mo = +m[2]; }
  else return null;
  if (mo < 1 || mo > 12 || y < 2000 || y > 2100) return null;
  return monthEnd(`${y}-${mo}`);
}
// "2027-03-31" → "03/2027" (এডিটের সময় দেখানোর জন্য)
export const toMonthText = (ymd?: string | null) => (ymd ? `${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : '');

export function ExpiryInput({ label = 'মেয়াদ (মাস/বছর)', value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  const ymd = parseMonth(value);
  const hint = !value ? 'যেমন: 03/2027' : ymd ? `মেয়াদ শেষ: ${monthYear(Date.parse(ymd + 'T12:00:00Z'))}` : 'ঠিকমতো লিখুন (যেমন: 03/2027)';
  return <Input label={label} value={value} onChangeText={onChange} placeholder="MM/YYYY" keyboardType="numbers-and-punctuation" hint={hint} />;
}
