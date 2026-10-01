import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as auth from '@/services/auth';
import { isPharmacy, Role, Shop, User } from '@/types';

type Ctx = {
  user: User | null; shop: Shop | null; role: Role; isPharma: boolean; employee: boolean;
  setUser: (u: User | null) => void; reload: () => Promise<void>; signOut: () => Promise<void>;
};
const C = createContext<Ctx>(null as any);
export const useSession = () => useContext(C);

export function SessionProvider({ initialUser, initialShop, children }: { initialUser: User | null; initialShop: Shop | null; children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(initialUser);
  const [shop, setShop] = useState<Shop | null>(initialShop);

  const reload = useCallback(async () => {
    setUserState(await auth.restoreSession());
    setShop(await auth.getShop());
  }, []);
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    auth.getShop().then(setShop);
  }, []);
  const signOut = useCallback(async () => {
    await auth.logout();
    setUserState(null);
  }, []);

  const value = useMemo<Ctx>(() => ({
    user, shop, role: user?.role ?? 'EMPLOYEE', isPharma: isPharmacy(shop?.shopType), employee: user?.role === 'EMPLOYEE', setUser, reload, signOut,
  }), [user, shop, setUser, reload, signOut]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
