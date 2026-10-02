import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Btn, Card, confirm, errMsg, IconBox, Input, Muted, Notice, Page, Text } from '@/components/ui';
import { pickBackup, shareBackup } from '@/lib/files';
import { changePassword } from '@/services/auth';
import { exportAll, importAll } from '@/services/backup';
import { useSession } from '@/store/session';

export default function Settings() {
  const { shop, user, reload, role, removeCurrent, shops } = useSession();
  const router = useRouter();
  const [old, setOld] = useState(''); const [nw, setNw] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const run = async (fn: () => Promise<any>, ok: string) => { setErr(''); setMsg(''); try { await fn(); setMsg(ok); } catch (e) { setErr(errMsg(e)); } };
  return (
    <Page>
      <Card className="flex-row items-center gap-3">
        <IconBox name="storefront" size={46} tone="brand" />
        <View className="flex-1">
          <Text className="text-lg font-bold" numberOfLines={1}>{shop?.name}</Text>
          <Muted>{shop?.shopType} · {user?.name}</Muted>
        </View>
      </Card>
      <Notice kind="ok">{msg}</Notice><Notice kind="err">{err}</Notice>
      {role === 'OWNER' && (
        <Card className="gap-3">
          <View className="flex-row items-center gap-2.5"><IconBox name="cloud-upload" size={34} tone="green" /><Text className="font-bold text-base">ব্যাকআপ</Text></View>
          <Muted>আপনার সব হিসাব শুধু এই ফোনে থাকে। ফোন হারালে বা নষ্ট হলে ব্যাকআপ ছাড়া ফেরত পাওয়া যাবে না — নিয়মিত ব্যাকআপ নিয়ে WhatsApp / Google Drive-এ রাখুন।</Muted>
          <Btn title="ব্যাকআপ নিন ও শেয়ার করুন" icon="share-outline" variant="dark" onPress={() => run(async () => shareBackup(await exportAll()), 'ব্যাকআপ তৈরি হয়েছে ✅')} />
          <Btn title="ব্যাকআপ থেকে ফিরিয়ে আনুন" icon="cloud-download-outline" variant="outline" onPress={() => run(async () => {
            if (!(await confirm('ফিরিয়ে আনবেন?', 'এখনকার সব ডাটা মুছে ব্যাকআপের ডাটা বসবে।', 'ফিরিয়ে আনুন'))) return;
            const t = await pickBackup(); if (!t) return;
            await importAll(t); await reload(); router.replace('/');
          }, 'ডাটা ফিরে এসেছে ✅')} />
        </Card>
      )}
      <Card className="gap-3">
        <View className="flex-row items-center gap-2.5"><IconBox name="key" size={34} tone="slate" /><Text className="font-bold text-base">পাসওয়ার্ড বদলান</Text></View>
        <View className="flex-row"><Input placeholder="পুরনো পাসওয়ার্ড" secureTextEntry value={old} onChangeText={setOld} /></View>
        <View className="flex-row"><Input placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" secureTextEntry value={nw} onChangeText={setNw} /></View>
        <Btn title="পাসওয়ার্ড বদলান" variant="outline" onPress={() => run(async () => { await changePassword(old, nw); setOld(''); setNw(''); }, 'পাসওয়ার্ড বদলেছে ✅')} />
      </Card>
      {role === 'OWNER' && (
        <Card className="gap-3 border-rose-200">
          <View className="flex-row items-center gap-2.5"><IconBox name="warning" size={34} tone="red" /><Text className="font-bold text-base">বিপজ্জনক</Text></View>
          <Muted>শুধু "{shop?.name}" দোকানের সব হিসাব মুছবে — {shops.length > 1 ? 'অন্য দোকানের কিছু হবে না।' : 'এটা আপনার একমাত্র দোকান।'}</Muted>
          <Btn title="এই দোকান মুছুন" variant="danger" icon="trash" onPress={async () => {
            if (!(await confirm(`"${shop?.name}" মুছবেন?`, 'এই দোকানের সব ডাটা চিরতরে মুছে যাবে। আগে ব্যাকআপ নিন।', 'মুছুন'))) return;
            if (!(await confirm('আপনি কি নিশ্চিত?', undefined, 'হ্যাঁ, মুছুন'))) return;
            await run(async () => { await removeCurrent(); }, '');
          }} />
        </Card>
      )}
      <Text className="text-center text-xs text-slate-400">ইজিদোকান · {user?.name}</Text>
    </Page>
  );
}