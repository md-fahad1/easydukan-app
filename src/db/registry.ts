// দোকানের তালিকা — প্রতিটি দোকানের হিসাব আলাদা SQLite ফাইলে, এখানে শুধু তালিকা ও কোনটা চালু আছে তা থাকে।
import { Exec } from './exec';
import { uid } from '@/lib/id';

export type ShopEntry = { id: string; name: string; shopType: string; file: string; createdAt: number };

export const REGISTRY_SCHEMA = `
CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, name TEXT NOT NULL, shopType TEXT NOT NULL, file TEXT NOT NULL UNIQUE, createdAt INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reg_meta (key TEXT PRIMARY KEY, value TEXT);
`;

export const listShops = (x: Exec) => x.all<ShopEntry>('SELECT * FROM shops ORDER BY createdAt ASC');

export async function addShop(x: Exec, i: { name: string; shopType: string; file: string }) {
  const id = uid();
  await x.run('INSERT INTO shops (id,name,shopType,file,createdAt) VALUES (?,?,?,?,?)', [id, i.name, i.shopType, i.file, Date.now()]);
  return id;
}
export const updateShop = (x: Exec, id: string, name: string, shopType: string) => x.run('UPDATE shops SET name=?, shopType=? WHERE id=?', [name, shopType, id]);
export const removeShopRow = (x: Exec, id: string) => x.run('DELETE FROM shops WHERE id=?', [id]);

export const getMeta = async (x: Exec, k: string) => (await x.first<{ value: string }>('SELECT value FROM reg_meta WHERE key=?', [k]))?.value ?? null;
export const setMeta = (x: Exec, k: string, v: string | null) =>
  v === null ? x.run('DELETE FROM reg_meta WHERE key=?', [k]) : x.run('INSERT OR REPLACE INTO reg_meta (key,value) VALUES (?,?)', [k, v]);