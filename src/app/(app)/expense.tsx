import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, Chip, Chips, Empty, errMsg, H1, Input, Muted, Notice, Page, Text, useLoad } from '@/components/ui';
import { num, taka, timeOf } from '@/lib/format';
import { createExpense, expenses } from '@/services/shop';

const CATS = ['দোকান ভাড়া', 'বিদ্যুৎ', 'কর্মচারী', 'পরিবহন', 'মাল কেনা', 'অন্যান্য'];
export default function Expense() {
  const { data, err, reload } = useLoad(() => expenses('TODAY'));
  const [cat, setCat] = useState(CATS[0]); const [custom, setCustom] = useState(''); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const [e2, setE2] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setE2('');
    if (!(num(amount) > 0)) return setE2('টাকার পরিমাণ দিন');
    setBusy(true);
    try { await createExpense(cat === 'অন্যান্য' && custom.trim() ? custom.trim() : cat, num(amount), note || null); setAmount(''); setNote(''); setCustom(''); await reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };
  return (
    <Page onRefresh={reload}>
      <H1>আজকের খরচ</H1>
      <Chips>{CATS.map((c) => <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />)}</Chips>
      {cat === 'অন্যান্য' && <View className="flex-row"><Input placeholder="খরচের নাম (ঐচ্ছিক)" value={custom} onChangeText={setCustom} /></View>}
      <View className="flex-row"><Input label="টাকা" className="text-3xl font-bold py-4" keyboardType="decimal-pad" placeholder="500" value={amount} onChangeText={setAmount} /></View>
      <View className="flex-row"><Input placeholder="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} /></View>
      <Notice kind="err">{e2 || err}</Notice>
      <Btn title="খরচ যোগ করুন" variant="danger" icon="add" loading={busy} onPress={submit} />
      <View className="gap-2 pt-1">
        {(data ?? []).map((e: any) => (
          <Card key={e.id} className="flex-row justify-between items-center">
            <View className="flex-1"><Text className="font-semibold">{e.category}</Text><Muted>{e.note ? e.note + ' · ' : ''}{timeOf(e.createdAt)}</Muted></View>
            <Text className="font-bold text-rose-600">{taka(e.amount)}</Text>
          </Card>
        ))}
        {data && data.length === 0 && <Empty text="আজ এখনো কোনো খরচ নেই" />}
      </View>
    </Page>
  );
}
