import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { ExpiryInput, parseMonth } from '@/components/ExpiryInput';
import { Btn, Card, Chip, Chips, Empty, errMsg, H1, Icon, Input, Label, Muted, Notice, Page, Split, Text, useLoad } from '@/components/ui';
import { num, taka } from '@/lib/format';
import { boxSize, fmtStock, r2, unitFactor, unitsFor } from '@/lib/pharma';
import { saveMedicine } from '@/services/pharmacy';
import { products } from '@/services/shop';

const FORMS: [string, string][] = [['TABLET', 'ট্যাবলেট'], ['CAPSULE', 'ক্যাপসুল'], ['SYRUP', 'সিরাপ'], ['INJECTION', 'ইনজেকশন'], ['OTHER', 'অন্যান্য']];
const empty = { name: '', genericName: '', company: '', form: 'TABLET', barcode: '', piecesPerStrip: '10', stripsPerBox: '10', unit: 'BOX', sellPrice: '', buyPrice: '', minQty: '', openBoxes: '', openStrips: '', openPieces: '', openExpiry: '', openBatchNo: '' };

export default function Medicines() {
  const { data, err, reload } = useLoad(() => products());
  const [f, setF] = useState<any>(empty); const [editId, setEditId] = useState(''); const [show, setShow] = useState(false); const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false); const [scan, setScan] = useState<'' | 'form' | 'search'>(''); const [e2, setE2] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const list = data ?? [];

  const pack = { form: f.form, piecesPerStrip: f.form === 'SYRUP' ? 1 : num(f.piecesPerStrip) || 1, stripsPerBox: num(f.stripsPerBox) || 1 };
  const units = unitsFor(pack);
  const unit = units.some((u) => u[0] === f.unit) ? f.unit : 'PIECE';

  const startEdit = (m: any) => {
    const u = unitsFor(m)[0][0]; const fc = unitFactor(m, u);
    setEditId(m.id);
    setF({ ...empty, name: m.name, genericName: m.genericName || '', company: m.company || '', form: m.form === 'GENERAL' ? 'OTHER' : m.form, barcode: m.barcode || '', piecesPerStrip: String(m.piecesPerStrip), stripsPerBox: String(m.stripsPerBox), unit: u, sellPrice: String(r2(m.sellingPrice * fc)), buyPrice: String(r2(m.purchasePrice * fc)), minQty: m.minStock ? String(r2(m.minStock / fc)) : '' });
    setShow(true);
  };
  const reset = () => { setF(empty); setEditId(''); setShow(false); setE2(''); };

  const save = async () => {
    setE2('');
    if (!f.name.trim()) return setE2('ওষুধের নাম দিন');
    if (!editId && f.openExpiry && !parseMonth(f.openExpiry)) return setE2('মেয়াদ ঠিকমতো লিখুন (যেমন: 03/2027)');
    setBusy(true);
    try {
      const input: any = { name: f.name, genericName: f.genericName || null, company: f.company || null, form: f.form, barcode: f.barcode || null, piecesPerStrip: pack.piecesPerStrip, stripsPerBox: pack.stripsPerBox, priceUnit: unit, sellPrice: num(f.sellPrice), buyPrice: num(f.buyPrice), minQty: num(f.minQty) };
      if (!editId) Object.assign(input, { openBoxes: num(f.openBoxes), openStrips: num(f.openStrips), openPieces: num(f.openPieces), openExpiry: parseMonth(f.openExpiry), openBatchNo: f.openBatchNo || null });
      await saveMedicine(editId || null, input);
      reset(); await reload();
    } catch (e) { setE2(errMsg(e)); }
    setBusy(false);
  };
  const onScan = (code: string) => { if (scan === 'form') set('barcode', code); else setQ(code); setScan(''); };
  const shown = list.filter((m) => (!onlyLow || (m.minStock > 0 && m.stock <= m.minStock))).filter((m) => { const s = q.toLowerCase(); return !s || m.name.toLowerCase().includes(s) || (m.genericName || '').toLowerCase().includes(s) || (m.company || '').toLowerCase().includes(s) || (m.barcode || '') === q; });

  return (
    <Page onRefresh={reload}>
      {scan ? <BarcodeScanner onScan={onScan} onClose={() => setScan('')} /> : null}
      <H1>ওষুধের তালিকা</H1>
      <Split>
        <View className="flex-1"><Link href="/pharmacy/purchase" asChild><Btn title="মাল কেনা" icon="cube" small /></Link></View>
        <View className="flex-1"><Btn title={show ? 'বন্ধ করুন' : 'নতুন ওষুধ'} icon={show ? 'close' : 'add'} variant="outline" small onPress={() => (show ? reset() : setShow(true))} /></View>
      </Split>
      {show && (
        <Card className="gap-3">
          <Text className="font-bold text-lg">{editId ? 'ওষুধ এডিট' : 'নতুন ওষুধ'}</Text>
          <View className="flex-row"><Input placeholder="ওষুধের নাম (যেমন: Napa 500mg)" value={f.name} onChangeText={(v) => set('name', v)} /></View>
          <View className="flex-row"><Input placeholder="জেনেরিক নাম (ঐচ্ছিক)" value={f.genericName} onChangeText={(v) => set('genericName', v)} /></View>
          <View className="flex-row"><Input placeholder="কোম্পানি (ঐচ্ছিক)" value={f.company} onChangeText={(v) => set('company', v)} /></View>
          <Chips>{FORMS.map(([k, v]) => <Chip key={k} label={v} on={f.form === k} onPress={() => set('form', k)} />)}</Chips>
          <View className="flex-row gap-3">
            {f.form !== 'SYRUP' && <Input label="১ পাতায় কত পিস?" keyboardType="number-pad" value={f.piecesPerStrip} onChangeText={(v) => set('piecesPerStrip', v)} />}
            <Input label={f.form === 'SYRUP' ? '১ বক্সে কত বোতল?' : '১ বক্সে কত পাতা?'} keyboardType="number-pad" value={f.stripsPerBox} onChangeText={(v) => set('stripsPerBox', v)} />
          </View>
          <Muted>১ বক্স = {boxSize(pack)} {f.form === 'SYRUP' ? 'বোতল' : 'পিস'}</Muted>
          <View className="flex-row gap-2 items-end">
            <Input label="বারকোড (ঐচ্ছিক)" value={f.barcode} onChangeText={(v) => set('barcode', v)} />
            <Pressable onPress={() => setScan('form')} className="w-14 h-[54px] rounded-xl bg-brand-600 items-center justify-center"><Icon name="barcode-outline" size={28} color="#fff" /></Pressable>
          </View>
          <View><Label>নিচের দাম ও কমপক্ষে স্টক কিসের হিসাবে?</Label><Chips>{units.map(([k, v]) => <Chip key={k} label={`প্রতি ${v}`} on={unit === k} onPress={() => set('unit', k)} />)}</Chips></View>
          <View className="flex-row gap-3"><Input label="বিক্রয় মূল্য" keyboardType="decimal-pad" value={f.sellPrice} onChangeText={(v) => set('sellPrice', v)} /><Input label="ক্রয় মূল্য" keyboardType="decimal-pad" value={f.buyPrice} onChangeText={(v) => set('buyPrice', v)} /></View>
          <View className="flex-row"><Input label="কমপক্ষে স্টক (এর নিচে গেলে সতর্ক করবে)" keyboardType="decimal-pad" value={f.minQty} onChangeText={(v) => set('minQty', v)} /></View>
          {!editId && (
            <View className="gap-3 border-t border-line pt-3">
              <Text className="font-semibold">এখন দোকানে কত স্টক আছে? (ঐচ্ছিক)</Text>
              <View className="flex-row gap-2"><Input placeholder="বক্স" keyboardType="decimal-pad" value={f.openBoxes} onChangeText={(v) => set('openBoxes', v)} /><Input placeholder="পাতা" keyboardType="decimal-pad" value={f.openStrips} onChangeText={(v) => set('openStrips', v)} /><Input placeholder="পিস" keyboardType="decimal-pad" value={f.openPieces} onChangeText={(v) => set('openPieces', v)} /></View>
              <View className="flex-row gap-3"><ExpiryInput value={f.openExpiry} onChange={(v) => set('openExpiry', v)} /><Input label="ব্যাচ নং" value={f.openBatchNo} onChangeText={(v) => set('openBatchNo', v)} /></View>
            </View>
          )}
          <Notice kind="err">{e2}</Notice>
          <Btn title="সেভ করুন" icon="checkmark" loading={busy} onPress={save} />
        </Card>
      )}
      <View className="flex-row gap-2 items-end">
        <Input placeholder="নাম / জেনেরিক / কোম্পানি / বারকোড" value={q} onChangeText={setQ} />
        <Pressable onPress={() => setScan('search')} className="w-14 h-[54px] rounded-xl bg-brand-600 items-center justify-center"><Icon name="barcode-outline" size={28} color="#fff" /></Pressable>
      </View>
      <View className="flex-row"><Chip label="⚠️ শুধু কম স্টক" on={onlyLow} onPress={() => setOnlyLow(!onlyLow)} /></View>
      {!show && <Notice kind="err">{err}</Notice>}
      <View className="gap-2">
        {shown.map((m) => {
          const low = m.minStock > 0 && m.stock <= m.minStock;
          return (
            <Card key={m.id} onPress={() => startEdit(m)} className="gap-1">
              <View className="flex-row justify-between gap-2">
                <View className="flex-1"><Text className="font-bold">{m.name}</Text><Muted>{[m.genericName, m.company].filter(Boolean).join(' · ')}</Muted></View>
                <View className="items-end"><Text className={`font-bold ${low ? 'text-rose-600' : ''}`}>{fmtStock(m.stock, m)}</Text>{low && <Text className="text-xs text-rose-600">⚠️ কম স্টক</Text>}</View>
              </View>
              <Text className="text-sm text-slate-600">{unitsFor(m).map(([k, l]) => `${l} ${taka(r2(m.sellingPrice * unitFactor(m, k)))}`).join(' · ')}</Text>
            </Card>
          );
        })}
        {data && shown.length === 0 && <Empty text="কোনো ওষুধ পাওয়া যায়নি" icon="medkit-outline" />}
      </View>
    </Page>
  );
}
