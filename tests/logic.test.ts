// চালানোর নিয়ম:  npm test   (sql.js দিয়ে আসল SQLite-এ সব হিসাব যাচাই হয়)
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import initSqlJs from 'sql.js';
import { Exec, setExec } from '../src/db/exec';
import { migrate } from '../src/db/migrate';
import { sha256 } from '../src/lib/hash';
import { group, taka, toEn, num, bn } from '../src/lib/format';
import { parseExpiry, monthEnd } from '../src/lib/dates';
import * as auth from '../src/services/auth';
import * as shop from '../src/services/shop';
import * as ph from '../src/services/pharmacy';
import * as ret from '../src/services/returns';
import * as ed from '../src/services/edits';
import * as bk from '../src/services/backup';
import { setCurrent } from '../src/services/session';

const DAY = 86400000;
let passed = 0;
const t = async (name: string, fn: () => Promise<void> | void) => {
  try { await fn(); passed++; console.log('  ✓', name); } catch (e: any) { console.log('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
};
const near = (a: number, b: number, m = '') => assert.ok(Math.abs(a - b) < 0.011, `${m} পেলাম ${a}, চাই ${b}`);
const rejects = async (p: Promise<any>, msg: string) => {
  try { await p; } catch (e: any) { assert.ok(e.message.includes(msg), `error "${e.message}" এ "${msg}" নেই`); return; }
  assert.fail(`error হওয়ার কথা ছিল: ${msg}`);
};

async function makeDb(): Promise<Exec> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  const x: Exec = {
    all: async (s, p = []) => { const st = db.prepare(s); st.bind(p as any); const out: any[] = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out as any; },
    first: async (s, p = []) => (await x.all(s, p))[0] ?? null,
    run: async (s, p = []) => { db.run(s, p as any); },
    exec: async (s) => { db.exec(s); },
  };
  setExec(x);
  await migrate(x);
  return x;
}

async function main() {
  console.log('\nলাইব্রেরি');
  await t('SHA-256 Node-এর সাথে মেলে', () => {
    for (const s of ['', 'abc', 'পাসওয়ার্ড ১২৩৪৫৬', 'x'.repeat(200)]) assert.equal(sha256(s), createHash('sha256').update(s).digest('hex'));
  });
  await t('টাকা ফরম্যাট (ভারতীয় গ্রুপিং) ও বাংলা সংখ্যা', () => {
    assert.equal(group(1234567.5), '12,34,567.5');
    assert.equal(taka(0), '৳0');
    assert.equal(taka(1250), '৳1,250');
    assert.equal(num('১২৫.৫'), 125.5);
    assert.equal(toEn('৳'), '৳');
    assert.equal(bn(2026), '২০২৬');
  });
  await t('মেয়াদ তারিখ পার্স', () => {
    assert.equal(monthEnd('2027-02'), '2027-02-28');
    assert.equal(monthEnd('2028-02'), '2028-02-29');
    assert.ok(parseExpiry('2027-03-31')! > Date.UTC(2027, 2, 31));
  });

  const x = await makeDb();

  console.log('\nঅ্যাকাউন্ট');
  await t('রেজিস্টার ও লগইন', async () => {
    assert.equal(await auth.hasShop(), false);
    await rejects(auth.register({ name: 'রহমান', shopName: 'দোকান', phone: '123', password: '123456' }), 'মোবাইল');
    await rejects(auth.register({ name: 'রহমান', shopName: 'দোকান', phone: '01700000000', password: '123' }), 'পাসওয়ার্ড');
    const u = await auth.register({ name: 'রহমান', shopName: 'রহমান গ্রোসারি', phone: '01700000000', shopType: 'মুদি দোকান', password: '123456' });
    assert.equal(u.role, 'OWNER');
    assert.equal(await auth.hasShop(), true);
    await rejects(auth.register({ name: 'অন্য', shopName: 'ক', phone: '01800000000', password: '123456' }), 'আগেই');
    await auth.logout();
    await rejects(auth.login('01700000000', 'ভুল-পাসওয়ার্ড'), 'ভুল');
    await auth.login('01700000000', '123456');
    assert.equal((await auth.restoreSession())?.name, 'রহমান');
  });
  await t('কর্মচারী/ম্যানেজার ও অনুমতি', async () => {
    await auth.addUser({ name: 'রুবেল', phone: '01700000002', password: '123456', role: 'EMPLOYEE' });
    await auth.addUser({ name: 'জামাল', phone: '01700000001', password: '123456', role: 'MANAGER' });
    await rejects(auth.addUser({ name: 'X', phone: '01700000002', password: '123456', role: 'EMPLOYEE' }), 'আগেই ব্যবহার');
    assert.equal((await auth.users()).length, 3);
    await auth.login('01700000002', '123456'); // কর্মচারী
    await rejects(shop.summary('TODAY'), 'অনুমতি');
    await rejects(shop.createExpense('ভাড়া', 100), 'অনুমতি');
    await rejects(auth.users(), 'অনুমতি');
    await auth.login('01700000001', '123456'); // ম্যানেজার
    await shop.summary('TODAY');
    await rejects(auth.users(), 'অনুমতি');
    await auth.login('01700000000', '123456');
  });

  console.log('\nমুদি দোকান');
  let rice = '', oil = '', karim = '', rahman = '', saleId = '';
  await t('পণ্য / কাস্টমার / মালদাতা তৈরি', async () => {
    rice = await shop.createProduct({ name: 'চাল', unit: 'kg', purchasePrice: 65, sellingPrice: 75, stock: 40, minStock: 20 });
    oil = await shop.createProduct({ name: 'সয়াবিন তেল', unit: 'লিটার', purchasePrice: 165, sellingPrice: 180, stock: 6, minStock: 10 });
    karim = await shop.createCustomer('করিম ভাই', '01711111111');
    rahman = await shop.createSupplier('Rahman Traders');
    await rejects(shop.createCustomer('  '), 'নাম');
    assert.equal((await shop.products()).length, 2);
  });
  await t('বিক্রি (নগদ + বাকি) — স্টক ও বাকি ঠিক হয়', async () => {
    saleId = await shop.createSale({ items: [{ productId: rice, qty: 10 }, { productId: oil, qty: 1 }], cashAmount: 500, dueAmount: 430, customerId: karim });
    const p = (await shop.products()).find((p) => p.id === rice)!;
    near(p.stock, 30);
    near((await shop.customers())[0].balance, 430);
    await rejects(shop.createSale({ items: [{ productId: rice, qty: 1 }], cashAmount: 10 }), 'মিলছে না');
    await rejects(shop.createSale({ items: [{ productId: rice, qty: 1 }], dueAmount: 75 }), 'কাস্টমার');
    await shop.createSale({ amount: 500 }); // দ্রুত বিক্রি
    await shop.createSale({ amount: 1200, bkashAmount: 1200 });
  });
  await t('খরচ / বাকি আদায় / মালদাতা পরিশোধ', async () => {
    await shop.createExpense('বিদ্যুৎ', 300, 'বিল');
    await shop.receivePayment(karim, 100);
    await rejects(shop.receivePayment(karim, 0), 'টাকা');
    near((await shop.customer(karim))!.balance, 330);
    await shop.createPurchase({ supplierId: rahman, items: [{ productId: rice, qty: 20, cost: 66 }], paid: 1000 });
    near((await shop.suppliers())[0].balance, 320);
    await rejects(shop.createPurchase({ total: 500, paid: 100 }), 'মালদাতা');
    await shop.paySupplier(rahman, 20);
    near((await shop.suppliers())[0].balance, 300);
    const p = (await shop.products()).find((p) => p.id === rice)!;
    near(p.stock, 50); near(p.purchasePrice, 66);
  });
  await t('আজকের হিসাব (summary) মেলে', async () => {
    const s = await shop.summary('TODAY');
    near(s.totalSale, 930 + 500 + 1200);
    near(s.cash, 500 + 500);
    near(s.bkash, 1200);
    near(s.due, 430);
    near(s.expense, 300);
    near(s.received, 100);
    // নগদ+বিকাশ+আদায় − খরচ − মালদাতাকে দেওয়া − মালের পেমেন্ট
    near(s.cashInHand, 1000 + 1200 + 100 - 300 - 20 - 1000);
    near(s.customerDue, 330); near(s.supplierDue, 300);
    assert.equal(s.saleCount, 3);
    assert.equal(s.lowStockCount, 1); // তেল: ৫ ≤ ১০
    near(s.profit, 2630 - (650 + 165 + 0 + 0) - 300);
    await shop.closeDay(); await shop.closeDay(); // দুইবার চাপলেও একটাই এন্ট্রি
    assert.equal((await shop.closings()).length, 1);
  });
  await t('বাকির খাতা', async () => {
    const l = await shop.customerLedger(karim);
    assert.deepEqual(l.map((e) => e.type).sort(), ['BAKI', 'JOMA']);
  });

  console.log('\nফেরত / সংশোধন / মুছা');
  await t('ফেরত: আগে বাকি কমে, তারপর টাকা ফেরত', async () => {
    const list = await ret.returnableSales(1);
    const s = list.find((s) => s.id === saleId)!;
    near(s.dueLeft, 430);
    const item = s.items.find((i) => i.name === 'চাল')!; // ১০ কেজি × ৭৫ = ৭৫০
    await rejects(ret.createSaleReturn({ saleId, items: [{ saleItemId: item.id, qty: 11 }] }), 'সর্বোচ্চ');
    const r = await ret.createSaleReturn({ saleId, items: [{ saleItemId: item.id, qty: 6 }] }); // ৪৫০
    near(r.total, 450); near(r.dueAdjusted, 430); near(r.refund, 20);
    near((await shop.customer(karim))!.balance, 330 - 430); // আগের ৩৩০ থেকে ৪৩০ কমে (আদায়ের পর) → −১০০ = কাস্টমার পাবে
    near((await shop.products()).find((p) => p.id === rice)!.stock, 56);
    const s2 = await shop.summary('TODAY');
    near(s2.totalSale, 2630 - 450); near(s2.returnTotal, 450); near(s2.due, 0);
    near(s2.cashInHand, 980 - 20, 'ফেরতের পর হাতে টাকা'); // ৪৩০ বাকি থেকে কমেছে (নগদ নয়), ২০ নগদ ফেরত
    assert.equal((await ret.saleReturnsHistory(1)).length, 1);
    await rejects(ed.deleteSale(saleId), 'ফেরত');
  });
  await t('বিক্রি সংশোধন — স্টক/বাকি আগের অবস্থায় গিয়ে নতুন হিসাব', async () => {
    const cid = await shop.createCustomer('সালাম');
    const id = await shop.createSale({ items: [{ productId: rice, qty: 5, price: 75 }], dueAmount: 375, customerId: cid });
    near((await shop.products()).find((p) => p.id === rice)!.stock, 51);
    const before = (await ed.manageSales(1)).find((s) => s.id === id)!;
    await ed.editSale(id, { items: [{ productId: rice, qty: 2, price: 80 }], cashAmount: 60, dueAmount: 100, customerId: cid }, false);
    near((await shop.products()).find((p) => p.id === rice)!.stock, 54);
    near((await shop.customers()).find((c) => c.id === cid)!.balance, 100);
    const after = (await ed.manageSales(1)).find((s) => s.total === 160)!;
    assert.equal(after.createdAt, before.createdAt); // তারিখ বদলায়নি
    await ed.deleteSale(after.id);
    near((await shop.products()).find((p) => p.id === rice)!.stock, 56);
    near((await shop.customers()).find((c) => c.id === cid)!.balance, 0);
  });
  await t('মাল কেনা সংশোধন / মুছা — বিক্রি হয়ে গেলে আটকায়', async () => {
    const id = await shop.createPurchase({ supplierId: rahman, items: [{ productId: oil, qty: 10, cost: 170 }], paid: 700 }); // ১৭০০, বাকি ১০০০
    near((await shop.suppliers())[0].balance, 1300);
    await ed.editPurchase(id, { supplierId: rahman, items: [{ productId: oil, qty: 10, cost: 160 }], paid: 1600 }, false);
    near((await shop.suppliers())[0].balance, 300);
    await shop.createSale({ items: [{ productId: oil, qty: 14 }] }); // স্টক ১৫ → ১
    await rejects(ed.deletePurchase((await ed.managePurchases(1))[0].id), 'বিক্রি হয়ে গেছে');
  });

  console.log('\nফার্মেসি');
  let napa = '', syrup = '', batchOld = '';
  await t('ওষুধ তৈরি — দাম/স্টক বক্স-পাতা-পিসে', async () => {
    // ১ পাতা = ১০ পিস, ১ বক্স = ১০ পাতা (১০০ পিস)। দাম প্রতি বক্স ১০০০ টাকা
    napa = await ph.saveMedicine(null, { name: 'Napa 500mg', genericName: 'Paracetamol', form: 'TABLET', piecesPerStrip: 10, stripsPerBox: 10, priceUnit: 'BOX', sellPrice: 1000, buyPrice: 800, minQty: 1, openBoxes: 1, openStrips: 2, openPieces: 5, openExpiry: '2020-01-31', openBatchNo: 'OLD1' });
    const p = (await shop.products()).find((p) => p.id === napa)!;
    near(p.stock, 125); near(p.sellingPrice, 10); near(p.purchasePrice, 8); near(p.minStock, 100);
    await rejects(ph.saveMedicine(null, { name: 'X', barcode: '123' }).then(() => ph.saveMedicine(null, { name: 'Y', barcode: '123' })), 'বারকোড');
    syrup = await ph.saveMedicine(null, { name: 'Zimax Syrup', form: 'SYRUP', piecesPerStrip: 10, stripsPerBox: 12, priceUnit: 'PIECE', sellPrice: 120, buyPrice: 90 });
    const s = (await shop.products()).find((p) => p.id === syrup)!;
    assert.equal(s.piecesPerStrip, 1); assert.equal(s.stripsPerBox, 12);
  });
  await t('মেয়াদোত্তীর্ণ মাল বিক্রি হয় না', async () => {
    // ১২৫ পিস স্টক, সবই মেয়াদোত্তীর্ণ (২০২০)
    await rejects(ph.pharmacySale({ items: [{ productId: napa, unit: 'PIECE', qty: 1 }] }), 'বিক্রির মতো স্টক নেই');
    const ex = await ph.expiringBatches(90);
    assert.equal(ex.length, 1); assert.equal(ex[0].expired, true);
    batchOld = ex[0].id;
  });
  await t('কেনা — নতুন ব্যাচ; বিক্রি — FEFO (আগে মেয়াদ শেষ যেটার)', async () => {
    const soon = new Date(Date.now() + 40 * DAY).toISOString().slice(0, 10);
    const later = new Date(Date.now() + 400 * DAY).toISOString().slice(0, 10);
    await ph.pharmacyPurchase({ supplierId: rahman, paid: 0, items: [
      { productId: napa, unit: 'BOX', qty: 1, cost: 800, batchNo: 'LATER', expiry: later },
      { productId: napa, unit: 'STRIP', qty: 5, cost: 80, batchNo: 'SOON', expiry: soon },
    ] }); // ৮০০ + ৪০০ = ১২০০ বাকি
    near((await shop.suppliers()).find((s) => s.id === rahman)!.balance, 300 + 1200);
    const stk = (await ph.batchStock()).find((p) => p.id === napa)!;
    near(stk.stock, 125 + 100 + 50);
    assert.deepEqual(stk.batches.map((b) => b.batchNo), ['OLD1', 'SOON', 'LATER']); // মেয়াদ আগে শেষ যেটার, সেটা আগে
    // ২ পাতা বিক্রি = ২০ পিস, দাম ১০০/পাতা → ২০০
    await ph.pharmacySale({ items: [{ productId: napa, unit: 'STRIP', qty: 2 }] });
    const after = (await ph.batchStock()).find((p) => p.id === napa)!;
    near(after.batches.find((b) => b.batchNo === 'SOON')!.qty, 30); // ৫০ − ২০
    near(after.batches.find((b) => b.batchNo === 'LATER')!.qty, 100);
    near(after.stock, 275 - 20);
    // মেয়াদোত্তীর্ণ ২৫ পিস + বাকি (৩০+১০০): মোট বিক্রিযোগ্য ১৩০ — ১৩১ পিস চাইলে আটকাবে
    await rejects(ph.pharmacySale({ items: [{ productId: napa, unit: 'PIECE', qty: 131 }] }), 'মেয়াদোত্তীর্ণ');
  });
  await t('বাকিতে বিক্রি, ব্যাচ বাদ, কম স্টক, টপ-সেলিং, ট্রেন্ড', async () => {
    const c = await shop.createCustomer('রহিমা');
    const id2 = await ph.pharmacySale({ items: [{ productId: napa, unit: 'STRIP', qty: 3 }], cashAmount: 100, dueAmount: 200, customerId: c });
    assert.ok(id2);
    near((await shop.customers()).find((x) => x.id === c)!.balance, 200);
    await ph.discardBatch(batchOld);
    const napaNow = (await shop.products()).find((p) => p.id === napa)!;
    const active = (await ph.batchStock()).find((p) => p.id === napa)!;
    near(napaNow.stock, active.batches.reduce((a, b) => a + b.qty, 0), 'স্টক = ব্যাচের যোগফল');
    assert.equal((await ph.expiringBatches(90)).filter((e) => e.expired).length, 0);
    assert.ok((await ph.topSelling(30)).length >= 1);
    const tr = await ph.salesTrend(7);
    assert.equal(tr.length, 7);
    near(tr[6].sale, (await shop.summary('TODAY')).totalSale);
    await ph.lowStockMedicines();
  });
  await t('ফার্মেসি বিক্রি ফেরত ব্যাচে যায়; সংশোধনে পিস মেলে', async () => {
    const before = (await shop.products()).find((p) => p.id === napa)!.stock;
    const id = await ph.pharmacySale({ items: [{ productId: napa, unit: 'STRIP', qty: 2 }] });
    const sale = (await ret.returnableSales(1)).find((s) => s.id === id)!;
    await ret.createSaleReturn({ saleId: id, items: [{ saleItemId: sale.items[0].id, qty: 1 }] });
    near((await shop.products()).find((p) => p.id === napa)!.stock, before - 10);
    await rejects(ed.editSale(id, { items: [{ productId: napa, unit: 'PIECE', qty: 5 }] }, true), 'ফেরত');
    const id3 = await ph.pharmacySale({ items: [{ productId: napa, unit: 'STRIP', qty: 1 }] });
    await ed.editSale(id3, { items: [{ productId: napa, unit: 'PIECE', qty: 4 }] }, true);
    const stock = (await shop.products()).find((p) => p.id === napa)!.stock;
    const bsum = (await ph.batchStock()).find((p) => p.id === napa)!.batches.reduce((a, b) => a + b.qty, 0);
    near(stock, before - 10 - 4);
    near(stock, bsum, 'সংশোধনের পরও স্টক = ব্যাচের যোগফল');
  });

  console.log('\nব্যাকআপ');
  await t('এক্সপোর্ট → সব মুছে → রিস্টোর: ডাটা হুবহু ফেরে', async () => {
    const summaryBefore = await shop.summary('MONTH');
    const json = await bk.exportAll();
    const counts: Record<string, number> = {};
    for (const tb of ['sales', 'sale_items', 'product_batches', 'customers']) counts[tb] = (await x.first<any>(`SELECT COUNT(*) c FROM ${tb}`))!.c;
    await auth.wipeAll();
    assert.equal(await auth.hasShop(), false);
    await bk.importAll(json);
    for (const tb of Object.keys(counts)) assert.equal((await x.first<any>(`SELECT COUNT(*) c FROM ${tb}`))!.c, counts[tb], tb);
    await auth.login('01700000000', '123456');
    const s2 = await shop.summary('MONTH');
    near(s2.totalSale, summaryBefore.totalSale); near(s2.cashInHand, summaryBefore.cashInHand);
    await rejects(bk.importAll('{"app":"other"}'), 'ব্যাকআপ');
    await rejects(bk.importAll('না-JSON'), 'ঠিক নেই');
    setCurrent(null);
  });

  console.log(`\n${passed} টি পরীক্ষা পাস${process.exitCode ? ' — কিছু ফেল!' : ' ✅'}`);
}
main();
