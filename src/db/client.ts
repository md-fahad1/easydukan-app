import * as SQLite from 'expo-sqlite';
import { File } from 'expo-file-system';
import { uid } from '@/lib/id';
import { Exec, setExec } from './exec';
import { migrate } from './migrate';
import { addShop, getMeta, listShops, removeShopRow, REGISTRY_SCHEMA, setMeta, ShopEntry, updateShop } from './registry';

export type { ShopEntry };

// registry.db = শুধু দোকানের তালিকা। প্রতিটি দোকানের হিসাব আলাদা ফাইলে (shop_xxxx.db)।
// "pending" = নতুন দোকানের ফাঁকা ডাটাবেস খোলা আছে, কিন্তু রেজিস্ট্রেশন শেষ হয়নি (তালিকায় ওঠেনি)।
let regDb: SQLite.SQLiteDatabase | null = null;
let reg: Exec | null = null;
let cur: SQLite.SQLiteDatabase | null = null;
let activeId = '';
let prevActive = '';
let pending = false;
let pendingFile = '';

export const getActiveId = () => activeId;
export const isPending = () => pending;

const toExec = (db: SQLite.SQLiteDatabase): Exec => ({
  all: (s, p = []) => db.getAllAsync(s, p as any),
  first: (s, p = []) => db.getFirstAsync(s, p as any),
  run: async (s, p = []) => { await db.runAsync(s, p as any); },
  exec: (s) => db.execAsync(s),
});

async function registry(): Promise<Exec> {
  if (reg) return reg;
  regDb = await SQLite.openDatabaseAsync('registry.db');
  await regDb.execAsync(REGISTRY_SCHEMA);
  reg = toExec(regDb);
  await importLegacy(reg);
  return reg;
}

// আগের ভার্সনে সব ডাটা easydukan.db-তে ছিল — সেটাকে প্রথম দোকান হিসেবে তালিকায় তোলা (পুরনো ডাটা হারাবে না)
async function importLegacy(r: Exec) {
  if (await getMeta(r, 'legacyChecked')) return;
  try {
    if (new File(SQLite.defaultDatabaseDirectory, 'easydukan.db').exists) {
      const old = await SQLite.openDatabaseAsync('easydukan.db');
      let s: any = null;
      try { s = await old.getFirstAsync<any>('SELECT name, shopType FROM shop WHERE id=1'); } catch {}
      await old.closeAsync();
      if (s) {
        await addShop(r, { name: s.name, shopType: s.shopType, file: 'easydukan.db' });
        await setMeta(r, 'active', (await listShops(r))[0].id);
      } else await SQLite.deleteDatabaseAsync('easydukan.db');
    }
  } catch {}
  await setMeta(r, 'legacyChecked', '1');
}

async function closeCurrent() {
  if (cur) { try { await cur.closeAsync(); } catch {} cur = null; }
}
async function openFile(file: string) {
  await closeCurrent();
  const db = await SQLite.openDatabaseAsync(file);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const x = toExec(db);
  await migrate(x);
  setExec(x);
  cur = db;
}
const delFile = async (f: string) => { try { await SQLite.deleteDatabaseAsync(f); } catch {} };

export const listShopsNow = async () => listShops(await registry());

// অ্যাপ চালু: শেষবার খোলা দোকান খোলে। কোনো দোকান না থাকলে নতুন ফাঁকা (pending) ডাটাবেস খোলে।
export async function bootDb() {
  const r = await registry();
  const stale = await getMeta(r, 'pendingFile'); // আগের বার রেজিস্ট্রেশনের মাঝখানে অ্যাপ বন্ধ হলে পড়ে থাকা ফাঁকা ফাইল
  if (stale) { await delFile(stale); await setMeta(r, 'pendingFile', null); }
  const list = await listShops(r);
  if (!list.length) { await startPending(); return; }
  const want = await getMeta(r, 'active');
  await switchShopDb((list.find((s) => s.id === want) ?? list[0]).id);
}

export async function switchShopDb(id: string) {
  const r = await registry();
  const s = (await listShops(r)).find((x) => x.id === id);
  if (!s) throw new Error('দোকান পাওয়া যায়নি');
  await openFile(s.file);
  activeId = id; pending = false; pendingFile = '';
  await setMeta(r, 'active', id);
  await setMeta(r, 'pendingFile', null);
}

export async function startPending() {
  const r = await registry();
  if (!pending) prevActive = activeId;
  const file = `shop_${uid().slice(0, 8)}.db`;
  await openFile(file);
  pending = true; pendingFile = file; activeId = '';
  await setMeta(r, 'pendingFile', file);
}

// রেজিস্ট্রেশন/রিস্টোর শেষ — ফাঁকা ডাটাবেসটা এবার আসল দোকান হিসেবে তালিকায় ওঠে
export async function adoptPending(name: string, shopType: string) {
  const r = await registry();
  if (!pending) return;
  const id = await addShop(r, { name, shopType, file: pendingFile });
  await setMeta(r, 'active', id);
  await setMeta(r, 'pendingFile', null);
  activeId = id; pending = false; pendingFile = ''; prevActive = '';
}

// নতুন দোকান যোগ করা বাতিল: ফাঁকা ফাইল মুছে আগের দোকানে ফেরা
export async function cancelPending() {
  const r = await registry();
  if (!pending) return;
  const back = prevActive;
  await closeCurrent();
  await delFile(pendingFile);
  await setMeta(r, 'pendingFile', null);
  pending = false; pendingFile = ''; prevActive = '';
  if (back) await switchShopDb(back); else await startPending();
}

// শুধু এই দোকান মুছে ফেলা; অন্য দোকান থাকলে প্রথমটা খোলে, না থাকলে নতুন ফাঁকা ডাটাবেস
export async function removeShopDb(id: string) {
  const r = await registry();
  const s = (await listShops(r)).find((x) => x.id === id);
  if (!s) return;
  await closeCurrent();
  await delFile(s.file);
  await removeShopRow(r, id);
  await setMeta(r, 'active', null);
  activeId = '';
  const rest = await listShops(r);
  if (rest.length) await switchShopDb(rest[0].id); else await startPending();
}

// ব্যাকআপ রিস্টোরের পর দোকানের নাম/ধরন বদলাতে পারে — তালিকা ঠিক রাখা
export async function syncShopMeta(name: string, shopType: string) {
  if (!activeId) return;
  await updateShop(await registry(), activeId, name, shopType);
}