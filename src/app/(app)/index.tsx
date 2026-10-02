import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { FadeUp } from '@/components/premium';
import Hero from '@/components/hero';
import { LineChart } from '@/components/charts';
import { Bar, Btn, Card, Icon, IconBox, IconName, Loading, Muted, Notice, Page, SectionHead, Segment, Split, Stat, Text, useLoad } from '@/components/ui';
import { dayShort, taka, todayLong } from '@/lib/format';
import { salesTrend } from '@/services/pharmacy';
import { summary } from '@/services/shop';

// দ্রুত কাজের বোতাম (Link-এর ভেতরে বসে)
const QA = ({ icon, label, tone = 'brand', onPress }: { icon: IconName; label: string; tone?: 'brand' | 'red' | 'amber' | 'green' | 'slate'; onPress?: () => void }) => (
  <Pressable onPress={onPress} className="flex-1 items-center gap-1.5 active:opacity-60">
    <IconBox name={icon} size={52} tone={tone} />
    <Text className="text-xs text-center font-semibold text-slate-700" numberOfLines={2}>{label}</Text>
  </Pressable>
);

// নিচের তালিকার সারি
const Item = ({ href, icon, label, value, tone, box }: { href: string; icon: IconName; label: string; value: string; tone: string; box: 'amber' | 'red' | 'brand' }) => (
  <Link href={href as any} asChild>
    <Card onPress={() => {}} className="flex-row items-center gap-3">
      <IconBox name={icon} size={40} tone={box} />
      <Text className="flex-1 text-sm text-slate-700">{label}</Text>
      <Text className={`font-bold text-base ${tone}`}>{value}</Text>
      <Icon name="chevron-forward" size={16} color="#CBD5E1" />
    </Card>
  </Link>
);

const pct = (v: number, t: number) => (t > 0 ? (v / t) * 100 : 0);

export default function Home() {
  const [days, setDays] = useState(7);
  const { data: d, err, loading, reload } = useLoad(async () => ({ s: await summary('TODAY'), tr: await salesTrend(days) }), [days]);
  const s = d?.s;
  const tr = d?.tr ?? [];
  const periodTotal = tr.reduce((a, x) => a + x.sale, 0);
  const chart = tr.map((x) => ({ label: dayShort(x.date), value: Math.max(x.sale, 0) }));
  return (
    <Page onRefresh={reload} refreshing={false}>
      <Notice kind="err">{err}</Notice>
      {loading && !s ? <Loading /> : s && (
        <>
          {/* ---------- হিরো: আজকের বিক্রি ---------- */}
          <FadeUp>
            <Hero>
              <View className="flex-row items-center justify-between">
                <Text className="text-white/80 text-sm">আজকের বিক্রি</Text>
                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Text className="text-white text-xs font-semibold">{todayLong()}</Text>
                </View>
              </View>
              <Text className="text-white font-bold mt-1" style={{ fontSize: 36, lineHeight: 52 }}>{taka(s.totalSale)}</Text>
              <View className="flex-row mt-3 gap-3">
                <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <Text className="text-white/80 text-xs">আনুমানিক লাভ*</Text>
                  <Text className="text-white font-bold text-lg">{taka(s.profit)}</Text>
                </View>
                <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <Text className="text-white/80 text-xs">বিক্রির সংখ্যা</Text>
                  <Text className="text-white font-bold text-lg">{s.saleCount}টি</Text>
                </View>
              </View>
            </Hero>
          </FadeUp>

          {/* ---------- দ্রুত কাজ ---------- */}
          <FadeUp delay={80}>
            <Card>
              <SectionHead title="দ্রুত কাজ" />
              <View className="flex-row gap-2">
                <Link href="/sale" asChild><QA icon="cart" label="বিক্রি" /></Link>
                <Link href={{ pathname: '/sale', params: { due: '1' } }} asChild><QA icon="time" label="বাকিতে বিক্রি" tone="amber" /></Link>
                <Link href="/expense" asChild><QA icon="wallet" label="খরচ" tone="red" /></Link>
                <Link href="/baki" asChild><QA icon="book" label="বাকির টাকা নিন" tone="green" /></Link>
                <Link href="/purchase" asChild><QA icon="cube" label="মাল কেনা" tone="slate" /></Link>
              </View>
            </Card>
          </FadeUp>

          {/* ---------- খরচ / বাকি ---------- */}
          <FadeUp delay={140}>
            <Split>
              <Stat icon="wallet-outline" label="আজকের খরচ" value={taka(s.expense)} tone="red" />
              <Stat icon="time-outline" label="আজ বাকিতে" value={taka(s.due)} tone="amber" />
            </Split>
          </FadeUp>

          {/* ---------- বিক্রির ধারা (লাইন চার্ট) ---------- */}
          <FadeUp delay={170}>
            <Card className="gap-3">
              <SectionHead title="বিক্রির ধারা" />
              <Segment small value={days} onChange={setDays} options={[[7, '৭ দিন'], [30, '৩০ দিন']]} />
              <View>
                <Text className="text-2xl font-bold" style={{ lineHeight: 36 }}>{taka(periodTotal)}</Text>
                <Muted>গত {days === 7 ? '৭' : '৩০'} দিনের মোট বিক্রি (ফেরত বাদে)</Muted>
              </View>
              <LineChart data={chart} format={taka} />
            </Card>
          </FadeUp>

          {/* ---------- টাকা কোথায় আছে ---------- */}
          <FadeUp delay={200}>
            <Card>
              <View className="flex-row items-center gap-3 pb-3 border-b border-line">
                <IconBox name="cash" size={40} tone="dark" />
                <View className="flex-1">
                  <Text className="text-slate-500 text-xs">হাতে থাকার কথা</Text>
                  <Text className="text-xl font-bold">{taka(s.cashInHand)}</Text>
                </View>
              </View>
              <View className="gap-3.5 pt-3.5">
                <View className="gap-1.5">
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-600">নগদ</Text><Text className="text-sm font-bold">{taka(s.cash)}</Text></View>
                  <Bar pct={pct(s.cash, s.totalSale)} tone="green" />
                </View>
                <View className="gap-1.5">
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-600">বিকাশ</Text><Text className="text-sm font-bold">{taka(s.bkash)}</Text></View>
                  <Bar pct={pct(s.bkash, s.totalSale)} tone="brand" />
                </View>
                <View className="gap-1.5">
                  <View className="flex-row justify-between"><Text className="text-sm text-slate-600">বাকি</Text><Text className="text-sm font-bold">{taka(s.due)}</Text></View>
                  <Bar pct={pct(s.due, s.totalSale)} tone="amber" />
                </View>
              </View>
            </Card>
          </FadeUp>

          {/* ---------- পাওনা / দেনা / স্টক ---------- */}
          <FadeUp delay={260}>
            <View className="gap-2.5">
              <Item href="/baki" icon="book" box="amber" label="কে টাকা পাবে (বাকির খাতা)" value={taka(s.customerDue)} tone="text-amber-600" />
              <Item href="/supplier" icon="bus" box="red" label="কাকে টাকা দিতে হবে" value={taka(s.supplierDue)} tone="text-rose-600" />
              <Item href="/mal" icon="warning" box="brand" label="কমে যাওয়া পণ্য" value={`${s.lowStockCount}টি`} tone="text-slate-900" />
            </View>
          </FadeUp>

          <Link href="/closing" asChild><Btn title="আজকের হিসাব শেষ করুন" icon="lock-closed" variant="dark" /></Link>
        </>
      )}
    </Page>
  );
}