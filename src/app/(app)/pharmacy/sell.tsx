import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Badge, Btn, Card, Chip, Chips, Empty, errMsg, Icon, IconBox, IconName, Input, Label, Muted, Notice, Page, Pick, SectionHead, Text, useLoad } from '@/components/ui';
import { num, taka, timeOf } from '@/lib/format';
import { fmtStock, r2, unitFactor, unitsFor } from '@/lib/pharma';
import { pharmacySale } from '@/services/pharmacy';
import { createCustomer, customers, products, sales } from '@/services/shop';

type Line = { p: any; unit: string; qty: string; price: string };
const PAY: [string, string, IconName][] = [['CASH', 'নগদ', 'cash'], ['BKASH', 'বিকাশ', 'phone-portrait'], ['PART', 'নগদ + বাকি', 'git-compare'], ['DUE', 'পুরো বাকি', 'time']];

export default function PharmaSell() {
  const { data, reload } = useLoad(async () => ({ p: await products(), c: await customers(), s: await sales('TODAY') }));
  const ps = data?.p ?? [];
  const [cart, setCart] = useState<Line[]>([]); const [q, setQ] = useState(''); const [scan, setScan] = useState(false);
  const [pay, setPay] = useState('CASH'); const [paid, setPaid] = useState(''); const [customerId, setCustomerId] = useState(''); const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const add = (p: any) => {
    setQ(''); setMsg(''); setErr('');
    const unit = unitsFor(p).some((u) => u[0] === 'STRIP') ? 'STRIP' : 'PIECE';
    setCart((c) => {
      const i = c.findIndex((l) => l.p.id === p.id && l.unit === unit);
      if (i >= 0) return c.map((l, k) => (k === i ? { ...l, qty: String(num(l.qty) + 1) } : l));
      return [...c, { p, unit, qty: '1', price: String(r2(p.sellingPrice * unitFactor(p, unit))) }];
    });
  };
  const upd = (i: number, patch: Partial<Line>) => setCart((c) => c.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const setUnit = (i: number, unit: string) => upd(i, { unit, price: String(r2(cart[i].p.sellingPrice * unitFactor(cart[i].p, unit))) });
  const onScan = (code: string) => { setScan(false); const p = ps.find((p) => p.barcode === code); if (p) add(p); else setErr(`বারকোড ${code} — এই ওষুধ পাওয়া যায়নি`); };
  const found = useMemo(() => (q ? ps.filter((p) => (p.name + ' ' + (p.genericName || '') + ' ' + (p.company || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []), [q, ps]);
  const onSubmitEditing = () => { const b = ps.find((p) => p.barcode && p.barcode === q.trim()); if (b) return add(b); if (found.length === 1) add(found[0]); };

  const total = r2(cart.reduce((a, l) => a + num(l.qty) * num(l.price), 0));
  const needCustomer = pay === 'DUE' || pay === 'PART';

  const submit = async () => {
    setErr(''); setMsg('');
    if (!cart.length) return setErr('কমপক্ষে একটি ওষুধ যোগ করুন');
    if (needCustomer && !customerId && !newName.trim()) return setErr('কাস্টমার বেছে নিন বা নাম লিখুন');
    let cash = 0, bkash = 0, due = 0;
    if (pay === 'CASH') cash = total; if (pay === 'BKASH') bkash = total; if (pay === 'DUE') due = total;
    if (pay === 'PART') { cash = num(paid); due = r2(total - cash); if (due <= 0 || cash < 0) return setErr('নগদ টাকা মোট টাকার কম হতে হবে'); }
    setBusy(true);
    try {
      let cid = customerId;
      if (needCustomer && !cid) cid = await createCustomer(newName);
      await pharmacySale({ items: cart.map((l) => ({ productId: l.p.id, unit: l.unit, qty: num(l.qty), price: num(l.price) })), cashAmount: cash, bkashAmount: bkash, dueAmount: due, customerId: needCustomer ? cid : null });
      setMsg(`বিক্রি সফল ✅ ${taka(total)}`); setCart([]); setPaid(''); setNewName(''); setPay('CASH'); setCustomerId('');
      await reload();
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  const list = data?.s ?? [];
  return (
    <Page>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan(false)} />}

      {/* ---------- খোঁজা + স্ক্যান ---------- */}
      <View className="flex-row gap-2.5 items-center">
        <Input placeholder="নাম / জেনেরিক / বারকোড" value={q} onChangeText={setQ} onSubmitEditing={onSubmitEditing} returnKeyType="search" />
        <Pressable onPress={() => setScan(true)} className="w-[52px] h-[52px] rounded-full bg-slate-900 items-center justify-center active:bg-black"><Icon name="barcode-outline" size={26} color="#fff" /></Pressable>
      </View>
      {found.map((p) => (
        <Card key={p.id} onPress={() => add(p)} className="flex-row items-center gap-3">
          <IconBox name="medkit-outline" size={40} tone="brand" />
          <View className="flex-1 gap-0.5">
            <Text className="font-bold">{p.name}</Text>
            <Muted>{[p.genericName, p.company].filter(Boolean).join(' · ') || '—'}</Muted>
            <Text className="text-xs text-slate-500">{unitsFor(p).map(([k, l]) => `${l} ${taka(r2(p.sellingPrice * unitFactor(p, k)))}`).join(' · ')}</Text>
          </View>
          <Muted>স্টক {fmtStock(p.stock, p)}</Muted>
        </Card>
      ))}
      {q && found.length === 0 && <Muted>কোনো ওষুধ পাওয়া যায়নি</Muted>}

      {/* ---------- কার্ট ---------- */}
      {cart.map((l, i) => (
        <Card key={i} className="gap-3">
          <View className="flex-row items-center gap-3">
            <IconBox name="medkit" size={38} tone="brand" />
            <View className="flex-1"><Text className="font-bold" numberOfLines={1}>{l.p.name}</Text><Muted>স্টক: {fmtStock(l.p.stock, l.p)}</Muted></View>
            <Pressable onPress={() => setCart(cart.filter((_, k) => k !== i))} hitSlop={8} className="active:opacity-50"><Icon name="close-circle" size={24} color="#CBD5E1" /></Pressable>
          </View>
          <Chips>{unitsFor(l.p).map(([k, v]) => <Chip key={k} label={v} on={l.unit === k} onPress={() => setUnit(i, k)} />)}</Chips>
          <View className="flex-row gap-3"><Input label="পরিমাণ" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => upd(i, { qty: v })} /><Input label="দাম (প্রতি ইউনিট)" keyboardType="decimal-pad" value={l.price} onChangeText={(v) => upd(i, { price: v })} /></View>
          <Text className="text-right font-bold text-brand-700">{taka(num(l.qty) * num(l.price))}</Text>
        </Card>
      ))}

      {/* ---------- পেমেন্ট ---------- */}
      <View>
        <Label>পেমেন্ট কীভাবে?</Label>
        <View className="flex-row flex-wrap gap-2.5">
          {PAY.map(([k, v, ic]) => {
            const on = pay === k;
            return (
              <Pressable key={k} onPress={() => setPay(k)} style={{ width: '48%' }} className={`flex-row items-center gap-2.5 p-3 rounded-2xl border ${on ? 'bg-brand-50 border-brand-600' : 'bg-white border-line'}`}>
                <IconBox name={ic} size={34} tone={on ? 'brand' : 'slate'} />
                <Text className={`flex-1 text-sm ${on ? 'font-bold text-brand-800' : 'text-slate-700'}`} numberOfLines={1}>{v}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {pay === 'PART' && (<View><View className="flex-row"><Input label="এখন কত টাকা নগদ নিলেন?" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>{total > 0 && <Text className="text-amber-600 mt-1 text-sm">বাকি থাকবে: {taka(total - num(paid))}</Text>}</View>)}
      {needCustomer && (
        <View className="gap-2.5">
          <View className="flex-row"><Pick label="কার নামে বাকি?" value={customerId} onChange={setCustomerId} placeholder="কাস্টমার বেছে নিন" options={(data?.c ?? []).map((c) => ({ value: c.id, label: c.name, sub: `বাকি ${taka(c.balance)}` }))} /></View>
          {!customerId && <View className="flex-row"><Input placeholder="অথবা নতুন কাস্টমারের নাম লিখুন" value={newName} onChangeText={setNewName} /></View>}
        </View>
      )}
      <Notice kind="err">{err}</Notice><Notice kind="ok">{msg}</Notice>

      <Card className="gap-3">
        <View className="flex-row justify-between items-center"><Text className="text-slate-500">মোট বিক্রি</Text><Text className="text-2xl font-bold">{taka(total)}</Text></View>
        <Btn title="বিক্রি যোগ করুন" icon="checkmark" variant="dark" loading={busy} onPress={submit} />
      </Card>

      {/* ---------- আজকের বিক্রি ---------- */}
      <View>
        <SectionHead title="আজকের বিক্রি" />
        <View className="gap-2.5">
          {list.map((s: any) => (
            <Card key={s.id} className="flex-row items-center gap-3">
              <IconBox name="receipt-outline" size={40} tone="slate" />
              <View className="flex-1"><Text className="font-bold text-base">{taka(s.total)}</Text><Muted>{s.customerName || 'সাধারণ'} · {timeOf(s.createdAt)}</Muted></View>
              <View className="items-end gap-1">{s.dueAmount > 0 && <Badge tone="amber" label={`বাকি ${taka(s.dueAmount)}`} />}{s.bkashAmount > 0 && <Badge tone="red" label="বিকাশ" />}</View>
            </Card>
          ))}
          {data && list.length === 0 && <Empty text="আজ এখনো কোনো বিক্রি নেই" icon="receipt-outline" />}
        </View>
      </View>
    </Page>
  );
}