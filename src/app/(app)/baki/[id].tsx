import { Link, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { Btn, Card, Chip, Empty, errMsg, H2, Input, Loading, Muted, Notice, Page, Split, Text, useLoad } from '@/components/ui';
import { dateOf, num, taka } from '@/lib/format';
import { customer, customerLedger, receivePayment } from '@/services/shop';

export default function CustomerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, err, reload } = useLoad(async () => ({ c: await customer(id), l: await customerLedger(id) }), [id]);
  const [amount, setAmount] = useState(''); const [method, setMethod] = useState('CASH');
  const [e2, setE2] = useState(''); const [busy, setBusy] = useState(false);
  if (!data?.c) return <Page>{err ? <Notice kind="err">{err}</Notice> : <Loading />}</Page>;
  const { c, l } = data;

  const receive = async () => {
    setE2(''); setBusy(true);
    try { await receivePayment(id, num(amount), method); setAmount(''); await reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };
  const text = `আসসালামু আলাইকুম ${c.name}, আপনার দোকানের বাকি ${taka(c.balance)} টাকা। সময় হলে পরিশোধ করবেন। ধন্যবাদ।`;
  const wa = () => Linking.openURL(`https://wa.me/88${c.phone}?text=${encodeURIComponent(text)}`).catch(() => Linking.openURL(`sms:${c.phone}?body=${encodeURIComponent(text)}`));

  return (
    <Page>
      <Card>
        <Text className="text-2xl font-bold">{c.name}</Text><Muted>{c.phone}</Muted>
        <Text className="mt-3 text-slate-600">মোট বাকি</Text>
        <Text className={`text-3xl font-bold ${c.balance > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>{taka(c.balance)}</Text>
        {c.balance < 0 && <Muted>কাস্টমার আপনার কাছে পাবেন</Muted>}
      </Card>
      <Card className="gap-3">
        <Text className="font-bold">টাকা নিয়েছি</Text>
        <View className="flex-row"><Input className="text-2xl" keyboardType="decimal-pad" placeholder="কত টাকা?" value={amount} onChangeText={setAmount} /></View>
        <View className="flex-row gap-2"><Chip label="নগদ" on={method === 'CASH'} onPress={() => setMethod('CASH')} /><Chip label="বিকাশ" on={method === 'BKASH'} onPress={() => setMethod('BKASH')} /></View>
        <Notice kind="err">{e2}</Notice>
        <Btn title="টাকা গ্রহণ করুন" disabled={!amount} loading={busy} onPress={receive} />
      </Card>
      <Split>
        <View className="flex-1"><Link href={{ pathname: '/sale', params: { customer: c.id } }} asChild><Btn title="নতুন বাকি" icon="add" variant="outline" small /></Link></View>
        <View className="flex-1"><Btn title="রিমাইন্ডার" icon="logo-whatsapp" variant="outline" small disabled={!c.phone} onPress={wa} /></View>
      </Split>
      <H2>হিসাব</H2>
      <View className="gap-2">
        {l.map((e, i) => (
          <Card key={i} className="flex-row justify-between items-center">
            <View><Text className="font-semibold">{e.type === 'BAKI' ? 'বাকি নিয়েছে' : e.note === 'RETURN' ? 'ফেরত (বাকি কমেছে)' : 'টাকা দিয়েছে'}</Text><Muted>{dateOf(e.date)}</Muted></View>
            <Text className={`font-bold ${e.type === 'BAKI' ? 'text-amber-600' : 'text-emerald-700'}`}>{e.type === 'BAKI' ? '+' : '−'}{taka(e.amount)}</Text>
          </Card>
        ))}
        {l.length === 0 && <Empty text="এখনো কোনো লেনদেন নেই" />}
      </View>
    </Page>
  );
}
