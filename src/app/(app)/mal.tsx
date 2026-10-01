import { Link } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, Empty, errMsg, H1, Input, Muted, Notice, Page, Split, Text, useLoad } from '@/components/ui';
import { num, qtyFmt, taka } from '@/lib/format';
import { createProduct, products } from '@/services/shop';

const empty = { name: '', unit: 'pcs', purchasePrice: '', sellingPrice: '', stock: '', minStock: '' };
export default function Mal() {
  const { data, err, reload } = useLoad(() => products());
  const [f, setF] = useState<any>(empty); const [show, setShow] = useState(false); const [e2, setE2] = useState('');
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const list = data ?? [];
  const low = list.filter((p) => p.minStock > 0 && p.stock <= p.minStock);
  const add = async () => {
    setE2('');
    try {
      await createProduct({ name: f.name, unit: f.unit || 'pcs', purchasePrice: num(f.purchasePrice), sellingPrice: num(f.sellingPrice), stock: num(f.stock), minStock: num(f.minStock) });
      setF(empty); setShow(false); reload();
    } catch (e) { setE2(errMsg(e)); }
  };
  return (
    <Page onRefresh={reload}>
      <H1>মাল / পণ্য</H1>
      <Split>
        <View className="flex-1"><Link href="/purchase" asChild><Btn title="মাল কেনা" icon="cube" small /></Link></View>
        <View className="flex-1"><Btn title={show ? 'বন্ধ' : 'নতুন পণ্য'} icon="add" variant="outline" small onPress={() => setShow(!show)} /></View>
      </Split>
      {show && (
        <Card className="gap-3">
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
        <Card className="bg-amber-50 border-amber-200 gap-1">
          <Text className="font-bold">⚠️ কমে যাওয়া পণ্য — {low.length}টি</Text>
          {low.map((p) => <Text key={p.id} className="text-sm">{p.name}: {qtyFmt(p.stock)} {p.unit} (কমপক্ষে {qtyFmt(p.minStock)})</Text>)}
        </Card>
      )}
      <View className="gap-2">
        {list.map((p) => (
          <Card key={p.id} className="flex-row justify-between items-center">
            <View className="flex-1"><Text className="font-bold">{p.name}</Text><Muted>কেনা {taka(p.purchasePrice)} · বিক্রি {taka(p.sellingPrice)}</Muted></View>
            <Text className={`font-bold ${p.minStock > 0 && p.stock <= p.minStock ? 'text-rose-600' : ''}`}>{qtyFmt(p.stock)} {p.unit}</Text>
          </Card>
        ))}
        {list.length === 0 && <Empty text="এখনো কোনো পণ্য নেই — চাইলে শুধু “দ্রুত বিক্রি” দিয়েও হিসাব রাখতে পারেন" icon="cube-outline" />}
      </View>
    </Page>
  );
}
