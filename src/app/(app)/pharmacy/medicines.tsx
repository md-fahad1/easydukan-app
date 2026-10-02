import { Link } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import BarcodeScanner from '@/components/BarcodeScanner';
import { ExpiryInput, parseMonth } from '@/components/ExpiryInput';
import { Btn, Card, Chip, Chips, Empty, errMsg, Icon, IconBox, Input, Label, Muted, Notice, Page, SectionHead, Split, Text, useLoad } from '@/components/ui';
import { CatalogItem, fromCatalog, searchCatalog, warmCatalog } from '@/lib/catalog';
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

  // ---- নাম লিখলে বাংলাদেশের ওষুধের তালিকা থেকে সাজেশন (ফোনের ভেতরেই, ইন্টারনেট লাগে না) ----
  const [picked, setPicked] = useState('');
  const nm = f.name.trim();
  const sugg = useMemo(() => (editId || nm.length < 2 || nm === picked ? [] : searchCatalog(nm, 8)), [nm, editId, picked]);
  useEffect(() => { if (show && !editId) warmCatalog(); }, [show, editId]);
  const pick = (c: CatalogItem) => {
    const x = fromCatalog(c);
    setPicked(x.name);
    setF((p: any) => ({ ...p, name: x.name, genericName: x.genericName, company: x.company, form: x.form, piecesPerStrip: x.plain ? (p.piecesPerStrip === '1' ? '10' : p.piecesPerStrip) : '1' }));
    Keyboard.dismiss();
  };

  const pack = { form: f.form, piecesPerStrip: f.form === 'SYRUP' ? 1 : num(f.piecesPerStrip) || 1, stripsPerBox: num(f.stripsPerBox) || 1 };
  const units = unitsFor(pack);
  const unit = units.some((u) => u[0] === f.unit) ? f.unit : 'PIECE';

  const startEdit = (m: any) => {
    const u = unitsFor(m)[0][0]; const fc = unitFactor(m, u);
    setEditId(m.id);
    setF({ ...empty, name: m.name, genericName: m.genericName || '', company: m.company || '', form: m.form === 'GENERAL' ? 'OTHER' : m.form, barcode: m.barcode || '', piecesPerStrip: String(m.piecesPerStrip), stripsPerBox: String(m.stripsPerBox), unit: u, sellPrice: String(r2(m.sellingPrice * fc)), buyPrice: String(r2(m.purchasePrice * fc)), minQty: m.minStock ? String(r2(m.minStock / fc)) : '' });
    setShow(true);
  };
  const reset = () => { setF(empty); setEditId(''); setShow(false); setE2(''); setPicked(''); };

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

      <Card className="flex-row items-center gap-3">
        <IconBox name="medkit" size={42} tone="brand" />
        <View className="flex-1"><Text className="text-slate-500 text-xs">মোট ওষুধ</Text><Text className="text-2xl font-bold">{list.length}টি</Text></View>
      </Card>

      <Split>
        <View className="flex-1"><Link href="/pharmacy/purchase" asChild><Btn title="মাল কেনা" icon="cube" variant="dark" small /></Link></View>
        <View className="flex-1"><Btn title={show ? 'বন্ধ করুন' : 'নতুন ওষুধ'} icon={show ? 'close' : 'add'} variant="outline" small onPress={() => (show ? reset() : setShow(true))} /></View>
      </Split>

      {show && (
        <Card className="gap-3">
          <Text className="font-bold text-lg">{editId ? 'ওষুধ এডিট' : 'নতুন ওষুধ'}</Text>
          <View className="flex-row"><Input placeholder="ওষুধের নাম লিখুন (যেমন: napa, seclo, ace)" value={f.name} onChangeText={(v) => { set('name', v); setPicked(''); }} /></View>
          {sugg.length > 0 && (
            <View className="bg-white border border-line rounded-2xl overflow-hidden">
              {sugg.map((c, i) => (
                <Pressable key={c.id} onPress={() => pick(c)} className={`px-3 py-2.5 active:bg-slate-100 ${i < sugg.length - 1 ? 'border-b border-line' : ''}`}>
                  <Text className="font-bold">{c.brand} {c.strength}</Text>
                  <Muted>{[c.dosage, c.genericName, c.company].filter(Boolean).join(' • ')}</Muted>
                </Pressable>
              ))}
            </View>
          )}
          <View className="flex-row"><Input placeholder="জেনেরিক নাম (ঐচ্ছিক)" value={f.genericName} onChangeText={(v) => set('genericName', v)} /></View>
          <View className="flex-row"><Input placeholder="কোম্পানি (ঐচ্ছিক)" value={f.company} onChangeText={(v) => set('company', v)} /></View>
          <Chips>{FORMS.map(([k, v]) => <Chip key={k} label={v} on={f.form === k} onPress={() => set('form', k)} />)}</Chips>
          <View className="flex-row gap-3">
            {f.form !== 'SYRUP' && <Input label="১ পাতায় কত পিস?" keyboardType="number-pad" value={f.piecesPerStrip} onChangeText={(v) => set('piecesPerStrip', v)} />}
            <Input label={f.form === 'SYRUP' ? '১ বক্সে কত বোতল?' : '১ বক্সে কত পাতা?'} keyboardType="number-pad" value={f.stripsPerBox} onChangeText={(v) => set('stripsPerBox', v)} />
          </View>
          <Muted>১ বক্স = {boxSize(pack)} {f.form === 'SYRUP' ? 'বোতল' : 'পিস'}</Muted>
          <View className="flex-row gap-2.5 items-end">
            <Input label="বারকোড (ঐচ্ছিক)" value={f.barcode} onChangeText={(v) => set('barcode', v)} />
            <Pressable onPress={() => setScan('form')} className="w-[52px] h-[52px] rounded-full bg-slate-900 items-center justify-center active:bg-black"><Icon name="barcode-outline" size={26} color="#fff" /></Pressable>
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
          <Btn title="সেভ করুন" icon="checkmark" variant="dark" loading={busy} onPress={save} />
        </Card>
      )}

      <View className="flex-row gap-2.5 items-center">
        <Input placeholder="নাম / জেনেরিক / কোম্পানি / বারকোড" value={q} onChangeText={setQ} />
        <Pressable onPress={() => setScan('search')} className="w-[52px] h-[52px] rounded-full bg-slate-900 items-center justify-center active:bg-black"><Icon name="barcode-outline" size={26} color="#fff" /></Pressable>
      </View>
      <View className="flex-row"><Chip label="শুধু কম স্টক" on={onlyLow} onPress={() => setOnlyLow(!onlyLow)} /></View>
      {!show && <Notice kind="err">{err}</Notice>}

      <View>
        <SectionHead title="সব ওষুধ" />
        <View className="gap-2.5">
          {shown.map((m) => {
            const low = m.minStock > 0 && m.stock <= m.minStock;
            return (
              <Card key={m.id} onPress={() => startEdit(m)} className="flex-row items-center gap-3">
                <IconBox name="medkit-outline" size={40} tone={low ? 'red' : 'slate'} />
                <View className="flex-1 gap-0.5">
                  <Text className="font-bold" numberOfLines={1}>{m.name}</Text>
                  <Muted>{[m.genericName, m.company].filter(Boolean).join(' · ') || '—'}</Muted>
                  <Text className="text-xs text-slate-500">{unitsFor(m).map(([k, l]) => `${l} ${taka(r2(m.sellingPrice * unitFactor(m, k)))}`).join(' · ')}</Text>
                </View>
                <View className="items-end">
                  <Text className={`font-bold ${low ? 'text-rose-600' : ''}`}>{fmtStock(m.stock, m)}</Text>
                  {low && <Text className="text-xs text-rose-600">কম স্টক</Text>}
                </View>
              </Card>
            );
          })}
          {data && shown.length === 0 && <Empty text="কোনো ওষুধ পাওয়া যায়নি" icon="medkit-outline" />}
        </View>
      </View>
    </Page>
  );
}