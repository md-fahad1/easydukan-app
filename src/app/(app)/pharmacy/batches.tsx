import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Btn, Card, Chip, confirm, Empty, errMsg, H1, Input, Muted, Notice, Page, Split, Text, useLoad } from '@/components/ui';
import { dateFull, taka } from '@/lib/format';
import { DAY } from '@/lib/dates';
import { fmtStock } from '@/lib/pharma';
import { batchStock, discardBatch } from '@/services/pharmacy';

const SOON = 90;
const FILTERS: [string, string][] = [['ALL', 'সব'], ['SOON', 'মেয়াদ কাছে'], ['EXPIRED', 'মেয়াদোত্তীর্ণ'], ['LOW', 'কম স্টক']];
const daysLeft = (e?: number | null) => (e ? Math.ceil((e - Date.now()) / DAY) : null);
function tone(d: number | null): { tone: 'gray' | 'red' | 'amber' | 'green'; t: string } {
  if (d === null) return { tone: 'gray', t: 'মেয়াদ নেই' };
  if (d < 0) return { tone: 'red', t: `${-d} দিন আগে শেষ` };
  if (d <= 30) return { tone: 'red', t: `${d} দিন বাকি` };
  if (d <= SOON) return { tone: 'amber', t: `${d} দিন বাকি` };
  return { tone: 'green', t: `${d} দিন বাকি` };
}
import { bn } from '@/lib/format';

export default function Batches() {
  const { data, err, reload } = useLoad(() => batchStock());
  const [q, setQ] = useState(''); const [filter, setFilter] = useState('ALL'); const [open, setOpen] = useState('');
  const [busy, setBusy] = useState(false); const [e2, setE2] = useState(''); const [ok, setOk] = useState('');

  const rows = useMemo(() => (data ?? []).map((p) => {
    const bs = p.batches.map((b) => ({ ...b, d: daysLeft(b.expiry) }));
    const expiredQty = bs.filter((b) => b.d !== null && b.d < 0).reduce((a, b) => a + b.qty, 0);
    const soonQty = bs.filter((b) => b.d !== null && b.d >= 0 && b.d <= SOON).reduce((a, b) => a + b.qty, 0);
    const nearest = bs.reduce<number | null>((m, b) => (b.d !== null && (m === null || b.d < m) ? b.d : m), null);
    return { ...p, bs, expiredQty, soonQty, nearest, low: p.minStock > 0 && p.stock <= p.minStock };
  }), [data]);

  const sum = useMemo(() => {
    let cost = 0, sale = 0, expiredCost = 0, soonCount = 0, expiredCount = 0;
    for (const p of rows) { cost += p.stock * p.purchasePrice; sale += p.stock * p.sellingPrice; for (const b of p.bs) { if (b.d !== null && b.d < 0) { expiredCost += b.qty * b.cost; expiredCount++; } else if (b.d !== null && b.d <= SOON) soonCount++; } }
    return { cost, sale, expiredCost, soonCount, expiredCount };
  }, [rows]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    let r = rows.filter((p) => p.stock > 0 || p.bs.length > 0 || filter === 'LOW');
    if (k) r = r.filter((p) => p.name.toLowerCase().includes(k) || (p.genericName || '').toLowerCase().includes(k) || (p.company || '').toLowerCase().includes(k) || p.bs.some((b) => (b.batchNo || '').toLowerCase().includes(k)));
    if (filter === 'SOON') r = r.filter((p) => p.soonQty > 0).sort((a, b) => (a.nearest ?? 9999) - (b.nearest ?? 9999));
    if (filter === 'EXPIRED') r = r.filter((p) => p.expiredQty > 0);
    if (filter === 'LOW') r = r.filter((p) => p.low);
    return r;
  }, [rows, q, filter]);

  const discard = async (p: any, b: any) => {
    if (!(await confirm(`${p.name} (ব্যাচ ${b.batchNo || '—'})`, `${fmtStock(b.qty, p)} স্টক থেকে বাদ দিবেন?`, 'বাদ দিন'))) return;
    setBusy(true); setE2(''); setOk('');
    try { await discardBatch(b.id); setOk('ব্যাচ স্টক থেকে বাদ দেওয়া হয়েছে'); await reload(); } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };
  const Box = ({ l, v, c = '', bg = '' }: any) => <Card className={`flex-1 ${bg}`}><Muted>{l}</Muted><Text className={`text-xl font-bold ${c}`}>{v}</Text></Card>;

  return (
    <Page onRefresh={reload}>
      <H1>ব্যাচ অনুযায়ী স্টক</H1>
      <Split><Box l="স্টকের দাম (কেনা)" v={taka(sum.cost)} /><Box l="স্টকের দাম (বিক্রি)" v={taka(sum.sale)} c="text-emerald-700" /></Split>
      <Split><Box l="মেয়াদোত্তীর্ণ মাল" v={taka(sum.expiredCost)} c="text-rose-700" bg="bg-rose-50 border-rose-200" /><Box l={`${bn(SOON)} দিনে শেষ`} v={`${bn(sum.soonCount)} ব্যাচ`} c="text-amber-700" bg="bg-amber-50 border-amber-200" /></Split>
      <View className="flex-row"><Input placeholder="ওষুধ, কোম্পানি, জেনেরিক বা ব্যাচ নং" value={q} onChangeText={setQ} /></View>
      <View className="flex-row flex-wrap gap-2">{FILTERS.map(([k, l]) => <Chip key={k} label={l} on={filter === k} onPress={() => setFilter(k)} />)}</View>
      <Notice kind="ok">{ok}</Notice><Notice kind="err">{e2 || err}</Notice>
      <View className="gap-2">
        {shown.map((p) => (
          <Card key={p.id} className="p-0 overflow-hidden">
            <Pressable onPress={() => setOpen(open === p.id ? '' : p.id)} className="p-4 flex-row justify-between gap-3 active:bg-slate-50">
              <View className="flex-1 gap-1">
                <Text className="font-bold" numberOfLines={1}>{p.name}</Text><Muted>{[p.company, p.genericName].filter(Boolean).join(' • ') || '—'}</Muted>
                <View className="flex-row flex-wrap gap-1">{p.expiredQty > 0 && <Badge tone="red" label="মেয়াদোত্তীর্ণ" />}{p.soonQty > 0 && <Badge tone="amber" label="মেয়াদ কাছে" />}{p.low && <Badge tone="orange" label="কম স্টক" />}</View>
              </View>
              <View className="items-end"><Text className="font-bold">{fmtStock(p.stock, p)}</Text><Muted>{bn(p.bs.length)} ব্যাচ</Muted></View>
            </Pressable>
            {open === p.id && (
              <View className="border-t border-line bg-slate-50 p-3 gap-2">
                {p.bs.map((b) => {
                  const t = tone(b.d);
                  return (
                    <View key={b.id} className="bg-white rounded-xl border border-line p-3 gap-2">
                      <View className="flex-row justify-between"><Text className="font-semibold">ব্যাচ: {b.batchNo || '—'}</Text><Badge tone={t.tone} label={t.t} /></View>
                      <View className="flex-row justify-between"><Muted>মেয়াদ</Muted><Text className="text-sm">{b.expiry ? dateFull(b.expiry) : '—'}</Text></View>
                      <View className="flex-row justify-between"><Muted>পরিমাণ</Muted><Text className="text-sm font-bold">{fmtStock(b.qty, p)}</Text></View>
                      <View className="flex-row justify-between"><Muted>কেনা দামে মোট</Muted><Text className="text-sm">{taka(b.qty * b.cost)}</Text></View>
                      <View className="flex-row justify-between"><Muted>এসেছে</Muted><Text className="text-sm">{dateFull(b.receivedAt)}</Text></View>
                      {b.d !== null && b.d < 0 && <Btn title="স্টক থেকে বাদ দিন" icon="trash" variant="danger" small disabled={busy} onPress={() => discard(p, b)} />}
                    </View>
                  );
                })}
                {p.bs.length === 0 && <Muted>কোনো ব্যাচ নেই (স্টক: {fmtStock(p.stock, p)})</Muted>}
                <Muted>বিক্রির সময় যে ব্যাচের মেয়াদ আগে শেষ হবে সেটা আগে কাটা হয়।</Muted>
              </View>
            )}
          </Card>
        ))}
        {data && shown.length === 0 && <Empty text="কিছু পাওয়া যায়নি" />}
      </View>
    </Page>
  );
}
