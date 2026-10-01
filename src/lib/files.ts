import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { dhakaDay } from './dates';

// ব্যাকআপ ফাইল শেয়ার (WhatsApp / Drive / Files-এ সেভ)
export async function shareBackup(json: string) {
  const f = new File(Paths.cache, `easydukan-backup-${dhakaDay()}.json`);
  if (f.exists) f.delete();
  f.create();
  f.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new Error('এই ফোনে শেয়ার করা যাচ্ছে না');
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'ইজিদোকান ব্যাকআপ' });
}

// ফোন থেকে ব্যাকআপ ফাইল বেছে টেক্সট পড়া (বাতিল করলে null)
export async function pickBackup(): Promise<string | null> {
  const r: any = await File.pickFileAsync();
  const file: any = Array.isArray(r) ? r[0] : r?.file ?? r?.result ?? r;
  if (!file || r?.canceled) return null;
  return await file.text();
}
