import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text as RNText, TextInput, TextInputProps, TextProps, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FONT = { reg: 'HindSiliguri', bold: 'HindSiliguriBold' };
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = ({ name, size = 22, color = '#0F172A' }: { name: IconName; size?: number; color?: string }) => <Ionicons name={name} size={size} color={color} />;

// ---------- লেখা: font-bold / font-semibold লিখলে বাংলা bold ফন্ট ব্যবহার হয় ----------
const HAS_COLOR = /(^|\s)text-(white|black|transparent|bkash|[a-z]+-\d{2,3})(\s|$)/;
const isBold = (c: string) => /(^|\s)font-(bold|semibold|extrabold|medium)(\s|$)/.test(c);
export function Text({ className = '', style, ...p }: TextProps & { className?: string }) {
  const cls = HAS_COLOR.test(className) ? className : `text-slate-900 ${className}`;
  return <RNText className={cls} style={[{ fontFamily: isBold(className) ? FONT.bold : FONT.reg, fontWeight: 'normal' }, style]} {...p} />;
}

export function Input({ label, hint, className = '', ...p }: TextInputProps & { label?: string; hint?: string; className?: string }) {
  return (
    <View className="flex-1">
      {label ? <Text className="text-sm font-semibold text-slate-600 mb-1.5">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        className={`bg-white border border-slate-300 rounded-xl px-4 py-3 text-lg text-slate-900 focus:border-brand-600 ${className}`}
        style={{ fontFamily: FONT.reg }}
        {...p}
      />
      {hint ? <Text className="text-xs text-slate-500 mt-1">{hint}</Text> : null}
    </View>
  );
}

// ---------- কার্ড ----------
export function Card({ children, className = '', onPress }: { children: React.ReactNode; className?: string; onPress?: () => void }) {
  const cls = `bg-white rounded-2xl border border-line p-4 ${className}`;
  if (onPress) return <Pressable onPress={onPress} className={`${cls} active:opacity-70`}>{children}</Pressable>;
  return <View className={cls}>{children}</View>;
}

// ---------- বাটন ----------
type Variant = 'primary' | 'outline' | 'danger' | 'soft' | 'ghost';
const V: Record<Variant, [string, string]> = {
  primary: ['bg-brand-600 active:bg-brand-700', 'text-white'],
  danger: ['bg-rose-500 active:bg-rose-600', 'text-white'],
  outline: ['bg-white border-2 border-brand-600 active:bg-brand-50', 'text-brand-700'],
  soft: ['bg-brand-50 active:bg-brand-100', 'text-brand-700'],
  ghost: ['bg-transparent active:bg-slate-100', 'text-slate-600'],
};
export function Btn({ title, onPress, variant = 'primary', loading, disabled, icon, small, className = '' }: {
  title: string; onPress?: () => void; variant?: Variant; loading?: boolean; disabled?: boolean; icon?: IconName; small?: boolean; className?: string;
}) {
  const [bg, fg] = V[variant];
  const color = fg === 'text-white' ? '#fff' : variant === 'ghost' ? '#475569' : '#047857';
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} className={`flex-row items-center justify-center gap-2 rounded-2xl ${small ? 'py-2.5 px-4' : 'py-3.5 px-5'} ${bg} ${disabled || loading ? 'opacity-50' : ''} ${className}`}>
      {loading ? <ActivityIndicator color={color} /> : icon ? <Icon name={icon} size={small ? 18 : 22} color={color} /> : null}
      <Text className={`font-bold ${small ? 'text-base' : 'text-lg'} ${fg}`}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, className = '' }: { label: string; on?: boolean; onPress?: () => void; className?: string }) {
  return (
    <Pressable onPress={onPress} className={`px-4 py-2 rounded-full border ${on ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300 active:bg-slate-50'} ${className}`}>
      <Text className={`text-base ${on ? 'text-white font-bold' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}
export const Chips = ({ children }: { children: React.ReactNode }) => <View className="flex-row flex-wrap gap-2">{children}</View>;

// ---------- পেজ ----------
export function Page({ children, onRefresh, refreshing }: { children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView
      className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={['#059669']} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
export const H1 = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <View>
    <Text className="text-2xl font-bold">{children}</Text>
    {sub ? <Text className="text-slate-500 -mt-0.5">{sub}</Text> : null}
  </View>
);
export const H2 = ({ children }: { children: React.ReactNode }) => <Text className="text-lg font-bold mt-1">{children}</Text>;
export const Label = ({ children }: { children: React.ReactNode }) => <Text className="text-sm font-semibold text-slate-600 mb-1.5">{children}</Text>;
export const Muted = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <Text className={`text-sm text-slate-500 ${className}`}>{children}</Text>;

export function Notice({ kind, children }: { kind: 'ok' | 'err' | 'warn' | 'info'; children?: React.ReactNode }) {
  if (!children) return null;
  const s = { ok: ['bg-emerald-50 border-emerald-200', 'text-emerald-800', 'checkmark-circle'], err: ['bg-rose-50 border-rose-200', 'text-rose-700', 'alert-circle'],
    warn: ['bg-amber-50 border-amber-200', 'text-amber-800', 'warning'], info: ['bg-sky-50 border-sky-200', 'text-sky-800', 'information-circle'] }[kind];
  const col = { ok: '#065F46', err: '#BE123C', warn: '#92400E', info: '#075985' }[kind];
  return (
    <View className={`flex-row gap-2 items-start rounded-xl border px-3 py-2.5 ${s[0]}`}>
      <Icon name={s[2] as IconName} size={20} color={col} />
      <Text className={`flex-1 ${s[1]}`}>{children}</Text>
    </View>
  );
}
export const Empty = ({ text, icon = 'file-tray-outline' }: { text: string; icon?: IconName }) => (
  <View className="items-center py-8 gap-2"><Icon name={icon} size={34} color="#CBD5E1" /><Text className="text-slate-400 text-center">{text}</Text></View>
);
export const Loading = () => <View className="py-10"><ActivityIndicator color="#059669" size="large" /></View>;

export function Badge({ label, tone = 'gray' }: { label: string; tone?: 'gray' | 'red' | 'amber' | 'green' | 'orange' }) {
  const t = { gray: 'bg-slate-100 text-slate-600', red: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-700', green: 'bg-emerald-100 text-emerald-700', orange: 'bg-orange-100 text-orange-700' }[tone].split(' ');
  return <View className={`px-2 py-0.5 rounded-full self-start ${t[0]}`}><Text className={`text-xs ${t[1]}`}>{label}</Text></View>;
}

const TONE = { green: 'text-emerald-700', red: 'text-rose-600', amber: 'text-amber-600', none: 'text-slate-900', pink: 'text-bkash' };
export function Stat({ label, value, tone = 'none', className = '' }: { label: string; value: string; tone?: keyof typeof TONE; className?: string }) {
  return (
    <Card className={`flex-1 ${className}`}>
      <Text className="text-slate-500 text-sm">{label}</Text>
      <Text className={`text-2xl font-bold mt-0.5 ${TONE[tone]}`}>{value}</Text>
    </Card>
  );
}
export const Row = ({ l, v, bold, tone = 'none', last }: { l: string; v: string | number; bold?: boolean; tone?: keyof typeof TONE; last?: boolean }) => (
  <View className={`flex-row justify-between items-center py-2.5 ${last ? '' : 'border-b border-slate-100'}`}>
    <Text className={`${bold ? 'font-bold text-lg' : 'text-slate-700'}`}>{l}</Text>
    <Text className={`${bold ? 'font-bold text-lg' : 'font-semibold'} ${TONE[tone]}`}>{v}</Text>
  </View>
);
export const Split = ({ children }: { children: React.ReactNode }) => <View className="flex-row gap-3">{children}</View>;

// ---------- নিচ থেকে ওঠা শীট ----------
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl max-h-[80%]" style={{ paddingBottom: ins.bottom + 12 }} onPress={() => {}}>
          <View className="items-center pt-2.5"><View className="w-10 h-1 rounded-full bg-slate-300" /></View>
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
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-3.5 active:bg-slate-50">
        <Text className={`text-lg flex-1 ${cur ? '' : 'text-slate-400'}`} numberOfLines={1}>{cur ? cur.label + (cur.sub ? `  (${cur.sub})` : '') : placeholder}</Text>
        <Icon name="chevron-down" size={20} color="#64748B" />
      </Pressable>
      <Sheet visible={open} onClose={close} title={label || placeholder}>
        {options.length > 6 && <View className="px-4 pt-2 pb-1 flex-row"><Input placeholder="খুঁজুন..." value={q} onChangeText={setQ} /></View>}
        <FlatList
          data={shown} keyExtractor={(o) => o.value} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}
          ListHeaderComponent={noneLabel ? (
            <Pressable onPress={() => { onChange(''); close(); }} className="px-5 py-3.5 border-b border-slate-100 active:bg-slate-50"><Text className="text-slate-500">{noneLabel}</Text></Pressable>
          ) : null}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onChange(item.value); close(); }} className={`px-5 py-3.5 border-b border-slate-100 flex-row justify-between items-center active:bg-slate-50 ${item.value === value ? 'bg-brand-50' : ''}`}>
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
