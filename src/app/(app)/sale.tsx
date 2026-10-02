import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Badge, Btn, Card, Empty, errMsg, FONT, Icon, IconBox, IconName, Input, Label, Muted, Notice, Page, Pick, SectionHead, Text, useLoad } from '@/components/ui';
import { num, qtyFmt, taka, timeOf } from '@/lib/format';
import { createCustomer, createSale, customers, products, sales } from '@/services/shop';

type Line = { productId: string; name: string; price: number; qty: string };
const PAY: [string, string, IconName][] = [['CASH', 'নগদ', 'cash'], ['BKASH', 'বিকাশ', 'phone-portrait'], ['PART', 'নগদ + বাকি', 'git-compare'], ['DUE', 'পুরো বাকি', 'time']];
const QUICK = [100, 200, 500, 1000];

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

  const list = data?.sales ?? [];
  const todayTotal = list.reduce((a: number, s: any) => a + s.total, 0);

  return (
    <Page>
      {/* ---------- মোড বদলের সুইচ ---------- */}
      <View className="flex-row bg-white rounded-full p-1 border border-line">
        {([['quick', 'দ্রুত বিক্রি', 'flash'], ['product', 'পণ্য দিয়ে', 'cube']] as const).map(([k, l, ic]) => (
          <Pressable key={k} onPress={() => setMode(k)} className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-full ${mode === k ? 'bg-slate-900' : ''}`}>
            <Icon name={ic} size={17} color={mode === k ? '#fff' : '#94A3B8'} />
            <Text className={`text-sm ${mode === k ? 'text-white font-bold' : 'text-slate-500'}`}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'quick' ? (
        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <IconBox name="cash" size={32} tone="brand" />
            <Text className="text-slate-500 text-sm">টাকার পরিমাণ</Text>
          </View>
          <View className="flex-row items-center">
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
        </Card>
      ) : (
        <View className="gap-2.5">
          <View className="flex-row"><Input placeholder="পণ্য খুঁজুন..." value={q} onChangeText={setQ} /></View>
          {found.map((p) => (
            <Card key={p.id} onPress={() => add(p)} className="flex-row items-center gap-3">
              <IconBox name="cube-outline" size={40} tone="brand" />
              <View className="flex-1"><Text className="font-semibold">{p.name}</Text><Muted>স্টক {qtyFmt(p.stock)} {p.unit}</Muted></View>
              <Text className="font-bold text-brand-700">{taka(p.sellingPrice)}</Text>
            </Card>
          ))}
          {ps.length === 0 && <Notice kind="info">আগে “মাল” থেকে পণ্য যোগ করুন — অথবা “দ্রুত বিক্রি” ব্যবহার করুন।</Notice>}
          {cart.map((l) => (
            <Card key={l.productId} className="gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="font-semibold flex-1">{l.name}</Text>
                <Text className="font-bold text-base">{taka(num(l.qty) * l.price)}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => bump(l.productId, -1)} className="w-11 h-11 rounded-full bg-canvas items-center justify-center active:bg-slate-200"><Icon name="remove" /></Pressable>
                <View className="w-24"><Input className="text-center py-2" keyboardType="decimal-pad" value={l.qty} onChangeText={(v) => setQty(l.productId, v)} /></View>
                <Pressable onPress={() => bump(l.productId, 1)} className="w-11 h-11 rounded-full bg-slate-900 items-center justify-center active:bg-black"><Icon name="add" color="#fff" /></Pressable>
                <Muted className="flex-1 text-right">{taka(l.price)} প্রতি</Muted>
              </View>
            </Card>
          ))}
        </View>
      )}

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
      {pay === 'PART' && (
        <View>
          <View className="flex-row"><Input label="এখন কত টাকা নগদ নিলেন?" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>
          {total > 0 && <Text className="text-amber-600 mt-1 text-sm">বাকি থাকবে: {taka(total - num(paid))}</Text>}
        </View>
      )}
      {needCustomer && (
        <View className="gap-2.5">
          <View className="flex-row"><Pick label="কার নামে বাকি?" value={customerId} onChange={setCustomerId} placeholder="কাস্টমার বেছে নিন" options={cs.map((c) => ({ value: c.id, label: c.name, sub: `বাকি ${taka(c.balance)}` }))} /></View>
          {!customerId && <View className="flex-row"><Input placeholder="অথবা নতুন কাস্টমারের নাম লিখুন" value={newName} onChangeText={setNewName} /></View>}
        </View>
      )}

      <Notice kind="err">{err}</Notice><Notice kind="ok">{msg}</Notice>

      {/* ---------- মোট + বাটন ---------- */}
      <Card className="gap-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500">মোট বিক্রি</Text>
          <Text className="text-2xl font-bold">{taka(total)}</Text>
        </View>
        <Btn title="বিক্রি যোগ করুন" icon="checkmark" variant="dark" loading={busy} onPress={submit} />
      </Card>

      {/* ---------- আজকের তালিকা ---------- */}
      <View>
        <SectionHead title="আজকের বিক্রির তালিকা" />
        <View className="gap-2.5">
          {list.map((s: any) => (
            <Card key={s.id} className="flex-row items-center gap-3">
              <IconBox name="receipt-outline" size={40} tone="slate" />
              <View className="flex-1">
                <Text className="font-bold text-base">{taka(s.total)}</Text>
                <Muted>{s.customerName || 'সাধারণ'} · {timeOf(s.createdAt)}</Muted>
              </View>
              <View className="items-end gap-1">
                {s.dueAmount > 0 && <Badge tone="amber" label={`বাকি ${taka(s.dueAmount)}`} />}
                {s.bkashAmount > 0 && <Badge tone="red" label="বিকাশ" />}
              </View>
            </Card>
          ))}
          {data && list.length === 0 && <Empty text="আজ এখনো কোনো বিক্রি নেই" icon="receipt-outline" />}
          {list.length > 0 && <Text className="text-right text-sm text-slate-500">আজ মোট {taka(todayTotal)}</Text>}
        </View>
      </View>
    </Page>
  );
}