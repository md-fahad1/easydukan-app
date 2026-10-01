import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, errMsg, H2, Loading, Muted, Notice, Page, Row, Text, useLoad } from '@/components/ui';
import { taka } from '@/lib/format';
import { closeDay, closings, summary } from '@/services/shop';

export default function Closing() {
  const { data, err, reload } = useLoad(async () => ({ s: await summary('TODAY'), past: await closings() }));
  const [msg, setMsg] = useState(''); const [e2, setE2] = useState('');
  const close = async () => { setE2(''); try { await closeDay(); setMsg('আজকের হিসাব বন্ধ হয়েছে ✅'); await reload(); } catch (e) { setE2(errMsg(e)); } };
  const s = data?.s;
  return (
    <Page onRefresh={reload}>
      <Text className="text-2xl font-bold">আজকের হিসাব</Text>
      {!s ? <Loading /> : (
        <Card>
          <Row l="মোট বিক্রি" v={taka(s.totalSale)} bold /><Row l="নগদ" v={taka(s.cash)} /><Row l="বিকাশ" v={taka(s.bkash)} /><Row l="বাকিতে" v={taka(s.due)} />
          <Row l="মোট খরচ" v={taka(s.expense)} bold tone="red" /><Row l="হাতে থাকার কথা" v={taka(s.cashInHand)} bold />
          <Row l="আজকের লাভ*" v={taka(s.profit)} bold tone="green" last />
          <Muted className="mt-1">* আনুমানিক — পণ্যের ক্রয় মূল্য দেওয়া থাকলে সঠিক হবে</Muted>
        </Card>
      )}
      <Notice kind="err">{e2 || err}</Notice><Notice kind="ok">{msg}</Notice>
      <Btn title="হিসাব বন্ধ করুন" icon="lock-closed" onPress={close} />
      <H2>আগের দিনের হিসাব</H2>
      <View className="gap-2">
        {(data?.past ?? []).map((p: any) => (
          <Card key={p.id} className="flex-row justify-between"><Text className="font-semibold">{p.date}</Text><Text className="text-sm">বিক্রি {taka(p.totalSale)}</Text><Text className="text-sm">খরচ {taka(p.expense)}</Text><Text className="text-sm font-bold text-emerald-700">লাভ {taka(p.profit)}</Text></Card>
        ))}
      </View>
    </Page>
  );
}
