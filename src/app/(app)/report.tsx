import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bar, Card, IconBox, Loading, Notice, Page, Row, SectionHead, Split, Stat, Text, useLoad } from '@/components/ui';
import { Gauge } from '@/components/charts';
import { bn, taka } from '@/lib/format';
import { summary } from '@/services/shop';

const TABS: [string, string][] = [['TODAY', 'আজ'], ['WEEK', 'এই সপ্তাহ'], ['MONTH', 'এই মাস']];

// বিক্রির কত অংশ খরচের পর হাতে থাকছে → ০–১০০
const health = (sale: number, exp: number) => (sale > 0 ? Math.max(0, Math.min(100, (1 - exp / sale) * 100)) : 0);
const level = (v: number): [string, string, string] => (v >= 70 ? ['খুব ভালো', '#22C55E', 'text-emerald-600'] : v >= 40 ? ['ভালো', '#18A9B7', 'text-brand-700'] : ['সতর্ক থাকুন', '#F87171', 'text-rose-600']);

export default function Report() {
  const [p, setP] = useState('TODAY');
  const { data: s, err, reload } = useLoad(() => summary(p), [p]);
  const h = s ? health(s.totalSale, s.expense) : 0;
  const [lv, col] = level(h);
  const top = s ? Math.max(1, s.totalSale, s.expense) : 1;
  return (
    <Page onRefresh={reload}>
      {/* ---------- সময় বাছাই ---------- */}
      <View className="flex-row bg-white rounded-full p-1 border border-line">
        {TABS.map(([k, v]) => (
          <Pressable key={k} onPress={() => setP(k)} className={`flex-1 items-center py-3 rounded-full ${p === k ? 'bg-slate-900' : ''}`}>
            <Text className={`text-sm ${p === k ? 'text-white font-bold' : 'text-slate-500'}`}>{v}</Text>
          </Pressable>
        ))}
      </View>
      <Notice kind="err">{err}</Notice>
      {!s ? <Loading /> : (
        <>
          {/* ---------- আয়-খরচের স্বাস্থ্য ---------- */}
          <Card className="gap-4">
            <SectionHead title="আয়-খরচের স্বাস্থ্য" />
            <Gauge value={h} label={lv} color={col} />
            <Text className="text-center text-xs text-slate-400 -mt-2">বিক্রির কত অংশ খরচের পরও থাকছে</Text>
            <View className="gap-3 pt-3 border-t border-line">
              <View className="gap-1.5">
                <View className="flex-row justify-between"><Text className="text-sm text-slate-600">বিক্রি</Text><Text className="text-sm font-bold">{taka(s.totalSale)}</Text></View>
                <Bar pct={(s.totalSale / top) * 100} tone="green" />
              </View>
              <View className="gap-1.5">
                <View className="flex-row justify-between"><Text className="text-sm text-slate-600">খরচ</Text><Text className="text-sm font-bold">{taka(s.expense)}</Text></View>
                <Bar pct={(s.expense / top) * 100} tone="red" />
              </View>
            </View>
          </Card>

          <Split>
            <Stat icon="trending-up" label="আনুমানিক লাভ" value={taka(s.profit)} tone="green" />
            <Stat icon="receipt-outline" label="বিক্রির সংখ্যা" value={`${bn(s.saleCount)}টি`} />
          </Split>

          {/* ---------- বিক্রির বিবরণ ---------- */}
          <Card>
            <View className="flex-row items-center gap-2.5 mb-1"><IconBox name="cash" size={34} tone="brand" /><Text className="font-bold text-base">বিক্রির বিবরণ</Text></View>
            <Row l="মোট বিক্রি (ফেরত বাদে)" v={taka(s.totalSale)} bold />
            <Row l="নগদ" v={taka(s.cash)} /><Row l="বিকাশ" v={taka(s.bkash)} /><Row l="বাকিতে" v={taka(s.due)} />
            <Row l="ফেরত (বাদ গেছে)" v={taka(s.returnTotal)} last />
          </Card>

          {/* ---------- টাকার হিসাব ---------- */}
          <Card>
            <View className="flex-row items-center gap-2.5 mb-1"><IconBox name="wallet" size={34} tone="slate" /><Text className="font-bold text-base">টাকার হিসাব</Text></View>
            <Row l="মোট খরচ" v={taka(s.expense)} tone="red" />
            <Row l="বাকি আদায়" v={taka(s.received)} />
            <Row l="হাতে থাকার কথা" v={taka(s.cashInHand)} bold last />
          </Card>

          {/* ---------- পাওনা-দেনা ---------- */}
          <Card>
            <View className="flex-row items-center gap-2.5 mb-1"><IconBox name="swap-vertical" size={34} tone="amber" /><Text className="font-bold text-base">পাওনা-দেনা ও স্টক</Text></View>
            <Row l="মোট বাকি (পাবেন)" v={taka(s.customerDue)} tone="amber" />
            <Row l="মোট পাওনা (দেবেন)" v={taka(s.supplierDue)} tone="red" />
            <Row l="কমে যাওয়া পণ্য" v={`${bn(s.lowStockCount)}টি`} last />
          </Card>
        </>
      )}
    </Page>
  );
}