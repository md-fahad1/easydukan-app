import { Exec, fail, read, write } from '@/db/exec';
import { DAY, dhakaDay, parseExpiry, range } from '@/lib/dates';
import { uid } from '@/lib/id';
import { r2, r4, unitFactor } from '@/lib/pharma';
import type { Product } from '@/types';
import { currentUserId, MGR, need } from './session';
import { Meta, n, ownCustomer, ownSupplier, productsByIds, sum } from './shop';

const factor = (p: any, unit: string) => unitFactor(p, unit);

// ---------- ওষুধ তৈরি / এডিট ----------
export type MedicineInput = {
  name: string; genericName?: string | null; company?: string | null; form?: string; barcode?: string | null;
  piecesPerStrip?: number; stripsPerBox?: number; priceUnit?: string; sellPrice?: number; buyPrice?: number; minQty?: number;
  openBoxes?: number; openStrips?: number; openPieces?: number; openExpiry?: string | null; openBatchNo?: string | null;
};

export const saveMedicine = (id: string | null, i: MedicineInput) =>
  write(async (x) => {
    need(...MGR);
    if (!i.name?.trim()) fail('ওষুধের নাম দিন');
    const isSyrup = i.form === 'SYRUP';
    const ppS = isSyrup ? 1 : Math.max(1, Math.floor(n(i.piecesPerStrip) || 1));
    const spB = Math.max(1, Math.floor(n(i.stripsPerBox) || 1));
    const f = factor({ piecesPerStrip: ppS, stripsPerBox: spB }, i.priceUnit || 'PIECE');

    if (i.barcode) {
      const dup = await x.first('SELECT 1 AS a FROM products WHERE barcode=? AND id != ?', [i.barcode, id ?? '']);
      if (dup) fail('এই বারকোড আগেই অন্য ওষুধে আছে');
    }
    const d = {
      name: i.name.trim(), genericName: i.genericName || null, company: i.company || null, form: i.form || 'GENERAL',
      barcode: i.barcode || null, piecesPerStrip: ppS, stripsPerBox: spB,
      sellingPrice: r4(n(i.sellPrice) / f), purchasePrice: r4(n(i.buyPrice) / f), minStock: n(i.minQty) * f,
    };

    if (id) {
      if (!(await x.first('SELECT 1 AS a FROM products WHERE id=?', [id]))) fail('ওষুধ পাওয়া যায়নি');
      await x.run(
        'UPDATE products SET name=?, genericName=?, company=?, form=?, barcode=?, piecesPerStrip=?, stripsPerBox=?, sellingPrice=?, purchasePrice=?, minStock=? WHERE id=?',
        [d.name, d.genericName, d.company, d.form, d.barcode, d.piecesPerStrip, d.stripsPerBox, d.sellingPrice, d.purchasePrice, d.minStock, id]);
      return id;
    }

    const pieces = n(i.openBoxes) * ppS * spB + n(i.openStrips) * ppS + n(i.openPieces);
    const pid = uid(), now = Date.now();
    await x.run(
      `INSERT INTO products (id,name,unit,genericName,company,form,barcode,piecesPerStrip,stripsPerBox,sellingPrice,purchasePrice,minStock,stock,createdAt)
       VALUES (?,?,'pcs',?,?,?,?,?,?,?,?,?,?,?)`,
      [pid, d.name, d.genericName, d.company, d.form, d.barcode, ppS, spB, d.sellingPrice, d.purchasePrice, d.minStock, pieces, now]);
    if (pieces > 0)
      await x.run('INSERT INTO product_batches (id,productId,batchNo,expiry,qty,cost,createdAt) VALUES (?,?,?,?,?,?,?)',
        [uid(), pid, i.openBatchNo || null, parseExpiry(i.openExpiry), pieces, d.purchasePrice, now]);
    return pid;
  });

// ---------- বিক্রি (বক্স / পাতা / পিস) ----------
export type PharmaSaleInput = {
  items: { productId: string; unit: string; qty: number; price?: number }[];
  cashAmount?: number; bkashAmount?: number; dueAmount?: number; customerId?: string | null; note?: string | null;
};

export async function pharmacySaleTx(x: Exec, userId: string | null, i: PharmaSaleInput, meta?: Meta) {
  if (!i.items?.length) fail('কমপক্ষে একটি ওষুধ যোগ করুন');
  const ids = [...new Set(i.items.map((v) => v.productId))];
  const products = await productsByIds(x, ids);
  const now = Date.now();
  const expiredRows = ids.length
    ? await x.all<{ productId: string; q: number }>(
        `SELECT productId, SUM(qty) AS q FROM product_batches WHERE productId IN (${ids.map(() => '?').join(',')}) AND qty > 0 AND expiry < ? GROUP BY productId`, [...ids, now])
    : [];

  const need: Record<string, number> = {};
  const lines = i.items.map((v) => {
    const p = products.find((p) => p.id === v.productId) ?? fail('ওষুধ পাওয়া যায়নি');
    const qty = n(v.qty);
    if (!(qty > 0)) fail('পরিমাণ দিন');
    const f = factor(p, v.unit);
    const pieces = qty * f;
    need[p.id] = (need[p.id] || 0) + pieces;
    return { productId: p.id, name: p.name, unit: v.unit, qty, pieces, price: v.price != null ? n(v.price) : r2(p.sellingPrice * f), cost: r4(p.purchasePrice * f) };
  });

  for (const p of products) {
    const exp = n(expiredRows.find((e) => e.productId === p.id)?.q);
    const available = p.stock - exp; // মেয়াদোত্তীর্ণ মাল বিক্রি হবে না
    if (need[p.id] > available + 1e-9)
      fail(`${p.name}: বিক্রির মতো স্টক নেই (আছে ${available} পিস${exp > 0 ? `, মেয়াদোত্তীর্ণ ${exp} পিস বাদে` : ''})`);
  }

  const total = r2(sum(lines.map((l) => l.qty * l.price)));
  const cost = sum(lines.map((l) => l.qty * l.cost));
  if (!(total > 0)) fail('মোট টাকা ০ হতে পারে না');

  let cash = n(i.cashAmount), bkash = n(i.bkashAmount), due = n(i.dueAmount);
  if (!cash && !bkash && !due) cash = total;
  if (Math.abs(cash + bkash + due - total) > 0.01) fail('নগদ + বিকাশ + বাকি মিলছে না');
  if (due > 0) {
    if (!i.customerId) fail('বাকির জন্য কাস্টমার বেছে নিন');
    await ownCustomer(x, i.customerId!);
  }

  const id = uid();
  await x.run('INSERT INTO sales (id,customerId,total,cost,cashAmount,bkashAmount,dueAmount,note,createdBy,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, i.customerId || null, total, cost, cash, bkash, due, i.note || null, meta ? meta.createdBy : userId, meta?.createdAt ?? now]);
  for (const l of lines)
    await x.run('INSERT INTO sale_items (id,saleId,productId,name,qty,price,cost,unit,pieces) VALUES (?,?,?,?,?,?,?,?,?)',
      [uid(), id, l.productId, l.name, l.qty, l.price, l.cost, l.unit, l.pieces]);

  for (const pid of Object.keys(need)) {
    await x.run('UPDATE products SET stock = stock - ? WHERE id=?', [need[pid], pid]);
    // FEFO: যে ব্যাচের মেয়াদ আগে শেষ হবে সেটা আগে বিক্রি
    let left = need[pid];
    const batches = await x.all<any>(
      'SELECT id, qty FROM product_batches WHERE productId=? AND qty > 0 AND (expiry IS NULL OR expiry >= ?) ORDER BY expiry IS NULL, expiry ASC, createdAt ASC', [pid, now]);
    for (const b of batches) {
      if (left <= 0) break;
      const take = Math.min(b.qty, left);
      await x.run('UPDATE product_batches SET qty = qty - ? WHERE id=?', [take, b.id]);
      left -= take;
    }
  }
  if (due > 0) await x.run('UPDATE customers SET balance = balance + ?, updatedAt=? WHERE id=?', [due, now, i.customerId!]);
  return id;
}
export const pharmacySale = (i: PharmaSaleInput) => write((x) => pharmacySaleTx(x, currentUserId(), i));

// ---------- কোম্পানি থেকে মাল কেনা (বক্স / পাতা / পিস) ----------
export type PharmaPurchaseInput = {
  supplierId?: string | null; paid?: number;
  items: { productId: string; unit: string; qty: number; cost: number; batchNo?: string | null; expiry?: string | null }[];
};

export async function pharmacyPurchaseTx(x: Exec, i: PharmaPurchaseInput, meta?: { createdAt: number }) {
  if (!i.items?.length) fail('কমপক্ষে একটি ওষুধ যোগ করুন');
  const products = await productsByIds(x, [...new Set(i.items.map((v) => v.productId))]);
  const lines = i.items.map((v) => {
    const p = products.find((p) => p.id === v.productId) ?? fail('ওষুধ পাওয়া যায়নি');
    const qty = n(v.qty), cost = n(v.cost);
    if (!(qty > 0)) fail('পরিমাণ দিন');
    const f = factor(p, v.unit);
    return { productId: p.id, name: p.name, unit: v.unit, qty, cost, pieces: qty * f, perPiece: r4(cost / f), batchNo: v.batchNo || null, expiry: parseExpiry(v.expiry) };
  });
  const total = r2(sum(lines.map((l) => l.qty * l.cost)));
  if (!(total > 0)) fail('মোট টাকা ০ হতে পারে না');
  const paid = i.paid == null ? total : Math.min(Math.max(n(i.paid), 0), total);
  const due = r2(total - paid);
  if (i.supplierId) await ownSupplier(x, i.supplierId);
  else if (due > 0) fail('বাকির জন্য কোম্পানি বেছে নিন');

  const id = uid(), now = Date.now();
  await x.run('INSERT INTO purchases (id,supplierId,total,paid,due,createdAt) VALUES (?,?,?,?,?,?)', [id, i.supplierId || null, total, paid, due, meta?.createdAt ?? now]);
  for (const l of lines) {
    await x.run('INSERT INTO purchase_items (id,purchaseId,productId,name,qty,cost,unit,pieces) VALUES (?,?,?,?,?,?,?,?)', [uid(), id, l.productId, l.name, l.qty, l.cost, l.unit, l.pieces]);
    await x.run('UPDATE products SET stock = stock + ?, purchasePrice=? WHERE id=?', [l.pieces, l.perPiece, l.productId]);
    await x.run('INSERT INTO product_batches (id,productId,batchNo,expiry,qty,cost,purchaseId,createdAt) VALUES (?,?,?,?,?,?,?,?)',
      [uid(), l.productId, l.batchNo, l.expiry, l.pieces, l.perPiece, id, now]);
  }
  if (due > 0) await x.run('UPDATE suppliers SET balance = balance + ?, updatedAt=? WHERE id=?', [due, now, i.supplierId!]);
  return id;
}
export const pharmacyPurchase = (i: PharmaPurchaseInput) => write((x) => { need(...MGR); return pharmacyPurchaseTx(x, i); });

// ---------- মেয়াদোত্তীর্ণ / নষ্ট মাল স্টক থেকে বাদ ----------
export const discardBatch = (batchId: string) =>
  write(async (x) => {
    need(...MGR);
    const b = (await x.first<any>('SELECT * FROM product_batches WHERE id=?', [batchId])) ?? fail('ব্যাচ পাওয়া যায়নি');
    await x.run('UPDATE products SET stock = stock - ? WHERE id=?', [b.qty, b.productId]);
    await x.run('UPDATE product_batches SET qty = 0 WHERE id=?', [b.id]);
  });

// ---------- রিপোর্ট ----------
export type TrendDay = { date: string; sale: number; due: number; expense: number; profit: number };

export const salesTrend = (days: number) =>
  read(async (x): Promise<TrendDay[]> => {
    need(...MGR);
    days = Math.min(Math.max(Math.floor(days) || 7, 1), 90);
    const from = range('TODAY').from - (days - 1) * DAY;
    const sales = await x.all<any>('SELECT total, dueAmount, cost, createdAt FROM sales WHERE createdAt >= ?', [from]);
    const exps = await x.all<any>('SELECT amount, createdAt FROM expenses WHERE createdAt >= ?', [from]);
    const rets = await x.all<any>('SELECT total, cost, dueAdjusted, createdAt FROM sale_returns WHERE createdAt >= ?', [from]);
    const map: Record<string, any> = {};
    for (let k = 0; k < days; k++) {
      const d = dhakaDay(from + k * DAY);
      map[d] = { date: d, sale: 0, due: 0, expense: 0, cost: 0 };
    }
    for (const s of sales) { const m = map[dhakaDay(s.createdAt)]; if (m) { m.sale += s.total; m.due += s.dueAmount; m.cost += s.cost; } }
    for (const e of exps) { const m = map[dhakaDay(e.createdAt)]; if (m) m.expense += e.amount; }
    // ট্রেন্ডে ফেরত বাদ দিয়ে নেট বিক্রি ও লাভ দেখায়
    for (const r of rets) { const m = map[dhakaDay(r.createdAt)]; if (m) { m.sale -= r.total; m.due -= r.dueAdjusted; m.cost -= r.cost; } }
    return Object.values(map).map((d: any) => ({ date: d.date, sale: d.sale, due: d.due, expense: d.expense, profit: d.sale - d.cost - d.expense }));
  });

export const lowStockMedicines = () =>
  read(async (x) => {
    need(...MGR);
    const list = await x.all<Product>('SELECT * FROM products WHERE minStock > 0 AND stock <= minStock');
    return list.sort((a, b) => a.stock / a.minStock - b.stock / b.minStock).slice(0, 50);
  });

export type ExpiryBatch = {
  id: string; productName: string; batchNo: string | null; expiry: number; qty: number; expired: boolean;
  piecesPerStrip: number; stripsPerBox: number; form: string;
};
export const expiringBatches = (days: number) =>
  read(async (x): Promise<ExpiryBatch[]> => {
    need(...MGR);
    const now = Date.now();
    const rows = await x.all<any>(
      `SELECT b.id, b.batchNo, b.expiry, b.qty, p.name AS productName, p.piecesPerStrip, p.stripsPerBox, p.form
       FROM product_batches b JOIN products p ON p.id = b.productId
       WHERE b.qty > 0 AND b.expiry IS NOT NULL AND b.expiry <= ? ORDER BY b.expiry ASC LIMIT 100`, [now + n(days) * DAY]);
    return rows.map((b) => ({ ...b, expired: b.expiry < now }));
  });

export const topSelling = (days: number) =>
  read(async (x) => {
    need(...MGR);
    const from = Date.now() - n(days) * DAY;
    const items = await x.all<any>(
      `SELECT si.productId, si.name, si.qty, si.price, si.pieces FROM sale_items si JOIN sales s ON s.id = si.saleId
       WHERE si.productId IS NOT NULL AND s.createdAt >= ?`, [from]);
    const agg: Record<string, any> = {};
    for (const it of items) {
      const a = (agg[it.productId] ||= { productId: it.productId, name: it.name, pieces: 0, revenue: 0 });
      a.pieces += it.pieces || it.qty;
      a.revenue += it.qty * it.price;
    }
    const top = Object.values(agg).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10) as any[];
    const ps = await productsByIds(x, top.map((t) => t.productId));
    return top.map((t) => {
      const p = ps.find((p) => p.id === t.productId);
      return { ...t, piecesPerStrip: p?.piecesPerStrip || 1, stripsPerBox: p?.stripsPerBox || 1, form: p?.form || 'GENERAL' };
    });
  });

// ---------- ব্যাচ অনুযায়ী স্টক ----------
export type StockBatch = { id: string; batchNo: string | null; expiry: number | null; qty: number; cost: number; receivedAt: number };
export type MedicineStock = Product & { batches: StockBatch[] };
export const batchStock = () =>
  read(async (x): Promise<MedicineStock[]> => {
    need(...MGR);
    const ps = await x.all<Product>('SELECT * FROM products ORDER BY name ASC LIMIT 1000');
    const bs = await x.all<any>('SELECT id, productId, batchNo, expiry, qty, cost, createdAt AS receivedAt FROM product_batches WHERE qty > 0 ORDER BY expiry IS NULL, expiry ASC, createdAt ASC');
    const by: Record<string, StockBatch[]> = {};
    for (const b of bs) (by[b.productId] ||= []).push(b);
    return ps.map((p) => ({ ...p, batches: by[p.id] || [] }));
  });
