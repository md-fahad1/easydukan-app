import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import ShopSwitcher from '@/components/ShopSwitcher';
import { C, FadeUp, Grad, PButton, PInput, Rings, useLoop, useShake } from '@/components/premium';
import { errMsg, Icon, Text } from '@/components/ui';
import { login } from '@/services/auth';
import { useSession } from '@/store/session';

// ---------- দোকানের ছবি (SVG দিয়ে আঁকা) ----------
function Shop() {
  const prod = (x: number, colors: string[]) => (
    <>
      <Rect x={x} y={106} width={10} height={16} rx={2} fill={colors[0]} />
      <Rect x={x + 14} y={110} width={10} height={12} rx={2} fill={colors[1]} />
      <Rect x={x + 28} y={104} width={12} height={18} rx={2} fill={colors[2]} />
      <Rect x={x} y={132} width={14} height={16} rx={2} fill={colors[3]} />
      <Rect x={x + 20} y={136} width={10} height={12} rx={2} fill={colors[4]} />
      <Rect x={x + 34} y={130} width={12} height={18} rx={2} fill={colors[5]} />
    </>
  );
  return (
    <Svg width={250} height={190} viewBox="0 0 250 190">
      <Ellipse cx={125} cy={184} rx={110} ry={6} fill="#000" opacity={0.12} />
      <Rect x={28} y={70} width={194} height={113} rx={8} fill="#E8FBFC" />
      {/* ছাউনি (ডোরাকাটা) */}
      {[0, 1, 2, 3, 4, 5].map((i) => <Path key={i} d={`M${20 + i * 35} 34 h35 v22 a17.5 17.5 0 0 1 -35 0 z`} fill={i % 2 ? '#0E8F9B' : '#FFFFFF'} />)}
      <Rect x={20} y={26} width={210} height={10} rx={5} fill="#0B7C88" />
      {/* জানালা */}
      <Rect x={44} y={96} width={62} height={56} rx={6} fill="#BDF1F4" />
      <Rect x={44} y={124} width={62} height={3} fill="#7FD6DC" />
      {prod(52, ['#FF8A65', '#FFD54F', '#4DB6AC', '#9575CD', '#F06292', '#64B5F6'])}
      <Rect x={144} y={96} width={62} height={56} rx={6} fill="#BDF1F4" />
      <Rect x={144} y={124} width={62} height={3} fill="#7FD6DC" />
      {prod(152, ['#64B5F6', '#F06292', '#FFD54F', '#4DB6AC', '#FF8A65', '#9575CD'])}
      {/* দরজা */}
      <Rect x={108} y={104} width={34} height={79} rx={5} fill="#18A9B7" />
      <Rect x={114} y={110} width={22} height={32} rx={3} fill="#BDF1F4" />
      <Circle cx={135} cy={152} r={2.6} fill="#fff" />
      <Rect x={102} y={180} width={46} height={4} rx={2} fill="#0B7C88" />
    </Svg>
  );
}

// ভাসমান কার্ড (ধীরে ওঠানামা করে)
function FloatCard({ style, delay = 0, ms = 3600, children }: { style?: any; delay?: number; ms?: number; children: React.ReactNode }) {
  const v = useLoop(ms, delay);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 6, shadowColor: '#064E55', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

function Illustration() {
  return (
    <View style={{ height: 196, marginTop: 4 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 6, alignItems: 'center' }}><Shop /></View>

      {/* বিক্রির কার্ড */}
      <FloatCard style={{ left: 14, top: 22, width: 108 }}>
        <Text className="text-slate-500" style={{ fontSize: 10, lineHeight: 15 }}>আজকের বিক্রি</Text>
        <Text className="font-bold text-slate-900" style={{ fontSize: 15, lineHeight: 22 }}>৳ ১২,৫০০</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 30, marginTop: 4 }}>
          {[12, 20, 15, 28, 22].map((h, i) => <View key={i} style={{ flex: 1, height: h, borderRadius: 3, backgroundColor: i === 3 ? C.main : '#BDEFF3' }} />)}
        </View>
      </FloatCard>

      {/* রশিদ কার্ড */}
      <FloatCard style={{ right: 16, top: 6, width: 74 }} delay={700} ms={4100}>
        <Icon name="receipt" size={20} color={C.main} />
        <View style={{ height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', marginTop: 8, width: '90%' }} />
        <View style={{ height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', marginTop: 5, width: '60%' }} />
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.main, marginTop: 8, width: '45%' }} />
      </FloatCard>

      {/* টাকার কয়েন */}
      <FloatCard style={{ right: 26, top: 122, width: 46, height: 46, borderRadius: 23, padding: 0, backgroundColor: '#FBBF24', alignItems: 'center', justifyContent: 'center' }} delay={300} ms={3300}>
        <Text className="font-bold text-amber-900" style={{ fontSize: 22, lineHeight: 30 }}>৳</Text>
      </FloatCard>

      {/* ওষুধ / স্টক */}
      <FloatCard style={{ left: 26, top: 128, width: 44, height: 44, borderRadius: 22, padding: 0, alignItems: 'center', justifyContent: 'center' }} delay={1000} ms={3900}>
        <Icon name="medkit" size={22} color={C.main} />
      </FloatCard>
    </View>
  );
}

export default function Login() {
  const { setUser, shop, shops, addNew, cancelNew } = useSession();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const pwRef = useRef<TextInput>(null);
  const { shake, style: shakeStyle } = useShake();
  const [pick, setPick] = useState(false);
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [ePhone, setEPhone] = useState<string | boolean>('');
  const [ePw, setEPw] = useState('');
  const [gen, setGen] = useState('');
  const [busy, setBusy] = useState(false);

  const clear = () => { setEPhone(''); setEPw(''); setGen(''); };
  // shops থাকলেও shop না থাকা = "নতুন দোকান খোলা" মোডে আছেন (ফাঁকা ডাটাবেস খোলা), আগের দোকান লুকানো
  const pendingNew = !shop && shops.length > 0;
  const newShop = () => (shop ? addNew() : router.push('/register'));
  const go = async () => {
    Keyboard.dismiss(); clear();
    if (!shop) { setGen(pendingNew ? 'আপনি নতুন দোকান খোলার ধাপে আছেন, তাই আগের দোকান দেখাচ্ছে না। নিচের "আগের দোকানে ফিরুন" চাপুন।' : 'এই ফোনে কোনো দোকান সেভ করা নেই — নিচের "নতুন দোকান খুলুন" চাপুন'); shake(); return; }
    let bad = false;
    if (!phone.trim()) { setEPhone('মোবাইল নম্বর দিন'); bad = true; }
    if (!pw) { setEPw('পাসওয়ার্ড দিন'); bad = true; }
    if (bad) { shake(); return; }
    setBusy(true);
    try { setUser(await login(phone, pw)); } catch (e) { setEPhone(true); setEPw(errMsg(e)); shake(); }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.t0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* ---------- উপরের ব্যানার ---------- */}
        <View style={{ paddingTop: ins.top + 16, paddingBottom: 30, overflow: 'hidden' }}>
          <Grad from={[0, 0]} to={[0.4, 1]} stops={[[0, C.t0], [1, C.t1]]} />
          <Rings style={{ top: -110, right: -120 }} />

          <View className="flex-row items-center justify-between px-6">
            <View className="flex-row items-center gap-2.5">
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="storefront" size={21} color={C.main} />
              </View>
              <Text className="text-white font-bold" style={{ fontSize: 19, lineHeight: 28 }}>ইজিদোকান</Text>
            </View>
            {shops.length > 0 && (
              <Pressable onPress={() => setPick(true)} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Icon name={shop?.shopType === 'ফার্মেসি' ? 'medkit' : 'storefront'} size={14} color="#fff" />
                <Text className="text-white font-semibold text-sm">{shop ? shop.name : 'দোকান বাছুন'}</Text>
                <Icon name="chevron-down" size={14} color="#fff" />
              </Pressable>
            )}
          </View>

          <FadeUp delay={100} style={{ paddingHorizontal: 24, marginTop: 20 }}>
            <Text className="text-white font-bold" style={{ fontSize: 28, lineHeight: 42 }}>
              আপনার দোকানের{'\n'}<Text className="text-cyan-100 font-bold" style={{ fontSize: 28, lineHeight: 42 }}>সব হিসাব</Text> এখন{'\n'}হাতের মুঠোয়
            </Text>
          </FadeUp>

          <FadeUp delay={220}><Illustration /></FadeUp>
        </View>

        {/* ---------- লগইন কার্ড ---------- */}
        <FadeUp delay={150} y={40} style={{ flex: 1, marginTop: -34 }}>
          <View className="flex-1 bg-white px-6 pt-8 gap-5" style={{ borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingBottom: Math.max(ins.bottom, 16) + 10 }}>
            <View className="items-center">
              <Text className="text-2xl font-bold">লগইন</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-slate-500 text-sm">{shop ? 'আরেকটি দোকান আছে? ' : 'এখনো দোকান খোলেননি? '}</Text>
                <Pressable onPress={newShop} hitSlop={8}><Text className="text-cyan-600 font-bold text-sm">{shop ? 'নতুন দোকান যোগ করুন' : 'নতুন দোকান খুলুন'}</Text></Pressable>
              </View>
            </View>

            {!shop && (
              <View className="gap-3">
                <View className="flex-row items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <Icon name="information-circle" size={20} color="#B45309" />
                  <Text className="flex-1 text-amber-800 text-sm">
                    {pendingNew
                      ? `এই ফোনে ${shops.length}টি দোকান সেভ করা আছে, কিন্তু এখন "নতুন দোকান খোলা" মোডে আছেন বলে লগইন দেখাচ্ছে না। আগের দোকানে ফিরতে নিচের বোতাম চাপুন।`
                      : 'এই ফোনে কোনো দোকান সেভ করা নেই। শুরু করতে "নতুন দোকান খুলুন" চাপুন। (আগে খুলে থাকলে রেজিস্টারে "ব্যাকআপ ফাইল থেকে ফিরিয়ে আনুন" ব্যবহার করুন)'}
                  </Text>
                </View>
                {pendingNew && <PButton icon="arrow-undo-outline" title="আগের দোকানে ফিরুন" onPress={cancelNew} />}
              </View>
            )}

            <Animated.View style={[shakeStyle, { gap: 14 }]}>
              <PInput icon="call-outline" keyboardType="number-pad" placeholder="মোবাইল নম্বর (01XXXXXXXXX)" maxLength={11} value={phone} onChangeText={(v) => { setPhone(v); clear(); }} returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} error={ePhone} />
              <PInput ref={pwRef} icon="lock-closed-outline" secure placeholder="পাসওয়ার্ড" value={pw} onChangeText={(v) => { setPw(v); clear(); }} returnKeyType="go" onSubmitEditing={go} error={ePw} />
            </Animated.View>

            {gen ? (
              <View className="flex-row items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                <Icon name="alert-circle" size={20} color={C.err} />
                <Text className="flex-1 text-rose-700 text-sm">{gen}</Text>
              </View>
            ) : null}

            <View className="gap-4 mt-1">
              <PButton title="লগইন" onPress={go} loading={busy} />
              <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-slate-200" />
                <Text className="text-slate-400 text-xs">অথবা</Text>
                <View className="flex-1 h-px bg-slate-200" />
              </View>
              <PButton variant="dark" icon="add-circle-outline" title={shop ? 'নতুন দোকান যোগ করুন' : 'নতুন দোকান খুলুন'} onPress={newShop} />
            </View>

            <View className="flex-row items-center justify-center gap-1.5 mt-1">
              <Icon name="lock-closed" size={13} color="#9CA3AF" />
              <Text className="text-xs text-slate-400">ইন্টারনেট ছাড়াই চলে — সব হিসাব শুধু আপনার ফোনে থাকে</Text>
            </View>
          </View>
        </FadeUp>
      </ScrollView>
      {shops.length > 0 && <ShopSwitcher visible={pick} onClose={() => setPick(false)} fromLogin />}
    </KeyboardAvoidingView>
  );
}