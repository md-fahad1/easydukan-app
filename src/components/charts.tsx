import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { bn } from '@/lib/format';
import { Text } from '@/components/ui';
import { useTheme } from '@/lib/theme';

// ---------- অর্ধ-বৃত্ত গজ (০–১০০) ----------
export function Gauge({ value, label, color = '#18A9B7' }: { value: number; label: string; color?: string }) {
  const { c } = useTheme();
  const v = Math.max(0, Math.min(100, value || 0));
  const W = 240, H = 128, cx = 120, cy = 112, r = 92, sw = 20;
  const f = Math.min(v / 100, 0.999);
  const ang = Math.PI - f * Math.PI;
  const x = cx + r * Math.cos(ang), y = cy - r * Math.sin(ang);
  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      <Svg width={W} height={H}>
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke={c.track} strokeWidth={sw} strokeLinecap="round" fill="none" />
        {v >= 1 && <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`} stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />}
      </Svg>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' }}>
        <Text className="text-slate-500 text-sm">{label}</Text>
        <Text className="text-2xl font-bold" style={{ lineHeight: 36 }}>{bn(Math.round(v))}/১০০</Text>
      </View>
    </View>
  );
}

// ---------- ছোট বার চার্ট (শেষ কয়েক দিন) ----------
export function MiniBars({ data }: { data: { label: string; value: number }[] }) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View className="flex-row items-end" style={{ height: 120, gap: data.length > 10 ? 2 : 8 }}>
      {data.map((d, i) => {
        const last = i === data.length - 1;
        return (
          <View key={i} className="flex-1 items-center justify-end gap-1.5" style={{ height: 120 }}>
            <View style={{ width: '100%', height: Math.max(d.value > 0 ? 4 : 2, (d.value / max) * 82), borderRadius: data.length > 10 ? 4 : 10, backgroundColor: last ? '#18A9B7' : c.barOff }} />
            <Text className="text-[11px] text-slate-400">{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- মসৃণ লাইন চার্ট (নিচে হালকা ভরাট, শেষ বিন্দুতে টুলটিপ) ----------
// width = স্ক্রিনের চওড়া থেকে হিসাব করা (কার্ডের ভেতরে বসানোর জন্য) — onLayout / state নেই
export function LineChart({ data, height = 160, format, inset = 66 }: { data: { label: string; value: number }[]; height?: number; format?: (v: number) => string; inset?: number }) {
  const { width: sw } = useWindowDimensions();
  const { c } = useTheme();
  const W = Math.max(200, sw - inset);
  const padT = 34, padB = 8, padX = 8;
  const H = height;
  const n = data.length;
  if (n < 2) return null;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  const cw = W - padX * 2, ch = H - padT - padB;
  const pts = data.map((d, i) => ({ x: padX + (i / (n - 1)) * cw, y: padT + ch - (Math.max(d.value, 0) / max) * ch }));
  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2;
    line += ` C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
  }
  const area = `${line} L ${pts[n - 1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`;
  const last = pts[n - 1];
  const tipW = 96;
  const tipLeft = Math.min(Math.max(last.x - tipW / 2, 0), W - tipW);
  const step = n <= 8 ? 1 : Math.ceil(n / 6);
  return (
    <View style={{ width: W }}>
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#18A9B7" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#18A9B7" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 1, 2].map((i) => {
            const y = padT + (ch / 2) * i;
            return <Line key={i} x1={0} y1={y} x2={W} y2={y} stroke={c.track} strokeWidth={1} strokeDasharray="4 5" />;
          })}
          <Path d={area} fill="url(#lcFill)" />
          <Path d={line} stroke="#18A9B7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Line x1={last.x} y1={last.y} x2={last.x} y2={H - padB} stroke="#18A9B7" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
          <Circle cx={last.x} cy={last.y} r={7} fill="#18A9B7" opacity={0.18} />
          <Circle cx={last.x} cy={last.y} r={4.5} fill={c.card} stroke="#18A9B7" strokeWidth={2.5} />
        </Svg>
        <View pointerEvents="none" style={{ position: 'absolute', left: tipLeft, top: Math.max(0, last.y - 34), width: tipW, alignItems: 'center', backgroundColor: c.tip, borderRadius: 10, paddingVertical: 4 }}>
          <Text className="text-white font-bold" style={{ fontSize: 12, lineHeight: 18 }}>{(format ?? ((v: number) => String(Math.round(v))))(data[n - 1].value)}</Text>
        </View>
      </View>
      <View style={{ width: W, height: 20, marginTop: 4 }}>
        {data.map((d, i) => (i % step === 0 || i === n - 1) && d.label ? (
          <Text key={i} className="text-slate-400" style={{ position: 'absolute', left: pts[i].x - 16, width: 32, textAlign: 'center', fontSize: 11, lineHeight: 16 }}>{d.label}</Text>
        ) : null)}
      </View>
    </View>
  );
}