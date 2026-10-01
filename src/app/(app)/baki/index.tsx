import { Link } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, Empty, errMsg, H1, Input, Muted, Notice, Page, Text, useLoad } from '@/components/ui';
import { taka } from '@/lib/format';
import { createCustomer, customers } from '@/services/shop';
import { useSession } from '@/store/session';

export default function Baki() {
  const { employee } = useSession();
  const { data, err, reload } = useLoad(() => customers());
  const [q, setQ] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [show, setShow] = useState(false); const [e2, setE2] = useState('');
  const list = data ?? [];
  const total = list.reduce((a, c) => a + c.balance, 0);
  const shown = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q));
  const add = async () => {
    setE2('');
    try { await createCustomer(name, phone || null); setName(''); setPhone(''); setShow(false); reload(); } catch (e) { setE2(errMsg(e)); }
  };
  return (
    <Page onRefresh={reload}>
      <H1>বাকির খাতা</H1>
      <Card className="bg-amber-50 border-amber-200"><Text className="text-slate-600">মোট পাবেন</Text><Text className="text-3xl font-bold text-amber-700">{taka(total)}</Text></Card>
      <View className="flex-row"><Input placeholder="নাম বা মোবাইল দিয়ে খুঁজুন" value={q} onChangeText={setQ} /></View>
      <Btn title={show ? 'বন্ধ করুন' : 'নতুন কাস্টমার'} icon={show ? 'close' : 'person-add'} variant="outline" small onPress={() => setShow(!show)} />
      {show && (
        <Card className="gap-3">
          <View className="flex-row"><Input placeholder="নাম" value={name} onChangeText={setName} /></View>
          <View className="flex-row"><Input placeholder="মোবাইল (ঐচ্ছিক)" keyboardType="number-pad" value={phone} onChangeText={setPhone} /></View>
          <Notice kind="err">{e2}</Notice>
          <Btn title="সেভ করুন" onPress={add} />
        </Card>
      )}
      <Notice kind="err">{err}</Notice>
      <View className="gap-2">
        {shown.map((c) => (
          <Link key={c.id} href={employee ? '/sale' : { pathname: '/baki/[id]', params: { id: c.id } }} asChild>
            <Card onPress={() => {}} className="flex-row justify-between items-center">
              <View><Text className="font-bold text-lg">{c.name}</Text><Muted>{c.phone}</Muted></View>
              <Text className={`font-bold text-lg ${c.balance > 0 ? 'text-amber-600' : c.balance < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{taka(c.balance)}</Text>
            </Card>
          </Link>
        ))}
        {shown.length === 0 && <Empty text="কোনো কাস্টমার নেই" icon="people-outline" />}
      </View>
    </Page>
  );
}
