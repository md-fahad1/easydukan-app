import { fail } from '@/db/exec';
import type { Role, User } from '@/types';

// এখন কে লগইন করা আছে — অনুমতি (permission) চেক এখান থেকে হয়
let current: User | null = null;
export const setCurrent = (u: User | null) => { current = u; };
export const getCurrent = () => current;
export const currentUserId = () => current?.id ?? null;

export const MGR: Role[] = ['OWNER', 'MANAGER'];
export function need(...roles: Role[]) {
  if (!current || !roles.includes(current.role)) fail('আপনার এই কাজের অনুমতি নেই');
}
