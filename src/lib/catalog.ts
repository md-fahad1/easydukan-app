// বাংলাদেশের ওষুধের তালিকা (প্রায় ২১ হাজার) — ফোনের ভেতরেই থাকে, ইন্টারনেট লাগে না।
// ডেটা: src/data/catalog.json  (প্রতি লাইনে: ব্র্যান্ড ⇥ জেনেরিক ⇥ স্ট্রেংথ ⇥ ডোজ টাইপ ⇥ কোম্পানি)

export type CatalogItem = {
  id: number;
  brand: string;
  genericName: string;
  strength: string;
  dosage: string;
  form: string; // TABLET | CAPSULE | SYRUP | INJECTION | OTHER
  company: string;
};

type Row = { item: CatalogItem; hay: string; brandLc: string; genLc: string };

let rows: Row[] | null = null;

// ডেটাসেটের dosage type → অ্যাপের ফর্ম (ব্যাকএন্ডের seed-catalog.ts-এর মতোই)
export function formOf(d: string) {
  const s = d.toLowerCase();
  if (s.includes('injection') || s.includes('infusion')) return 'INJECTION';
  if (s.includes('tablet')) return 'TABLET';
  if (s.includes('capsule')) return 'CAPSULE';
  if (['syrup', 'suspension', 'drops', 'solution', 'elixir', 'emulsion'].some((k) => s.includes(k))) return 'SYRUP';
  return 'OTHER';
}

// প্রথমবার ডাকলে ফাইল পড়ে মেমোরিতে সাজায় (এরপর সব সার্চ তাৎক্ষণিক)
function load(): Row[] {
  if (rows) return rows;
  const text: string = require('../data/catalog.json').rows;
  rows = text.split('\n').map((line, i) => {
    const [brand = '', genericName = '', strength = '', dosage = '', company = ''] = line.split('\t');
    return {
      item: { id: i, brand, genericName, strength, dosage, form: formOf(dosage), company },
      hay: [brand, genericName, strength, company].join('\t').toLowerCase(), // ডোজ টাইপ বাদে — ব্যাকএন্ডের মতো
      brandLc: brand.toLowerCase(),
      genLc: genericName.toLowerCase(),
    };
  });
  return rows;
}

// ফর্ম খোলার সময় ডাকলে প্রথম টাইপে আটকাবে না
export const warmCatalog = () => { try { load(); } catch {} };

// "napa 500", "seclo", "square omep" — নাম/জেনেরিক/স্ট্রেংথ/কোম্পানির যেকোনো অংশ লিখলেই খুঁজে দেয়
export function searchCatalog(q: string, limit = 15): CatalogItem[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const tokens = s.split(/\s+/).filter(Boolean).slice(0, 4);
  const first = tokens[0];

  const hits: { r: Row; rank: number }[] = [];
  for (const r of load()) {
    if (!tokens.every((t) => r.hay.includes(t))) continue;
    // যে ব্র্যান্ডের নাম লেখার শুরুর সাথে মেলে সেগুলো আগে
    const rank = r.brandLc === s ? 0 : r.brandLc.startsWith(s) ? 1 : r.brandLc.startsWith(first) ? 2 : r.genLc.startsWith(first) ? 3 : 4;
    hits.push({ r, rank });
  }
  hits.sort((a, b) =>
    a.rank - b.rank ||
    (a.r.brandLc < b.r.brandLc ? -1 : a.r.brandLc > b.r.brandLc ? 1 : 0) ||
    (parseFloat(a.r.item.strength) || 0) - (parseFloat(b.r.item.strength) || 0),
  );
  return hits.slice(0, limit).map((h) => h.r.item);
}

// সাজেশনে ট্যাপ করলে ফর্মে যা যা বসবে (ওয়েবের pick() এর মতো)
export function fromCatalog(c: CatalogItem) {
  const plain = c.form === 'TABLET' || c.form === 'CAPSULE';
  const name = (plain ? `${c.brand} ${c.strength}` : `${c.brand} ${c.dosage} ${c.strength}`).replace(/\s+/g, ' ').trim();
  return { name, genericName: c.genericName, company: c.company, form: c.form, plain };
}