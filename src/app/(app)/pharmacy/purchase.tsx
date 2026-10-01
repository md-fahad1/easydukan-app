import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { ExpiryInput, parseMonth } from '@/components/ExpiryInput';
import { Btn, Card, Chip, Chips, errMsg, H1, Icon, Input, Label, Muted, Notice, Page, Pick, Text, useLoad } from '@/components/ui';
import { num, taka } from '@/lib/format';
import { fmtStock, r2, unitFactor, unitsFor } from '@/lib/pharma';
import { pharmacyPurchase } from '@/services/pharmacy';
import { products, suppliers } from '@/services/shop';

type Line = { p: any; unit: string; qty: string; cost: string; batchNo: string; expiry: string };
export default function PharmaPurchase() {
  const router = useRouter();
  const { data } = useLoad(async () => ({ s: await suppliers(), p: await products() }));
  const ps = data?.p ?? [];
  const [supplierId, setSupplierId] = useState(''); const [lines, setLines] = useState<Line[]>([]); const [q, setQ] = useState(''); const [scan, setScan] = useState(false);
  const [pay, setPay] = useState('FULL'); const [paid, setPaid] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const add = (p: any) => { setQ(''); const unit = unitsFor(p)[0][0]; setLines((l) => [...l, { p, unit, qty: '1', cost: String(r2(p.purchasePrice * unitFactor(p, unit))), batchNo: '', expiry: '' }]); };
  const upd = (i: number, patch: Partial<Line>) => setLines((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const setUnit = (i: number, unit: string) => upd(i, { unit, cost: String(r2(lines[i].p.purchasePrice * unitFactor(lines[i].p, unit))) });
  const onScan = (code: string) => { setScan(false); const p = ps.find((p) => p.barcode === code); if (p) add(p); else setErr(`বারকোড ${code} — এই ওষুধ আগে "নতুন ওষুধ" থেকে যোগ করুন`); };
  const total = r2(lines.reduce((a, l) => a + num(l.qty) * num(l.cost), 0));
  const found = useMemo(() => (q ? ps.filter((p) => (p.name + ' ' + (p.genericName || '') + ' ' + (p.company || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []), [q, ps]);

  const submit = async () => {
    setErr('');
    if (!lines.length) return setErr('কমপক্ষে একটি ওষুধ যোগ করুন');
    if (total <= 0) return setErr('দাম দিন');
    for (const l of lines) if (l.expiry && !parseMonth(l.expiry)) return setErr(`${l.p.name}: মেয়াদ ঠিকমতো লিখুন (যেমন: 03/2027)`);
    const p = pay === 'FULL' ? total : pay === 'DUE' ? 0 : num(paid);
    if (p < total && !supplierId) return setErr('বাকির জন্য কোম্পানি বেছে নিন');
    setBusy(true);
    try {
      await pharmacyPurchase({ supplierId: supplierId || null, paid: p, items: lines.map((l) => ({ productId: l.p.id, unit: l.unit, qty: num(l.qty), cost: num(l.cost), batchNo: l.batchNo || null, expiry: parseMonth(l.expiry) })) });
      router.replace('/pharmacy/medicines');
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Page>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan(false)} />}
      <H1>কোম্পানি থেকে মাল কেনা</H1>
      <View className="flex-row"><Pick label="কোন কোম্পানি থেকে?" value={supplierId} onChange={setSupplierId} placeholder="কোম্পানি বেছে নিন" noneLabel="— কোম্পানি ছাড়া —" options={(data?.s ?? []).map((s) => ({ value: s.id, label: s.name, sub: `${s.balance >= 0 ? 'দিতে হবে' : 'পাবেন'} ${taka(Math.abs(s.balance))}` }))} /></View>
      <View className="flex-row gap-2 items-end">
        <Input placeholder="ওষুধ খুঁজুন..." value={q} onChangeText={setQ} />
        <Pressable onPress={() => setScan(true)} className="w-14 h-[54px] rounded-xl bg-brand-600 items-center justify-center"><Icon name="barcode-outline" size={28} color="#fff" /></Pressable>
      </View>
      {found.map((p) => <Card key={p.id} onPress={() => add(p)} className="flex-row justify-between items-center"><View className="flex-1"><Text className="font-semibold">{p.name}</Text><Muted>{p.company}</Muted></View><Muted>স্টক {fmtStock(p.stock, p)}</Muted></Card>)}
      {lines.map((l, i) => (
        <Card key={i} className="gap-2">
          <View className="flex-row justify-between items-center"><Text className="font-bold flex-1">{l.p.name}</Text><Pressable onPress={() => setLines(lines.filter((_, k) => k !== i))} className="p-1"><Icon name="close-circle" color="#F43F5E" /></Pressable></View>
          <Chips>{unitsFor(l.p).map(([k, v]) => <Chip key={k} label={v} on={l.unit === k} onPress={() => setUnit(i, k)} />)}</Chips>
          <View className="flex-row gap-3"><Input label="পরিমাণ" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => upd(i, { qty: v })} /><Input label="কেনা দাম (প্রতি ইউনিট)" keyboardType="decimal-pad" value={l.cost} onChangeText={(v) => upd(i, { cost: v })} /></View>
          <View className="flex-row gap-3"><Input label="ব্যাচ নং" value={l.batchNo} onChangeText={(v) => upd(i, { batchNo: v })} /><ExpiryInput value={l.expiry} onChange={(v) => upd(i, { expiry: v })} /></View>
          <Text className="text-right font-bold">{taka(num(l.qty) * num(l.cost))}</Text>
        </Card>
      ))}
      <Text className="text-right text-xl font-bold">মোট: {taka(total)}</Text>
      <View><Label>পেমেন্ট</Label><Chips>{[['FULL', 'পুরো টাকা'], ['PART', 'কিছু টাকা'], ['DUE', 'বাকিতে']].map(([k, v]) => <Chip key={k} label={v} on={pay === k} onPress={() => setPay(k)} />)}</Chips></View>
      {pay === 'PART' && <View><View className="flex-row"><Input placeholder="এখন কত টাকা দিলেন?" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>{total > 0 && <Text className="text-amber-600 mt-1">বাকি থাকবে: {taka(Math.max(0, total - num(paid)))}</Text>}</View>}
      <Notice kind="err">{err}</Notice>
      <Btn title="মাল কেনা যোগ করুন" icon="checkmark" loading={busy} onPress={submit} />
    </Page>
  );
}
