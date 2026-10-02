import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, Btn, Card, Empty, errMsg, Icon, IconBox, Input, Muted, Notice, Page, SectionHead, Text, useLoad } from '@/components/ui';
import { taka } from '@/lib/format';
import { createCustomer, customers } from '@/services/shop';
import { useSession } from '@/store/session';

export default function Baki() {
  const { employee } = useSession();
  const { data, err, reload } = useLoad(() => customers());
  const [q, setQ] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [show, setShow] = useState(false); const [e2, setE2] = useState('');
  const list = data ?? [];
  const total = list.reduce((a, c) => a + c.balance, 0);
  const dueCount = list.filter((c) => c.balance > 0).length;
  const shown = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q));
  const add = async () => {
    setE2('');
    try { await createCustomer(name, phone || null); setName(''); setPhone(''); setShow(false); reload(); } catch (e) { setE2(errMsg(e)); }
  };
  return (
    <Page onRefresh={reload}>
      {/* ---------- মোট পাবেন ---------- */}
      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <IconBox name="book" size={42} tone="amber" />
          <View className="flex-1">
            <Text className="text-slate-500 text-xs">মোট পাবেন (বাকির খাতা)</Text>
            <Text className="text-3xl font-bold text-amber-600" style={{ lineHeight: 46 }}>{taka(total)}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2 pt-3 border-t border-line">
          <Icon name="people" size={16} color="#94A3B8" />
          <Text className="text-sm text-slate-500">{dueCount} জনের কাছে বাকি আছে · মোট {list.length} জন কাস্টমার</Text>
        </View>
      </Card>

      {/* ---------- খোঁজা + নতুন কাস্টমার ---------- */}
      <View className="flex-row items-center gap-2.5">
        <Input placeholder="নাম বা মোবাইল দিয়ে খুঁজুন" value={q} onChangeText={setQ} />
        <Pressable onPress={() => setShow(!show)} className="w-[52px] h-[52px] rounded-full bg-slate-900 items-center justify-center active:bg-black">
          <Icon name={show ? 'close' : 'person-add'} size={22} color="#fff" />
        </Pressable>
      </View>
      {show && (
        <Card className="gap-3">
          <Text className="font-bold">নতুন কাস্টমার</Text>
          <View className="flex-row"><Input placeholder="নাম" value={name} onChangeText={setName} /></View>
          <View className="flex-row"><Input placeholder="মোবাইল (ঐচ্ছিক)" keyboardType="number-pad" value={phone} onChangeText={setPhone} /></View>
          <Notice kind="err">{e2}</Notice>
          <Btn title="সেভ করুন" onPress={add} />
        </Card>
      )}
      <Notice kind="err">{err}</Notice>

      {/* ---------- কাস্টমার তালিকা ---------- */}
      <View>
        <SectionHead title="কাস্টমার" />
        <View className="gap-2.5">
          {shown.map((c) => (
            <Link key={c.id} href={employee ? '/sale' : { pathname: '/baki/[id]', params: { id: c.id } }} asChild>
              <Card onPress={() => {}} className="flex-row items-center gap-3">
                <Avatar name={c.name} />
                <View className="flex-1">
                  <Text className="font-bold text-base" numberOfLines={1}>{c.name}</Text>
                  <Muted>{c.phone || 'মোবাইল নেই'}</Muted>
                </View>
                <View className="items-end">
                  <Text className={`font-bold text-base ${c.balance > 0 ? 'text-amber-600' : c.balance < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{taka(Math.abs(c.balance))}</Text>
                  <Text className="text-xs text-slate-400">{c.balance > 0 ? 'বাকি' : c.balance < 0 ? 'জমা' : 'পরিষ্কার'}</Text>
                </View>
              </Card>
            </Link>
          ))}
          {shown.length === 0 && <Empty text="কোনো কাস্টমার নেই" icon="people-outline" />}
        </View>
      </View>
    </Page>
  );
}