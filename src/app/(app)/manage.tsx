import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ExpiryInput, parseMonth, toMonthText } from '@/components/ExpiryInput';
import { Btn, Card, Chip, confirm, Empty, errMsg, H1, Input, Muted, Notice, Page, Split, Text, useLoad } from '@/components/ui';
import { dateOf, num, qtyFmt, taka, timeOf } from '@/lib/format';
import { r2, UNIT_BN } from '@/lib/pharma';
import { deletePurchase, deleteSale, editPurchase, editSale, managePurchases, manageSales } from '@/services/edits';
import { useSession } from '@/store/session';

const DAYS: [number, string][] = [[1, 'আজ'], [7, '৭ দিন'], [30, '৩০ দিন']];
const unitOf = (u?: string | null) => (u ? UNIT_BN[u] || u : '');

export default function Manage() {
  const { isPharma: pharma } = useSession();
  const [tab, setTab] = useState<'sale' | 'purchase'>('sale'); const [days, setDays] = useState(7);
  const { data, err, reload } = useLoad(async () => (tab === 'sale' ? await manageSales(days) : await managePurchases(days)) as any[], [tab, days]);
  const [open, setOpen] = useState(''); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [e2, setE2] = useState(''); const [ok, setOk] = useState('');
  const [rows, setRows] = useState<any[]>([]); const [amount, setAmount] = useState(''); const [bkash, setBkash] = useState(''); const [due, setDue] = useState(''); const [paid, setPaid] = useState(''); const [note, setNote] = useState('');
  useEffect(() => { setOpen(''); setEditing(false); }, [tab, days]);
  const list = data ?? [];

  const toggle = (id: string) => { setOpen(open === id ? '' : id); setEditing(false); setE2(''); setOk(''); };
  const startEdit = (x: any) => {
    setE2(''); setEditing(true);
    setRows(x.items.map((i: any) => ({ ...i, qty: String(i.qty), price: String(i.price ?? ''), cost: String(i.cost ?? ''), batchNo: i.batchNo || '', expiry: toMonthText(i.expiry) })));
    setAmount(String(x.total));
    if (tab === 'sale') { setBkash(x.bkashAmount ? String(x.bkashAmount) : ''); setDue(x.dueAmount ? String(x.dueAmount) : ''); setNote(x.note || ''); } else setPaid(String(x.paid));
  };
  const upd = (i: number, patch: any) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const del = async (x: any) => {
    if (!(await confirm(`${tab === 'sale' ? 'এই বিক্রি' : 'এই মাল কেনা'} মুছে ফেলবেন?`, 'স্টক ও বাকির হিসাব আগের অবস্থায় ফিরে যাবে।', 'মুছুন'))) return;
    setBusy(true); setE2(''); setOk('');
    try { tab === 'sale' ? await deleteSale(x.id) : await deletePurchase(x.id); setOk('মুছে ফেলা হয়েছে'); setOpen(''); reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };

  const saleTotal = rows.length ? r2(rows.reduce((a, r) => a + num(r.qty) * num(r.price), 0)) : num(amount);
  const saleCash = r2(saleTotal - num(bkash) - num(due));
  const saveSale = async (x: any) => {
    setE2('');
    if (saleCash < 0) return setE2('বিকাশ + বাকি মোটের চেয়ে বেশি হয়ে গেছে');
    const live = rows.filter((r) => num(r.qty) > 0);
    if (rows.length && !live.length) return setE2('কমপক্ষে একটি আইটেম রাখুন (পুরো বিক্রি বাদ দিতে "মুছুন" চাপুন)');
    const base: any = { cashAmount: saleCash, bkashAmount: num(bkash), dueAmount: num(due), customerId: x.customerId || null, note: note || null };
    const input = pharma ? { ...base, items: live.map((r) => ({ productId: r.productId, unit: r.unit, qty: num(r.qty), price: num(r.price) })) }
      : rows.length ? { ...base, items: live.map((r) => ({ productId: r.productId, qty: num(r.qty), price: num(r.price) })) } : { ...base, amount: num(amount) };
    if (!(await confirm(`বিক্রি ${taka(saleTotal)} হিসেবে সেভ করবেন?`))) return;
    setBusy(true);
    try { await editSale(x.id, input, pharma); setOk('সংশোধন হয়েছে ✅'); setOpen(''); setEditing(false); reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };

  const purTotal = rows.length ? r2(rows.reduce((a, r) => a + num(r.qty) * num(r.cost), 0)) : num(amount);
  const savePurchase = async (x: any) => {
    setE2('');
    if (num(paid) > purTotal) return setE2('দেওয়া টাকা মোটের চেয়ে বেশি');
    const live = rows.filter((r) => num(r.qty) > 0);
    if (rows.length && !live.length) return setE2('কমপক্ষে একটি আইটেম রাখুন (পুরোটা বাদ দিতে "মুছুন" চাপুন)');
    for (const r of live) if (pharma && r.expiry && !parseMonth(r.expiry)) return setE2(`${r.name}: মেয়াদ ঠিকমতো লিখুন (যেমন 03/2027)`);
    const input: any = pharma
      ? { supplierId: x.supplierId || null, paid: num(paid), items: live.map((r) => ({ productId: r.productId, unit: r.unit, qty: num(r.qty), cost: num(r.cost), batchNo: r.batchNo || null, expiry: parseMonth(r.expiry) })) }
      : rows.length ? { supplierId: x.supplierId || null, paid: num(paid), items: live.map((r) => ({ productId: r.productId, qty: num(r.qty), cost: num(r.cost) })) } : { supplierId: x.supplierId || null, paid: num(paid), total: num(amount) };
    if (!(await confirm(`মাল কেনা ${taka(purTotal)} হিসেবে সেভ করবেন?`))) return;
    setBusy(true);
    try { await editPurchase(x.id, input, pharma); setOk('সংশোধন হয়েছে ✅'); setOpen(''); setEditing(false); reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Page onRefresh={reload}>
      <H1>সংশোধন / মুছুন</H1>
      <View className="flex-row gap-2"><Chip className="flex-1 items-center" label="বিক্রি" on={tab === 'sale'} onPress={() => setTab('sale')} /><Chip className="flex-1 items-center" label="মাল কেনা" on={tab === 'purchase'} onPress={() => setTab('purchase')} /></View>
      <View className="flex-row gap-2">{DAYS.map(([d, l]) => <Chip key={d} className="flex-1 items-center" label={l} on={days === d} onPress={() => setDays(d)} />)}</View>
      <Notice kind="ok">{ok}</Notice><Notice kind="err">{e2 || err}</Notice>
      <View className="gap-2">
        {list.map((x: any) => (
          <Card key={x.id} className="p-0 overflow-hidden">
            <Pressable onPress={() => toggle(x.id)} className="p-4 flex-row justify-between gap-3 active:bg-slate-50">
              <View className="flex-1"><Text className="font-bold" numberOfLines={1}>{tab === 'sale' ? x.customerName || 'নগদ কাস্টমার' : x.supplierName || 'কোম্পানি ছাড়া'}</Text><Muted>{dateOf(x.createdAt)} • {timeOf(x.createdAt)}</Muted><Muted>{x.items.map((i: any) => i.name).join(', ') || 'শুধু টাকার হিসাব'}</Muted></View>
              <View className="items-end"><Text className="font-bold">{taka(x.total)}</Text>{(tab === 'sale' ? x.dueAmount : x.due) > 0 && <Text className="text-xs text-amber-600">বাকি {taka(tab === 'sale' ? x.dueAmount : x.due)}</Text>}</View>
            </Pressable>
            {open === x.id && !editing && (
              <View className="border-t border-line bg-slate-50 p-4 gap-3">
                {x.items.map((i: any) => <View key={i.id} className="flex-row justify-between"><Text className="text-sm flex-1">{i.name} × {qtyFmt(i.qty)} {unitOf(i.unit)}</Text><Text className="text-sm">{taka(i.qty * (tab === 'sale' ? i.price : i.cost))}</Text></View>)}
                {tab === 'sale' && x.hasReturn && <Text className="text-sm text-rose-600">এই বিক্রিতে ফেরত আছে — মুছা বা সংশোধন করা যাবে না।</Text>}
                <Split><View className="flex-1"><Btn title="সংশোধন" icon="create" variant="outline" small disabled={busy || (tab === 'sale' && x.hasReturn)} onPress={() => startEdit(x)} /></View><View className="flex-1"><Btn title="মুছুন" icon="trash" variant="danger" small disabled={busy || (tab === 'sale' && x.hasReturn)} onPress={() => del(x)} /></View></Split>
              </View>
            )}
            {open === x.id && editing && (
              <View className="border-t border-line bg-slate-50 p-4 gap-3">
                {rows.map((r, k) => (
                  <View key={r.id} className="bg-white rounded-xl border border-line p-3 gap-2">
                    <Text className="font-semibold">{r.name} {r.unit ? <Text className="text-sm text-slate-500">({unitOf(r.unit)})</Text> : null}</Text>
                    <View className="flex-row gap-3"><Input label="পরিমাণ (০ দিলে বাদ)" keyboardType="decimal-pad" value={r.qty} onChangeText={(v) => upd(k, { qty: v })} /><Input label={tab === 'sale' ? 'বিক্রির দাম' : 'কেনা দাম'} keyboardType="decimal-pad" value={tab === 'sale' ? r.price : r.cost} onChangeText={(v) => upd(k, tab === 'sale' ? { price: v } : { cost: v })} /></View>
                    {tab === 'purchase' && pharma && <View className="flex-row gap-3"><Input label="ব্যাচ নং" value={r.batchNo} onChangeText={(v) => upd(k, { batchNo: v })} /><ExpiryInput value={r.expiry} onChange={(v) => upd(k, { expiry: v })} /></View>}
                  </View>
                ))}
                {rows.length === 0 && <View className="flex-row"><Input label="মোট টাকা" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} /></View>}
                {tab === 'sale' ? (
                  <>
                    <View className="flex-row gap-3"><Input label="বিকাশ" keyboardType="decimal-pad" value={bkash} onChangeText={setBkash} /><Input label={`বাকি ${x.customerId ? '' : '(কাস্টমার নেই)'}`} editable={!!x.customerId} keyboardType="decimal-pad" value={due} onChangeText={setDue} /></View>
                    <View className="flex-row"><Input placeholder="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} /></View>
                    <Card className="gap-1"><View className="flex-row justify-between"><Text>নতুন মোট</Text><Text className="font-bold">{taka(saleTotal)}</Text></View><View className="flex-row justify-between"><Text className="text-slate-600">নগদ (বাকিটা)</Text><Text className="font-bold">{taka(saleCash)}</Text></View></Card>
                    <Btn title="সেভ করুন" icon="checkmark" loading={busy} onPress={() => saveSale(x)} />
                  </>
                ) : (
                  <>
                    <View className="flex-row"><Input label="কত টাকা দিয়েছেন" keyboardType="decimal-pad" value={paid} onChangeText={setPaid} /></View>
                    <Card className="gap-1"><View className="flex-row justify-between"><Text>নতুন মোট</Text><Text className="font-bold">{taka(purTotal)}</Text></View><View className="flex-row justify-between"><Text className="text-amber-700">বাকি থাকবে</Text><Text className="font-bold text-amber-700">{taka(Math.max(r2(purTotal - num(paid)), 0))}</Text></View></Card>
                    <Btn title="সেভ করুন" icon="checkmark" loading={busy} onPress={() => savePurchase(x)} />
                  </>
                )}
                <Btn title="বাতিল" variant="ghost" onPress={() => setEditing(false)} />
              </View>
            )}
          </Card>
        ))}
        {data && list.length === 0 && <Empty text="কিছু পাওয়া যায়নি" />}
      </View>
    </Page>
  );
}
