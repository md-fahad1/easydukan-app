import { Exec, fail, read, write } from '@/db/exec';
import { TABLES } from '@/db/schema';
import { hashPassword } from '@/lib/hash';
import { uid } from '@/lib/id';
import type { Shop, User } from '@/types';
import { getCurrent, need, setCurrent } from './session';

const PHONE = /^01\d{9}$/;
const pub = (u: any): User => ({ id: u.id, name: u.name, phone: u.phone, role: u.role });

const getMeta = async (x: Exec, k: string) => (await x.first<{ value: string }>('SELECT value FROM meta WHERE key=?', [k]))?.value ?? null;

export const hasShop = () => read(async (x) => !!(await x.first('SELECT 1 AS a FROM shop WHERE id=1')));
export const getShop = () => read((x) => x.first<Shop>('SELECT name, ownerName, phone, shopType FROM shop WHERE id=1'));

export const register = (i: { name: string; shopName: string; phone: string; shopType?: string; password: string }) =>
  write(async (x) => {
    if (await x.first('SELECT 1 AS a FROM shop WHERE id=1')) fail('এই ফোনে আগেই দোকান খোলা আছে');
    if (!i.name?.trim()) fail('আপনার নাম লিখুন');
    if (!i.shopName?.trim()) fail('দোকানের নাম লিখুন');
    if (!PHONE.test(i.phone)) fail('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    if (!i.password || i.password.length < 6) fail('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    const now = Date.now();
    const salt = uid();
    const id = uid();
    await x.run('INSERT INTO shop (id,name,ownerName,phone,shopType,createdAt) VALUES (1,?,?,?,?,?)', [i.shopName.trim(), i.name.trim(), i.phone, i.shopType || 'মুদি দোকান', now]);
    await x.run('INSERT INTO users (id,name,phone,salt,password,role,createdAt) VALUES (?,?,?,?,?,?,?)', [id, i.name.trim(), i.phone, salt, hashPassword(i.password, salt), 'OWNER', now]);
    await x.run("INSERT OR REPLACE INTO meta (key,value) VALUES ('session',?)", [id]);
    const u = pub({ id, name: i.name.trim(), phone: i.phone, role: 'OWNER' });
    setCurrent(u);
    return u;
  });

export const login = (phone: string, password: string) =>
  write(async (x) => {
    const u = await x.first<any>('SELECT * FROM users WHERE phone=?', [phone.trim()]);
    if (!u || hashPassword(password, u.salt) !== u.password) fail('মোবাইল নম্বর বা পাসওয়ার্ড ভুল');
    await x.run("INSERT OR REPLACE INTO meta (key,value) VALUES ('session',?)", [u.id]);
    const me = pub(u);
    setCurrent(me);
    return me;
  });

// অ্যাপ খুললে আগের লগইন ফিরিয়ে আনে (ইন্টারনেট ছাড়াই)
export const restoreSession = () =>
  read(async (x) => {
    const id = await getMeta(x, 'session');
   const u = id ? await x.first<any>('SELECT * FROM users WHERE id=?', [id]) : null;
    if (!u) { setCurrent(null); return null; } 
    const me = pub(u);
    setCurrent(me);
    return me;
  });

export const logout = () =>
  write(async (x) => {
    await x.run("DELETE FROM meta WHERE key='session'");
    setCurrent(null);
  });

export const users = () => read(async (x) => { need('OWNER'); return (await x.all<any>('SELECT * FROM users ORDER BY createdAt')).map(pub); });

export const addUser = (i: { name: string; phone: string; password: string; role: string }) =>
  write(async (x) => {
    need('OWNER');
    if (!i.name?.trim()) fail('নাম দিন');
    if (!PHONE.test(i.phone)) fail('সঠিক মোবাইল নম্বর দিন');
    if (!['MANAGER', 'EMPLOYEE'].includes(i.role)) fail('ভুল ভূমিকা');
    if (!i.password || i.password.length < 6) fail('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    if (await x.first('SELECT 1 AS a FROM users WHERE phone=?', [i.phone])) fail('এই নম্বর আগেই ব্যবহার হয়েছে');
    const salt = uid();
    await x.run('INSERT INTO users (id,name,phone,salt,password,role,createdAt) VALUES (?,?,?,?,?,?,?)', [uid(), i.name.trim(), i.phone, salt, hashPassword(i.password, salt), i.role, Date.now()]);
  });

export const removeUser = (id: string) =>
  write(async (x) => {
    need('OWNER');
    if (getCurrent()?.id === id) fail('নিজেকে মুছা যাবে না');
    await x.run('DELETE FROM users WHERE id=?', [id]);
  });

export const changePassword = (oldPw: string, newPw: string) =>
  write(async (x) => {
    const me = getCurrent();
    if (!me) fail('আগে লগইন করুন');
    const u = await x.first<any>('SELECT * FROM users WHERE id=?', [me!.id]);
    if (!u || hashPassword(oldPw, u.salt) !== u.password) fail('পুরনো পাসওয়ার্ড ভুল');
    if (!newPw || newPw.length < 6) fail('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    const salt = uid();
    await x.run('UPDATE users SET salt=?, password=? WHERE id=?', [salt, hashPassword(newPw, salt), me!.id]);
  });

// সব ডাটা মুছে নতুন করে শুরু (শুধু মালিক)
export const wipeAll = () =>
  write(async (x) => {
    need('OWNER');
    for (const t of [...TABLES].reverse()) await x.run(`DELETE FROM ${t}`);
    await x.run('DELETE FROM meta');
    setCurrent(null);
  });
