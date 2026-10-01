import { Exec, fail, read, write } from '@/db/exec';
import { dhakaDay, range } from '@/lib/dates';
import { uid } from '@/lib/id';
import type { Customer, Product, Summary, Supplier } from '@/types';
import { currentUserId, getCurrent, MGR, need } from './session';

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const n = (v: any) => Number(v) || 0;
const qs = (a: any[]) => a.map(() => '?').join(',');

// ---------- helpers ----------
export async function ownCustomer(x: Exec, id: string) {
  return (await x.first<Customer>('SELECT * FROM customers WHERE id=?', [id])) ?? fail('কাস্টমার পাওয়া যায়নি');
}
export async function ownSupplier(x: Exec, id: string) {
  return (await x.first<Supplier>('SELECT * FROM suppliers WHERE id=?', [id])) ?? fail('মালদাতা পাওয়া যায়নি');
}
export const productsByIds = (x: Exec, ids: string[]) =>
  ids.length ? x.all<Product>(`SELECT * FROM products WHERE id IN (${qs(ids)})`, ids) : Promise.resolve([] as Product[]);

// ---------- আজকের হিসাব / রিপোর্ট ----------
async function baseSummary(x: Exec, period: string) {
  const { from, to } = range(period);
  const W = 'createdAt >= ? AND createdAt < ?';
  const P = [from, to];
  const s = await x.first<any>(
    `SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS total, COALESCE(SUM(cashAmount),0) AS cash, COALESCE(SUM(bkashAmount),0) AS bkash,
            COALESCE(SUM(dueAmount),0) AS due, COALESCE(SUM(cost),0) AS cost FROM sales WHERE ${W}`, P);
  const e = await x.first<any>(`SELECT COALESCE(SUM(amount),0) AS v FROM expenses WHERE ${W}`, P);
  const pays = await x.all<any>(`SELECT type, COALESCE(SUM(amount),0) AS v FROM payments WHERE ${W} GROUP BY type`, P);
  const pu = await x.first<any>(`SELECT COALESCE(SUM(paid),0) AS v FROM purchases WHERE ${W}`, P);
  const cust = await x.first<any>('SELECT COALESCE(SUM(balance),0) AS v FROM customers');
  const sup = await x.first<any>('SELECT COALESCE(SUM(balance),0) AS v FROM suppliers');
  const low = await x.first<any>('SELECT COUNT(*) AS c FROM products WHERE minStock > 0 AND stock <= minStock');
  const received = n(pays.find((p) => p.type === 'CUSTOMER_RECEIVE')?.v);
  const paidSupplier = sum(pays.filter((p) => p.type === 'SUPPLIER_PAY' || p.type === 'SUPPLIER_LEND').map((p) => n(p.v)));
  const expense = n(e.v);
  return {
    totalSale: n(s.total), cash: n(s.cash), bkash: n(s.bkash), due: n(s.due), expense,
    profit: n(s.total) - n(s.cost) - expense, // আনুমানিক লাভ
    received,
    cashInHand: n(s.cash) + n(s.bkash) + received - expense - paidSupplier - n(pu.v),
    saleCount: n(s.c), customerDue: n(cust.v), supplierDue: n(sup.v), lowStockCount: n(low.c),
  };
}

// রিপোর্টে ফেরত (Sales return) হিসাব করে নেট বিক্রি দেখায়
export async function summaryTx(x: Exec, period: string): Promise<Summary> {
  const base = await baseSummary(x, period);
  const { from, to } = range(period);
  const rets = await x.all<any>(
    `SELECT refundMethod, COALESCE(SUM(total),0) AS total, COALESCE(SUM(cost),0) AS cost, COALESCE(SUM(dueAdjusted),0) AS due, COALESCE(SUM(refund),0) AS refund
     FROM sale_returns WHERE createdAt >= ? AND createdAt < ? GROUP BY refundMethod`, [from, to]);
  const rTotal = sum(rets.map((r) => n(r.total)));
  const rCost = sum(rets.map((r) => n(r.cost)));
  const rDue = sum(rets.map((r) => n(r.due)));
  const rCash = sum(rets.filter((r) => r.refundMethod !== 'BKASH').map((r) => n(r.refund)));
  const rBkash = sum(rets.filter((r) => r.refundMethod === 'BKASH').map((r) => n(r.refund)));
  return {
    ...base,
    totalSale: base.totalSale - rTotal,
    cash: base.cash - rCash,
    bkash: base.bkash - rBkash,
    due: base.due - rDue,
    profit: base.profit - rTotal + rCost,
    cashInHand: base.cashInHand - rCash - rBkash,
    returnTotal: rTotal,
  };
}
export const summary = (period: string) => read((x) => { need(...MGR); return summaryTx(x, period); });

export const closeDay = () =>
  write(async (x) => {
    need(...MGR);
    const s = await summaryTx(x, 'TODAY');
    const date = dhakaDay();
    await x.run(
      `INSERT INTO daily_closings (id,date,totalSale,cash,bkash,due,expense,profit,cashInHand,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(date) DO UPDATE SET totalSale=excluded.totalSale, cash=excluded.cash, bkash=excluded.bkash, due=excluded.due,
       expense=excluded.expense, profit=excluded.profit, cashInHand=excluded.cashInHand`,
      [uid(), date, s.totalSale, s.cash, s.bkash, s.due, s.expense, s.profit, s.cashInHand, Date.now()]);
  });

export const closings = () => read((x) => { need(...MGR); return x.all<any>('SELECT * FROM daily_closings ORDER BY date DESC LIMIT 60'); });

// ---------- কাস্টমার / বাকি ----------
export const customers = () => read((x) => x.all<Customer>('SELECT * FROM customers ORDER BY balance DESC, name ASC'));
export const customer = (id: string) => read((x) => { need(...MGR); return x.first<Customer>('SELECT * FROM customers WHERE id=?', [id]); });

export const createCustomer = (name: string, phone?: string | null) =>
  write(async (x) => {
    if (!name?.trim()) fail('নাম দিন');
    const id = uid(), now = Date.now();
    await x.run('INSERT INTO customers (id,name,phone,balance,createdAt,updatedAt) VALUES (?,?,?,0,?,?)', [id, name.trim(), phone || null, now, now]);
    return id;
  });

export const receivePayment = (customerId: string, amount: number, method = 'CASH') =>
  write(async (x) => {
    need(...MGR);
    await ownCustomer(x, customerId);
    if (!(amount > 0)) fail('সঠিক টাকার পরিমাণ দিন');
    const now = Date.now();
    await x.run('INSERT INTO payments (id,type,customerId,amount,method,createdAt) VALUES (?,?,?,?,?,?)', [uid(), 'CUSTOMER_RECEIVE', customerId, amount, method, now]);
    await x.run('UPDATE customers SET balance = balance - ?, updatedAt=? WHERE id=?', [amount, now, customerId]);
  });

export type LedgerEntry = { date: number; type: 'BAKI' | 'JOMA'; amount: number; note: string | null };
export const customerLedger = (customerId: string) =>
  read(async (x) => {
    need(...MGR);
    await ownCustomer(x, customerId);
    const sales = await x.all<LedgerEntry>(`SELECT createdAt AS date, 'BAKI' AS type, dueAmount AS amount, note FROM sales WHERE customerId=? AND dueAmount>0 ORDER BY createdAt DESC LIMIT 100`, [customerId]);
    const pays = await x.all<LedgerEntry>(`SELECT createdAt AS date, 'JOMA' AS type, amount, method AS note FROM payments WHERE customerId=? AND type='CUSTOMER_RECEIVE' ORDER BY createdAt DESC LIMIT 100`, [customerId]);
    // ফেরত নিলে বাকি কমে — সেটাও খাতায় দেখানো হয়
    const rets = await x.all<LedgerEntry>(`SELECT r.createdAt AS date, 'JOMA' AS type, r.dueAdjusted AS amount, 'RETURN' AS note FROM sale_returns r JOIN sales s ON s.id=r.saleId WHERE s.customerId=? AND r.dueAdjusted>0 ORDER BY r.createdAt DESC LIMIT 100`, [customerId]);
    return [...sales, ...pays, ...rets].sort((a, b) => b.date - a.date);
  });

// ---------- মালদাতা / কোম্পানি ----------
export const suppliers = () => read((x) => { need(...MGR); return x.all<Supplier>('SELECT * FROM suppliers ORDER BY balance DESC, name ASC'); });
export const createSupplier = (name: string, phone?: string | null) =>
  write(async (x) => {
    need(...MGR);
    if (!name?.trim()) fail('নাম দিন');
    const id = uid(), now = Date.now();
    await x.run('INSERT INTO suppliers (id,name,phone,balance,createdAt,updatedAt) VALUES (?,?,?,0,?,?)', [id, name.trim(), phone || null, now, now]);
    return id;
  });
export const paySupplier = (supplierId: string, amount: number, method = 'CASH') =>
  write(async (x) => {
    need(...MGR);
    await ownSupplier(x, supplierId);
    if (!(amount > 0)) fail('সঠিক টাকার পরিমাণ দিন');
    const now = Date.now();
    await x.run('INSERT INTO payments (id,type,supplierId,amount,method,createdAt) VALUES (?,?,?,?,?,?)', [uid(), 'SUPPLIER_PAY', supplierId, amount, method, now]);
    await x.run('UPDATE suppliers SET balance = balance - ?, updatedAt=? WHERE id=?', [amount, now, supplierId]);
  });
// কোম্পানিকে ধার দেওয়া (তখন কোম্পানি আপনাকে দেবে)
export const lendToSupplier = (supplierId: string, amount: number, method = 'CASH') =>
  write(async (x) => {
    need(...MGR);
    await ownSupplier(x, supplierId);
    if (!(amount > 0)) fail('সঠিক টাকার পরিমাণ দিন');
    const now = Date.now();
    await x.run('INSERT INTO payments (id,type,supplierId,amount,method,createdAt) VALUES (?,?,?,?,?,?)', [uid(), 'SUPPLIER_LEND', supplierId, amount, method, now]);
    await x.run('UPDATE suppliers SET balance = balance - ?, updatedAt=? WHERE id=?', [amount, now, supplierId]);
  });

// ---------- পণ্য ----------
export const products = () => read((x) => x.all<Product>('SELECT * FROM products ORDER BY name ASC'));

export type ProductInput = { name: string; unit?: string; purchasePrice?: number; sellingPrice?: number; stock?: number; minStock?: number };
export const createProduct = (i: ProductInput) =>
  write(async (x) => {
    need(...MGR);
    if (!i.name?.trim()) fail('পণ্যের নাম দিন');
    const id = uid();
    await x.run('INSERT INTO products (id,name,unit,purchasePrice,sellingPrice,stock,minStock,createdAt) VALUES (?,?,?,?,?,?,?,?)',
      [id, i.name.trim(), i.unit || 'pcs', n(i.purchasePrice), n(i.sellingPrice), n(i.stock), n(i.minStock), Date.now()]);
    return id;
  });
export const updateProduct = (id: string, i: ProductInput) =>
  write(async (x) => {
    need(...MGR);
    const p = (await x.first<Product>('SELECT * FROM products WHERE id=?', [id])) ?? fail('পণ্য পাওয়া যায়নি');
    if (!i.name?.trim()) fail('পণ্যের নাম দিন');
    await x.run('UPDATE products SET name=?, unit=?, purchasePrice=?, sellingPrice=?, stock=?, minStock=? WHERE id=?',
      [i.name.trim(), i.unit || p.unit, i.purchasePrice ?? p.purchasePrice, i.sellingPrice ?? p.sellingPrice, i.stock ?? p.stock, i.minStock ?? p.minStock, id]);
  });

// ---------- বিক্রি ----------
export type SaleInput = {
  amount?: number; items?: { productId: string; qty: number; price?: number }[];
  cashAmount?: number; bkashAmount?: number; dueAmount?: number; customerId?: string | null; note?: string | null;
};
export type Meta = { createdAt: number; createdBy: string | null };

export const sales = (period: string) =>
  read((x) => {
    const p = getCurrent()?.role === 'EMPLOYEE' ? 'TODAY' : period;
    const { from, to } = range(p);
    return x.all<any>(
      `SELECT s.*, c.name AS customerName FROM sales s LEFT JOIN customers c ON c.id = s.customerId
       WHERE s.createdAt >= ? AND s.createdAt < ? ORDER BY s.createdAt DESC LIMIT 200`, [from, to]);
  });

export async function createSaleTx(x: Exec, userId: string | null, i: SaleInput, meta?: Meta) {
  let total = n(i.amount), cost = 0;
  let items: any[] = [];
  if (i.items?.length) {
    const products = await productsByIds(x, i.items.map((v) => v.productId));
    items = i.items.map((v) => {
      const p = products.find((p) => p.id === v.productId) ?? fail('পণ্য পাওয়া যায়নি');
      return { productId: p.id, name: p.name, qty: n(v.qty), price: v.price != null ? n(v.price) : p.sellingPrice, cost: p.purchasePrice };
    });
    total = sum(items.map((v) => v.qty * v.price));
    cost = sum(items.map((v) => v.qty * v.cost));
  }
  if (!(total > 0)) fail('টাকার পরিমাণ দিন');
  let cash = n(i.cashAmount), bkash = n(i.bkashAmount), due = n(i.dueAmount);
  if (!cash && !bkash && !due) cash = total; // ডিফল্ট: নগদ
  if (Math.abs(cash + bkash + due - total) > 0.01) fail('নগদ + বিকাশ + বাকি মিলছে না');
  if (due > 0) {
    if (!i.customerId) fail('বাকির জন্য কাস্টমার বেছে নিন');
    await ownCustomer(x, i.customerId!);
  }
  const id = uid();
  const at = meta?.createdAt ?? Date.now();
  await x.run('INSERT INTO sales (id,customerId,total,cost,cashAmount,bkashAmount,dueAmount,note,createdBy,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, i.customerId || null, total, cost, cash, bkash, due, i.note || null, meta ? meta.createdBy : userId, at]);
  for (const it of items) {
    await x.run('INSERT INTO sale_items (id,saleId,productId,name,qty,price,cost) VALUES (?,?,?,?,?,?,?)', [uid(), id, it.productId, it.name, it.qty, it.price, it.cost]);
    await x.run('UPDATE products SET stock = stock - ? WHERE id=?', [it.qty, it.productId]);
  }
  if (due > 0) await x.run('UPDATE customers SET balance = balance + ?, updatedAt=? WHERE id=?', [due, Date.now(), i.customerId!]);
  return id;
}
export const createSale = (i: SaleInput) => write((x) => createSaleTx(x, currentUserId(), i));

// ---------- খরচ ----------
export const expenses = (period: string) =>
  read((x) => {
    need(...MGR);
    const { from, to } = range(period);
    return x.all<any>('SELECT * FROM expenses WHERE createdAt >= ? AND createdAt < ? ORDER BY createdAt DESC LIMIT 200', [from, to]);
  });
export const createExpense = (category: string, amount: number, note?: string | null) =>
  write(async (x) => {
    need(...MGR);
    if (!(amount > 0)) fail('টাকার পরিমাণ দিন');
    await x.run('INSERT INTO expenses (id,category,amount,note,createdAt) VALUES (?,?,?,?,?)', [uid(), category || 'অন্যান্য', amount, note || null, Date.now()]);
  });

// ---------- মাল কেনা ----------
export type PurchaseInput = { supplierId?: string | null; total?: number; paid?: number; items?: { productId: string; qty: number; cost: number }[] };

export async function createPurchaseTx(x: Exec, i: PurchaseInput, meta?: { createdAt: number }) {
  let total = n(i.total);
  const lines: any[] = [];
  if (i.items?.length) {
    const products = await productsByIds(x, i.items.map((v) => v.productId));
    for (const v of i.items) {
      const p = products.find((p) => p.id === v.productId) ?? fail('পণ্য পাওয়া যায়নি');
      lines.push({ productId: p.id, name: p.name, qty: n(v.qty), cost: n(v.cost) });
    }
    total = sum(lines.map((l) => l.qty * l.cost));
  }
  if (!(total > 0)) fail('মালের মোট টাকা দিন');
  const paid = i.paid == null ? total : Math.min(n(i.paid), total);
  const due = total - paid;
  if (due > 0 && !i.supplierId) fail('বাকির জন্য মালদাতা বেছে নিন');
  if (i.supplierId) await ownSupplier(x, i.supplierId);
  const id = uid();
  await x.run('INSERT INTO purchases (id,supplierId,total,paid,due,createdAt) VALUES (?,?,?,?,?,?)', [id, i.supplierId || null, total, paid, due, meta?.createdAt ?? Date.now()]);
  for (const l of lines) {
    await x.run('INSERT INTO purchase_items (id,purchaseId,productId,name,qty,cost) VALUES (?,?,?,?,?,?)', [uid(), id, l.productId, l.name, l.qty, l.cost]);
    await x.run('UPDATE products SET stock = stock + ?, purchasePrice=? WHERE id=?', [l.qty, l.cost, l.productId]);
  }
  if (due > 0) await x.run('UPDATE suppliers SET balance = balance + ?, updatedAt=? WHERE id=?', [due, Date.now(), i.supplierId!]);
  return id;
}
export const createPurchase = (i: PurchaseInput) => write((x) => { need(...MGR); return createPurchaseTx(x, i); });
