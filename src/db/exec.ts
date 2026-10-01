// ডাটাবেস এক্সিকিউটর — expo-sqlite (ফোনে) ও sql.js (টেস্টে) দুটোতেই একই কোড চলে।
export type Param = string | number | null;
export interface Exec {
  all<T = any>(sql: string, p?: Param[]): Promise<T[]>;
  first<T = any>(sql: string, p?: Param[]): Promise<T | null>;
  run(sql: string, p?: Param[]): Promise<void>;
  exec(sql: string): Promise<void>;
}

let base: Exec | null = null;
let tail: Promise<any> = Promise.resolve();

export function setExec(e: Exec) {
  base = e;
}
const db = () => {
  if (!base) throw new Error('ডাটাবেস চালু হয়নি');
  return base;
};

// সব কাজ লাইনে দাঁড়িয়ে একটার পর একটা চলে — তাই হিসাব কখনো মিশে যায় না
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const res = tail.then(job, job);
  tail = res.catch(() => {});
  return res;
}

export const read = <T>(fn: (x: Exec) => Promise<T>) => enqueue(() => fn(db()));

// লেখার কাজ: হয় সবটা সেভ হবে, নয়তো কিছুই না (BEGIN / COMMIT / ROLLBACK)
export const write = <T>(fn: (x: Exec) => Promise<T>) =>
  enqueue(async () => {
    const x = db();
    await x.exec('BEGIN');
    try {
      const r = await fn(x);
      await x.exec('COMMIT');
      return r;
    } catch (e) {
      try { await x.exec('ROLLBACK'); } catch {}
      throw e;
    }
  });

export class AppError extends Error {}
export function fail(msg: string): never {
  throw new AppError(msg);
}
