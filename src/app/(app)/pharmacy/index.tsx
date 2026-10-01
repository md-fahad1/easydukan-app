import { Link } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Btn, Card, Chip, confirm, errMsg, H1, Loading, Muted, Notice, Page, Split, Stat, Text, useLoad } from '@/components/ui';
import { dayMonth, dayShort, monthYear, taka } from '@/lib/format';
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
  const max = Math.max(1, ...tr.map((x) => x.sale));
  return (
    <Page onRefresh={reload}>
      <H1>ফার্মেসি হিসাব</H1>
      <Notice kind="err">{err || e2}</Notice>
      <Split><View className="flex-1"><Link href="/pharmacy/sell" asChild><Btn title="বিক্রি করুন" icon="medkit" /></Link></View><View className="flex-1"><Link href="/pharmacy/purchase" asChild><Btn title="মাল কেনা" icon="cube" variant="outline" /></Link></View></Split>
      {!d ? <Loading /> : (
        <>
          <Split><Stat label="আজকের বিক্রি" value={taka(d.s.totalSale)} tone="green" /><Stat label="আজকের খরচ" value={taka(d.s.expense)} tone="red" /></Split>
          <Split><Stat label="আজ বাকিতে" value={taka(d.s.due)} tone="amber" /><Stat label="হাতে থাকার কথা" value={taka(d.s.cashInHand)} /></Split>
          <Split><Stat label="মোট বাকি (পাবেন)" value={taka(d.s.customerDue)} tone="amber" /><Stat label="কোম্পানিকে দিতে হবে" value={taka(d.s.supplierDue)} tone="red" /></Split>
          <View className="flex-row gap-2">{[7, 30].map((x) => <Chip key={x} className="flex-1 items-center" label={`${x} দিন`} on={days === x} onPress={() => setDays(x)} />)}</View>
          <Card className="gap-3">
            <View className="flex-row">
              <View className="flex-1 items-center"><Muted>বিক্রি</Muted><Text className="font-bold text-emerald-700">{taka(tot('sale'))}</Text></View>
              <View className="flex-1 items-center"><Muted>বাকি</Muted><Text className="font-bold text-amber-600">{taka(tot('due'))}</Text></View>
              <View className="flex-1 items-center"><Muted>খরচ</Muted><Text className="font-bold text-rose-600">{taka(tot('expense'))}</Text></View>
            </View>
            <View className="flex-row items-end h-32 gap-0.5">
              {tr.map((x) => (
                <View key={x.date} className="flex-1 h-full justify-end items-center">
                  <View className="w-full bg-brand-500 rounded-t" style={{ height: `${(Math.max(x.sale, 0) / max) * 88}%`, minHeight: x.sale > 0 ? 2 : 0 }} />
                  {days === 7 || Number(x.date.slice(8)) % 5 === 0 ? <Text className="text-[9px] text-slate-500 mt-1">{dayShort(x.date)}</Text> : <Text className="text-[9px] mt-1"> </Text>}
                </View>
              ))}
            </View>
            {days === 7 && [...tr].reverse().map((x) => (
              <View key={x.date} className="flex-row justify-between border-t border-slate-100 pt-1.5">
                <Text className="text-slate-500 text-sm w-12">{dayMonth(x.date)}</Text><Text className="text-sm">বিক্রি {taka(x.sale)}</Text><Text className="text-sm text-amber-600">বাকি {taka(x.due)}</Text>
              </View>
            ))}
          </Card>
          <Card className="gap-2">
            <Text className="font-bold">⏳ মেয়াদ শেষ হচ্ছে / হয়ে গেছে (৯০ দিনের মধ্যে)</Text>
            {d.exp.length === 0 && <Muted>কিছু নেই ✅</Muted>}
            {d.exp.map((e) => (
              <View key={e.id} className={`rounded-xl p-3 border ${e.expired ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                <View className="flex-row justify-between"><Text className="font-bold flex-1">{e.productName}</Text><Badge tone={e.expired ? 'red' : 'amber'} label={e.expired ? 'মেয়াদ শেষ' : monthYear(e.expiry)} /></View>
                <Muted>ব্যাচ {e.batchNo || '-'} · {fmtStock(e.qty, e)} · মেয়াদ {monthYear(e.expiry)}</Muted>
                {e.expired && <Btn title="স্টক থেকে বাদ দিন" variant="ghost" small onPress={() => discard(e.id)} />}
              </View>
            ))}
          </Card>
          <Card className="gap-1">
            <Text className="font-bold">⚠️ কমে যাওয়া ওষুধ — {d.low.length}টি</Text>
            {d.low.length === 0 && <Muted>সব ঠিক আছে ✅</Muted>}
            {d.low.map((m) => <View key={m.id} className="flex-row justify-between py-1.5 border-t border-slate-100"><Text className="flex-1 text-sm">{m.name}</Text><Text className="text-sm text-rose-600 font-semibold">{fmtStock(m.stock, m)} / {fmtStock(m.minStock, m)}</Text></View>)}
          </Card>
          <Card className="gap-1">
            <Text className="font-bold">🔥 বেশি বিক্রি হচ্ছে (৩০ দিন)</Text>
            {d.top.length === 0 && <Muted>এখনো বিক্রি নেই</Muted>}
            {d.top.map((m: any, i: number) => <View key={m.productId} className="flex-row justify-between py-1.5 border-t border-slate-100"><Text className="flex-1 text-sm">{i + 1}. {m.name}</Text><Text className="text-sm"><Text className="font-bold">{taka(m.revenue)}</Text> ({fmtStock(m.pieces, m)})</Text></View>)}
          </Card>
        </>
      )}
    </Page>
  );
}
