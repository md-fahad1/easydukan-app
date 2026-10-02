import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C, Rings } from '@/components/premium';

// হোম পেজের বড় টিল কার্ড।
// • গ্রেডিয়েন্ট viewBox দিয়ে কার্ডের মাপে নিজে নিজে টানা হয় (কোনো state / onLayout নেই, তাই লুপ হয় না)
// • ছায়া আলাদা বাইরের বক্সে (solid ব্যাকগ্রাউন্ড সহ) — Android-এ সাদা ভাঙা কোণা আসে না
export default function Hero({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 28, backgroundColor: C.deep, elevation: 4, shadowColor: C.deep, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}>
      <View style={{ borderRadius: 28, overflow: 'hidden', padding: 20 }}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
          <Defs>
            <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={C.deep} />
              <Stop offset="1" stopColor={C.t1} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill="url(#heroGrad)" />
        </Svg>
        <Rings style={{ top: -120, right: -130 }} />
        {children}
      </View>
    </View>
  );
}