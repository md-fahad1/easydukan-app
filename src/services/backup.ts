import { fail, read, write } from '@/db/exec';
import { TABLES } from '@/db/schema';
import { need } from './session';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

// সব ডাটা একটা JSON ফাইলে (ফোন বদলালে বা হারালে ফিরিয়ে আনার জন্য)
export const exportAll = () =>
  read(async (x) => {
    need('OWNER');
    const tables: Record<string, any[]> = {};
    for (const t of TABLES) tables[t] = await x.all(`SELECT * FROM ${t}`);
    return JSON.stringify({ app: 'easydukan', version: 1, exportedAt: Date.now(), tables });
  });

export const importAll = (json: string) =>
  write(async (x) => {
    // নতুন ফোনে (দোকান খোলার আগে) লগইন ছাড়াই ফিরিয়ে আনা যাবে; দোকান থাকলে শুধু মালিক পারবে
    if (await x.first('SELECT 1 AS a FROM shop WHERE id=1')) need('OWNER');
    let data: any;
    try { data = JSON.parse(json); } catch { return fail('ফাইলটি ঠিক নেই'); }
    if (data?.app !== 'easydukan' || !data.tables) fail('এটা ইজিদোকানের ব্যাকআপ ফাইল নয়');
    for (const t of [...TABLES].reverse()) await x.run(`DELETE FROM ${t}`);
    await x.run('DELETE FROM meta');
    let count = 0;
    for (const t of TABLES) {
      for (const row of data.tables[t] || []) {
        const cols = Object.keys(row);
        if (!cols.length || !cols.every((c) => IDENT.test(c))) fail('ব্যাকআপ ফাইলে ভুল আছে');
        await x.run(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => row[c]));
        count++;
      }
    }
    return count;
  });
