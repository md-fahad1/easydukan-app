import React, { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Btn, Card, Empty, errMsg, IconBox, Input, Muted, Notice, Page, SectionHead, Split, Text, useLoad } from '@/components/ui';
import { num, taka } from '@/lib/format';
import { createSupplier, lendToSupplier, paySupplier, suppliers } from '@/services/shop';

export default function Supplier() {
  const { data, err, reload } = useLoad(() => suppliers());
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [amt, setAmt] = useState<Record<string, string>>({}); const [e2, setE2] = useState('');
  const list = data ?? [];
  const net = list.reduce((a, s) => a + s.balance, 0);
  const run = async (fn: () => Promise<any>) => { setE2(''); try { await fn(); reload(); } catch (e) { setE2(errMsg(e)); } };
  return (
    <Page onRefresh={reload}>
      <Card className="flex-row items-center gap-3">
        <IconBox name="bus" size={42} tone={net >= 0 ? 'red' : 'green'} />
        <View className="flex-1">
          <Text className="text-slate-500 text-xs">{net >= 0 ? 'মোট দিতে হবে' : 'মোট আপনি পাবেন'}</Text>
          <Text className={`text-3xl font-bold ${net >= 0 ? 'text-rose-600' : 'text-emerald-600'}`} style={{ lineHeight: 46 }}>{taka(Math.abs(net))}</Text>
        </View>
      </Card>

      <Card className="gap-3">
        <Text className="font-bold">নতুন কোম্পানি / মালদাতা</Text>
        <View className="flex-row"><Input placeholder="কোম্পানির নাম" value={name} onChangeText={setName} /></View>
        <View className="flex-row"><Input placeholder="মোবাইল (ঐচ্ছিক)" keyboardType="number-pad" value={phone} onChangeText={setPhone} /></View>
        <Btn title="যোগ করুন" icon="add" variant="dark" small onPress={() => run(async () => { await createSupplier(name, phone || null); setName(''); setPhone(''); })} />
      </Card>
      <Notice kind="err">{err || e2}</Notice>

      <View>
        <SectionHead title="সব কোম্পানি" />
        <View className="gap-2.5">
          {list.map((s) => (
            <Card key={s.id} className="gap-3">
              <View className="flex-row items-center gap-3">
                <Avatar name={s.name} />
                <Text className="font-bold text-base flex-1" numberOfLines={1}>{s.name}</Text>
                <View className="items-end">
                  <Text className={`font-bold text-base ${s.balance > 0 ? 'text-rose-600' : s.balance < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{taka(Math.abs(s.balance))}</Text>
                  <Muted>{s.balance > 0 ? 'আপনি দেবেন' : s.balance < 0 ? 'আপনি পাবেন' : 'হিসাব শেষ'}</Muted>
                </View>
              </View>
              <View className="flex-row"><Input placeholder="টাকার পরিমাণ" keyboardType="decimal-pad" value={amt[s.id] || ''} onChangeText={(v) => setAmt({ ...amt, [s.id]: v })} /></View>
              <Split>
                <View className="flex-1"><Btn title="টাকা পরিশোধ" small onPress={() => run(async () => { await paySupplier(s.id, num(amt[s.id])); setAmt({ ...amt, [s.id]: '' }); })} /></View>
                <View className="flex-1"><Btn title="ধার দিন" small variant="outline" onPress={() => run(async () => { await lendToSupplier(s.id, num(amt[s.id])); setAmt({ ...amt, [s.id]: '' }); })} /></View>
              </Split>
            </Card>
          ))}
          {list.length === 0 && <Empty text="কোনো কোম্পানি নেই" icon="bus-outline" />}
        </View>
      </View>
    </Page>
  );
}