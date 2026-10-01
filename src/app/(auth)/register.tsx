import { Link } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Chip, Chips, errMsg, Input, Label, Notice, Text } from '@/components/ui';
import { register } from '@/services/auth';
import { importAll } from '@/services/backup';
import { pickBackup } from '@/lib/files';
import { useSession } from '@/store/session';

const TYPES = ['মুদি দোকান', 'মনোহারি', 'কনফেকশনারি', 'ফার্মেসি', 'অন্যান্য'];

export default function Register() {
  const { reload } = useSession();
  const ins = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', shopName: '', phone: '', shopType: TYPES[0], password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const next = () => {
    setErr('');
    if (step === 1 && !f.name.trim()) return setErr('আপনার নাম লিখুন');
    if (step === 2 && !f.shopName.trim()) return setErr('দোকানের নাম লিখুন');
    if (step === 3 && !/^01\d{9}$/.test(f.phone)) return setErr('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    setStep(step + 1);
  };
  const submit = async () => {
    setBusy(true); setErr('');
    try { await register(f); await reload(); } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  const restore = async () => {
    setErr('');
    try {
      const txt = await pickBackup();
      if (!txt) return;
      await importAll(txt);
      await reload();
    } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-brand-700" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="pb-8 px-6" style={{ paddingTop: ins.top + 40 }}>
          <Text className="text-2xl font-bold text-white">নতুন দোকান খুলুন</Text>
          <View className="flex-row gap-1.5 mt-3">{[1, 2, 3, 4].map((i) => <View key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`} />)}</View>
        </View>
        <View className="flex-1 bg-canvas rounded-t-[32px] p-6 gap-4">
          {step === 1 && <View className="flex-row"><Input label="আপনার নাম" autoFocus value={f.name} onChangeText={(v) => set('name', v)} /></View>}
          {step === 2 && <View className="flex-row"><Input label="দোকানের নাম" autoFocus value={f.shopName} onChangeText={(v) => set('shopName', v)} /></View>}
          {step === 3 && <View className="flex-row"><Input label="মোবাইল নম্বর (লগইনের জন্য)" autoFocus keyboardType="number-pad" placeholder="01XXXXXXXXX" value={f.phone} onChangeText={(v) => set('phone', v)} /></View>}
          {step === 4 && (
            <>
              <View><Label>দোকানের ধরন</Label><Chips>{TYPES.map((t) => <Chip key={t} label={t} on={f.shopType === t} onPress={() => set('shopType', t)} />)}</Chips></View>
              <View className="flex-row"><Input label="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" secureTextEntry value={f.password} onChangeText={(v) => set('password', v)} /></View>
            </>
          )}
          <Notice kind="err">{err}</Notice>
          {step < 4 ? <Btn title="পরের ধাপ" onPress={next} /> : <Btn title="দোকান তৈরি করুন" onPress={submit} loading={busy} />}
          {step > 1 && <Btn title="পেছনে" variant="ghost" icon="arrow-back" onPress={() => setStep(step - 1)} />}
          <Btn title="ব্যাকআপ ফাইল থেকে ফিরিয়ে আনুন" variant="soft" icon="cloud-download-outline" onPress={restore} />
          <Link href="/login" className="text-center text-brand-700 font-bold py-2">আগেই একাউন্ট আছে? ঢুকুন</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
