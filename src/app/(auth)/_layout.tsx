import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useSession } from '@/store/session';

export default function AuthLayout() {
  const { user } = useSession();
  if (user) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
