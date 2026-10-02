import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FadeUp, Grad, PButton, PInput, Rings, useShake } from '@/components/premium';
import { errMsg, Icon, IconName, Text } from '@/components/ui';
import { pickBackup } from '@/lib/files';
import { register } from '@/services/auth';
import { importAll } from '@/services/backup';
import { useSession } from '@/store/session';

// নাম অবশ্যই আগের মতোই থাকতে হবে (ফার্মেসি দেখে অ্যাপ ওষুধের ফিচার চালু করে)
const TYPES: { name: string; icon: IconName; sub: string; tint: string; fg: string }[] = [
  { name: 'মুদি দোকান', icon: 'basket', sub: 'চাল, ডাল, তেল, মসলা', tint: '#FEF3C7', fg: '#D97706' },
  { name: 'মনোহারি', icon: 'bag-handle', sub: 'প্রসাধনী, স্টেশনারি, গৃহস্থালি', tint: '#FCE7F3', fg: '#DB2777' },
  { name: 'কনফেকশনারি', icon: 'ice-cream', sub: 'বিস্কুট, চকলেট, পানীয়', tint: '#EDE9FE', fg: '#7C3AED' },
  { name: 'ফার্মেসি', icon: 'medkit', sub: 'ওষুধ, বক্স-পাতা ও মেয়াদ হিসাব', tint: '#DCFCE7', fg: '#16A34A' },
  { name: 'অন্যান্য', icon: 'apps', sub: 'অন্য যেকোনো ধরনের দোকান', tint: '#E0F2FE', fg: '#0284C7' },
];
const HEAD: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'storefront', title: 'কোন ধরনের ব্যবসা?', sub: 'আপনার দোকানের ধরন বেছে নিন' },
  { icon: 'person-add', title: 'দোকানের তথ্য দিন', sub: 'একবারেই সব দিয়ে দোকান খুলুন' },
];

// ---------- ব্যবসার ধরনের কার্ড ----------
function TypeCard({ t, on, wide, delay, onPress }: { t: (typeof TYPES)[number]; on: boolean; wide?: boolean; delay: number; onPress: () => void }) {
  return (
    <FadeUp delay={delay} y={16} style={{ width: wide ? '100%' : '47.5%' }}>
      <Pressable
        onPress={onPress}
        className="active:opacity-80"
        style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', gap: wide ? 14 : 12, padding: 14, minHeight: wide ? 0 : 132, borderRadius: 20, borderWidth: 2, backgroundColor: on ? '#ECFBFC' : '#fff', borderColor: on ? C.main : '#E5E7EB', elevation: on ? 0 : 2, shadowColor: '#0F172A', shadowOpacity: on ? 0 : 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: on ? C.main : t.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={t.icon} size={25} color={on ? '#fff' : t.fg} />
        </View>
        <View style={{ flex: wide ? 1 : undefined }}>
          <Text className="font-bold text-slate-900" style={{ fontSize: 16, lineHeight: 24 }}>{t.name}</Text>
          <Text className="text-slate-500" style={{ fontSize: 12, lineHeight: 18 }}>{t.sub}</Text>
        </View>
        {on && (
          <View style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.main, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </Pressable>
    </FadeUp>
  );
}

type Errs = { name?: string; shopName?: string; phone?: string; password?: string; confirm?: string };

export default function Register() {
  const { adopt, shops, cancelNew } = useSession();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { shake, style: shakeStyle } = useShake();
  const shopRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const pw2Ref = useRef<TextInput>(null);
  const [stage, setStage] = useState<1 | 2>(1);
  const [type, setType] = useState('');
  const [typeErr, setTypeErr] = useState('');
  const [f, setF] = useState({ name: '', shopName: '', phone: '', password: '', confirm: '' });
  const [errs, setErrs] = useState<Errs>({});
  const [gen, setGen] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setErrs({ ...errs, [k]: '' }); setGen(''); };

  const chooseType = (n: string) => { setType(n); setTypeErr(''); };
  const goForm = () => {
    if (!type) { setTypeErr('আগে আপনার ব্যবসার ধরন বেছে নিন'); shake(); return; }
    setStage(2);
  };
  const submit = async () => {
    setGen('');
    const e: Errs = {};
    if (!f.name.trim()) e.name = 'আপনার নাম লিখুন';
    if (!f.shopName.trim()) e.shopName = 'দোকানের নাম লিখুন';
    if (!/^01\d{9}$/.test(f.phone)) e.phone = 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)';
    if (f.password.length < 6) e.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন';
    if (!f.confirm) e.confirm = 'পাসওয়ার্ড আবার লিখুন';
    else if (f.confirm !== f.password) e.confirm = 'পাসওয়ার্ড দুটি মিলছে না';
    setErrs(e);
    if (Object.keys(e).length) { shake(); return; }
    setBusy(true);
    try { await register({ name: f.name, shopName: f.shopName, phone: f.phone, shopType: type, password: f.password }); await adopt(); } catch (x) { setGen(errMsg(x)); shake(); }
    setBusy(false);
  };
  const restore = async () => {
    setGen('');
    try {
      const txt = await pickBackup();
      if (!txt) return;
      await importAll(txt);
      if (!(await adopt())) router.replace('/login');
    } catch (x) { setGen(errMsg(x)); }
  };
  const back = () => {
    if (stage === 2) { setStage(1); setGen(''); return; }
    if (shops.length > 0) { cancelNew(); return; }
    if (router.canGoBack()) router.back(); else router.replace('/login');
  };
  const h = HEAD[stage - 1];
  const picked = TYPES.find((t) => t.name === type);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.t0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* ---------- উপরের অংশ ---------- */}
        <View style={{ paddingTop: ins.top + 12, paddingBottom: 56, paddingHorizontal: 24, overflow: 'hidden' }}>
          <Grad from={[0, 0]} to={[0.4, 1]} stops={[[0, C.t0], [1, C.t1]]} />
          <Rings style={{ top: -120, right: -120 }} />

          <View className="flex-row items-center justify-between">
            <Pressable onPress={back} hitSlop={8} className="w-10 h-10 rounded-full items-center justify-center active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Icon name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text className="text-white font-semibold" style={{ opacity: 0.9 }}>ধাপ {stage === 1 ? '১' : '২'} / ২</Text>
          </View>

          <View className="flex-row gap-1.5 mt-4">
            {[1, 2].map((i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= stage ? '#fff' : 'rgba(255,255,255,0.3)' }} />)}
          </View>

          <FadeUp key={stage} y={10} style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Text className="text-white font-bold" style={{ fontSize: 26, lineHeight: 38 }}>{h.title}</Text>
              <Text className="text-cyan-100" style={{ fontSize: 14, lineHeight: 22 }}>{h.sub}</Text>
            </View>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={h.icon} size={30} color="#fff" />
            </View>
          </FadeUp>
        </View>

        {/* ---------- কার্ড ---------- */}
        <FadeUp delay={100} y={40} style={{ flex: 1, marginTop: -32 }}>
          <View className="flex-1 bg-white px-6 pt-8 gap-5" style={{ borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingBottom: Math.max(ins.bottom, 16) + 10 }}>

            {stage === 1 ? (
              <>
                <Animated.View style={[shakeStyle, { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }]}>
                  {TYPES.map((t, i) => <TypeCard key={t.name} t={t} on={type === t.name} wide={i === TYPES.length - 1} delay={120 + i * 70} onPress={() => chooseType(t.name)} />)}
                </Animated.View>

                {typeErr ? (
                  <View className="flex-row items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    <Icon name="alert-circle" size={20} color={C.err} />
                    <Text className="flex-1 text-rose-700 text-sm">{typeErr}</Text>
                  </View>
                ) : null}
                {gen ? (
                  <View className="flex-row items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    <Icon name="alert-circle" size={20} color={C.err} />
                    <Text className="flex-1 text-rose-700 text-sm">{gen}</Text>
                  </View>
                ) : null}

                <View className="gap-4 mt-1">
                  <PButton title="চালিয়ে যান" icon="arrow-forward" onPress={goForm} />
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 h-px bg-slate-200" />
                    <Text className="text-slate-400 text-xs">অথবা</Text>
                    <View className="flex-1 h-px bg-slate-200" />
                  </View>
                  <PButton variant="soft" icon="cloud-download-outline" title="ব্যাকআপ ফাইল থেকে ফিরিয়ে আনুন" onPress={restore} />
                </View>

                {shops.length > 0 && (
                  <Pressable onPress={() => cancelNew()} hitSlop={8} className="flex-row items-center justify-center gap-1.5 active:opacity-60">
                    <Icon name="arrow-undo-outline" size={16} color="#0891B2" />
                    <Text className="text-cyan-600 font-semibold text-sm">বাতিল — আগের দোকানে ফিরুন</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <FadeUp key="form" y={12} style={{ gap: 18 }}>
                {/* বেছে নেওয়া ধরন */}
                {picked && (
                  <View className="flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: '#ECFBFC', borderWidth: 1, borderColor: '#BDEFF3' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.main, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={picked.icon} size={21} color="#fff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-500" style={{ fontSize: 11, lineHeight: 16 }}>ব্যবসার ধরন</Text>
                      <Text className="font-bold text-slate-900">{picked.name}</Text>
                    </View>
                    <Pressable onPress={() => setStage(1)} hitSlop={8} className="active:opacity-60"><Text className="text-cyan-600 font-bold text-sm">পরিবর্তন</Text></Pressable>
                  </View>
                )}

                <Animated.View style={[shakeStyle, { gap: 14 }]}>
                  <PInput icon="person-outline" placeholder="আপনার নাম" value={f.name} onChangeText={(v) => set('name', v)} returnKeyType="next" onSubmitEditing={() => shopRef.current?.focus()} error={errs.name} />
                  <PInput ref={shopRef} icon="storefront-outline" placeholder="দোকানের নাম" value={f.shopName} onChangeText={(v) => set('shopName', v)} returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} error={errs.shopName} />
                  <PInput ref={phoneRef} icon="call-outline" placeholder="মোবাইল নম্বর (লগইনের জন্য)" keyboardType="number-pad" maxLength={11} value={f.phone} onChangeText={(v) => set('phone', v)} returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} error={errs.phone} />
                  <PInput ref={pwRef} icon="lock-closed-outline" secure placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" value={f.password} onChangeText={(v) => set('password', v)} returnKeyType="next" onSubmitEditing={() => pw2Ref.current?.focus()} error={errs.password} />
                  <PInput ref={pw2Ref} icon="shield-checkmark-outline" secure placeholder="পাসওয়ার্ড আবার লিখুন" value={f.confirm} onChangeText={(v) => set('confirm', v)} returnKeyType="go" onSubmitEditing={submit} error={errs.confirm} />
                </Animated.View>

                {gen ? (
                  <View className="flex-row items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    <Icon name="alert-circle" size={20} color={C.err} />
                    <Text className="flex-1 text-rose-700 text-sm">{gen}</Text>
                  </View>
                ) : null}

                <PButton title="দোকান খুলুন" icon="checkmark-circle" onPress={submit} loading={busy} />
              </FadeUp>
            )}
          </View>
        </FadeUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}