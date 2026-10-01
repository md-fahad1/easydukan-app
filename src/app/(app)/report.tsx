import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, Chip, Loading, Notice, Page, Row, Text, useLoad } from '@/components/ui';
import { taka } from '@/lib/format';
import { summary } from '@/services/shop';

const TABS: [string, string][] = [['TODAY', 'আজ'], ['WEEK', 'এই সপ্তাহ'], ['MONTH', 'এই মাস']];
export default function Report() {
  const [p, setP] = useState('TODAY');
  const { data: s, err, reload } = useLoad(() => summary(p), [p]);
  return (
    <Page onRefresh={reload}>
      <Text className="text-2xl font-bold">রিপোর্ট</Text>
      <View className="flex-row gap-2">{TABS.map(([k, v]) => <Chip key={k} className="flex-1 items-center" label={v} on={p === k} onPress={() => setP(k)} />)}</View>
      <Notice kind="err">{err}</Notice>
      {!s ? <Loading /> : (
        <Card>
          <Row l="মোট বিক্রি (ফেরত বাদে)" v={taka(s.totalSale)} bold /><Row l="   নগদ" v={taka(s.cash)} /><Row l="   বিকাশ" v={taka(s.bkash)} /><Row l="   বাকিতে" v={taka(s.due)} />
          <Row l="মোট খরচ" v={taka(s.expense)} tone="red" /><Row l="বাকি আদায়" v={taka(s.received)} /><Row l="হাতে থাকার কথা" v={taka(s.cashInHand)} />
          <Row l="আনুমানিক লাভ" v={taka(s.profit)} bold tone="green" /><Row l="বিক্রির সংখ্যা" v={s.saleCount} /><Row l="ফেরত (বাদ গেছে)" v={taka(s.returnTotal)} />
          <Row l="মোট বাকি (পাবেন)" v={taka(s.customerDue)} tone="amber" /><Row l="মোট পাওনা (দেবেন)" v={taka(s.supplierDue)} tone="red" /><Row l="কমে যাওয়া পণ্য" v={s.lowStockCount} last />
        </Card>
      )}
    </Page>
  );
}
