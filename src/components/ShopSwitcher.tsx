import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errMsg, Icon, Notice, Sheet, Text } from './ui';
import { useSession } from '@/store/session';

// দোকান বদলানোর শীট — fromLogin=true হলে (লগইন ছাড়া) অন্য দোকানে ঢুকতে আবার লগইন লাগবে
export default function ShopSwitcher({ visible, onClose, fromLogin }: { visible: boolean; onClose: () => void; fromLogin?: boolean }) {
  const { shops, activeId, switchTo, addNew } = useSession();
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<void>) => { setErr(''); try { await fn(); onClose(); } catch (e) { setErr(errMsg(e)); } };
  return (
    <Sheet visible={visible} onClose={onClose} title="দোকান বাছুন">
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {shops.map((s) => {
          const on = s.id === activeId;
          return (
            <Pressable key={s.id} onPress={() => (on ? onClose() : run(() => switchTo(s.id, !fromLogin)))} className={`flex-row items-center gap-3 p-3.5 rounded-2xl border ${on ? 'bg-brand-50 border-brand-600' : 'bg-white border-line active:bg-slate-50'}`}>
              <View className="w-10 h-10 rounded-xl bg-brand-100 items-center justify-center"><Icon name={s.shopType === 'ফার্মেসি' ? 'medkit' : 'storefront'} size={22} color="#18A9B7" /></View>
              <View className="flex-1"><Text className="font-bold text-base" numberOfLines={1}>{s.name}</Text><Text className="text-xs text-slate-500">{s.shopType}</Text></View>
              {on && <Icon name="checkmark-circle" size={22} color="#18A9B7" />}
            </Pressable>
          );
        })}
        <Pressable onPress={() => run(addNew)} className="flex-row items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-brand-600 active:bg-brand-50">
          <Icon name="add-circle-outline" size={22} color="#18A9B7" /><Text className="font-bold text-brand-700">নতুন দোকান যোগ করুন</Text>
        </Pressable>
        <Notice kind="err">{err}</Notice>
      </ScrollView>
    </Sheet>
  );
}