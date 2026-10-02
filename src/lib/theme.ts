import { colorScheme, useColorScheme } from 'nativewind';
import { getThemePref, setThemePref } from '@/db/client';

// হালকা / গাঢ় থিম।
// • class-এ লেখা রং (bg-card, text-slate-900 ...) tailwind.config.js + global.css থেকে নিজে নিজে বদলায়।
// • style={{ ... }} বা Icon color-এ সরাসরি রং লাগলে useTheme().c ব্যবহার করুন।
export type ThemePref = 'system' | 'light' | 'dark';

export const PALETTE = {
  light: {
    text: '#0F172A', sub: '#64748B', sub2: '#475569', hint: '#9CA3AF', faint: '#CBD5E1',
    card: '#FFFFFF', canvas: '#F4F5F7', line: '#EDEEF1', track: '#F1F2F4', field: '#F3F4F6',
    ink: '#0F172A', navy: '#0B1B2B', brandText: '#0E8F9B', barOff: '#BDE9ED', tip: '#0F172A',
    errBg: '#FFF1F2', focusBg: '#ECFBFC',
  },
  dark: {
    text: '#F2F5F8', sub: '#909BAD', sub2: '#AEB7C5', hint: '#6E7A8D', faint: '#465162',
    card: '#171C24', canvas: '#0E1217', line: '#262E39', track: '#262E39', field: '#212835',
    ink: '#18A9B7', navy: '#2C3543', brandText: '#6FD8DD', barOff: '#1E4E57', tip: '#2C3543',
    errBg: '#3A1A22', focusBg: '#12383F',
  },
} as const;

export function useTheme() {
  const { colorScheme: cs } = useColorScheme();
  const dark = cs === 'dark';
  return { dark, c: dark ? PALETTE.dark : PALETTE.light };
}

const clean = (v: string | null): ThemePref => (v === 'light' || v === 'dark' ? v : 'system');

// অ্যাপ চালুর সময় — আগের বার যা বেছেছিলেন সেটা চালু করে
export async function loadTheme(): Promise<ThemePref> {
  let pref: ThemePref = 'system';
  try { pref = clean(await getThemePref()); } catch {}
  colorScheme.set(pref);
  return pref;
}

// সেটিং থেকে বদলানো: সাথে সাথে চালু + সেভ
export async function chooseTheme(pref: ThemePref) {
  colorScheme.set(pref);
  try { await setThemePref(pref); } catch {}
}
export const savedTheme = async (): Promise<ThemePref> => { try { return clean(await getThemePref()); } catch { return 'system'; } };