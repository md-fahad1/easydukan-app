import { Link, Redirect, Slot, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName, Sheet, Text } from '@/components/ui';
import { confirm } from '@/components/ui';
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
  const { user, shop, isPharma, employee, signOut } = useSession();
  const path = usePathname();
  const ins = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
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

  const Item = ({ n }: { n: Nav }) => {
    const on = active(n.href);
    return (
      <Link href={n.href as any} asChild>
        <Pressable className="flex-1 items-center py-1.5">
          <View className={`px-4 py-1 rounded-full ${on ? 'bg-brand-100' : ''}`}><Icon name={on ? n.icon : (`${n.icon}-outline` as IconName)} size={22} color={on ? '#047857' : '#64748B'} /></View>
          <Text className={`text-xs mt-0.5 ${on ? 'font-bold text-brand-700' : 'text-slate-500'}`}>{n.label}</Text>
        </Pressable>
      </Link>
    );
  };
  const out = async () => { if (await confirm('লগ আউট করবেন?', 'আপনার ডাটা ফোনেই থাকবে।', 'লগ আউট')) signOut(); };

  return (
    <View className="flex-1 bg-canvas">
      <View className="bg-brand-700 px-4 pb-3 flex-row items-center justify-between" style={{ paddingTop: ins.top + 10 }}>
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center"><Icon name={isPharma ? 'medkit' : 'storefront'} size={20} color="#fff" /></View>
          <View className="flex-1"><Text className="text-white font-bold text-lg" numberOfLines={1}>{shop?.name || 'ইজিদোকান'}</Text><Text className="text-brand-100 text-xs -mt-1">{user.name}</Text></View>
        </View>
        <Pressable onPress={out} className="p-2 active:opacity-60"><Icon name="log-out-outline" size={24} color="#fff" /></Pressable>
      </View>

      <View className="flex-1"><Slot /></View>

      <View className="bg-white border-t border-line flex-row items-end px-2" style={{ paddingBottom: Math.max(ins.bottom, 6) }}>
        {left.map((n) => <Item key={n.href} n={n} />)}
        {!employee && (
          <View className="flex-1 items-center">
            <Pressable onPress={() => setOpen(true)} className="-mt-6 w-16 h-16 rounded-full bg-brand-600 items-center justify-center active:bg-brand-700" style={{ elevation: 6 }}>
              <Icon name="add" size={38} color="#fff" />
            </Pressable>
          </View>
        )}
        {right.map((n) => <Item key={n.href} n={n} />)}
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="কী করবেন?">
        <View className="flex-row flex-wrap px-4 pb-2 pt-1">
          {add.map((a) => (
            <View key={a.href} className="w-1/3 p-1.5">
              <Link href={a.href as any} asChild onPress={() => setOpen(false)}>
                <Pressable className="bg-brand-50 rounded-2xl items-center py-3.5 px-1 active:bg-brand-100">
                  <Icon name={a.icon} size={26} color="#047857" />
                  <Text className="text-xs text-center mt-1.5 font-semibold" numberOfLines={2}>{a.label}</Text>
                </Pressable>
              </Link>
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
