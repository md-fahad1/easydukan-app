import * as SQLite from 'expo-sqlite';
import { Exec, setExec } from './exec';
import { migrate } from './migrate';

let opened = false;

// ফোনের ভেতরের SQLite ডাটাবেস চালু করে (ইন্টারনেট ছাড়াই সব হিসাব এখানে জমা থাকে)
export async function openDb() {
  if (opened) return;
  const db = await SQLite.openDatabaseAsync('easydukan.db');
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const x: Exec = {
    all: (s, p = []) => db.getAllAsync(s, p as any),
    first: (s, p = []) => db.getFirstAsync(s, p as any),
    run: async (s, p = []) => { await db.runAsync(s, p as any); },
    exec: (s) => db.execAsync(s),
  };
  setExec(x);
  await migrate(x);
  opened = true;
}
