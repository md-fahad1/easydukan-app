import { Link } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Btn, Card, Icon, IconName, Loading, Notice, Page, Split, Stat, Text, useLoad } from '@/components/ui';
import { taka, todayLong } from '@/lib/format';
import { summary } from '@/services/shop';

const Link2 = ({ href, icon, label, value, tone }: { href: string; icon: IconName; label: string; value: string; tone: string }) => (
  <Link href={href as any} asChild>
    <Card onPress={() => {}} className="flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center"><Icon name={icon} size={22} color="#047857" /></View>
      <Text className="flex-1 text-base">{label}</Text>
      <Text className={`font-bold text-lg ${tone}`}>{value}</Text>
    </Card>
  </Link>
);

export default function Home() {
  const { data: s, err, loading, reload } = useLoad(() => summary('TODAY'));
  return (
    <Page onRefresh={reload} refreshing={false}>
      <View><Text className="text-2xl font-bold">আজকের হিসাব</Text><Text className="text-slate-500">{todayLong()}</Text></View>
      <Notice kind="err">{err}</Notice>
      {loading && !s ? <Loading /> : s && (
        <>
          <Card className="bg-brand-700 border-brand-700">
            <Text className="text-brand-100">আজকের বিক্রি</Text>
            <Text className="text-4xl font-bold text-white">{taka(s.totalSale)}</Text>
            <View className="flex-row mt-3 pt-3 border-t border-white/20">
              <View className="flex-1"><Text className="text-brand-100 text-xs">আনুমানিক লাভ*</Text><Text className="text-white font-bold text-lg">{taka(s.profit)}</Text></View>
              <View className="flex-1"><Text className="text-brand-100 text-xs">বিক্রির সংখ্যা</Text><Text className="text-white font-bold text-lg">{s.saleCount}টি</Text></View>
            </View>
          </Card>
          <Split><Stat label="আজকের খরচ" value={taka(s.expense)} tone="red" /><Stat label="আজ বাকিতে" value={taka(s.due)} tone="amber" /></Split>
          <Card className="flex-row justify-between items-center"><Text className="text-slate-600">হাতে থাকার কথা</Text><Text className="text-xl font-bold">{taka(s.cashInHand)}</Text></Card>
        </>
      )}
      <Split>
        <View className="flex-1"><Link href="/sale" asChild><Btn title="বিক্রি" icon="add" /></Link></View>
        <View className="flex-1"><Link href="/expense" asChild><Btn title="খরচ" icon="add" variant="danger" /></Link></View>
      </Split>
      <Split>
        <View className="flex-1"><Link href="/baki" asChild><Btn title="বাকির টাকা নিন" variant="outline" small /></Link></View>
        <View className="flex-1"><Link href={{ pathname: '/sale', params: { due: '1' } }} asChild><Btn title="বাকিতে বিক্রি" variant="outline" small /></Link></View>
      </Split>
      {s && (
        <View className="gap-2.5">
          <Link2 href="/baki" icon="book" label="কে টাকা পাবে (বাকির খাতা)" value={taka(s.customerDue)} tone="text-amber-600" />
          <Link2 href="/supplier" icon="bus" label="কাকে টাকা দিতে হবে" value={taka(s.supplierDue)} tone="text-rose-600" />
          <Link2 href="/mal" icon="warning" label="কমে যাওয়া পণ্য" value={`${s.lowStockCount}টি`} tone="text-slate-900" />
        </View>
      )}
      <Link href="/closing" asChild><Btn title="আজকের হিসাব শেষ করুন" icon="lock-closed" variant="soft" /></Link>
    </Page>
  );
}
