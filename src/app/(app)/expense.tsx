import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Btn, Card, Chip, Chips, Empty, errMsg, FONT, IconBox, Input, Muted, Notice, Page, SectionHead, Text, useLoad } from '@/components/ui';
import { num, taka, timeOf } from '@/lib/format';
import { createExpense, expenses } from '@/services/shop';

const CATS = ['দোকান ভাড়া', 'বিদ্যুৎ', 'কর্মচারী', 'পরিবহন', 'মাল কেনা', 'অন্যান্য'];
const QUICK = [100, 200, 500, 1000];
export default function Expense() {
  const { data, err, reload } = useLoad(() => expenses('TODAY'));
  const [cat, setCat] = useState(CATS[0]); const [custom, setCustom] = useState(''); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const [e2, setE2] = useState(''); const [busy, setBusy] = useState(false);
  const list = data ?? [];
  const sum = list.reduce((a: number, e: any) => a + e.amount, 0);
  const submit = async () => {
    setE2('');
    if (!(num(amount) > 0)) return setE2('টাকার পরিমাণ দিন');
    setBusy(true);
    try { await createExpense(cat === 'অন্যান্য' && custom.trim() ? custom.trim() : cat, num(amount), note || null); setAmount(''); setNote(''); setCustom(''); await reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };
  return (
    <Page onRefresh={reload}>
      <Card className="flex-row items-center gap-3">
        <IconBox name="wallet" size={42} tone="red" />
        <View className="flex-1">
          <Text className="text-slate-500 text-xs">আজকের মোট খরচ</Text>
          <Text className="text-3xl font-bold text-rose-600" style={{ lineHeight: 46 }}>{taka(sum)}</Text>
        </View>
      </Card>

      <Card className="gap-3">
        <Text className="text-slate-500 text-sm">কিসের খরচ?</Text>
        <Chips>{CATS.map((c) => <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />)}</Chips>
        {cat === 'অন্যান্য' && <View className="flex-row"><Input placeholder="খরচের নাম (ঐচ্ছিক)" value={custom} onChangeText={setCustom} /></View>}
        <View className="flex-row items-center pt-1">
          <Text className="text-slate-300 font-bold mr-2" style={{ fontSize: 36, lineHeight: 52 }}>৳</Text>
          <TextInput
            value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#CBD5E1" selectionColor="#18A9B7"
            style={{ flex: 1, fontFamily: FONT.bold, fontSize: 40, height: 64, padding: 0, color: '#0F172A' }}
          />
        </View>
        <View className="flex-row gap-2">
          {QUICK.map((v) => (
            <Pressable key={v} onPress={() => setAmount(String(num(amount) + v))} className="flex-1 items-center py-2 rounded-xl bg-canvas active:bg-brand-50">
              <Text className="text-sm font-semibold text-slate-600">+{v}</Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row"><Input placeholder="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} /></View>
        <Notice kind="err">{e2 || err}</Notice>
        <Btn title="খরচ যোগ করুন" variant="danger" icon="add" loading={busy} onPress={submit} />
      </Card>

      <View>
        <SectionHead title="আজকের খরচের তালিকা" />
        <View className="gap-2.5">
          {list.map((e: any) => (
            <Card key={e.id} className="flex-row items-center gap-3">
              <IconBox name="arrow-up" size={38} tone="red" />
              <View className="flex-1"><Text className="font-semibold">{e.category}</Text><Muted>{e.note ? e.note + ' · ' : ''}{timeOf(e.createdAt)}</Muted></View>
              <Text className="font-bold text-rose-600">{taka(e.amount)}</Text>
            </Card>
          ))}
          {data && list.length === 0 && <Empty text="আজ এখনো কোনো খরচ নেই" icon="wallet-outline" />}
        </View>
      </View>
    </Page>
  );
}