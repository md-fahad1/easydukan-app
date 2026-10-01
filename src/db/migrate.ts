import { Exec } from './exec';
import { SCHEMA, SCHEMA_VERSION } from './schema';

export async function migrate(x: Exec) {
  const v = (await x.first<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (v < 1) await x.exec(SCHEMA);
  // ভবিষ্যতে নতুন কলাম লাগলে: if (v < 2) { await x.exec('ALTER TABLE ...'); }
  if (v < SCHEMA_VERSION) await x.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
