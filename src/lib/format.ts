// বাংলা ফরম্যাটিং — Intl-এর উপর ভরসা না করে নিজস্ব (সব ফোনে একই আউটপুট)
const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const bn = (v: string | number) => String(v).replace(/\d/g, (d) => BN[+d]);
export const toEn = (s: string) => (s || '').replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).replace(/[,،]/g, '.').replace(/\s/g, '');

// ইনপুট থেকে সংখ্যা (বাংলা ডিজিট লিখলেও চলবে)
export const num = (v: any) => {
  const x = Number(toEn(String(v ?? '')));
  return Number.isFinite(x) ? x : 0;
};

const MONTHS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const MONTHS_FULL = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const WEEK = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

// ভারতীয় গ্রুপিং: 1,23,456.50
export function group(n: number, max = 2) {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(max);
  let [i, f] = fixed.split('.');
  const last3 = i.slice(-3);
  const rest = i.slice(0, -3);
  i = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  if (f) f = f.replace(/0+$/, '');
  return (neg ? '-' : '') + i + (f ? '.' + f : '');
}

export const taka = (n: number) => '৳' + group(Math.round((n || 0) * 100) / 100);
export const qtyFmt = (n: number) => group(Math.round((n || 0) * 1000) / 1000, 3);

export const dateOf = (ms: number) => {
  const d = new Date(ms);
  return `${bn(d.getDate())} ${MONTHS[d.getMonth()]}`;
};
export const dateFull = (ms: number) => {
  const d = new Date(ms);
  return `${bn(d.getDate())} ${MONTHS[d.getMonth()]} ${bn(d.getFullYear())}`;
};
export const monthYear = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${bn(d.getFullYear())}`;
};
export const timeOf = (ms: number) => {
  const d = new Date(ms);
  const h = d.getHours();
  const h12 = h % 12 || 12;
  return `${bn(String(h12).padStart(2, '0'))}:${bn(String(d.getMinutes()).padStart(2, '0'))} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const todayLong = () => {
  const d = new Date();
  return `${WEEK[d.getDay()]}, ${bn(d.getDate())} ${MONTHS_FULL[d.getMonth()]}`;
};
export const dayShort = (ymd: string) => bn(ymd.slice(8));
export const dayMonth = (ymd: string) => `${bn(ymd.slice(8))}/${bn(ymd.slice(5, 7))}`;
