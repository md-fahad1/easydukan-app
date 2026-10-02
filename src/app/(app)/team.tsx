import React, { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Btn, Card, Chip, confirm, errMsg, IconBox, Input, Muted, Notice, Page, SectionHead, Text, useLoad } from '@/components/ui';
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
      <Card className="gap-3">
        <View className="flex-row items-center gap-2.5">
          <IconBox name="person-add" size={34} tone="brand" />
          <Text className="font-bold text-base">নতুন কর্মচারী</Text>
        </View>
        <View className="flex-row"><Input placeholder="নাম" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} /></View>
        <View className="flex-row"><Input placeholder="মোবাইল (লগইনের জন্য)" keyboardType="number-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} /></View>
        <View className="flex-row"><Input placeholder="পাসওয়ার্ড" secureTextEntry value={f.password} onChangeText={(v) => setF({ ...f, password: v })} /></View>
        <View className="flex-row gap-2">{['EMPLOYEE', 'MANAGER'].map((r) => <Chip key={r} label={ROLE[r]} on={f.role === r} onPress={() => setF({ ...f, role: r })} />)}</View>
        <Notice kind="err">{e2 || err}</Notice>
        <Btn title="যোগ করুন" icon="person-add" variant="dark" onPress={add} />
      </Card>

      <View>
        <SectionHead title="সবাই" />
        <View className="gap-2.5">
          {(data ?? []).map((u) => (
            <Card key={u.id} className="flex-row items-center gap-3">
              <Avatar name={u.name} />
              <View className="flex-1 gap-1">
                <Text className="font-bold" numberOfLines={1}>{u.name}</Text>
                <Muted>{u.phone}</Muted>
                <Badge label={ROLE[u.role]} tone={u.role === 'OWNER' ? 'green' : u.role === 'MANAGER' ? 'amber' : 'gray'} />
              </View>
              {u.id !== user?.id && <Btn title="মুছুন" variant="ghost" small onPress={() => del(u)} />}
            </Card>
          ))}
        </View>
      </View>
    </Page>
  );
}