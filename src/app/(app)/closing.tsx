import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, Empty, errMsg, IconBox, Loading, Muted, Notice, Page, Row, SectionHead, Text, useLoad } from '@/components/ui';
import { MiniBars } from '@/components/charts';
import { bn, taka } from '@/lib/format';
import { closeDay, closings, summary } from '@/services/shop';

export default function Closing() {
  const { data, err, reload } = useLoad(async () => ({ s: await summary('TODAY'), past: await closings() }));
  const [msg, setMsg] = useState(''); const [e2, setE2] = useState('');
  const close = async () => { setE2(''); try { await closeDay(); setMsg('আজকের হিসাব বন্ধ হয়েছে ✅'); await reload(); } catch (e) { setE2(errMsg(e)); } };
  const s = data?.s;
  const past: any[] = data?.past ?? [];
  const last7 = past.slice(0, 7).reverse().map((p) => ({ label: bn(String(p.date).slice(8, 10)), value: p.totalSale }));
  return (
    <Page onRefresh={reload}>
      {!s ? <Loading /> : (
        <>
          <Card className="gap-1">
            <View className="flex-row items-center gap-3 pb-3 border-b border-line">
              <IconBox name="lock-closed" size={42} tone="dark" />
              <View className="flex-1">
                <Text className="text-slate-500 text-xs">আজকের মোট বিক্রি</Text>
                <Text className="text-3xl font-bold" style={{ lineHeight: 46 }}>{taka(s.totalSale)}</Text>
              </View>
            </View>
            <Row l="নগদ" v={taka(s.cash)} /><Row l="বিকাশ" v={taka(s.bkash)} /><Row l="বাকিতে" v={taka(s.due)} />
            <Row l="মোট খরচ" v={taka(s.expense)} bold tone="red" /><Row l="হাতে থাকার কথা" v={taka(s.cashInHand)} bold />
            <Row l="আজকের লাভ*" v={taka(s.profit)} bold tone="green" last />
            <Muted className="mt-1">* আনুমানিক — পণ্যের ক্রয় মূল্য দেওয়া থাকলে সঠিক হবে</Muted>
          </Card>
          <Notice kind="err">{e2 || err}</Notice><Notice kind="ok">{msg}</Notice>
          <Btn title="হিসাব বন্ধ করুন" icon="lock-closed" variant="dark" onPress={close} />
        </>
      )}

      {last7.length > 1 && (
        <Card className="gap-3">
          <SectionHead title="শেষ কয়েক দিনের বিক্রি" />
          <MiniBars data={last7} />
        </Card>
      )}

      <View>
        <SectionHead title="আগের দিনের হিসাব" />
        <View className="gap-2.5">
          {past.map((p: any) => (
            <Card key={p.id} className="flex-row items-center gap-3">
              <IconBox name="calendar-outline" size={40} tone="slate" />
              <View className="flex-1">
                <Text className="font-semibold">{p.date}</Text>
                <Muted>বিক্রি {taka(p.totalSale)} · খরচ {taka(p.expense)}</Muted>
              </View>
              <View className="items-end">
                <Text className="font-bold text-emerald-600">{taka(p.profit)}</Text>
                <Text className="text-xs text-slate-400">লাভ</Text>
              </View>
            </Card>
          ))}
          {data && past.length === 0 && <Empty text="এখনো কোনো দিনের হিসাব বন্ধ করা হয়নি" icon="calendar-outline" />}
        </View>
      </View>
    </Page>
  );
}