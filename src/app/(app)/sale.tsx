import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Btn, Card, Chip, Chips, Empty, errMsg, H1, H2, Icon, Input, Label, Muted, Notice, Page, Pick, Text, useLoad } from '@/components/ui';
import { num, qtyFmt, taka, timeOf } from '@/lib/format';
import { createCustomer, createSale, customers, products, sales } from '@/services/shop';

type Line = { productId: string; name: string; price: number; qty: string };
const PAY: [string, string][] = [['CASH', 'নগদ'], ['BKASH', 'বিকাশ'], ['PART', 'নগদ + বাকি'], ['DUE', 'পুরো বাকি']];

export default function Sale() {
  const sp = useLocalSearchParams<{ customer?: string; due?: string }>();
  const [mode, setMode] = useState<'quick' | 'product'>('quick');
  const [amount, setAmount] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('CASH');
  const [paid, setPaid] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const { data, reload } = useLoad(async () => ({ products: await products(), customers: await customers(), sales: await sales('TODAY') }));
  const ps = data?.products ?? [], cs = data?.customers ?? [];
  useEffect(() => { if (sp.customer) { setCustomerId(sp.customer); setPay('DUE'); } else if (sp.due) setPay('DUE'); }, [sp.customer, sp.due]);

  const total = mode === 'quick' ? num(amount) : cart.reduce((a, l) => a + num(l.qty) * l.price, 0);
  const needCustomer = pay === 'DUE' || pay === 'PART';
  const found = useMemo(() => (q ? ps.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []), [q, ps]);

  const add = (p: any) => {
    setQ('');
    setCart((c) => c.find((l) => l.productId === p.id) ? c.map((l) => l.productId === p.id ? { ...l, qty: String(num(l.qty) + 1) } : l) : [...c, { productId: p.id, name: p.name, price: p.sellingPrice, qty: '1' }]);
  };
  const setQty = (id: string, v: string) => setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: v } : l)));
  const bump = (id: string, d: number) => setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: String(Math.max(0, num(l.qty) + d)) } : l)).filter((l) => num(l.qty) > 0));

  const submit = async () => {
    setErr(''); setMsg('');
    if (total <= 0) return setErr('টাকার পরিমাণ দিন');
    if (needCustomer && !customerId && !newName.trim()) return setErr('কাস্টমার বেছে নিন বা নাম লিখুন');
    let cash = 0, bkash = 0, due = 0;
    if (pay === 'CASH') cash = total; if (pay === 'BKASH') bkash = total; if (pay === 'DUE') due = total;
    if (pay === 'PART') { cash = num(paid); due = total - cash; if (due <= 0 || cash < 0) return setErr('নগদ টাকা মোট টাকার কম হতে হবে'); }
    setBusy(true);
    try {
      let cid = customerId;
      if (needCustomer && !cid) cid = await createCustomer(newName);
      const input: any = { cashAmount: cash, bkashAmount: bkash, dueAmount: due, customerId: needCustomer ? cid : null };
      if (mode === 'quick') input.amount = total; else input.items = cart.filter((l) => num(l.qty) > 0).map((l) => ({ productId: l.productId, qty: num(l.qty), price: l.price }));
      await createSale(input);
      setMsg(`বিক্রি সফল ✅ ${taka(total)}`);
      setAmount(''); setCart([]); setPaid(''); setNewName(''); setPay('CASH'); setCustomerId('');
      await reload();
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Page>
      <H1>আজকের বিক্রি</H1>
      <View className="flex-row gap-2">
        <Chip className="flex-1 items-center" label="⚡ দ্রুত বিক্রি" on={mode === 'quick'} onPress={() => setMode('quick')} />
        <Chip className="flex-1 items-center" label="📦 পণ্য দিয়ে" on={mode === 'product'} onPress={() => setMode('product')} />
      </View>

      {mode === 'quick' ? (
        <View className="flex-row"><Input label="টাকার পরিমাণ" className="text-3xl font-bold py-4" keyboardType="decimal-pad" placeholder="500" value={amount} onChangeText={setAmount} /></View>
      ) : (
        <View className="gap-2.5">
          <View className="flex-row"><Input placeholder="পণ্য খুঁজুন..." value={q} onChangeText={setQ} /></View>
          {found.map((p) => (
            <Card key={p.id} onPress={() => add(p)} className="flex-row justify-between items-center">
              <Text className="flex-1 font-semibold">{p.name}</Text><Muted>{taka(p.sellingPrice)}/{p.unit} · স্টক {qtyFmt(p.stock)}</Muted>
            </Card>
          ))}
          {ps.length === 0 && <Notice kind="info">আগে “মাল” থেকে পণ্য যোগ করুন — অথবা “দ্রুত বিক্রি” ব্যবহার করুন।</Notice>}
          {cart.map((l) => (
            <Card key={l.productId} className="gap-2">
              <View className="flex-row justify-between"><Text className="font-semibold flex-1">{l.name}</Text><Text className="font-bold">{taka(num(l.qty) * l.price)}</Text></View>
              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => bump(l.productId, -1)} className="w-11 h-11 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"><Icon name="remove" /></Pressable>
                <View className="w-24"><Input className="text-center py-2" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => setQty(l.productId, v)} /></View>
                <Pressable onPress={() => bump(l.productId, 1)} className="w-11 h-11 rounded-xl bg-brand-50 items-center justify-center active:bg-brand-100"><Icon name="add" color="#047857" /></Pressable>
                <Muted className="flex-1 text-right">{taka(l.price)} প্রতি</Muted>
              </View>
            </Card>
          ))}
          {cart.length > 0 && <Text className="text-right text-xl font-bold">মোট: {taka(total)}</Text>}
        </View>
      )}

      <View><Label>পেমেন্ট</Label><Chips>{PAY.map(([k, v]) => <Chip key={k} label={v} on={pay === k} onPress={() => setPay(k)} />)}</Chips></View>
      {pay === 'PART' && (
        <View>
          <View className="flex-row"><Input label="এখন কত টাকা নগদ নিলেন?" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>
          {total > 0 && <Text className="text-amber-600 mt-1">বাকি থাকবে: {taka(total - num(paid))}</Text>}
        </View>
      )}
      {needCustomer && (
        <View className="gap-2.5">
          <View className="flex-row"><Pick label="কার নামে বাকি?" value={customerId} onChange={setCustomerId} placeholder="কাস্টমার বেছে নিন" options={cs.map((c) => ({ value: c.id, label: c.name, sub: `বাকি ${taka(c.balance)}` }))} /></View>
          {!customerId && <View className="flex-row"><Input placeholder="অথবা নতুন কাস্টমারের নাম লিখুন" value={newName} onChangeText={setNewName} /></View>}
        </View>
      )}

      <Notice kind="err">{err}</Notice><Notice kind="ok">{msg}</Notice>
      <Btn title="বিক্রি যোগ করুন" icon="checkmark" loading={busy} onPress={submit} />

      <H2>আজকের বিক্রির তালিকা</H2>
      <View className="gap-2">
        {(data?.sales ?? []).map((s: any) => (
          <Card key={s.id} className="flex-row justify-between items-center">
            <View><Text className="font-bold text-lg">{taka(s.total)}</Text><Muted>{s.customerName || 'সাধারণ'} · {timeOf(s.createdAt)}</Muted></View>
            <View className="items-end gap-1">{s.dueAmount > 0 && <Badge tone="amber" label={`বাকি ${taka(s.dueAmount)}`} />}{s.bkashAmount > 0 && <Badge tone="red" label="বিকাশ" />}</View>
          </Card>
        ))}
        {data && data.sales.length === 0 && <Empty text="আজ এখনো কোনো বিক্রি নেই" />}
      </View>
    </Page>
  );
}
