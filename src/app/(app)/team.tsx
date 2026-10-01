import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, Chip, confirm, errMsg, H1, Input, Muted, Notice, Page, Text, useLoad } from '@/components/ui';
import { addUser, removeUser, users } from '@/services/auth';
import { useSession } from '@/store/session';

const ROLE: Record<string, string> = { OWNER: 'মালিক', MANAGER: 'ম্যানেজার', EMPLOYEE: 'কর্মচারী (শুধু বিক্রি)' };
const blank = { name: '', phone: '', password: '', role: 'EMPLOYEE' };
export default function Team() {
  const { user } = useSession();
  const { data, err, reload } = useLoad(() => users());
  const [f, setF] = useState(blank); const [e2, setE2] = useState('');
  const add = async () => { setE2(''); try { await addUser(f); setF(blank); reload(); } catch (e) { setE2(errMsg(e)); } };
  const del = async (u: any) => { if (await confirm(`${u.name} কে মুছবেন?`)) { try { await removeUser(u.id); reload(); } catch (e) { setE2(errMsg(e)); } } };
  return (
    <Page>
      <H1>কর্মচারী</H1>
      <Card className="gap-3">
        <View className="flex-row"><Input placeholder="নাম" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} /></View>
        <View className="flex-row"><Input placeholder="মোবাইল (লগইনের জন্য)" keyboardType="number-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} /></View>
        <View className="flex-row"><Input placeholder="পাসওয়ার্ড" secureTextEntry value={f.password} onChangeText={(v) => setF({ ...f, password: v })} /></View>
        <View className="flex-row gap-2">{['EMPLOYEE', 'MANAGER'].map((r) => <Chip key={r} label={ROLE[r]} on={f.role === r} onPress={() => setF({ ...f, role: r })} />)}</View>
        <Notice kind="err">{e2 || err}</Notice>
        <Btn title="যোগ করুন" icon="person-add" onPress={add} />
      </Card>
      {(data ?? []).map((u) => (
        <Card key={u.id} className="flex-row justify-between items-center">
          <View><Text className="font-bold">{u.name}</Text><Muted>{u.phone} · {ROLE[u.role]}</Muted></View>
          {u.id !== user?.id && <Btn title="মুছুন" variant="ghost" small onPress={() => del(u)} />}
        </Card>
      ))}
    </Page>
  );
}
