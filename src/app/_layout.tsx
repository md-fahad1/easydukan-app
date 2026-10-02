import '../../global.css';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { bootDb, getActiveId, isPending, listShopsNow } from '@/db/client';
import { loadTheme } from '@/lib/theme';
import { getShop, restoreSession } from '@/services/auth';
import { Boot, SessionProvider, useSession } from '@/store/session';

SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [fonts] = useFonts({
    HindSiliguri: require('@expo-google-fonts/hind-siliguri/400Regular/HindSiliguri_400Regular.ttf'),
    HindSiliguriBold: require('@expo-google-fonts/hind-siliguri/700Bold/HindSiliguri_700Bold.ttf'),
    ...Ionicons.font,
  });
  const [boot, setBoot] = useState<Boot | null>(null);
  const [fatal, setFatal] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await bootDb();
        await loadTheme();
        const user = await restoreSession();
        setBoot({ user, shop: await getShop(), shops: await listShopsNow(), activeId: getActiveId(), pending: isPending() });
      } catch (e: any) { setFatal(e?.message || 'ডাটাবেস চালু করা যায়নি'); }
    })();
  }, []);

  useEffect(() => { if ((fonts && boot) || fatal) SplashScreen.hideAsync(); }, [fonts, boot, fatal]);

  if (fatal) return <View className="flex-1 items-center justify-center p-8 bg-white"><Text className="text-rose-600 text-center">{fatal}</Text></View>;
  if (!fonts || !boot) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider initial={boot}>
        <Shell />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { epoch } = useSession();
  return (
    <>
      <StatusBar style="light" />
      <Stack key={epoch} screenOptions={{ headerShown: false, animation: 'fade' }} />
    </>
  );
}