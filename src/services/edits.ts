import { Exec, fail, read, write } from '@/db/exec';
import { dhakaDay, sinceDays } from '@/lib/dates';
import { r4 } from '@/lib/pharma';
import { uid } from '@/lib/id';
import { currentUserId, MGR, need } from './session';
import { createPurchaseTx, createSaleTx, PurchaseInput, SaleInput } from './shop';
import { pharmacyPurchaseTx, pharmacySaleTx, PharmaPurchaseInput, PharmaSaleInput } from './pharmacy';

const ph = (a: any[]) => a.map(() => '?').join(',');

export type EditableSale = {
  id: string; total: number; cashAmount: number; bkashAmount: number; dueAmount: number; note: string | null; createdAt: number;
  customerId: string | null; customerName: string | null; hasReturn: boolean;
  items: { id: string; productId: string | null; name: string; unit: string | null; qty: number; price: number }[];
};
export type EditablePurchase = {
  id: string; total: number; paid: number; due: number; createdAt: number; supplierId: string | null; supplierName: string | null;
  items: { id: string; productId: string | null; name: string; unit: string | null; qty: number; cost: number; batchNo: string | null; expiry: string | null }[];
};

// ---------- তালিকা ----------
export const manageSales = (days: number) =>
  read(async (x): Promise<EditableSale[]> => {
    need(...MGR);
    const rows = await x.all<any>(
      `SELECT s.*, c.name AS customerName, (SELECT COUNT(*) FROM sale_returns r WHERE r.saleId = s.id) AS retCount
       FROM sales s LEFT JOIN customers c ON c.id = s.customerId WHERE s.createdAt >= ? ORDER BY s.createdAt DESC LIMIT 100`, [sinceDays(days)]);
    const ids = rows.map((r) => r.id);
    const items = ids.length ? await x.all<any>(`SELECT * FROM sale_items WHERE saleId IN (${ph(ids)})`, ids) : [];
    return rows.map((s) => ({
      id: s.id, total: s.total, cashAmount: s.cashAmount, bkashAmount: s.bkashAmount, dueAmount: s.dueAmount, note: s.note, createdAt: s.createdAt,
      customerId: s.customerId, customerName: s.customerName || null, hasReturn: s.retCount > 0,
      items: items.filter((i) => i.saleId === s.id).map((i) => ({ id: i.id, productId: i.productId, name: i.name, unit: i.unit, qty: i.qty, price: i.price })),
    }));
  });

export const managePurchases = (days: number) =>
  read(async (x): Promise<EditablePurchase[]> => {
    need(...MGR);
    const rows = await x.all<any>(
      `SELECT p.*, s.name AS supplierName FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplierId WHERE p.createdAt >= ? ORDER BY p.createdAt DESC LIMIT 100`, [sinceDays(days)]);
    const ids = rows.map((r) => r.id);
    const items = ids.length ? await x.all<any>(`SELECT * FROM purchase_items WHERE purchaseId IN (${ph(ids)})`, ids) : [];
    const batches = ids.length ? await x.all<any>(`SELECT * FROM product_batches WHERE purchaseId IN (${ph(ids)})`, ids) : [];
    return rows.map((p) => ({
      id: p.id, total: p.total, paid: p.paid, due: p.due, createdAt: p.createdAt, supplierId: p.supplierId, supplierName: p.supplierName || null,
      items: items.filter((i) => i.purchaseId === p.id).map((i) => {
        const b = batches.find((b) => b.purchaseId === p.id && b.productId === i.productId);
        return { id: i.id, productId: i.productId, name: i.name, unit: i.unit, qty: i.qty, cost: i.cost, batchNo: b?.batchNo || null, expiry: b?.expiry ? dhakaDay(b.expiry) : null };
      }),
    }));
  });

// ---------- বিক্রি: স্টক ও বাকি আগের অবস্থায় ফেরানো ----------
async function putBack(x: Exec, productId: string, pieces: number, pieceCost: number) {
  const p = await x.first<any>('SELECT id FROM products WHERE id=?', [productId]);
  if (!p) return;
  await x.run('UPDATE products SET stock = stock + ? WHERE id=?', [pieces, p.id]);
  const hasBatch = (await x.first<any>('SELECT COUNT(*) AS c FROM product_batches WHERE productId=?', [p.id]))!.c;
  if (!hasBatch) return; // মুদি দোকানের পণ্য — ব্যাচ নেই
  const now = Date.now();
  const b = await x.first<any>('SELECT id FROM product_batches WHERE productId=? AND (expiry IS NULL OR expiry >= ?) ORDER BY expiry IS NULL, expiry ASC, createdAt ASC LIMIT 1', [p.id, now]);
  if (b) await x.run('UPDATE product_batches SET qty = qty + ? WHERE id=?', [pieces, b.id]);
  else await x.run('INSERT INTO product_batches (id,productId,batchNo,expiry,qty,cost,createdAt) VALUES (?,?,?,?,?,?,?)', [uid(), p.id, 'RETURN', null, pieces, pieceCost, now]);
}


async function reverseSale(x: Exec, id: string) {
  const s = (await x.first<any>('SELECT * FROM sales WHERE id=?', [id])) ?? fail('বিক্রি পাওয়া যায়নি');
  const rc = (await x.first<any>('SELECT COUNT(*) AS c FROM sale_returns WHERE saleId=?', [id]))!.c;
  if (rc) fail('এই বিক্রিতে ফেরত নেওয়া হয়েছে — মুছা বা সংশোধন করা যাবে না');
  const items = await x.all<any>('SELECT * FROM sale_items WHERE saleId=?', [id]);
  for (const it of items) {
    if (!it.productId) continue;
    const per = it.pieces > 0 ? it.pieces / it.qty : 1;
    await putBack(x, it.productId, it.qty * per, r4(it.cost / per));
  }
  if (s.dueAmount > 0 && s.customerId) await x.run('UPDATE customers SET balance = balance - ?, updatedAt=? WHERE id=?', [s.dueAmount, Date.now(), s.customerId]);
  return s;
}

export const deleteSale = (id: string) =>
  write(async (x) => {
    need(...MGR);
    await reverseSale(x, id);
    await x.run('DELETE FROM sales WHERE id=?', [id]);
  });

export const editSale = (id: string, input: SaleInput | PharmaSaleInput, pharma: boolean) =>
  write(async (x) => {
    need(...MGR);
    const old = await reverseSale(x, id);
    await x.run('DELETE FROM sales WHERE id=?', [id]);
    // আগের তারিখ ও কে বিক্রি করেছিল সেটা ঠিক রাখা
    const meta = { createdAt: old.createdAt as number, createdBy: (old.createdBy ?? currentUserId()) as string | null };
    return pharma ? pharmacySaleTx(x, meta.createdBy, input as PharmaSaleInput, meta) : createSaleTx(x, meta.createdBy, input as SaleInput, meta);
  });

// ---------- মাল কেনা: স্টক ও পাওনা আগের অবস্থায় ফেরানো ----------
async function undoPurchase(x: Exec, id: string) {
  const pu = (await x.first<any>('SELECT * FROM purchases WHERE id=?', [id])) ?? fail('মাল কেনার হিসাব পাওয়া যায়নি');
  const items = await x.all<any>('SELECT * FROM purchase_items WHERE purchaseId=?', [id]);
  for (const it of items) {
    if (!it.productId) continue;
    const p = await x.first<any>('SELECT * FROM products WHERE id=?', [it.productId]);
    if (!p) continue;
    const pieces = it.pieces > 0 ? it.pieces : it.qty;
    if (p.stock < pieces - 1e-9) fail(`${it.name}: এই মালের কিছু অংশ বিক্রি হয়ে গেছে, তাই মুছা বা সংশোধন করা যাবে না`);
    await x.run('UPDATE products SET stock = stock - ? WHERE id=?', [pieces, p.id]);

    let left = pieces;
    const linked = await x.all<any>('SELECT * FROM product_batches WHERE productId=? AND purchaseId=?', [p.id, pu.id]);
    for (const b of linked) {
      left -= Math.min(b.qty, left);
      await x.run('DELETE FROM product_batches WHERE id=?', [b.id]);
    }
    if (left > 1e-9) {
      // পুরনো ডাটায় ব্যাচের সাথে লিংক নেই — নতুন ব্যাচ থেকে কমানো হবে
      const others = await x.all<any>('SELECT * FROM product_batches WHERE productId=? AND qty > 0 ORDER BY createdAt DESC', [p.id]);
      for (const b of others) {
        if (left <= 1e-9) break;
        const take = Math.min(b.qty, left);
        await x.run('UPDATE product_batches SET qty = qty - ? WHERE id=?', [take, b.id]);
        left -= take;
      }
    }
  }
  if (pu.due > 0 && pu.supplierId) await x.run('UPDATE suppliers SET balance = balance - ?, updatedAt=? WHERE id=?', [pu.due, Date.now(), pu.supplierId]);
  return pu;
}

export const deletePurchase = (id: string) =>
  write(async (x) => {
    need(...MGR);
    await undoPurchase(x, id);
    await x.run('DELETE FROM purchases WHERE id=?', [id]);
  });

export const editPurchase = (id: string, input: PurchaseInput | PharmaPurchaseInput, pharma: boolean) =>
  write(async (x) => {
    need(...MGR);
    const old = await undoPurchase(x, id);
    await x.run('DELETE FROM purchases WHERE id=?', [id]);
    const meta = { createdAt: old.createdAt as number };
    return pharma ? pharmacyPurchaseTx(x, input as PharmaPurchaseInput, meta) : createPurchaseTx(x, input as PurchaseInput, meta);
  });
