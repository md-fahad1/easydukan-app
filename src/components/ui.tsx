import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text as RNText, TextInput, TextInputProps, TextProps, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

export const FONT = { reg: 'HindSiliguri', bold: 'HindSiliguriBold' };
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { c } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}

// নরম ছায়া — সব কার্ডে একই
export const SHADOW = { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

// ---------- লেখা: font-bold / font-semibold লিখলে বাংলা bold ফন্ট ব্যবহার হয় ----------
const HAS_COLOR = /(^|\s)text-(white|black|transparent|bkash|[a-z]+-\d{2,3})(\s|$)/;
const isBold = (c: string) => /(^|\s)font-(bold|semibold|extrabold|medium)(\s|$)/.test(c);
export function Text({ className = '', style, ...p }: TextProps & { className?: string }) {
  const cls = HAS_COLOR.test(className) ? className : `text-slate-900 ${className}`;
  return <RNText className={cls} style={[{ fontFamily: isBold(className) ? FONT.bold : FONT.reg, fontWeight: 'normal' }, style]} {...p} />;
}

export function Input({ label, hint, className = '', ...p }: TextInputProps & { label?: string; hint?: string; className?: string }) {
  const { c } = useTheme();
  return (
    <View className="flex-1">
      {label ? <Text className="text-sm font-semibold text-slate-600 mb-1.5">{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.hint}
        selectionColor="#18A9B7"
        className={`bg-card border border-line rounded-2xl px-4 py-3.5 text-base text-slate-900 focus:border-brand-600 focus:bg-brand-50 ${className}`}
        style={{ fontFamily: FONT.reg }}
        {...p}
      />
      {hint ? <Text className="text-xs text-slate-500 mt-1">{hint}</Text> : null}
    </View>
  );
}

// ---------- কার্ড ----------
export function Card({ children, className = '', onPress }: { children: React.ReactNode; className?: string; onPress?: () => void }) {
  const cls = `bg-card rounded-3xl border border-line p-4 ${className}`;
  if (onPress) return <Pressable onPress={onPress} style={SHADOW} className={`${cls} active:opacity-70`}>{children}</Pressable>;
  return <View style={SHADOW} className={cls}>{children}</View>;
}

// ---------- আইকন বক্স (কার্ডের বাঁয়ে ছোট গোল-কোণা আইকন) ----------
type BoxTone = 'brand' | 'slate' | 'red' | 'amber' | 'green' | 'dark';
const BOX: Record<BoxTone, [string, string]> = {
  brand: ['#E6F7F8', '#0E8F9B'], slate: ['#F1F2F4', '#475569'], red: ['#FFF1F2', '#E11D48'],
  amber: ['#FFF7E6', '#D97706'], green: ['#E8F8EF', '#16A34A'], dark: ['#0F172A', '#FFFFFF'],
};
const BOX_DARK: Record<BoxTone, [string, string]> = {
  brand: ['#12383F', '#5ED6D8'], slate: ['#232B37', '#AEB7C5'], red: ['#3A1A22', '#FB7185'],
  amber: ['#3A2E10', '#FBBF24'], green: ['#123A2A', '#34D399'], dark: ['#18A9B7', '#FFFFFF'],
};
export function IconBox({ name, size = 36, tone = 'slate' }: { name: IconName; size?: number; tone?: BoxTone }) {
  const { dark } = useTheme();
  const [bg, fg] = (dark ? BOX_DARK : BOX)[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.55)} color={fg} />
    </View>
  );
}

// নামের প্রথম অক্ষর দিয়ে গোল ছবি (কাস্টমার / কর্মচারী)
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { dark } = useTheme();
  const ch = (name || '?').trim().charAt(0);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: dark ? '#12383F' : '#E6F7F8', alignItems: 'center', justifyContent: 'center' }}>
      <Text className="font-bold text-brand-700" style={{ fontSize: size * 0.42, lineHeight: size * 0.62 }}>{ch}</Text>
    </View>
  );
}

// ---------- বাড়া/কমার ছোট চিহ্ন:  ↑ ৫.১%  গত মাসের চেয়ে ----------
export function Delta({ value, up = true, note }: { value: string; up?: boolean; note?: string }) {
  const col = up ? '#16A34A' : '#E11D48';
  return (
    <View className="flex-row items-center gap-1">
      <Icon name={up ? 'arrow-up-circle' : 'arrow-down-circle'} size={15} color={col} />
      <Text className={`text-xs font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>{value}</Text>
      {note ? <Text className="text-xs text-slate-400">{note}</Text> : null}
    </View>
  );
}

// ---------- প্রগ্রেস বার ----------
export function Bar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'green' | 'red' | 'amber' | 'dark' }) {
  const { c } = useTheme();
  const col = { brand: '#18A9B7', green: '#22C55E', red: '#F87171', amber: '#F59E0B', dark: '#0F172A' }[tone];
  const w = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${w}%`, height: 10, borderRadius: 5, backgroundColor: col }} />
    </View>
  );
}

// ---------- কার্ডের মাথার শিরোনাম + ডানে ছোট বাটন ----------
export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className="text-base font-bold">{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} className="px-3 py-1.5 rounded-xl bg-card border border-line active:bg-slate-50">
          <Text className="text-xs font-semibold text-slate-700">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- বাটন ----------
type Variant = 'primary' | 'outline' | 'danger' | 'soft' | 'ghost' | 'dark';
const V: Record<Variant, [string, string]> = {
  primary: ['bg-brand-600 active:opacity-80', 'text-white'],
  dark: ['bg-ink active:opacity-80', 'text-white'],
  danger: ['bg-rose-500 active:bg-rose-600', 'text-white'],
  outline: ['bg-card border border-slate-200 active:bg-slate-50', 'text-slate-800'],
  soft: ['bg-brand-50 active:bg-brand-100', 'text-brand-700'],
  ghost: ['bg-transparent active:bg-slate-100', 'text-slate-600'],
};
export function Btn({ title, onPress, variant = 'primary', loading, disabled, icon, small, className = '' }: {
  title: string; onPress?: () => void; variant?: Variant; loading?: boolean; disabled?: boolean; icon?: IconName; small?: boolean; className?: string;
}) {
  const { c } = useTheme();
  const [bg, fg] = V[variant];
  const color = fg === 'text-white' ? '#fff' : variant === 'ghost' ? c.sub2 : variant === 'outline' ? c.text : c.brandText;
  const glow = variant === 'primary' ? { elevation: 5, shadowColor: '#0E8F9B', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } } : undefined;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={glow} className={`flex-row items-center justify-center gap-2 rounded-full ${small ? 'py-2.5 px-4' : 'py-3.5 px-5'} ${bg} ${disabled || loading ? 'opacity-50' : ''} ${className}`}>
      {loading ? <ActivityIndicator color={color} /> : icon ? <Icon name={icon} size={small ? 18 : 21} color={color} /> : null}
      <Text className={`font-bold ${small ? 'text-sm' : 'text-base'} ${fg}`}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, className = '' }: { label: string; on?: boolean; onPress?: () => void; className?: string }) {
  return (
    <Pressable onPress={onPress} className={`px-4 py-2 rounded-full border ${on ? 'bg-ink border-ink' : 'bg-card border-line active:bg-slate-50'} ${className}`}>
      <Text className={`text-sm ${on ? 'text-white font-bold' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}
export const Chips = ({ children }: { children: React.ReactNode }) => <View className="flex-row flex-wrap gap-2">{children}</View>;

// ---------- সুইচ (২-৩টি অপশন, একটা সক্রিয় = কালো পিল) ----------
export function Segment<T extends string | number>({ value, onChange, options, small }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; small?: boolean }) {
  return (
    <View className="flex-row bg-card rounded-full p-1 border border-line">
      {options.map(([k, l]) => (
        <Pressable key={String(k)} onPress={() => onChange(k)} className={`flex-1 items-center rounded-full ${small ? 'py-2' : 'py-3'} ${value === k ? 'bg-ink' : ''}`}>
          <Text className={`${small ? 'text-xs' : 'text-sm'} ${value === k ? 'text-white font-bold' : 'text-slate-500'}`}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- পেজ ----------
export function Page({ children, onRefresh, refreshing }: { children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView
      className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 14 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={['#18A9B7']} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
export const H1 = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <View>
    <Text className="text-2xl font-bold">{children}</Text>
    {sub ? <Text className="text-slate-500 text-sm">{sub}</Text> : null}
  </View>
);
export const H2 = ({ children }: { children: React.ReactNode }) => <Text className="text-base font-bold mt-1">{children}</Text>;
export const Label = ({ children }: { children: React.ReactNode }) => <Text className="text-sm font-semibold text-slate-600 mb-1.5">{children}</Text>;
export const Muted = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <Text className={`text-sm text-slate-500 ${className}`}>{children}</Text>;

export function Notice({ kind, children }: { kind: 'ok' | 'err' | 'warn' | 'info'; children?: React.ReactNode }) {
  const { dark } = useTheme();
  if (!children) return null;
  const s = { ok: ['bg-emerald-50 border-emerald-100', 'text-emerald-800', 'checkmark-circle'], err: ['bg-rose-50 border-rose-100', 'text-rose-700', 'alert-circle'],
    warn: ['bg-amber-50 border-amber-100', 'text-amber-800', 'warning'], info: ['bg-brand-50 border-brand-100', 'text-brand-800', 'information-circle'] }[kind];
  const col = (dark ? { ok: '#6EE7B7', err: '#FDA4AF', warn: '#FCD34D', info: '#6FD8DD' } : { ok: '#065F46', err: '#BE123C', warn: '#92400E', info: '#0B747F' })[kind];
  return (
    <View className={`flex-row gap-2 items-start rounded-2xl border px-3.5 py-3 ${s[0]}`}>
      <Icon name={s[2] as IconName} size={20} color={col} />
      <Text className={`flex-1 text-sm ${s[1]}`}>{children}</Text>
    </View>
  );
}
export const Empty = ({ text, icon = 'file-tray-outline' }: { text: string; icon?: IconName }) => (
  <View className="items-center py-10 gap-3">
    <IconBox name={icon} size={56} tone="slate" />
    <Text className="text-slate-400 text-center">{text}</Text>
  </View>
);
export const Loading = () => <View className="py-10"><ActivityIndicator color="#18A9B7" size="large" /></View>;

export function Badge({ label, tone = 'gray' }: { label: string; tone?: 'gray' | 'red' | 'amber' | 'green' | 'orange' }) {
  const t = { gray: 'bg-slate-100 text-slate-600', red: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', orange: 'bg-orange-50 text-orange-700' }[tone].split(' ');
  return <View className={`px-2.5 py-1 rounded-full self-start ${t[0]}`}><Text className={`text-xs font-semibold ${t[1]}`}>{label}</Text></View>;
}

const TONE = { green: 'text-emerald-600', red: 'text-rose-600', amber: 'text-amber-600', none: 'text-slate-900', pink: 'text-bkash' };
export function Stat({ label, value, tone = 'none', icon, sub, className = '' }: {
  label: string; value: string; tone?: keyof typeof TONE; icon?: IconName; sub?: React.ReactNode; className?: string;
}) {
  const box: BoxTone = tone === 'red' ? 'red' : tone === 'amber' ? 'amber' : tone === 'green' ? 'green' : 'slate';
  return (
    <Card className={`flex-1 gap-2 ${className}`}>
      <View className="flex-row items-center gap-2">
        {icon ? <IconBox name={icon} size={32} tone={box} /> : null}
        <Text className="text-slate-500 text-xs flex-1" numberOfLines={1}>{label}</Text>
      </View>
      <Text className={`text-xl font-bold ${TONE[tone]}`}>{value}</Text>
      {sub}
    </Card>
  );
}
export const Row = ({ l, v, bold, tone = 'none', last }: { l: string; v: string | number; bold?: boolean; tone?: keyof typeof TONE; last?: boolean }) => (
  <View className={`flex-row justify-between items-center py-3 ${last ? '' : 'border-b border-line'}`}>
    <Text className={`${bold ? 'font-bold text-base' : 'text-slate-600 text-sm'}`}>{l}</Text>
    <Text className={`${bold ? 'font-bold text-base' : 'font-semibold text-sm'} ${TONE[tone]}`}>{v}</Text>
  </View>
);
export const Split = ({ children }: { children: React.ReactNode }) => <View className="flex-row gap-3">{children}</View>;

// ---------- নিচ থেকে ওঠা শীট ----------
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-card max-h-[80%]" style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: ins.bottom + 12 }} onPress={() => {}}>
          <View className="items-center pt-2.5"><View className="w-10 h-1 rounded-full bg-slate-200" /></View>
          {title ? <Text className="text-lg font-bold px-5 pt-3 pb-1">{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- তালিকা থেকে বাছাই (HTML <select> এর বদলে) ----------
export type Opt = { value: string; label: string; sub?: string };
export function Pick({ label, value, options, onChange, placeholder = 'বেছে নিন', noneLabel }: {
  label?: string; value: string; options: Opt[]; onChange: (v: string) => void; placeholder?: string; noneLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const cur = options.find((o) => o.value === value);
  const shown = q ? options.filter((o) => (o.label + ' ' + (o.sub || '')).toLowerCase().includes(q.toLowerCase())) : options;
  const close = () => { setOpen(false); setQ(''); };
  return (
    <View className="flex-1">
      {label ? <Label>{label}</Label> : null}
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center justify-between bg-card border border-line rounded-2xl px-4 py-3.5 active:bg-slate-50">
        <Text className={`text-base flex-1 ${cur ? '' : 'text-slate-400'}`} numberOfLines={1}>{cur ? cur.label + (cur.sub ? `  (${cur.sub})` : '') : placeholder}</Text>
        <Icon name="chevron-down" size={20} color="#64748B" />
      </Pressable>
      <Sheet visible={open} onClose={close} title={label || placeholder}>
        {options.length > 6 && <View className="px-4 pt-2 pb-1 flex-row"><Input placeholder="খুঁজুন..." value={q} onChangeText={setQ} /></View>}
        <FlatList
          data={shown} keyExtractor={(o) => o.value} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}
          ListHeaderComponent={noneLabel ? (
            <Pressable onPress={() => { onChange(''); close(); }} className="px-5 py-3.5 border-b border-line active:bg-slate-50"><Text className="text-slate-500">{noneLabel}</Text></Pressable>
          ) : null}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onChange(item.value); close(); }} className={`px-5 py-3.5 border-b border-line flex-row justify-between items-center active:bg-slate-50 ${item.value === value ? 'bg-brand-50' : ''}`}>
              <Text className={`text-base flex-1 ${item.value === value ? 'font-bold text-brand-700' : ''}`}>{item.label}</Text>
              {item.sub ? <Text className="text-slate-500 text-sm ml-3">{item.sub}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text className="text-slate-400 text-center py-8">কিছু পাওয়া যায়নি</Text>}
        />
      </Sheet>
    </View>
  );
}

// ---------- নিশ্চিত করুন (Yes/No) ----------
export const confirm = (title: string, message?: string, okLabel = 'হ্যাঁ') =>
  new Promise<boolean>((res) =>
    Alert.alert(title, message, [{ text: 'না', style: 'cancel', onPress: () => res(false) }, { text: okLabel, onPress: () => res(true) }], { cancelable: true, onDismiss: () => res(false) }));

// ---------- ডাটা লোড (স্ক্রিনে ফিরলেই নতুন করে আনে) ----------
export function useLoad<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    try { setErr(''); setData(await fn()); } catch (e: any) { setErr(e?.message || 'কিছু একটা ভুল হয়েছে'); } finally { setLoading(false); }
  }, deps);
  useFocusEffect(useCallback(() => { run(); }, [run]));
  return { data, err, loading, reload: run, setErr };
}

export const errMsg = (e: any) => e?.message || 'কিছু একটা ভুল হয়েছে';