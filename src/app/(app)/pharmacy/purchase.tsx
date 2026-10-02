import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { ExpiryInput, parseMonth } from '@/components/ExpiryInput';
import { Btn, Card, Chip, Chips, errMsg, Icon, IconBox, IconName, Input, Label, Muted, Notice, Page, Pick, Text, useLoad } from '@/components/ui';
import { num, taka } from '@/lib/format';
import { fmtStock, r2, unitFactor, unitsFor } from '@/lib/pharma';
import { pharmacyPurchase } from '@/services/pharmacy';
import { products, suppliers } from '@/services/shop';

type Line = { p: any; unit: string; qty: string; cost: string; batchNo: string; expiry: string };
const PAY: [string, string, IconName][] = [['FULL', 'পুরো টাকা', 'cash'], ['PART', 'কিছু টাকা', 'git-compare'], ['DUE', 'বাকিতে', 'time']];

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
      <Card className="gap-3">
        <View className="flex-row"><Pick label="কোন কোম্পানি থেকে?" value={supplierId} onChange={setSupplierId} placeholder="কোম্পানি বেছে নিন" noneLabel="— কোম্পানি ছাড়া —" options={(data?.s ?? []).map((s) => ({ value: s.id, label: s.name, sub: `${s.balance >= 0 ? 'দিতে হবে' : 'পাবেন'} ${taka(Math.abs(s.balance))}` }))} /></View>
      </Card>

      <View className="flex-row gap-2.5 items-center">
        <Input placeholder="ওষুধ খুঁজুন..." value={q} onChangeText={setQ} />
        <Pressable onPress={() => setScan(true)} className="w-[52px] h-[52px] rounded-full bg-slate-900 items-center justify-center active:bg-black"><Icon name="barcode-outline" size={26} color="#fff" /></Pressable>
      </View>
      {found.map((p) => (
        <Card key={p.id} onPress={() => add(p)} className="flex-row items-center gap-3">
          <IconBox name="medkit-outline" size={40} tone="brand" />
          <View className="flex-1"><Text className="font-semibold">{p.name}</Text><Muted>{p.company}</Muted></View>
          <Muted>স্টক {fmtStock(p.stock, p)}</Muted>
        </Card>
      ))}

      {lines.map((l, i) => (
        <Card key={i} className="gap-3">
          <View className="flex-row items-center gap-3">
            <IconBox name="medkit" size={38} tone="brand" />
            <Text className="font-bold flex-1" numberOfLines={1}>{l.p.name}</Text>
            <Text className="font-bold text-brand-700">{taka(num(l.qty) * num(l.cost))}</Text>
            <Pressable onPress={() => setLines(lines.filter((_, k) => k !== i))} hitSlop={8} className="active:opacity-50"><Icon name="close-circle" size={24} color="#CBD5E1" /></Pressable>
          </View>
          <Chips>{unitsFor(l.p).map(([k, v]) => <Chip key={k} label={v} on={l.unit === k} onPress={() => setUnit(i, k)} />)}</Chips>
          <View className="flex-row gap-3"><Input label="পরিমাণ" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => upd(i, { qty: v })} /><Input label="কেনা দাম (প্রতি ইউনিট)" keyboardType="decimal-pad" value={l.cost} onChangeText={(v) => upd(i, { cost: v })} /></View>
          <View className="flex-row gap-3"><Input label="ব্যাচ নং" value={l.batchNo} onChangeText={(v) => upd(i, { batchNo: v })} /><ExpiryInput value={l.expiry} onChange={(v) => upd(i, { expiry: v })} /></View>
        </Card>
      ))}

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
      {pay === 'PART' && <View><View className="flex-row"><Input placeholder="এখন কত টাকা দিলেন?" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>{total > 0 && <Text className="text-amber-600 mt-1 text-sm">বাকি থাকবে: {taka(Math.max(0, total - num(paid)))}</Text>}</View>}
      <Notice kind="err">{err}</Notice>

      <Card className="gap-3">
        <View className="flex-row justify-between items-center"><Text className="text-slate-500">মোট</Text><Text className="text-2xl font-bold">{taka(total)}</Text></View>
        <Btn title="মাল কেনা যোগ করুন" icon="checkmark" variant="dark" loading={busy} onPress={submit} />
      </Card>
    </Page>
  );
}