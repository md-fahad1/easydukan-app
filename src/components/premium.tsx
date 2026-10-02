// ডিজাইনের ছোট ছোট অংশ — সব পেজেই ব্যবহার করা যাবে।
// নতুন প্যাকেজ লাগে না: React Native-এর Animated + react-native-svg (আগে থেকেই package.json-এ আছে)।
// রং বদলাতে চাইলে শুধু নিচের C বদলান।
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { FONT, Icon, IconName, Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';

export const C = {
  t0: '#12A4B3', t1: '#5ED6D8',   // উপরের টিল গ্রেডিয়েন্ট (উপর → নিচ)
  main: '#18A9B7',                 // বাটন / ফোকাস রং
  deep: '#0E8F9B',                 // গাঢ় টিল
  navy: '#0B1B2B',                 // গাঢ় বাটন
  field: '#F3F4F6',                // ইনপুটের ব্যাকগ্রাউন্ড
  mute: '#6B7280', ink: '#0F172A', err: '#E11D48',
};

// ---------- গ্রেডিয়েন্ট (পেছনে ভরাট করে) ----------
let seq = 0;
type GStop = [offset: number, color: string, opacity?: number];
export function Grad({ stops, from = [0, 0], to = [1, 1], radial }: { stops: GStop[]; from?: [number, number]; to?: [number, number]; radial?: boolean }) {
  const id = useRef(`g${++seq}`).current;
  const st = stops.map((s, i) => <Stop key={i} offset={s[0]} stopColor={s[1]} stopOpacity={s[2] ?? 1} />);
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {radial ? <RadialGradient id={id} cx="50%" cy="50%" r="50%">{st}</RadialGradient> : <LinearGradient id={id} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>{st}</LinearGradient>}
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// ---------- অ্যানিমেশন ----------
// 0 → 1 → 0 ... ধীরে ধীরে দুলতে থাকে
export function useLoop(ms: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const e = Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: ms, easing: e, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: e, useNativeDriver: true }),
    ]));
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, []);
  return v;
}

// ভুল হলে ঝাঁকুনি:  const { shake, style } = useShake();  <Animated.View style={style}> ... shake()
export function useShake() {
  const v = useRef(new Animated.Value(0)).current;
  const shake = () => Animated.sequence([10, -10, 7, -7, 3, 0].map((x) => Animated.timing(v, { toValue: x, duration: 50, useNativeDriver: true }))).start();
  return { shake, style: { transform: [{ translateX: v }] } };
}

// নিচ থেকে হালকা করে ভেসে ওঠে
export function FadeUp({ delay = 0, y = 14, children, style }: { delay?: number; y?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 450, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }, style]}>{children}</Animated.View>;
}

// সূক্ষ্ম বৃত্তের নকশা — হিরোর কোণায় বসে
export function Rings({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 320, height: 320 }, style]}>
      <Svg width={320} height={320}>
        {[46, 82, 120, 158].map((r, i) => <Circle key={r} cx={160} cy={160} r={r} stroke="#FFFFFF" strokeOpacity={0.22 - i * 0.045} strokeWidth={1.2} fill="none" />)}
      </Svg>
    </View>
  );
}

// ---------- ইনপুট: হালকা ধূসর ভরাট, গোল কোণা, বাঁয়ে আইকন ----------
// error = true হলে শুধু লাল; error = "লেখা" হলে নিচে লেখাও দেখায়।
type PInputProps = TextInputProps & { icon?: IconName; secure?: boolean; error?: string | boolean };
export const PInput = forwardRef<TextInput, PInputProps>(function PInput({ icon, secure, error, ...p }, ref) {
  const { c } = useTheme();
  const [on, setOn] = useState(false);
  const [show, setShow] = useState(false);
  const bad = !!error;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1.5, backgroundColor: bad ? c.errBg : on ? c.focusBg : c.field, borderColor: bad ? C.err : on ? C.main : 'transparent' }}>
        {icon ? <Icon name={icon} size={21} color={bad ? C.err : on ? C.main : '#9CA3AF'} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor="#9CA3AF"
          selectionColor={C.main}
          secureTextEntry={secure && !show}
          style={{ flex: 1, fontSize: 16, color: c.text, fontFamily: FONT.reg, paddingVertical: 0 }}
          {...p}
          onFocus={(e) => { setOn(true); p.onFocus?.(e); }}
          onBlur={(e) => { setOn(false); p.onBlur?.(e); }}
        />
        {secure && (
          <Pressable onPress={() => setShow(!show)} hitSlop={10}>
            <Icon name={show ? 'eye-outline' : 'eye-off-outline'} size={21} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
      {typeof error === 'string' && error ? (
        <View className="flex-row items-center gap-1.5 mt-1.5 ml-2">
          <Icon name="alert-circle" size={15} color={C.err} />
          <Text className="text-xs text-rose-600 flex-1">{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

// ---------- বাটন (পুরো গোল) ----------
// primary = টিল, dark = গাঢ় নেভি, soft = হালকা ধূসর
export function PButton({ title, icon, onPress, loading, variant = 'primary' }: { title: string; icon?: IconName; onPress?: () => void; loading?: boolean; variant?: 'primary' | 'dark' | 'soft' }) {
  const { c } = useTheme();
  const s = useRef(new Animated.Value(1)).current;
  const press = (to: number) => Animated.spring(s, { toValue: to, speed: 40, bounciness: 4, useNativeDriver: true }).start();
  const bg = variant === 'primary' ? C.main : variant === 'dark' ? c.navy : c.field;
  const fg = variant === 'soft' ? c.text : '#fff';
  return (
    <Animated.View style={[{ transform: [{ scale: s }], borderRadius: 28, backgroundColor: bg }, variant === 'primary' && { elevation: 6, shadowColor: C.deep, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }]}>
      <Pressable onPress={onPress} disabled={loading} onPressIn={() => press(0.98)} onPressOut={() => press(1)} style={{ height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {loading ? <ActivityIndicator color={fg} /> : (
          <>
            {icon ? <Icon name={icon} size={21} color={fg} /> : null}
            <Text className={`font-bold text-base ${variant === 'soft' ? 'text-slate-900' : 'text-white'}`}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}