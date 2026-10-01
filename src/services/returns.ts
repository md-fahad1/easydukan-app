import { fail, read, write } from '@/db/exec';
import { sinceDays } from '@/lib/dates';
import { uid } from '@/lib/id';
import { r2, r4 } from '@/lib/pharma';
import { currentUserId, MGR, need } from './session';
import { n, sum } from './shop';

// কোন বিক্রির আইটেম থেকে আগে কতটা ফেরত হয়েছে
async function returnedMap(x: any, saleIds: string[]) {
  const map: Record<string, number> = {};
  if (!saleIds.length) return map;
  const rows = await x.all(
    `SELECT ri.saleItemId AS id, SUM(ri.qty) AS q FROM sale_return_items ri JOIN sale_returns r ON r.id = ri.returnId
     WHERE r.saleId IN (${saleIds.map(() => '?').join(',')}) GROUP BY ri.saleItemId`, saleIds);
  for (const r of rows) map[r.id] = n(r.q);
  return map;
}

export type ReturnableItem = { id: string; productId: string | null; name: string; unit: string | null; qty: number; returnedQty: number; price: number };
export type ReturnableSale = {
  id: string; total: number; dueAmount: number; dueLeft: number; createdAt: number; customerName: string | null; returnedTotal: number; items: ReturnableItem[];
};

// ---------- ফেরত দেওয়ার মতো বিক্রির তালিকা ----------
export const returnableSales = (days: number) =>
  read(async (x): Promise<ReturnableSale[]> => {
    need(...MGR);
    const sales = await x.all<any>(
      `SELECT s.*, c.name AS customerName FROM sales s LEFT JOIN customers c ON c.id = s.customerId WHERE s.createdAt >= ? ORDER BY s.createdAt DESC LIMIT 100`, [sinceDays(days)]);
    const ids = sales.map((s) => s.id);
    const done = await returnedMap(x, ids);
    const items = ids.length ? await x.all<any>(`SELECT * FROM sale_items WHERE saleId IN (${ids.map(() => '?').join(',')})`, ids) : [];
    const rets = ids.length ? await x.all<any>(`SELECT saleId, total, dueAdjusted FROM sale_returns WHERE saleId IN (${ids.map(() => '?').join(',')})`, ids) : [];
    return sales.map((s) => {
      const rs = rets.filter((r) => r.saleId === s.id);
      return {
        id: s.id, total: s.total, dueAmount: s.dueAmount,
        dueLeft: Math.max(s.dueAmount - sum(rs.map((r) => r.dueAdjusted)), 0),
        createdAt: s.createdAt, customerName: s.customerName || null, returnedTotal: sum(rs.map((r) => r.total)),
        items: items.filter((i) => i.saleId === s.id).map((it) => ({
          id: it.id, productId: it.productId, name: it.name, unit: it.unit, qty: it.qty, returnedQty: done[it.id] || 0, price: it.price,
        })),
      };
    });
  });

export type SaleReturnInfo = {
  id: string; saleId: string; total: number; refund: number; dueAdjusted: number; refundMethod: string; note: string | null;
  createdAt: number; customerName: string | null; items: { name: string; unit: string | null; qty: number }[];
};

// ---------- ফেরতের ইতিহাস ----------
export const saleReturnsHistory = (days: number) =>
  read(async (x): Promise<SaleReturnInfo[]> => {
    need(...MGR);
    const rows = await x.all<any>(
      `SELECT r.*, c.name AS customerName FROM sale_returns r JOIN sales s ON s.id = r.saleId LEFT JOIN customers c ON c.id = s.customerId
       WHERE r.createdAt >= ? ORDER BY r.createdAt DESC LIMIT 100`, [sinceDays(days)]);
    const ids = rows.map((r) => r.id);
    const items = ids.length ? await x.all<any>(`SELECT returnId, name, unit, qty FROM sale_return_items WHERE returnId IN (${ids.map(() => '?').join(',')})`, ids) : [];
    return rows.map((r) => ({
      id: r.id, saleId: r.saleId, total: r.total, refund: r.refund, dueAdjusted: r.dueAdjusted, refundMethod: r.refundMethod, note: r.note,
      createdAt: r.createdAt, customerName: r.customerName || null,
      items: items.filter((i) => i.returnId === r.id).map((i) => ({ name: i.name, unit: i.unit, qty: i.qty })),
    }));
  });

// ---------- নতুন ফেরত ----------
export const createSaleReturn = (i: { saleId: string; items: { saleItemId: string; qty: number }[]; refundMethod?: string; note?: string | null }) =>
  write(async (x) => {
    need(...MGR);
    if (!i.items?.length) fail('কোন আইটেম ফেরত হবে বেছে নিন');
    const sale = (await x.first<any>('SELECT * FROM sales WHERE id=?', [i.saleId])) ?? fail('বিক্রি পাওয়া যায়নি');
    const sItems = await x.all<any>('SELECT * FROM sale_items WHERE saleId=?', [sale.id]);
    const prevRets = await x.all<any>('SELECT dueAdjusted FROM sale_returns WHERE saleId=?', [sale.id]);
    const done = await returnedMap(x, [sale.id]);
    const method = i.refundMethod === 'BKASH' ? 'BKASH' : 'CASH';
    const seen = new Set<string>();
    const lines: any[] = [];

    for (const v of i.items) {
      const qty = n(v.qty);
      if (!(qty > 0)) continue;
      if (seen.has(v.saleItemId)) fail('একই আইটেম দুইবার দেওয়া হয়েছে');
      seen.add(v.saleItemId);
      const it = sItems.find((s) => s.id === v.saleItemId) ?? fail('আইটেম এই বিক্রিতে নেই');
      const left = it.qty - (done[it.id] || 0);
      if (qty > left + 1e-9) fail(`${it.name}: সর্বোচ্চ ${left} ফেরত নেওয়া যায়`);
      const perUnit = it.pieces > 0 ? it.pieces / it.qty : 1; // ১ unit = কত পিস
      lines.push({ saleItemId: it.id, productId: it.productId, name: it.name, unit: it.unit, qty, pieces: qty * perUnit, price: it.price, cost: it.cost });
    }
    if (!lines.length) fail('ফেরতের পরিমাণ দিন');

    const total = r2(sum(lines.map((l) => l.qty * l.price)));
    const cost = sum(lines.map((l) => l.qty * l.cost));
    // আগে বাকি কমবে, বাকি থাকলে তারপর টাকা ফেরত
    const dueLeft = Math.max(sale.dueAmount - sum(prevRets.map((r) => r.dueAdjusted)), 0);
    const dueAdjusted = sale.customerId ? r2(Math.min(total, dueLeft)) : 0;
    const refund = r2(total - dueAdjusted);
    const id = uid(), now = Date.now();

    await x.run('INSERT INTO sale_returns (id,saleId,total,cost,dueAdjusted,refund,refundMethod,note,createdBy,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, sale.id, total, cost, dueAdjusted, refund, method, i.note || null, currentUserId(), now]);
    for (const l of lines)
      await x.run('INSERT INTO sale_return_items (id,returnId,saleItemId,productId,name,unit,qty,pieces,price,cost) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [uid(), id, l.saleItemId, l.productId, l.name, l.unit, l.qty, l.pieces, l.price, l.cost]);

    for (const l of lines) {
      if (!l.productId) continue;
      const p = await x.first<any>('SELECT id FROM products WHERE id=?', [l.productId]);
      if (!p) continue;
      await x.run('UPDATE products SET stock = stock + ? WHERE id=?', [l.pieces, p.id]);
      // ফার্মেসির ওষুধ হলে ব্যাচেও ফেরত যাবে (আগে মেয়াদ শেষ হওয়া, মেয়াদ থাকা ব্যাচে)
      const hasBatch = (await x.first<any>('SELECT COUNT(*) AS c FROM product_batches WHERE productId=?', [p.id]))!.c;
      if (hasBatch) {
        const b = await x.first<any>(
          'SELECT id FROM product_batches WHERE productId=? AND (expiry IS NULL OR expiry >= ?) ORDER BY expiry IS NULL, expiry ASC, createdAt ASC LIMIT 1', [p.id, now]);
        if (b) await x.run('UPDATE product_batches SET qty = qty + ? WHERE id=?', [l.pieces, b.id]);
        else
          await x.run('INSERT INTO product_batches (id,productId,batchNo,expiry,qty,cost,createdAt) VALUES (?,?,?,?,?,?,?)',
            [uid(), p.id, 'RETURN', null, l.pieces, r4(l.cost / (l.pieces / l.qty)), now]);
      }
    }
    if (dueAdjusted > 0 && sale.customerId)
      await x.run('UPDATE customers SET balance = balance - ?, updatedAt=? WHERE id=?', [dueAdjusted, now, sale.customerId]);
    return { id, total, refund, dueAdjusted };
  });
