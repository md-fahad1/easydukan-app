export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type User = { id: string; name: string; phone: string; role: Role };
export type Shop = { name: string; ownerName: string | null; phone: string | null; shopType: string };
export type Customer = { id: string; name: string; phone: string | null; balance: number; updatedAt: number };
export type Supplier = { id: string; name: string; phone: string | null; balance: number };
export type Product = {
  id: string; name: string; unit: string; purchasePrice: number; sellingPrice: number; stock: number; minStock: number;
  barcode: string | null; genericName: string | null; company: string | null; form: string; piecesPerStrip: number; stripsPerBox: number;
};
export type Summary = {
  totalSale: number; cash: number; bkash: number; due: number; expense: number; profit: number; received: number;
  cashInHand: number; saleCount: number; customerDue: number; supplierDue: number; lowStockCount: number; returnTotal: number;
};
export const isPharmacy = (shopType?: string | null) => shopType === 'ফার্মেসি';
