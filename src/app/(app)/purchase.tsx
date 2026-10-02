import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, errMsg, Icon, IconBox, IconName, Input, Label, Notice, Page, Pick, Text, useLoad } from '@/components/ui';
import { num, taka } from '@/lib/format';
import { createPurchase, products, suppliers } from '@/services/shop';

type Line = { productId: string; name: string; qty: string; cost: string };
const PAY: [string, string, IconName][] = [['FULL', 'পুরো টাকা', 'cash'], ['PART', 'কিছু টাকা', 'git-compare'], ['DUE', 'বাকিতে', 'time']];

export default function Purchase() {
  const router = useRouter();
  const { data } = useLoad(async () => ({ s: await suppliers(), p: await products() }));
  const [supplierId, setSupplierId] = useState(''); const [lines, setLines] = useState<Line[]>([]); const [manual, setManual] = useState('');
  const [pay, setPay] = useState('FULL'); const [paid, setPaid] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const total = lines.length ? lines.reduce((a, l) => a + num(l.qty) * num(l.cost), 0) : num(manual);
  const upd = (id: string, k: 'qty' | 'cost', v: string) => setLines(lines.map((l) => (l.productId === id ? { ...l, [k]: v } : l)));
  const addLine = (id: string) => {
    const p = data?.p.find((p) => p.id === id);
    if (p && !lines.find((l) => l.productId === id)) setLines([...lines, { productId: p.id, name: p.name, qty: '1', cost: String(p.purchasePrice) }]);
  };
  const submit = async () => {
    setErr('');
    if (total <= 0) return setErr('মালের মোট টাকা দিন');
    const p = pay === 'FULL' ? total : pay === 'DUE' ? 0 : num(paid);
    if (p < total && !supplierId) return setErr('বাকির জন্য মালদাতা বেছে নিন');
    setBusy(true);
    try {
      const input: any = { supplierId: supplierId || null, paid: p };
      if (lines.length) input.items = lines.map((l) => ({ productId: l.productId, qty: num(l.qty), cost: num(l.cost) })); else input.total = total;
      await createPurchase(input);
      router.replace('/mal');
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  return (
    <Page>
      <Card className="gap-3">
        <View className="flex-row"><Pick label="কোথা থেকে?" value={supplierId} onChange={setSupplierId} placeholder="মালদাতা বেছে নিন" noneLabel="— মালদাতা ছাড়া —" options={(data?.s ?? []).map((s) => ({ value: s.id, label: s.name, sub: `দিতে হবে ${taka(s.balance)}` }))} /></View>
        <View className="flex-row"><Pick label="পণ্য (স্টকে যোগ হবে)" value="" onChange={addLine} placeholder="+ পণ্য যোগ করুন" options={(data?.p ?? []).map((p) => ({ value: p.id, label: p.name }))} /></View>
      </Card>

      {lines.map((l) => (
        <Card key={l.productId} className="gap-3">
          <View className="flex-row items-center gap-3">
            <IconBox name="cube-outline" size={38} tone="brand" />
            <Text className="font-bold flex-1" numberOfLines={1}>{l.name}</Text>
            <Text className="font-bold text-brand-700">{taka(num(l.qty) * num(l.cost))}</Text>
            <Pressable hitSlop={8} onPress={() => setLines(lines.filter((x) => x.productId !== l.productId))} className="active:opacity-50"><Icon name="close-circle" size={22} color="#CBD5E1" /></Pressable>
          </View>
          <View className="flex-row gap-3"><Input label="পরিমাণ" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => upd(l.productId, 'qty', v)} /><Input label="কেনা দাম" keyboardType="decimal-pad" value={l.cost} onChangeText={(v) => upd(l.productId, 'cost', v)} /></View>
        </Card>
      ))}
      {lines.length === 0 && <View className="flex-row"><Input label="অথবা শুধু মোট টাকা লিখুন" keyboardType="decimal-pad" placeholder="12500" value={manual} onChangeText={setManual} /></View>}

      <View>
        <Label>পেমেন্ট</Label>
        <View className="flex-row gap-2.5">
          {PAY.map(([k, v, ic]) => {
            const on = pay === k;
            return (
              <Pressable key={k} onPress={() => setPay(k)} className={`flex-1 items-center gap-2 py-3 rounded-2xl border ${on ? 'bg-brand-50 border-brand-600' : 'bg-white border-line'}`}>
                <IconBox name={ic} size={34} tone={on ? 'brand' : 'slate'} />
                <Text className={`text-xs ${on ? 'font-bold text-brand-800' : 'text-slate-700'}`}>{v}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {pay === 'PART' && <View className="flex-row"><Input placeholder="এখন কত টাকা দিলেন?" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>}
      <Notice kind="err">{err}</Notice>

      <Card className="gap-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500">মোট</Text>
          <Text className="text-2xl font-bold">{taka(total)}</Text>
        </View>
        <Btn title="মাল কেনা যোগ করুন" icon="checkmark" variant="dark" loading={busy} onPress={submit} />
      </Card>
    </Page>
  );
}