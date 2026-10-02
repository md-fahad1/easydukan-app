import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FadeUp, Grad, PButton, PInput, Rings } from '@/components/premium';
import { errMsg, Icon, IconBox, IconName, Notice, Text } from '@/components/ui';
import { pickBackup } from '@/lib/files';
import { register } from '@/services/auth';
import { importAll } from '@/services/backup';
import { useSession } from '@/store/session';

// নাম বদলাবেন না — 'ফার্মেসি' দেখে অ্যাপ ফার্মেসি মোডে চলে
const TYPES: [string, IconName][] = [['মুদি দোকান', 'basket'], ['মনোহারি', 'bag-handle'], ['কনফেকশনারি', 'ice-cream'], ['ফার্মেসি', 'medkit'], ['অন্যান্য', 'storefront']];
const STEPS: [string, string, IconName][] = [
  ['আপনার নাম কী?', 'এই নামেই আপনাকে ডাকা হবে', 'person'],
  ['দোকানের নাম কী?', 'যেমন: রহমান স্টোর', 'storefront'],
  ['মোবাইল নম্বর', 'এই নম্বর দিয়েই লগইন করবেন', 'call'],
  ['প্রায় শেষ!', 'দোকানের ধরন ও পাসওয়ার্ড বাছুন', 'shield-checkmark'],
];

export default function Register() {
  const { adopt, shops, cancelNew } = useSession();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const pwRef = useRef<TextInput>(null);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', shopName: '', phone: '', shopType: TYPES[0][0], password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setErr(''); };

  const next = () => {
    setErr('');
    if (step === 1 && !f.name.trim()) return setErr('আপনার নাম লিখুন');
    if (step === 2 && !f.shopName.trim()) return setErr('দোকানের নাম লিখুন');
    if (step === 3 && !/^01\d{9}$/.test(f.phone)) return setErr('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    setStep(step + 1);
  };
  const submit = async () => {
    setBusy(true); setErr('');
    try { await register(f); await adopt(); } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  };
  const restore = async () => {
    setErr('');
    try {
      const txt = await pickBackup();
      if (!txt) return;
      await importAll(txt);
      if (!(await adopt())) router.replace('/login');
    } catch (e) { setErr(errMsg(e)); }
  };
  const [title, sub, icon] = STEPS[step - 1];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.t0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* ---------- উপরের ব্যানার ---------- */}
        <View style={{ paddingTop: ins.top + 16, paddingBottom: 54, overflow: 'hidden' }}>
          <Grad from={[0, 0]} to={[0.4, 1]} stops={[[0, C.t0], [1, C.t1]]} />
          <Rings style={{ top: -110, right: -120 }} />
          <View className="flex-row items-center gap-2.5 px-6">
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="storefront" size={21} color={C.main} />
            </View>
            <Text className="text-white font-bold" style={{ fontSize: 19, lineHeight: 28 }}>ইজিদোকান</Text>
          </View>
          <View className="px-6 mt-5">
            <Text className="text-white font-bold" style={{ fontSize: 26, lineHeight: 38 }}>নতুন দোকান খুলুন</Text>
            <Text className="text-white/80 text-sm mt-0.5">ধাপ {step} / 4</Text>
            <View className="flex-row gap-1.5 mt-3">{[1, 2, 3, 4].map((i) => <View key={i} style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: i <= step ? '#fff' : 'rgba(255,255,255,0.3)' }} />)}</View>
          </View>
        </View>

        {/* ---------- ফর্ম কার্ড ---------- */}
        <View className="flex-1 bg-white px-6 pt-8 gap-5" style={{ marginTop: -30, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingBottom: Math.max(ins.bottom, 16) + 10 }}>
          <FadeUp key={step} y={16} style={{ gap: 18 }}>
            <View className="flex-row items-center gap-3">
              <IconBox name={icon} size={46} tone="brand" />
              <View className="flex-1">
                <Text className="text-xl font-bold">{title}</Text>
                <Text className="text-slate-500 text-sm">{sub}</Text>
              </View>
            </View>

            {step === 1 && <PInput icon="person-outline" autoFocus placeholder="আপনার নাম" value={f.name} onChangeText={(v) => set('name', v)} returnKeyType="next" onSubmitEditing={next} />}
            {step === 2 && <PInput icon="storefront-outline" autoFocus placeholder="দোকানের নাম" value={f.shopName} onChangeText={(v) => set('shopName', v)} returnKeyType="next" onSubmitEditing={next} />}
            {step === 3 && <PInput icon="call-outline" autoFocus keyboardType="number-pad" maxLength={11} placeholder="01XXXXXXXXX" value={f.phone} onChangeText={(v) => set('phone', v)} returnKeyType="next" onSubmitEditing={next} />}
            {step === 4 && (
              <>
                <View className="flex-row flex-wrap gap-2.5">
                  {TYPES.map(([t, ic]) => {
                    const on = f.shopType === t;
                    return (
                      <Pressable key={t} onPress={() => set('shopType', t)} style={{ width: '48%' }} className={`flex-row items-center gap-2.5 p-3 rounded-2xl border ${on ? 'bg-brand-50 border-brand-600' : 'bg-white border-line'}`}>
                        <IconBox name={ic} size={34} tone={on ? 'brand' : 'slate'} />
                        <Text className={`flex-1 text-sm ${on ? 'font-bold text-brand-800' : 'text-slate-700'}`} numberOfLines={1}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <PInput ref={pwRef} icon="lock-closed-outline" secure placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" value={f.password} onChangeText={(v) => set('password', v)} returnKeyType="go" onSubmitEditing={submit} />
              </>
            )}
          </FadeUp>

          <Notice kind="err">{err}</Notice>

          <View className="gap-3">
            {step < 4 ? <PButton title="পরের ধাপ" icon="arrow-forward" onPress={next} /> : <PButton title="দোকান তৈরি করুন" icon="checkmark-circle-outline" onPress={submit} loading={busy} />}
            {step > 1 && (
              <Pressable onPress={() => setStep(step - 1)} hitSlop={8} className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-60">
                <Icon name="arrow-back" size={18} color="#64748B" /><Text className="text-slate-500 font-semibold">পেছনে</Text>
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-slate-200" /><Text className="text-slate-400 text-xs">অথবা</Text><View className="flex-1 h-px bg-slate-200" />
          </View>
          <PButton variant="soft" icon="cloud-download-outline" title="ব্যাকআপ ফাইল থেকে ফিরিয়ে আনুন" onPress={restore} />
          {shops.length > 0 && (
            <Pressable onPress={cancelNew} hitSlop={8} className="flex-row items-center justify-center gap-1.5 py-1 active:opacity-60">
              <Icon name="arrow-undo-outline" size={16} color="#64748B" /><Text className="text-slate-500 text-sm font-semibold">বাতিল — আগের দোকানে ফিরুন</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}