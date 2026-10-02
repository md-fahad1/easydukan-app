import { Link, Redirect, Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Icon, IconBox, IconName, SHADOW, Sheet, Text } from '@/components/ui';
import { confirm } from '@/components/ui';
import ShopSwitcher from '@/components/ShopSwitcher';
import { useTheme } from '@/lib/theme';
import { useSession } from '@/store/session';

type Nav = { href: string; icon: IconName; label: string };
const NAV: Nav[] = [
  { href: '/', icon: 'home', label: 'হোম' }, { href: '/sale', icon: 'cash', label: 'বিক্রি' },
  { href: '/baki', icon: 'book', label: 'বাকি' }, { href: '/mal', icon: 'cube', label: 'মাল' },
];
const PNAV: Nav[] = [
  { href: '/pharmacy', icon: 'home', label: 'হোম' }, { href: '/pharmacy/sell', icon: 'medkit', label: 'বিক্রি' },
  { href: '/baki', icon: 'book', label: 'বাকি' }, { href: '/pharmacy/medicines', icon: 'cube', label: 'ওষুধ' },
];
const ADD: Nav[] = [
  { href: '/sale', icon: 'cart', label: 'বিক্রি' }, { href: '/expense', icon: 'wallet', label: 'খরচ' },
  { href: '/baki', icon: 'book', label: 'বাকি / টাকা গ্রহণ' }, { href: '/purchase', icon: 'cube', label: 'মাল কেনা' },
  { href: '/supplier', icon: 'bus', label: 'মালদাতা' }, { href: '/manage', icon: 'create', label: 'সংশোধন / মুছুন' },
  { href: '/returns', icon: 'return-down-back', label: 'বিক্রি ফেরত' }, { href: '/closing', icon: 'lock-closed', label: 'হিসাব বন্ধ' },
  { href: '/report', icon: 'bar-chart', label: 'রিপোর্ট' }, { href: '/team', icon: 'people', label: 'কর্মচারী' },
  { href: '/settings', icon: 'settings', label: 'সেটিং / ব্যাকআপ' },
];
const PADD: Nav[] = [
  { href: '/pharmacy/sell', icon: 'medkit', label: 'ওষুধ বিক্রি' }, { href: '/pharmacy/purchase', icon: 'cube', label: 'মাল কেনা' },
  { href: '/pharmacy/medicines', icon: 'add-circle', label: 'ওষুধ / নতুন ওষুধ' }, { href: '/pharmacy/batches', icon: 'albums', label: 'ব্যাচ / মেয়াদ' },
  { href: '/expense', icon: 'wallet', label: 'খরচ' }, { href: '/baki', icon: 'book', label: 'বাকি / টাকা গ্রহণ' },
  { href: '/supplier', icon: 'bus', label: 'কোম্পানি' }, { href: '/manage', icon: 'create', label: 'সংশোধন / মুছুন' },
  { href: '/returns', icon: 'return-down-back', label: 'বিক্রি ফেরত' }, { href: '/closing', icon: 'lock-closed', label: 'হিসাব বন্ধ' },
  { href: '/report', icon: 'bar-chart', label: 'রিপোর্ট' }, { href: '/team', icon: 'people', label: 'কর্মচারী' },
  { href: '/settings', icon: 'settings', label: 'সেটিং / ব্যাকআপ' },
];

export default function AppLayout() {
  const { user, shop, isPharma, employee, signOut, shops, role } = useSession();
  const path = usePathname();
  const ins = useSafeAreaInsets();
  const { dark, c } = useTheme();
  const [open, setOpen] = useState(false);
  const [swap, setSwap] = useState(false);
  if (!user) return <Redirect href="/login" />;

  const home = isPharma ? '/pharmacy/sell' : '/sale';
  const top = isPharma ? '/pharmacy' : '/';
  if (employee && path !== home) return <Redirect href={home as any} />;
  if (!employee && isPharma && path === '/') return <Redirect href="/pharmacy" />;

  const nav = isPharma ? PNAV : NAV;
  const add = isPharma ? PADD : ADD;
  const active = (h: string) => (h === '/' || h === '/pharmacy' ? path === h : path.startsWith(h));
  const left = employee ? nav.filter((n) => n.href === home) : nav.slice(0, 2);
  const right = employee ? [] : nav.slice(2);
  void top;

  // সক্রিয় ট্যাব = কালো গোল পিল (আইকন + নাম), বাকিগুলো সাদা গোল বোতাম
  const Item = ({ n }: { n: Nav }) => {
    const on = active(n.href);
    return (
      <Link href={n.href as any} asChild>
        <Pressable
          style={on ? { height: 46, paddingHorizontal: 14, borderRadius: 23, backgroundColor: c.ink, flexDirection: 'row', alignItems: 'center', gap: 6, ...SHADOW } : { width: 46, height: 46, borderRadius: 23, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', ...SHADOW }}
        >
          <Icon name={on ? n.icon : (`${n.icon}-outline` as IconName)} size={21} color={on ? '#fff' : '#94A3B8'} />
          {on ? <Text className="text-white font-bold text-sm">{n.label}</Text> : null}
        </Pressable>
      </Link>
    );
  };
  const out = async () => { if (await confirm('লগ আউট করবেন?', 'আপনার ডাটা ফোনেই থাকবে।', 'লগ আউট')) signOut(); };
  const first = (user.name || '').trim().split(' ')[0] || user.name;

  return (
    <View className="flex-1 bg-canvas">
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* ---------- উপরের হেডার ---------- */}
      <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: ins.top + 10 }}>
        <Pressable onPress={() => role === 'OWNER' && setSwap(true)} className="flex-row items-center gap-3 flex-1 active:opacity-70">
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', ...SHADOW }}>
            <Icon name={isPharma ? 'medkit' : 'storefront'} size={22} color="#18A9B7" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold" numberOfLines={1}>হ্যালো, {first}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-slate-500 text-xs shrink" numberOfLines={1}>{shop?.name || 'ইজিদোকান'}{shops.length > 1 ? ` · ${shops.length}টি দোকান` : ''}</Text>
              {role === 'OWNER' && <Icon name="swap-horizontal" size={14} color="#18A9B7" />}
            </View>
          </View>
        </Pressable>
        <View className="flex-row items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-white rounded-full" style={SHADOW}>
          <Pressable onPress={out} hitSlop={8} className="active:opacity-60"><Icon name="log-out-outline" size={22} color="#64748B" /></Pressable>
          <Avatar name={user.name} size={34} />
        </View>
      </View>

      <View className="flex-1"><Slot /></View>

      {/* ---------- নিচের ভাসমান নেভিগেশন ---------- */}
      <View className="flex-row items-center justify-center gap-2 px-3 pt-2" style={{ paddingBottom: Math.max(ins.bottom, 10) + 4 }}>
        {left.map((n) => <Item key={n.href} n={n} />)}
        {!employee && (
          <Pressable onPress={() => setOpen(true)} className="items-center justify-center bg-brand-600 active:opacity-80" style={{ width: 50, height: 50, borderRadius: 25, elevation: 6, shadowColor: '#0E8F9B', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }}>
            <Icon name="add" size={30} color="#fff" />
          </Pressable>
        )}
        {right.map((n) => <Item key={n.href} n={n} />)}
      </View>

      <ShopSwitcher visible={swap} onClose={() => setSwap(false)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="কী করবেন?">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, paddingTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}>
          {add.map((a) => (
            <View key={a.href} className="w-1/3 p-1.5">
              <Link href={a.href as any} asChild onPress={() => setOpen(false)}>
                <Pressable className="bg-canvas rounded-3xl items-center py-4 px-1 gap-2 active:bg-brand-50">
                  <IconBox name={a.icon} size={42} tone="brand" />
                  <Text className="text-xs text-center font-semibold" numberOfLines={2}>{a.label}</Text>
                </Pressable>
              </Link>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}