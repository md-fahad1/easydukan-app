import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, Chip, confirm, Empty, errMsg, H1, Icon, Input, Muted, Notice, Page, Text, useLoad } from '@/components/ui';
import { dateOf, num, qtyFmt, taka, timeOf } from '@/lib/format';
import { r2, UNIT_BN } from '@/lib/pharma';
import { createSaleReturn, returnableSales, saleReturnsHistory } from '@/services/returns';

const DAYS: [number, string][] = [[1, 'আজ'], [7, '৭ দিন'], [30, '৩০ দিন']];
const unitOf = (u?: string | null) => (u ? UNIT_BN[u] || u : '');

export default function Returns() {
  const [tab, setTab] = useState<'new' | 'list'>('new'); const [days, setDays] = useState(7);
  const { data, err, reload } = useLoad(async () => ({ sales: await returnableSales(days), hist: await saleReturnsHistory(days) }), [days]);
  const [q, setQ] = useState(''); const [open, setOpen] = useState(''); const [qty, setQty] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('CASH'); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [e2, setE2] = useState(''); const [ok, setOk] = useState('');

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (data?.sales ?? []).filter((s) => s.items.some((i) => i.qty - i.returnedQty > 0) && (!k || (s.customerName || '').toLowerCase().includes(k) || s.items.some((i) => i.name.toLowerCase().includes(k))));
  }, [data, q]);
  const sale = data?.sales.find((s) => s.id === open);
  const left = (i: any) => r2(i.qty - i.returnedQty);
  const setItem = (i: any, v: number) => { const c = Math.min(Math.max(v, 0), left(i)); setQty((p) => ({ ...p, [i.id]: c ? String(c) : '' })); };
  const total = sale ? r2(sale.items.reduce((a, i) => a + num(qty[i.id]) * i.price, 0)) : 0;
  const dueAdj = sale && sale.customerName ? r2(Math.min(total, sale.dueLeft)) : 0;
  const refund = r2(total - dueAdj);
  const pick = (id: string) => { setOpen(open === id ? '' : id); setQty({}); setNote(''); setMethod('CASH'); setE2(''); setOk(''); };

  const submit = async () => {
    if (!sale) return;
    const items = Object.entries(qty).map(([saleItemId, v]) => ({ saleItemId, qty: num(v) })).filter((x) => x.qty > 0);
    if (!items.length) return setE2('কত ফেরত দিবেন লিখুন');
    if (!(await confirm(`মোট ${taka(total)} ফেরত নিবেন?`))) return;
    setBusy(true); setE2('');
    try { await createSaleReturn({ saleId: sale.id, items, refundMethod: method, note: note || null }); setOk(`✅ ফেরত নেওয়া হয়েছে — ${taka(total)}`); setOpen(''); setQty({}); setNote(''); reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };

  return (
    <Page onRefresh={reload}>
      <H1>বিক্রি ফেরত</H1>
      <View className="flex-row gap-2"><Chip className="flex-1 items-center" label="নতুন ফেরত" on={tab === 'new'} onPress={() => setTab('new')} /><Chip className="flex-1 items-center" label="ফেরতের তালিকা" on={tab === 'list'} onPress={() => setTab('list')} /></View>
      <View className="flex-row gap-2">{DAYS.map(([d, l]) => <Chip key={d} className="flex-1 items-center" label={l} on={days === d} onPress={() => setDays(d)} />)}</View>
      <Notice kind="ok">{ok}</Notice><Notice kind="err">{err}</Notice>

      {tab === 'new' && (
        <>
          <View className="flex-row"><Input placeholder="কাস্টমার বা পণ্যের নাম দিয়ে খুঁজুন" value={q} onChangeText={setQ} /></View>
          <View className="gap-2">
            {shown.map((s) => (
              <Card key={s.id} className="p-0 overflow-hidden">
                <Pressable onPress={() => pick(s.id)} className="p-4 flex-row justify-between gap-3 active:bg-slate-50">
                  <View className="flex-1"><Text className="font-bold" numberOfLines={1}>{s.customerName || 'নগদ কাস্টমার'}</Text><Muted>{dateOf(s.createdAt)} • {timeOf(s.createdAt)}</Muted><Muted>{s.items.map((i) => i.name).join(', ')}</Muted></View>
                  <View className="items-end"><Text className="font-bold">{taka(s.total)}</Text>{s.returnedTotal > 0 && <Text className="text-xs text-rose-500">ফেরত {taka(s.returnedTotal)}</Text>}</View>
                </Pressable>
                {open === s.id && (
                  <View className="border-t border-line bg-slate-50 p-4 gap-3">
                    {s.items.filter((i) => left(i) > 0).map((i) => (
                      <View key={i.id} className="bg-white rounded-xl border border-line p-3 gap-2">
                        <View className="flex-row justify-between"><Text className="font-semibold flex-1">{i.name}</Text><Muted>{taka(i.price)} / {unitOf(i.unit) || 'একক'}</Muted></View>
                        <Muted>ফেরত দেওয়া যাবে: {qtyFmt(left(i))} {unitOf(i.unit)}</Muted>
                        <View className="flex-row items-center gap-2">
                          <Pressable className="w-11 h-11 rounded-xl bg-slate-100 items-center justify-center" onPress={() => setItem(i, num(qty[i.id]) - 1)}><Icon name="remove" /></Pressable>
                          <View className="flex-1"><Input className="text-center py-2" keyboardType="decimal-pad" placeholder="0" value={qty[i.id] || ''} onChangeText={(v) => setItem(i, num(v))} /></View>
                          <Pressable className="w-11 h-11 rounded-xl bg-brand-50 items-center justify-center" onPress={() => setItem(i, num(qty[i.id]) + 1)}><Icon name="add" color="#047857" /></Pressable>
                          <Btn title="সব" variant="soft" small onPress={() => setItem(i, left(i))} />
                        </View>
                      </View>
                    ))}
                    {total > 0 && (
                      <Card className="gap-1">
                        <View className="flex-row justify-between"><Text>ফেরতের মোট</Text><Text className="font-bold">{taka(total)}</Text></View>
                        {dueAdj > 0 && <View className="flex-row justify-between"><Text className="text-amber-700">বাকি থেকে কমবে</Text><Text className="font-bold text-amber-700">− {taka(dueAdj)}</Text></View>}
                        {refund > 0 && <View className="flex-row justify-between"><Text className="text-rose-600">কাস্টমারকে ফেরত দিতে হবে</Text><Text className="font-bold text-rose-600">{taka(refund)}</Text></View>}
                      </Card>
                    )}
                    {refund > 0 && <View className="flex-row gap-2"><Chip label="নগদ দিলাম" on={method === 'CASH'} onPress={() => setMethod('CASH')} /><Chip label="বিকাশে দিলাম" on={method === 'BKASH'} onPress={() => setMethod('BKASH')} /></View>}
                    <View className="flex-row"><Input placeholder="কারণ (ঐচ্ছিক) — যেমন: ভুল ওষুধ" value={note} onChangeText={setNote} /></View>
                    <Notice kind="err">{e2}</Notice>
                    <Btn title={`${taka(total)} ফেরত নিন`} icon="return-down-back" disabled={total <= 0} loading={busy} onPress={submit} />
                  </View>
                )}
              </Card>
            ))}
            {shown.length === 0 && <Empty text="ফেরত দেওয়ার মতো বিক্রি নেই" />}
          </View>
        </>
      )}
      {tab === 'list' && (
        <View className="gap-2">
          {(data?.hist ?? []).map((r) => (
            <Card key={r.id} className="gap-1">
              <View className="flex-row justify-between"><Text className="font-bold flex-1">{r.customerName || 'নগদ কাস্টমার'}</Text><Text className="font-bold text-rose-600">{taka(r.total)}</Text></View>
              <Muted>{dateOf(r.createdAt)} • {timeOf(r.createdAt)}</Muted>
              <Text className="text-sm">{r.items.map((i) => `${i.name} × ${qtyFmt(i.qty)} ${unitOf(i.unit)}`.trim()).join(', ')}</Text>
              <Muted>{r.dueAdjusted > 0 ? `বাকি কমেছে ${taka(r.dueAdjusted)}` : ''}{r.dueAdjusted > 0 && r.refund > 0 ? ' • ' : ''}{r.refund > 0 ? `${r.refundMethod === 'BKASH' ? 'বিকাশে' : 'নগদ'} ফেরত ${taka(r.refund)}` : ''}</Muted>
              {r.note ? <Muted>📝 {r.note}</Muted> : null}
            </Card>
          ))}
          {data && data.hist.length === 0 && <Empty text="কোনো ফেরত নেই" />}
        </View>
      )}
    </Page>
  );
}
