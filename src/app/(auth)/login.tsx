import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, errMsg, Icon, Input, Notice, Text } from '@/components/ui';
import { login } from '@/services/auth';
import { useSession } from '@/store/session';

export default function Login() {
  const { setUser } = useSession();
  const ins = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr('');
    try { setUser(await login(phone, pw)); } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  return (
    <KeyboardAvoidingView className="flex-1 bg-brand-700" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="items-center pb-10" style={{ paddingTop: ins.top + 56 }}>
          <View className="w-20 h-20 rounded-3xl bg-white items-center justify-center"><Icon name="storefront" size={44} color="#047857" /></View>
          <Text className="text-3xl font-bold text-white mt-4">ইজিদোকান</Text>
          <Text className="text-brand-100">দোকানের হিসাব, একদম সহজে।</Text>
        </View>
        <View className="flex-1 bg-canvas rounded-t-[32px] p-6 gap-4">
          <View className="flex-row"><Input label="মোবাইল নম্বর" keyboardType="number-pad" placeholder="01XXXXXXXXX" value={phone} onChangeText={setPhone} /></View>
          <View className="flex-row"><Input label="পাসওয়ার্ড" secureTextEntry value={pw} onChangeText={setPw} /></View>
          <Notice kind="err">{err}</Notice>
          <Btn title="ঢুকুন" onPress={go} loading={busy} />
          <Link href="/register" className="text-center text-brand-700 font-bold text-base py-2">নতুন দোকান খুলুন</Link>
          <Text className="text-xs text-slate-400 text-center">ইন্টারনেট ছাড়াই চলে — সব হিসাব আপনার ফোনেই থাকে</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
