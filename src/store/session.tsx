import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { adoptPending, cancelPending, getActiveId, isPending, listShopsNow, removeShopDb, ShopEntry, startPending, switchShopDb, syncShopMeta } from '@/db/client';
import * as auth from '@/services/auth';
import { need, setCurrent } from '@/services/session';
import { isPharmacy, Role, Shop, User } from '@/types';

type Ctx = {
  user: User | null; shop: Shop | null; shops: ShopEntry[]; activeId: string; pending: boolean; epoch: number;
  role: Role; isPharma: boolean; employee: boolean;
  setUser: (u: User | null) => void; reload: () => Promise<void>; signOut: () => Promise<void>;
  switchTo: (id: string, restore?: boolean) => Promise<void>;
  addNew: () => Promise<void>; adopt: () => Promise<User | null>; cancelNew: () => Promise<void>; removeCurrent: () => Promise<void>;
};
const C = createContext<Ctx>(null as any);
export const useSession = () => useContext(C);

export type Boot = { user: User | null; shop: Shop | null; shops: ShopEntry[]; activeId: string; pending: boolean };

export function SessionProvider({ initial, children }: { initial: Boot; children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(initial.user);
  const [shop, setShop] = useState<Shop | null>(initial.shop);
  const [shops, setShops] = useState<ShopEntry[]>(initial.shops);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [pending, setPending] = useState(initial.pending);
  const [epoch, setEpoch] = useState(0); // দোকান বদলালে বাড়ে — সব স্ক্রিন নতুন করে লোড হয়

  const refresh = useCallback(async () => {
    setShops(await listShopsNow());
    setActiveId(getActiveId());
    setPending(isPending());
    setShop(await auth.getShop());
  }, []);
  const after = useCallback(async (u: User | null) => { setUserState(u); setEpoch((e) => e + 1); await refresh(); }, [refresh]);

  const reload = useCallback(async () => {
    setUserState(await auth.restoreSession());
    const s = await auth.getShop();
    if (s && !isPending()) await syncShopMeta(s.name, s.shopType);
    await refresh();
  }, [refresh]);
  const setUser = useCallback((u: User | null) => { setUserState(u); refresh(); }, [refresh]);
  const signOut = useCallback(async () => { await auth.logout(); setUserState(null); }, []);

  // restore=false: লগইন স্ক্রিন থেকে বদলালে আবার পাসওয়ার্ড দিয়ে ঢুকতে হবে
  const switchTo = useCallback(async (id: string, restore = true) => {
    await switchShopDb(id);
    setCurrent(null);
    await after(restore ? await auth.restoreSession() : null);
  }, [after]);
  const addNew = useCallback(async () => { await startPending(); setCurrent(null); await after(null); }, [after]);
  const adopt = useCallback(async () => {
    const s = await auth.getShop();
    if (!s) throw new Error('দোকানের তথ্য পাওয়া যায়নি');
    await adoptPending(s.name, s.shopType);
    const u = await auth.restoreSession();
    await after(u);
    return u;
  }, [after]);
  const cancelNew = useCallback(async () => {
    await cancelPending();
    setCurrent(null);
    await after(await auth.restoreSession());
  }, [after]);
  const removeCurrent = useCallback(async () => {
    need('OWNER');
    await removeShopDb(getActiveId());
    setCurrent(null);
    await after(isPending() ? null : await auth.restoreSession());
  }, [after]);

  const value = useMemo<Ctx>(() => ({
    user, shop, shops, activeId, pending, epoch, role: user?.role ?? 'EMPLOYEE', isPharma: isPharmacy(shop?.shopType), employee: user?.role === 'EMPLOYEE',
    setUser, reload, signOut, switchTo, addNew, adopt, cancelNew, removeCurrent,
  }), [user, shop, shops, activeId, pending, epoch, setUser, reload, signOut, switchTo, addNew, adopt, cancelNew, removeCurrent]);
  return <C.Provider value={value}>{children}</C.Provider>;
}