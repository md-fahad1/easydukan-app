import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { FadeUp } from '@/components/premium';
import Hero from '@/components/hero';
import { MiniBars } from '@/components/charts';
import { Badge, Btn, Card, confirm, errMsg, IconBox, Loading, Muted, Notice, Page, SectionHead, Segment, Split, Stat, Text, useLoad } from '@/components/ui';
import { dayShort, monthYear, taka, todayLong } from '@/lib/format';
import { fmtStock } from '@/lib/pharma';
import { discardBatch, expiringBatches, lowStockMedicines, salesTrend, topSelling } from '@/services/pharmacy';
import { summary } from '@/services/shop';

export default function PharmacyHome() {
  const [days, setDays] = useState(7);
  const { data: d, err, reload } = useLoad(async () => ({
    s: await summary('TODAY'), tr: await salesTrend(days), low: await lowStockMedicines(), exp: await expiringBatches(90), top: await topSelling(30),
  }), [days]);
  const [e2, setE2] = useState('');
  const discard = async (id: string) => { if (!(await confirm('এই ব্যাচের বাকি স্টক বাদ দেবেন?'))) return; try { await discardBatch(id); reload(); } catch (e) { setE2(errMsg(e)); } };
  const tr = d?.tr ?? [];
  const tot = (k: 'sale' | 'due' | 'expense') => tr.reduce((a, x) => a + x[k], 0);
  const bars = tr.map((x) => ({ label: days === 7 || Number(x.date.slice(8)) % 5 === 0 ? dayShort(x.date) : '', value: Math.max(x.sale, 0) }));
  return (
    <Page onRefresh={reload}>
      <Notice kind="err">{err || e2}</Notice>
      {!d ? <Loading /> : (
        <>
          {/* ---------- হিরো ---------- */}
          <FadeUp>
            <Hero>
              <View className="flex-row items-center justify-between">
                <Text className="text-white/80 text-sm">ফার্মেসি · আজকের বিক্রি</Text>
                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}><Text className="text-white text-xs font-semibold">{todayLong()}</Text></View>
              </View>
              <Text className="text-white font-bold mt-1" style={{ fontSize: 36, lineHeight: 52 }}>{taka(d.s.totalSale)}</Text>
              <View className="flex-row mt-3 gap-3">
                <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}><Text className="text-white/80 text-xs">আজকের খরচ</Text><Text className="text-white font-bold text-lg">{taka(d.s.expense)}</Text></View>
                <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}><Text className="text-white/80 text-xs">হাতে থাকার কথা</Text><Text className="text-white font-bold text-lg">{taka(d.s.cashInHand)}</Text></View>
              </View>
            </Hero>
          </FadeUp>

          <Split>
            <View className="flex-1"><Link href="/pharmacy/sell" asChild><Btn title="বিক্রি করুন" icon="medkit" variant="dark" /></Link></View>
            <View className="flex-1"><Link href="/pharmacy/purchase" asChild><Btn title="মাল কেনা" icon="cube" variant="outline" /></Link></View>
          </Split>

          <Split>
            <Stat icon="time-outline" label="আজ বাকিতে" value={taka(d.s.due)} tone="amber" />
            <Stat icon="book-outline" label="মোট বাকি (পাবেন)" value={taka(d.s.customerDue)} tone="amber" />
          </Split>
          <Stat icon="bus-outline" label="কোম্পানিকে দিতে হবে" value={taka(d.s.supplierDue)} tone="red" />

          {/* ---------- ট্রেন্ড ---------- */}
          <Card className="gap-4">
            <SectionHead title="বিক্রির ধারা" />
            <Segment small value={days} onChange={setDays} options={[[7, '৭ দিন'], [30, '৩০ দিন']]} />
            <View className="flex-row">
              <View className="flex-1 items-center"><Muted>বিক্রি</Muted><Text className="font-bold text-emerald-600">{taka(tot('sale'))}</Text></View>
              <View className="flex-1 items-center"><Muted>বাকি</Muted><Text className="font-bold text-amber-600">{taka(tot('due'))}</Text></View>
              <View className="flex-1 items-center"><Muted>খরচ</Muted><Text className="font-bold text-rose-600">{taka(tot('expense'))}</Text></View>
            </View>
            <MiniBars data={bars} />
          </Card>

          {/* ---------- মেয়াদ ---------- */}
          <Card className="gap-3">
            <View className="flex-row items-center gap-2.5"><IconBox name="hourglass" size={34} tone="amber" /><Text className="font-bold flex-1">মেয়াদ শেষ হচ্ছে / হয়ে গেছে (৯০ দিন)</Text></View>
            {d.exp.length === 0 && <Muted>কিছু নেই ✅</Muted>}
            {d.exp.map((e) => (
              <View key={e.id} className={`rounded-2xl p-3 border gap-1 ${e.expired ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                <View className="flex-row justify-between items-center gap-2"><Text className="font-bold flex-1">{e.productName}</Text><Badge tone={e.expired ? 'red' : 'amber'} label={e.expired ? 'মেয়াদ শেষ' : monthYear(e.expiry)} /></View>
                <Muted>ব্যাচ {e.batchNo || '-'} · {fmtStock(e.qty, e)} · মেয়াদ {monthYear(e.expiry)}</Muted>
                {e.expired && <Btn title="স্টক থেকে বাদ দিন" variant="ghost" small onPress={() => discard(e.id)} />}
              </View>
            ))}
          </Card>

          {/* ---------- কম স্টক ---------- */}
          <Card className="gap-1">
            <View className="flex-row items-center gap-2.5 mb-1"><IconBox name="warning" size={34} tone="red" /><Text className="font-bold">কমে যাওয়া ওষুধ — {d.low.length}টি</Text></View>
            {d.low.length === 0 && <Muted>সব ঠিক আছে ✅</Muted>}
            {d.low.map((m) => <View key={m.id} className="flex-row justify-between py-2 border-t border-line"><Text className="flex-1 text-sm">{m.name}</Text><Text className="text-sm text-rose-600 font-semibold">{fmtStock(m.stock, m)} / {fmtStock(m.minStock, m)}</Text></View>)}
          </Card>

          {/* ---------- বেশি বিক্রি ---------- */}
          <Card className="gap-1">
            <View className="flex-row items-center gap-2.5 mb-1"><IconBox name="flame" size={34} tone="brand" /><Text className="font-bold">বেশি বিক্রি হচ্ছে (৩০ দিন)</Text></View>
            {d.top.length === 0 && <Muted>এখনো বিক্রি নেই</Muted>}
            {d.top.map((m: any, i: number) => (
              <View key={m.productId} className="flex-row items-center gap-3 py-2 border-t border-line">
                <View className="w-7 h-7 rounded-full bg-slate-900 items-center justify-center"><Text className="text-white text-xs font-bold">{i + 1}</Text></View>
                <Text className="flex-1 text-sm" numberOfLines={1}>{m.name}</Text>
                <Text className="text-sm"><Text className="font-bold">{taka(m.revenue)}</Text> ({fmtStock(m.pieces, m)})</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Page>
  );
}