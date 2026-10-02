import { Link } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Btn, Card, Empty, errMsg, IconBox, Input, Muted, Notice, Page, SectionHead, Split, Text, useLoad } from '@/components/ui';
import { num, qtyFmt, taka } from '@/lib/format';
import { createProduct, products } from '@/services/shop';

const empty = { name: '', unit: 'pcs', purchasePrice: '', sellingPrice: '', stock: '', minStock: '' };
export default function Mal() {
  const { data, err, reload } = useLoad(() => products());
  const [f, setF] = useState<any>(empty); const [show, setShow] = useState(false); const [e2, setE2] = useState(''); const [q, setQ] = useState('');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const list = data ?? [];
  const low = list.filter((p) => p.minStock > 0 && p.stock <= p.minStock);
  const shown = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const add = async () => {
    setE2('');
    try {
      await createProduct({ name: f.name, unit: f.unit || 'pcs', purchasePrice: num(f.purchasePrice), sellingPrice: num(f.sellingPrice), stock: num(f.stock), minStock: num(f.minStock) });
      setF(empty); setShow(false); reload();
    } catch (e) { setE2(errMsg(e)); }
  };
  return (
    <Page onRefresh={reload}>
      {/* ---------- সারসংক্ষেপ ---------- */}
      <Card className="flex-row items-center gap-3">
        <IconBox name="cube" size={42} tone="brand" />
        <View className="flex-1">
          <Text className="text-slate-500 text-xs">মোট পণ্য</Text>
          <Text className="text-2xl font-bold">{list.length}টি</Text>
        </View>
        {low.length > 0 && <Badge tone="amber" label={`${low.length}টি কমে গেছে`} />}
      </Card>

      <Split>
        <View className="flex-1"><Link href="/purchase" asChild><Btn title="মাল কেনা" icon="cube" variant="dark" small /></Link></View>
        <View className="flex-1"><Btn title={show ? 'বন্ধ' : 'নতুন পণ্য'} icon={show ? 'close' : 'add'} variant="outline" small onPress={() => setShow(!show)} /></View>
      </Split>

      {show && (
        <Card className="gap-3">
          <Text className="font-bold">নতুন পণ্য</Text>
          <View className="flex-row"><Input placeholder="পণ্যের নাম (যেমন: চাল)" value={f.name} onChangeText={(v) => set('name', v)} /></View>
          <View className="flex-row"><Input placeholder="একক (kg, pcs, লিটার)" value={f.unit} onChangeText={(v) => set('unit', v)} /></View>
          <Split><Input placeholder="ক্রয় মূল্য" keyboardType="decimal-pad" value={f.purchasePrice} onChangeText={(v) => set('purchasePrice', v)} /><Input placeholder="বিক্রয় মূল্য" keyboardType="decimal-pad" value={f.sellingPrice} onChangeText={(v) => set('sellingPrice', v)} /></Split>
          <Split><Input placeholder="বর্তমান স্টক" keyboardType="decimal-pad" value={f.stock} onChangeText={(v) => set('stock', v)} /><Input placeholder="কমপক্ষে স্টক" keyboardType="decimal-pad" value={f.minStock} onChangeText={(v) => set('minStock', v)} /></Split>
          <Notice kind="err">{e2}</Notice>
          <Btn title="সেভ করুন" onPress={add} />
        </Card>
      )}
      <Notice kind="err">{err}</Notice>

      {low.length > 0 && (
        <Card className="gap-2.5 bg-amber-50 border-amber-100">
          <View className="flex-row items-center gap-2.5">
            <IconBox name="warning" size={34} tone="amber" />
            <Text className="font-bold text-base">কমে যাওয়া পণ্য — {low.length}টি</Text>
          </View>
          {low.map((p) => (
            <View key={p.id} className="flex-row justify-between">
              <Text className="text-sm text-slate-700 flex-1">{p.name}</Text>
              <Text className="text-sm font-semibold text-amber-700">{qtyFmt(p.stock)} {p.unit} (কমপক্ষে {qtyFmt(p.minStock)})</Text>
            </View>
          ))}
        </Card>
      )}

      <View>
        <SectionHead title="সব পণ্য" />
        {list.length > 6 && <View className="flex-row mb-2.5"><Input placeholder="পণ্য খুঁজুন..." value={q} onChangeText={setQ} /></View>}
        <View className="gap-2.5">
          {shown.map((p) => {
            const isLow = p.minStock > 0 && p.stock <= p.minStock;
            return (
              <Card key={p.id} className="flex-row items-center gap-3">
                <IconBox name="cube-outline" size={40} tone={isLow ? 'red' : 'slate'} />
                <View className="flex-1"><Text className="font-bold" numberOfLines={1}>{p.name}</Text><Muted>কেনা {taka(p.purchasePrice)} · বিক্রি {taka(p.sellingPrice)}</Muted></View>
                <View className="items-end">
                  <Text className={`font-bold text-base ${isLow ? 'text-rose-600' : ''}`}>{qtyFmt(p.stock)}</Text>
                  <Text className="text-xs text-slate-400">{p.unit}</Text>
                </View>
              </Card>
            );
          })}
          {list.length === 0 && <Empty text="এখনো কোনো পণ্য নেই — চাইলে শুধু “দ্রুত বিক্রি” দিয়েও হিসাব রাখতে পারেন" icon="cube-outline" />}
        </View>
      </View>
    </Page>
  );
}