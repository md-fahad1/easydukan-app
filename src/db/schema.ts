// একটাই দোকান (single-tenant) — তাই tenantId লাগে না। কলামের নাম camelCase, ফলে SELECT * সরাসরি ব্যবহার করা যায়।
export const SCHEMA_VERSION = 1;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS shop (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL, ownerName TEXT, phone TEXT,
  shopType TEXT NOT NULL DEFAULT 'মুদি দোকান', createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'OWNER', createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, balance REAL NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, balance REAL NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs',
  purchasePrice REAL NOT NULL DEFAULT 0, sellingPrice REAL NOT NULL DEFAULT 0,
  stock REAL NOT NULL DEFAULT 0, minStock REAL NOT NULL DEFAULT 0,
  barcode TEXT, genericName TEXT, company TEXT, form TEXT NOT NULL DEFAULT 'GENERAL',
  piecesPerStrip INTEGER NOT NULL DEFAULT 1, stripsPerBox INTEGER NOT NULL DEFAULT 1, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY, customerId TEXT REFERENCES customers(id), total REAL NOT NULL, cost REAL NOT NULL DEFAULT 0,
  cashAmount REAL NOT NULL DEFAULT 0, bkashAmount REAL NOT NULL DEFAULT 0, dueAmount REAL NOT NULL DEFAULT 0,
  note TEXT, createdBy TEXT, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(createdAt);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customerId);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY, saleId TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE, productId TEXT,
  name TEXT NOT NULL, qty REAL NOT NULL, price REAL NOT NULL, cost REAL NOT NULL DEFAULT 0, unit TEXT, pieces REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(saleId);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(productId);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, amount REAL NOT NULL, note TEXT, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(createdAt);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY, supplierId TEXT REFERENCES suppliers(id), total REAL NOT NULL,
  paid REAL NOT NULL DEFAULT 0, due REAL NOT NULL DEFAULT 0, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(createdAt);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY, purchaseId TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE, productId TEXT,
  name TEXT NOT NULL, qty REAL NOT NULL, cost REAL NOT NULL, unit TEXT, pieces REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchaseId);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, customerId TEXT, supplierId TEXT,
  amount REAL NOT NULL, method TEXT NOT NULL DEFAULT 'CASH', createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(createdAt);

CREATE TABLE IF NOT EXISTS daily_closings (
  id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, totalSale REAL NOT NULL, cash REAL NOT NULL, bkash REAL NOT NULL,
  due REAL NOT NULL, expense REAL NOT NULL, profit REAL NOT NULL, cashInHand REAL NOT NULL, createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_batches (
  id TEXT PRIMARY KEY, productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batchNo TEXT, purchaseId TEXT, expiry INTEGER, qty REAL NOT NULL, cost REAL NOT NULL DEFAULT 0, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON product_batches(expiry);
CREATE INDEX IF NOT EXISTS idx_batches_purchase ON product_batches(purchaseId);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(productId);

CREATE TABLE IF NOT EXISTS sale_returns (
  id TEXT PRIMARY KEY, saleId TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE, total REAL NOT NULL,
  cost REAL NOT NULL DEFAULT 0, dueAdjusted REAL NOT NULL DEFAULT 0, refund REAL NOT NULL DEFAULT 0,
  refundMethod TEXT NOT NULL DEFAULT 'CASH', note TEXT, createdBy TEXT, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_returns_created ON sale_returns(createdAt);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON sale_returns(saleId);

CREATE TABLE IF NOT EXISTS sale_return_items (
  id TEXT PRIMARY KEY, returnId TEXT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE, saleItemId TEXT NOT NULL,
  productId TEXT, name TEXT NOT NULL, unit TEXT, qty REAL NOT NULL, pieces REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL, cost REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON sale_return_items(saleItemId);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON sale_return_items(returnId);
`;

// ব্যাকআপ / রিস্টোরের জন্য টেবিলের তালিকা (parent আগে, child পরে)
export const TABLES = [
  'shop', 'users', 'customers', 'suppliers', 'products', 'sales', 'sale_items', 'expenses', 'purchases',
  'purchase_items', 'payments', 'daily_closings', 'product_batches', 'sale_returns', 'sale_return_items',
] as const;
